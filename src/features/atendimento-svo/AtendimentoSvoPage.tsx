import { useMemo, useReducer, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { Link } from 'react-router-dom';

import {
  dutyTeams,
  getTransport,
  initialSvoRequests,
  routeStops,
  routes,
  statusOptions,
} from './data/atendimentoSvoMock';
import type { RouteRecord, SvoDemoRequest, SvoDemoStatus } from './types';
import './atendimento-svo.css';

type IconName =
  | 'inbox'
  | 'clipboard'
  | 'dashboard'
  | 'routes'
  | 'vehicle'
  | 'person'
  | 'maintenance'
  | 'users'
  | 'search'
  | 'lock'
  | 'logout'
  | 'info'
  | 'alert'
  | 'clip';
type ActionDialog = 'complement' | 'approve' | 'deny' | null;
type State = { requests: SvoDemoRequest[]; selectedId: string };
type Action =
  | { type: 'select'; id: string }
  | { type: 'save-analysis'; id: string; analysis: string; time: string }
  | {
      type: 'set-status';
      id: string;
      status: SvoDemoStatus;
      action: string;
      time: string;
      detail?: string;
    };

function reducer(state: State, action: Action): State {
  if (action.type === 'select') return { ...state, selectedId: action.id };
  return {
    ...state,
    requests: state.requests.map((request) => {
      if (request.id !== action.id) return request;
      if (action.type === 'save-analysis') {
        return {
          ...request,
          analysis: action.analysis,
          analysisSavedAt: action.time,
          history: [
            { id: `evt-${Date.now()}`, time: action.time.slice(-5), action: 'Análise salva' },
            ...request.history,
          ],
        };
      }
      const updated = {
        ...request,
        status: action.status,
        history: [
          { id: `evt-${Date.now()}`, time: action.time.slice(-5), action: action.action },
          ...request.history,
        ],
      };
      if (action.status === 'Aguardando complemento')
        return {
          ...updated,
          complementRequests: [...request.complementRequests, action.detail ?? ''],
        };
      if (action.status === 'Negada') return { ...updated, denialReason: action.detail };
      return updated;
    }),
  };
}

function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    inbox: (
      <>
        <path d="M4 4h16v12h-4l-2 3h-4l-2-3H4z" />
        <path d="M4 12h4l2 2h4l2-2h4" />
      </>
    ),
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5h6v3H9zM8 12h8M8 16h6" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    routes: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" />
      </>
    ),
    vehicle: (
      <>
        <path d="M3 14v-3l2-5h12l3 5v6h-2M3 14h14M6 17h.01M15 17h.01" />
        <circle cx="6" cy="17" r="2" />
        <circle cx="15" cy="17" r="2" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    maintenance: (
      <>
        <rect x="4" y="8" width="16" height="12" rx="2" />
        <path d="M8 8V5a4 4 0 0 1 8 0v3M8 13h8M8 16h5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.3" />
        <path d="m16 16 4 4" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="1.5" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 16h.01" />
      </>
    ),
    clip: <path d="m8 12.5 5.7-5.7a3 3 0 0 1 4.3 4.3l-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4l7.4-7.4" />,
  };
  return (
    <svg
      aria-hidden="true"
      className="svo-icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className = status
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(' ', '-');
  return <span className={`status-badge status-${className}`}>{status}</span>;
}

