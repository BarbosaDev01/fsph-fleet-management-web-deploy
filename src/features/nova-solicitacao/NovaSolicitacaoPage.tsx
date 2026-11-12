import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';

import { DashboardSidebar } from '../dashboard/components/DashboardSidebar';
import {
  initialFormValues,
  passengerCountOptions,
  sectorOptions,
  serviceTypeOptions,
  toDemoSubmission,
} from './data/novaSolicitacaoMock';
import type { DemoSubmission, PassengerCount, RequestFormValues, RouteChoice } from './types';
import './nova-solicitacao.css';
import '../dashboard/dashboard.css';

const emptyValues: RequestFormValues = {
  origin: '',
  destination: '',
  serviceType: '',
  demandSector: '',
  occurredAt: '',
  passengerCount: '',
  observations: '',
  routeChoice: 'existing',
};

const requiredFields: Array<
  keyof Pick<
    RequestFormValues,
    'origin' | 'destination' | 'serviceType' | 'demandSector' | 'occurredAt' | 'passengerCount'
  >
> = ['origin', 'destination', 'serviceType', 'demandSector', 'occurredAt', 'passengerCount'];

function RequestFields({
  values,
  attempted,
  onChange,
}: {
  values: RequestFormValues;
  attempted: boolean;
  onChange: <K extends keyof RequestFormValues>(field: K, value: RequestFormValues[K]) => void;
}) {
  const error = (field: (typeof requiredFields)[number]) =>
    attempted && !String(values[field]).trim();

  return (
    <section aria-labelledby="data-title" className="form-section">
      <div className="section-topline">
        <div>
          <div className="breadcrumbs">
            <span>Solicitações</span>
            <span>/</span>
            <strong>Nova solicitação</strong>
          </div>
          <h2 id="data-title">Dados da solicitação</h2>
        </div>
      </div>
      <div className="fields-grid">
        <TextField
          label="Origem *"
          value={values.origin}
          onChange={(e) => onChange('origin', e.target.value)}
          error={error('origin')}
          helperText={error('origin') ? 'Informe a origem.' : undefined}
          fullWidth
        />
        <TextField
          label="Destino *"
          value={values.destination}
          onChange={(e) => onChange('destination', e.target.value)}
          error={error('destination')}
          helperText={error('destination') ? 'Informe o destino.' : undefined}
          fullWidth
        />
        <TextField
          label="Tipo de solicitação *"
          value={values.serviceType}
          onChange={(e) => onChange('serviceType', e.target.value)}
          select
          error={error('serviceType')}
          helperText={error('serviceType') ? 'Selecione o tipo.' : undefined}
          fullWidth
        >
          {serviceTypeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Setor da demanda *"
          value={values.demandSector}
          onChange={(e) => onChange('demandSector', e.target.value)}
          select
          error={error('demandSector')}
          helperText={error('demandSector') ? 'Selecione o setor.' : undefined}
          fullWidth
        >
          {sectorOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Data e horário *"
          type="datetime-local"
          value={values.occurredAt}
          onChange={(e) => onChange('occurredAt', e.target.value)}
          error={error('occurredAt')}
          helperText={error('occurredAt') ? 'Informe data e horário.' : undefined}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Quantidade de passageiros *"
          value={values.passengerCount}
          onChange={(e) =>
            onChange(
              'passengerCount',
              e.target.value ? (Number(e.target.value) as PassengerCount) : '',
            )
          }
          select
          error={error('passengerCount')}
          helperText={
            error('passengerCount') ? 'Selecione a quantidade de passageiros.' : undefined
          }
          fullWidth
        >
          {passengerCountOptions.map((count) => (
            <MenuItem key={count} value={count}>
              {count} {count === 1 ? 'pessoa' : 'pessoas'}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          className="observations-field"
          label="Observações"
          value={values.observations}
          onChange={(e) => onChange('observations', e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
      </div>
    </section>
  );
}

function RouteOptions({
  value,
  onChange,
}: {
  value: RouteChoice;
  onChange: (value: RouteChoice) => void;
}) {
  return (
    <section aria-labelledby="route-choice-title" className="route-options-section">
      <h2 id="route-choice-title">Opções de rota</h2>
      <FormControl fullWidth>
        <RadioGroup
          aria-label="Opções de rota"
          name="route-choice"
          value={value}
          onChange={(e) => onChange(e.target.value as RouteChoice)}
        >
          <FormControlLabel
            className={`route-option ${value === 'new' ? 'route-option-selected' : ''}`}
            control={<Radio size="small" />}
            label="Criar uma nova rota"
            value="new"
          />
          <FormControlLabel
            className={`route-option ${value === 'existing' ? 'route-option-selected' : ''}`}
            control={<Radio size="small" />}
            label="Adicionar a uma rota existente"
            value="existing"
          />
        </RadioGroup>
      </FormControl>
    </section>
  );
}

export function NovaSolicitacaoPage() {
  const [values, setValues] = useState<RequestFormValues>(initialFormValues);
  const [submissions, setSubmissions] = useState<DemoSubmission[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [feedback, setFeedback] = useState<{
    severity: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);
  const missingFields = useMemo(
    () => requiredFields.filter((field) => !String(values[field]).trim()),
    [values],
  );

  function changeField<K extends keyof RequestFormValues>(field: K, value: RequestFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setAttempted(false);
    setFeedback(null);
  }

  function clearForm() {
    setValues(emptyValues);
    setAttempted(false);
    setFeedback({ severity: 'info', text: 'Formulário limpo.' });
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (missingFields.length) {
      setFeedback({ severity: 'error', text: 'Revise os campos obrigatórios destacados.' });
      return;
    }
    const id = `00000000-0000-4000-8000-${(submissions.length + 1).toString(16).padStart(12, '0')}`;
    const submission = toDemoSubmission(values, id);
    setSubmissions((current) => [...current, submission]);
    setFeedback({
      severity: 'success',
      text: `Solicitação demonstrativa ${id.slice(-6)} enviada para aprovação nesta sessão. Nenhum dado foi salvo em servidor.`,
    });
  }

  return (
    <div className="nova-app-shell">
      <DashboardSidebar active="requests" />
      <main className="nova-main">
        <header className="nova-page-header">
          <div>
            <h1>Nova solicitação</h1>
            <p>Preencha os dados para registrar uma solicitação.</p>
          </div>
        </header>
        <form noValidate onSubmit={submitForm}>
          <div className="nova-content-card">
            <div className="nova-form-column">
              <RequestFields values={values} attempted={attempted} onChange={changeField} />
              <RouteOptions
                value={values.routeChoice}
                onChange={(value) => changeField('routeChoice', value)}
              />
            </div>
            {feedback && (
              <Alert
                className="form-feedback"
                severity={feedback.severity}
                onClose={() => setFeedback(null)}
              >
                {feedback.text}
              </Alert>
            )}
          </div>
          <div className="form-actions">
            <Button type="button" variant="outlined" onClick={clearForm}>
              Cancelar / limpar
            </Button>
            <Button type="submit" variant="contained">
              Enviar para aprovação
            </Button>
          </div>
        </form>
        <footer className="nova-footer">
          <span>Protótipo frontend • Dados mantidos apenas em memória durante esta sessão</span>
          <span>FSPH • Solicitações</span>
        </footer>
      </main>
    </div>
  );
}
