import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Alert, Snackbar } from '@mui/material';
import type {
  FuelCardsRepository,
  FuelCardsSnapshot,
  FuelCardFormValues,
  FuelCardsQuery,
} from '@/features/fuel-cards/data/fuel-cards-repository';
import { ApiError, errorMessage as apiErrorMessage } from '@/shared/api/result';
import { isFuelCardsDemoEnabled } from '@/features/fuel-cards/data/fuel-cards-repository';

type DataState =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'error'; message?: string }
  | ({ status: 'ready' } & FuelCardsSnapshot);
interface FuelCardsData {
  state: DataState;
  mode: 'demo' | 'api' | 'unavailable';
  busy: boolean;
  repository: FuelCardsRepository | null;
  canWrite: boolean;
  revision: number;
  query: FuelCardsQuery;
  setQuery: (query: FuelCardsQuery) => void;
  retry: () => void;
  createCard: (values: FuelCardFormValues) => Promise<{ id: string } | { error: string }>;
  editCard: (id: string, values: FuelCardFormValues) => Promise<{ id: string } | { error: string }>;
  linkVehicle: (id: string, vehicleId: string) => Promise<boolean>;
  unlinkVehicle: (id: string) => Promise<boolean>;
  changeStatus: (id: string, status: string) => Promise<boolean>;
}
const Context = createContext<FuelCardsData | null>(null);
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível concluir a operação. Tente novamente.';

/** Um adaptador real pode ser injetado aqui após confirmar contratos e endpoints. */
export function FuelCardsProvider({
  children,
  repository: supplied,
  canWrite = true,
}: PropsWithChildren<{ repository?: FuelCardsRepository; canWrite?: boolean }>) {
  const [demoEnabled] = useState(isFuelCardsDemoEnabled);
  const allowedSource = supplied?.mode === 'demo' && !demoEnabled ? undefined : supplied;
  const [repository, setRepository] = useState<FuelCardsRepository | null>(null);
  const [state, setState] = useState<DataState>({
    status: allowedSource || demoEnabled ? 'loading' : 'unavailable',
  });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState<FuelCardsQuery>({ page: 0 });
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; severity: 'success' | 'error' } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    if (!allowedSource && !demoEnabled) return;
    async function load() {
      setState({ status: 'loading' });
      try {
        let source = allowedSource;
        // O build de homologação também permite a demonstração, nunca o ambiente de produção.
        if (!source && import.meta.env.VITE_APP_ENV === 'staging' && demoEnabled) {
          source = (
            await import('@/features/fuel-cards/demo/create-demo-repository')
          ).createDemoRepository();
        }
        if (!source) {
          if (active) setState({ status: 'unavailable' });
          return;
        }
        const snapshot = await source.load(query);
        if (active) {
          setRepository(source);
          setState({ status: 'ready', ...snapshot });
        }
      } catch (error) {
        if (active)
          setState({
            status: 'error',
            message: error instanceof ApiError ? apiErrorMessage(error) : undefined,
          });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [allowedSource, demoEnabled, attempt, query]);

  async function mutate<T>(
    operation: (source: FuelCardsRepository) => Promise<T>,
    text: string,
    fieldErrors = false,
  ): Promise<T | { error: string }> {
    if (!repository || busy || !canWrite)
      return { error: 'A operação não está disponível neste momento.' };
    setBusy(true);
    try {
      const result = await operation(repository);
      setRevision((value) => value + 1);
      try {
        const snapshot = await repository.load(query);
        setState({ status: 'ready', ...snapshot });
      } catch {
        setFeedback({
          text: 'Operação gravada, mas não foi possível atualizar a lista. Recarregue para consultar os dados atuais.',
          severity: 'error',
        });
        return result;
      }
      setFeedback({
        text: repository.mode === 'demo' ? `${text} apenas nesta demonstração.` : `${text}.`,
        severity: 'success',
      });
      return result;
    } catch (error) {
      const message = errorMessage(error);
      if (!fieldErrors) setFeedback({ text: message, severity: 'error' });
      return { error: message };
    } finally {
      setBusy(false);
    }
  }
  async function command(operation: (source: FuelCardsRepository) => Promise<void>, text: string) {
    const result = await mutate(async (source) => {
      await operation(source);
      return true;
    }, text);
    return result === true;
  }
  return (
    <Context.Provider
      value={{
        state,
        repository,
        busy,
        canWrite,
        revision,
        query,
        setQuery,
        mode: repository?.mode ?? (demoEnabled ? 'demo' : 'unavailable'),
        retry: () => {
          setAttempt((value) => value + 1);
          setRevision((value) => value + 1);
        },
        createCard: (values) =>
          mutate((source) => source.createCard(values), 'Cartão cadastrado', true),
        editCard: (id, values) =>
          mutate((source) => source.editCard(id, values), 'Cartão atualizado', true),
        linkVehicle: (id, vehicleId) =>
          command((source) => source.linkVehicle(id, vehicleId), 'Veículo vinculado'),
        unlinkVehicle: (id) =>
          command((source) => source.unlinkVehicle(id), 'Veículo desvinculado'),
        changeStatus: (id, status) =>
          command((source) => source.changeStatus(id, status), 'Status alterado'),
      }}
    >
      {children}
      <Snackbar
        open={Boolean(feedback)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={feedback?.severity ?? 'success'}
          role={feedback?.severity === 'error' ? 'alert' : 'status'}
          closeText="Fechar mensagem"
          onClose={() => setFeedback(null)}
        >
          {feedback?.text}
        </Alert>
      </Snackbar>
    </Context.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFuelCardsData() {
  return useContext(Context);
}