function Sidebar() {
  return (
    <aside className="svo-sidebar">
      <div className="svo-brand">
        <div className="brand-title">SVO</div>
        <div>Frota administrativa</div>
        <div>Serviço de Verificação de Óbito</div>
      </div>
      <nav aria-label="Navegação institucional" className="side-nav">
        <Link className="side-link" to="/dashboard">
          <Icon name="dashboard" />
          Dashboard
        </Link>
        <Link aria-current="page" className="side-link side-link-active" to="/atendimento-svo">
          <Icon name="clipboard" />
          Atendimento SVO
        </Link>
        <Link className="side-link" to="/solicitacoes">
          <Icon name="inbox" />
          Solicitações
        </Link>
        {[
          ['routes', 'Ordens'],
          ['routes', 'Rotas'],
          ['vehicle', 'Veículos'],
          ['person', 'Condutores'],
          ['maintenance', 'Manutenções'],
        ].map(([icon, label]) => (
          <span
            aria-disabled="true"
            className="side-link unavailable"
            key={label}
            title="Indisponível neste protótipo"
          >
            <Icon name={icon as IconName} />
            {label}
          </span>
        ))}
        <Link className="side-link" to="/usuarios">
          <Icon name="users" />
          Usuários
        </Link>
      </nav>
      <div className="side-context">
        <span>ATENDENTE / SVO</span>
        <p>
          Análise e aprovação SVO.
          <br />
          Alocação de equipes e veículos pela Logística.
        </p>
      </div>
      <div className="side-user">
        <div className="user-avatar">CO</div>
        <div>
          <strong>Clara Operações</strong>
          <span>Atendente • Setor SVO</span>
        </div>
      </div>
      <span
        aria-disabled="true"
        className="side-logout unavailable"
        title="Indisponível neste protótipo"
      >
        <Icon name="logout" />
        Sair
      </span>
    </aside>
  );
}

function SummaryItem({ number, title, detail }: { number: number; title: string; detail: string }) {
  return (
    <div className="summary-item">
      <strong>{number}</strong>
      <div>
        <b>{title}</b>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function PageHeader({
  pendingCount,
  approvedCount,
}: {
  pendingCount: number;
  approvedCount: number;
}) {
  return (
    <>
      <header className="page-header">
        <div className="header-main">
          <div className="breadcrumbs">
            <span>SVO</span>
            <span>/</span>
            <span>Frota administrativa</span>
            <span>/</span>
            <strong>Atendimento SVO</strong>
          </div>
          <h1>Atendimento SVO</h1>
          <p className="header-subtitle">
            Triagem demonstrativa • 06/10/2026 • Dados locais desta sessão
          </p>
        </div>
        <div className="account-context">
          <span className="account-badge">
            <Icon name="lock" size={12} />
            Setor: SVO • fixo pela conta
          </span>
          <span>Administrativo indisponível para este perfil</span>
        </div>
      </header>
      <section aria-label="Resumo da operação" className="summary-grid">
        <SummaryItem
          number={pendingCount}
          title="Triagens pendentes"
          detail="Contagem derivada dos estados demonstrativos"
        />
        <SummaryItem
          number={approvedCount}
          title="Aguardando alocação"
          detail="Aprovações SVO • sem alocação automática"
        />
        <SummaryItem
          number={routes.filter((route) => route.status === 'IN_PROGRESS').length}
          title="Rotas ativas no sistema"
          detail="Registros de rota do mock operacional"
        />
      </section>
      <div aria-label="Fluxo de atendimento (ilustrativo)" className="flow-bar">
        {['Solicitação', 'Análise SVO', 'Aprovação', 'Alocação logística', 'Rota'].map(
          (label, i) => (
            <div className={i === 1 ? 'flow-step flow-current' : 'flow-step'} key={label}>
              <span>{label}</span>
              {i < 4 && (
                <span aria-hidden="true" className="flow-arrow">
                  →
                </span>
              )}
            </div>
          ),
        )}
      </div>
    </>
  );
}

function Queue({
  requests,
  selectedId,
  onSelect,
}: {
  requests: SvoDemoRequest[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('Todos');
  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        const transport = getTransport(request.transportId);
        const search = query.trim().toLocaleLowerCase('pt-BR');
        const matches =
          !search ||
          [request.protocol, transport?.pickup_location ?? '', transport?.destination ?? ''].some(
            (value) => value.toLocaleLowerCase('pt-BR').includes(search),
          );
        return matches && (status === 'Todos' || request.status === status);
      }),
    [query, requests, status],
  );
  return (
    <section aria-labelledby="queue-title" className="surface queue-panel">
      <div className="section-heading queue-heading">
        <div>
          <h2 id="queue-title">Fila de atendimento</h2>
          <p>
            {requests.length} solicitações SVO •{' '}
            {
              requests.filter((r) =>
                ['Em análise', 'Aguardando análise', 'Aguardando complemento'].includes(r.status),
              ).length
            }{' '}
            triagens pendentes
          </p>
        </div>
        <div className="queue-tools">
          <label className="search-field">
            <Icon name="search" size={14} />
            <TextField
              aria-label="Buscar protocolo, coleta ou destino"
              className="queue-search-input"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar protocolo, coleta ou destino"
              slotProps={{ input: { disableUnderline: true } }}
              variant="standard"
              value={query}
            />
          </label>
          <label className="status-select">
            <span className="visually-hidden">Status</span>
            <Select
              aria-label="Status"
              className="queue-status-select"
              onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
              value={status}
              variant="standard"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'Todos' ? 'Status: Todos' : option}
                </MenuItem>
              ))}
            </Select>
          </label>
        </div>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label="Tabela da fila; role para rolagem horizontal"
        tabIndex={0}
      >
        <table className="data-table queue-table">
          <thead>
            <tr>
              {['Protocolo', 'Status', 'Entrada', 'Espera', 'Tipo', 'Coleta', 'Destino'].map(
                (label) => (
                  <th key={label}>{label}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((request) => {
              const transport = getTransport(request.transportId);
              return (
                <tr
                  aria-selected={selectedId === request.id}
                  className={selectedId === request.id ? 'selected-row' : ''}
                  key={request.id}
                  onClick={() => onSelect(request.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelect(request.id);
                  }}
                  tabIndex={0}
                >
                  <td className="protocol-cell">{request.protocol}</td>
                  <td>
                    <StatusBadge status={request.status} />
                    {request.status === 'Aprovada' && (
                      <small className="sub-status">Aguardando alocação</small>
                    )}
                  </td>
                  <td>{request.enteredAt}</td>
                  <td className={request.wait !== '—' ? 'wait-cell' : ''}>{request.wait}</td>
                  <td>{transport?.service_type}</td>
                  <td>{transport?.pickup_location}</td>
                  <td>{transport?.destination}</td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td className="empty-row" colSpan={7}>
                  Nenhuma solicitação corresponde à busca e ao status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="queue-footer">
        <span>
          Exibindo {filtered.length} de {requests.length} solicitações
        </span>
        <span>
          Selecionada:{' '}
          <strong>{requests.find((r) => r.id === selectedId)?.protocol.slice(-4)}</strong>
        </span>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RequestDetails({
  request,
  onSaveAnalysis,
}: {
  request: SvoDemoRequest;
  onSaveAnalysis: (value: string) => void;
}) {
  const [tab, setTab] = useState(0);
  const [analysis, setAnalysis] = useState(request.analysis);
  const transport = getTransport(request.transportId);
  return (
    <section aria-labelledby="request-title" className="surface request-card">
      <div className="request-card-header">
        <div>
          <span className="eyebrow">SOLICITAÇÃO SELECIONADA</span>
          <h2 id="request-title">{request.protocol}</h2>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <Tabs
        aria-label="Detalhes da solicitação"
        className="request-tabs"
        onChange={(_, value: number) => setTab(value)}
        value={tab}
      >
        <Tab className="request-tab" label="Detalhe e análise" />
        <Tab
          className="request-tab"
          label={`Complementos (${request.complementRequests.length})`}
        />
        <Tab className="request-tab" label="Anexos (0)" />
      </Tabs>
      {tab === 0 ? (
        <>
          <div className="request-facts">
            <Fact label="Coleta" value={transport?.pickup_location ?? '—'} />
            <Fact label="Destino" value={transport?.destination ?? '—'} />
            <Fact
              label="Tipo / setor"
              value={`${transport?.service_type ?? '—'} / ${request.sector}`}
            />
            <Fact label="Entrada / espera" value={`${request.enteredAt} / ${request.wait}`} />
          </div>
          <div className="request-notes">
            <h3>Observações e contato</h3>
            <p>{request.notes}</p>
            <small>{request.contact}</small>
          </div>
          <form
            className="analysis-area"
            onSubmit={(e) => {
              e.preventDefault();
              if (analysis.trim()) onSaveAnalysis(analysis.trim());
            }}
          >
            <label htmlFor="attendant-analysis">Análise do atendente</label>
            <textarea
              id="attendant-analysis"
              onChange={(e) => setAnalysis(e.target.value)}
              value={analysis}
            />
            <div className="action-buttons">
              <Button type="submit" size="small" variant="outlined" disabled={!analysis.trim()}>
                Salvar análise
              </Button>
            </div>
            <p className="workflow-note">
              Simulação local: as ações atualizam somente o estado demonstrativo SVO. Não alteram o
              transporte nem criam ordem, rota ou alocação.
            </p>
            {request.analysisSavedAt && (
              <small className="save-note">Análise salva • {request.analysisSavedAt}</small>
            )}
          </form>
          <History items={request.history} />
        </>
      ) : tab === 1 ? (
        <div className="tab-panel" role="tabpanel">
          {request.complementRequests.length ? (
            request.complementRequests.map((item, i) => (
              <p key={`${request.id}-complement-${i}`}>
                <strong>Informação solicitada:</strong> {item}
              </p>
            ))
          ) : (
            <p>Nenhum complemento solicitado.</p>
          )}
        </div>
      ) : (
        <div className="tab-panel" role="tabpanel">
          <p>Anexos não disponíveis neste protótipo.</p>
        </div>
      )}
      {request.denialReason && (
        <div className="denial-note">
          <strong>Justificativa da negativa:</strong> {request.denialReason}
        </div>
      )}
    </section>
  );
}

function History({ items }: { items: SvoDemoRequest['history'] }) {
  return (
    <div className="history">
      <h3>Histórico • demonstração local</h3>
      {items.map((item) => (
        <div className="history-row" key={item.id}>
          <time>{item.time}</time>
          <span className="history-dot">•</span>
          <span>{item.action}</span>
          <span>Clara Operações • Atendente SVO</span>
        </div>
      ))}
    </div>
  );
}

function DutyPanel() {
  return (
    <section aria-labelledby="duty-title" className="surface duty-panel">
      <div className="duty-heading">
        <h2 id="duty-title">Equipe de plantão</h2>
        <p>06/10/2026 • 07:00–19:00 • Setor SVO</p>
        <small>Consulta informativa • alocação pela logística</small>
      </div>
      {dutyTeams.map((team) => (
        <div className="team-row" key={team.name}>
          <div className="team-top">
            <strong>{team.name}</strong>
            <StatusBadge status={team.full ? 'Lotado' : team.state} />
          </div>
          <span>{team.driver}</span>
          <span>{team.vehicle}</span>
          <small>{team.capacity}</small>
        </div>
      ))}
      <div className="blocked-list">
        <h3>
          <Icon name="alert" size={13} />
          Bloqueados para alocação
        </h3>
        <p>
          Pedro Almeida <span>CNH vencida em 05/08/2025</span>
        </p>
        <p>
          Carro 01 <span>Em manutenção • MNT0092</span>
        </p>
        <p>
          Van 01 <span>CRLV vencido em 30/08/2026</span>
        </p>
      </div>
      <div className="duty-note">
        <Icon name="info" size={13} />
        <span>
          Informações demonstrativas. Esta tela não faz alocação; disponibilidade operacional não é
          alterada pelas ações de triagem.
        </span>
      </div>
    </section>
  );
}

function ActionDialogView({
  kind,
  request,
  onClose,
  onConfirm,
}: {
  kind: ActionDialog;
  request: SvoDemoRequest;
  onClose: () => void;
  onConfirm: (detail?: string) => void;
}) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  if (!kind) return null;
  const required = kind === 'approve' ? request.analysis.trim() : value.trim();
  const label =
    kind === 'complement'
      ? 'Informação faltante'
      : kind === 'deny'
        ? 'Justificativa'
        : 'Análise do atendente';
  const heading =
    kind === 'complement'
      ? 'Solicitar complemento'
      : kind === 'deny'
        ? 'Confirmar negativa'
        : 'Confirmar aprovação';
  const error = touched && !required;
  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open>
      <DialogTitle>{heading}</DialogTitle>
      <DialogContent>
        {kind === 'approve' ? (
          <>
            <p>
              Aprovar {request.protocol}? Esta ação altera apenas o estado demonstrativo SVO. Nenhum
              transporte, ordem, rota ou equipe será alterado.
            </p>
            <TextField
              label={label}
              margin="dense"
              multiline
              minRows={3}
              fullWidth
              value={request.analysis}
              slotProps={{ input: { readOnly: true } }}
              error={!request.analysis.trim()}
              helperText={
                !request.analysis.trim()
                  ? 'Salve uma análise antes de aprovar.'
                  : 'Análise salva no estado local.'
              }
            />
          </>
        ) : (
          <TextField
            autoFocus
            label={`${label} *`}
            margin="dense"
            multiline
            minRows={3}
            fullWidth
            value={value}
            onBlur={() => setTouched(true)}
            onChange={(e) => setValue(e.target.value)}
            error={error}
            helperText={error ? 'Preenchimento obrigatório.' : 'Somente para a simulação local.'}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color={kind === 'deny' ? 'error' : 'primary'}
          disabled={!required}
          onClick={() => onConfirm(kind === 'approve' ? undefined : value.trim())}
        >
          {kind === 'complement'
            ? 'Enviar pedido'
            : kind === 'deny'
              ? 'Confirmar negativa'
              : 'Confirmar aprovação'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ActiveRoutes() {
  const rows = routes.map((route: RouteRecord) => ({
    route,
    stops: routeStops
      .filter((stop) => stop.route_id === route.id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence),
  }));
  const labelStatus = (route: RouteRecord) =>
    route.status === 'IN_PROGRESS' ? 'Em execução' : route.status;
  return (
    <section aria-labelledby="routes-title" className="surface routes-panel">
      <div className="section-heading routes-heading">
        <h2 id="routes-title">
          Rotas ativas • {routes.filter((r) => r.status === 'IN_PROGRESS').length} no sistema
        </h2>
        <span>Resumo informativo • sem gestão nesta tela</span>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label="Tabela de rotas; role para rolagem horizontal"
        tabIndex={0}
      >
        <table className="data-table routes-table">
          <thead>
            <tr>
              {[
                'Rota / transporte',
                'Motorista / veículo',
                'Setor',
                'Paradas',
                'Início',
                'Status',
                'Km inicial',
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ route, stops }) => (
              <tr key={route.id}>
                <td>
                  <strong className="route-id">{route.id}</strong>
                  <small>{stops.map((s) => s.transport_id).join(', ') || '—'}</small>
                </td>
                <td>
                  {route.driver_id}
                  <small>{route.vehicle_id}</small>
                </td>
                <td>{route.id === 'ROT-0090' ? 'Administrativo' : 'SVO'}</td>
                <td>
                  {stops.map((s) => `${s.stop_sequence}: ${s.transport_id}`).join(' • ') || '—'}
                </td>
                <td>{route.planned_start_at.slice(11, 16)}</td>
                <td>
                  <StatusBadge status={labelStatus(route)} />
                </td>
                <td>{route.start_mileage?.toLocaleString('pt-BR') ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="route-footnote">
        Rotas e paradas são registros mockados independentes. Aprovar ou negar triagens não altera
        esses dados.
      </div>
    </section>
  );
}

function Constraints() {
  return (
    <section className="constraints-section">
      <h2>Informações operacionais • áreas responsáveis</h2>
      <div className="constraint-grid">
        <article>
          <h3>Alocação</h3>
          <p>
            Equipes, veículos e rotas são exibidos como dados informativos e não são manipulados
            nesta tela.
          </p>
        </article>
        <article>
          <h3>Modelo de transporte</h3>
          <p>
            O status operacional do transporte é independente do estado demonstrativo de triagem
            SVO.
          </p>
        </article>
        <article>
          <h3>Protótipo frontend</h3>
          <p>Alterações das ações existem somente em memória durante a sessão atual.</p>
        </article>
      </div>
    </section>
  );
}

function formatDateTime() {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(),
  );
}

export function AtendimentoSvoPage() {
  const first = initialSvoRequests[0];
  if (!first) throw new Error('A fila demonstrativa precisa conter ao menos uma solicitação.');
  const [state, dispatch] = useReducer(reducer, {
    requests: initialSvoRequests,
    selectedId: first.id,
  });
  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [toast, setToast] = useState('');
  const selected = state.requests.find((r) => r.id === state.selectedId) ?? first;
  const pending = state.requests.filter((r) =>
    ['Em análise', 'Aguardando análise', 'Aguardando complemento'].includes(r.status),
  ).length;
  const approved = state.requests.filter((r) => r.status === 'Aprovada').length;
  function saveAnalysis(value: string) {
    const time = formatDateTime();
    dispatch({ type: 'save-analysis', id: selected.id, analysis: value, time });
    setToast('Análise salva no estado demonstrativo local.');
  }
  function confirmAction(detail?: string) {
    if (dialog === 'approve' && !selected.analysis.trim()) return;
    if (dialog === 'complement' && detail?.trim()) {
      dispatch({
        type: 'set-status',
        id: selected.id,
        status: 'Aguardando complemento',
        action: 'Complemento solicitado',
        detail: detail.trim(),
        time: formatDateTime(),
      });
      setToast('Complemento registrado na simulação local.');
    }
    if (dialog === 'deny' && detail?.trim()) {
      dispatch({
        type: 'set-status',
        id: selected.id,
        status: 'Negada',
        action: `Solicitação negada • ${detail.trim()}`,
        detail: detail.trim(),
        time: formatDateTime(),
      });
      setToast('Negativa registrada na simulação local.');
    }
    if (dialog === 'approve') {
      dispatch({
        type: 'set-status',
        id: selected.id,
        status: 'Aprovada',
        action: 'Solicitação aprovada',
        time: formatDateTime(),
      });
      setToast('Aprovação registrada. Nenhuma ordem ou rota foi criada.');
    }
    setDialog(null);
  }
  return (
    <div className="svo-app-shell">
      <Sidebar />
      <main className="svo-main">
        <PageHeader pendingCount={pending} approvedCount={approved} />
        <Queue
          requests={state.requests}
          selectedId={state.selectedId}
          onSelect={(id) => dispatch({ type: 'select', id })}
        />
        <div className="detail-grid">
          <RequestDetails key={selected.id} request={selected} onSaveAnalysis={saveAnalysis} />
          <DutyPanel />
        </div>
        <section aria-labelledby="actions-title" className="actions-section">
          <div className="actions-heading">
            <h2 id="actions-title">Ações da solicitação selecionada</h2>
            <span>Operações locais de demonstração • {selected.protocol}</span>
          </div>
          <div className="action-scope surface">
            <p>
              As ações são aplicadas ao registro selecionado. A triagem SVO é independente do status
              de transporte do modelo.
            </p>
            <Button
              variant="outlined"
              onClick={() => setDialog('complement')}
              disabled={['Aprovada', 'Negada', 'Em execução'].includes(selected.status)}
            >
              Solicitar complemento
            </Button>
            <Button
              variant="outlined"
              onClick={() => setDialog('deny')}
              disabled={['Aprovada', 'Negada', 'Em execução'].includes(selected.status)}
            >
              Negar solicitação
            </Button>
            <Button
              variant="contained"
              onClick={() => setDialog('approve')}
              disabled={
                ['Aprovada', 'Negada', 'Em execução'].includes(selected.status) ||
                !selected.analysis.trim()
              }
            >
              Aprovar solicitação
            </Button>
            {!selected.analysis.trim() && (
              <small>Para aprovar nesta simulação, salve primeiro uma análise.</small>
            )}
          </div>
        </section>
        <ActiveRoutes />
        <Constraints />
        <footer className="svo-footer">
          <span>Dados demonstrativos • Memória da sessão • Sem integração ou persistência</span>
          <span>FSPH • Frota administrativa • SVO</span>
        </footer>
        <ActionDialogView
          kind={dialog}
          request={selected}
          onClose={() => setDialog(null)}
          onConfirm={confirmAction}
        />
        <Snackbar
          autoHideDuration={4000}
          message={toast}
          onClose={() => setToast('')}
          open={Boolean(toast)}
        >
          <Alert severity="success" variant="filled" onClose={() => setToast('')}>
            {toast}
          </Alert>
        </Snackbar>
      </main>
    </div>
  );
}
