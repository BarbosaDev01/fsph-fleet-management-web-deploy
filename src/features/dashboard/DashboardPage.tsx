import { useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import { DashboardSidebar } from './components/DashboardSidebar';
import {
  consumptionByVehicle,
  dashboardAlerts,
  fleetIndicators,
  fleetRequests,
  fuelByVehicle,
  operationIndicators,
  requestsPerDay,
} from './data/dashboardMock';
import type { DashboardAlert, DashboardPeriod, DashboardSector } from './data/dashboardMock';
import './dashboard.css';

function MetricIcon({ name }: { name: string }) {
  if (name === 'grid')
    return (
      <svg viewBox="0 0 20 20">
        <rect x="2" y="3" width="7" height="6" rx="1" />
        <rect x="11" y="3" width="7" height="6" rx="1" />
        <rect x="2" y="11" width="7" height="6" rx="1" />
        <rect x="11" y="11" width="7" height="6" rx="1" />
      </svg>
    );
  if (name === 'route')
    return (
      <svg viewBox="0 0 20 20">
        <circle cx="5" cy="5" r="2" />
        <circle cx="15" cy="15" r="2" />
        <path d="M7 5h5a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h5" />
      </svg>
    );
  if (name === 'tool')
    return (
      <svg viewBox="0 0 20 20">
        <path d="M3 8h14l2 3v5H1v-5zM6 8l1-4h6l1 4M5 16v2m10-2v2M5 12h.01m10 0h.01" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20">
      <path d="M2 13v-3l2-5h11l3 5v5h-2M2 13h13M5 16h.01M14 16h.01" />
      <circle cx="5" cy="15" r="2" />
      <circle cx="14" cy="15" r="2" />
    </svg>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="dashboard-filter">
      <span className="visually-hidden">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="m4 6 4 4 4-4" />
      </svg>
    </label>
  );
}

function FleetTable({
  sector,
  period,
  onSectorChange,
  onPeriodChange,
}: {
  sector: DashboardSector | 'all';
  period: DashboardPeriod;
  onSectorChange: (value: DashboardSector | 'all') => void;
  onPeriodChange: (value: DashboardPeriod) => void;
}) {
  const filteredRequests = useMemo(
    () =>
      fleetRequests.filter((request) => {
        if (sector !== 'all' && request.sector !== sector) return false;
        if (period === 'today' && request.date !== '2026-10-06') return false;
        if (period === 'week' && request.date < '2026-09-30') return false;
        return true;
      }),
    [sector, period],
  );

  return (
    <section aria-labelledby="active-routes-heading" className="dashboard-panel routes-panel">
      <div className="panel-heading panel-heading-wrap">
        <div>
          <h2 id="active-routes-heading">Rotas ativas</h2>
          <p>Execução, ocupação e status atualizados</p>
        </div>
        <div className="table-filters">
          <FilterSelect
            label="Filtrar por setor"
            value={sector}
            onChange={onSectorChange}
            options={[
              { value: 'all', label: 'Todos os setores' },
              { value: 'SVO', label: 'SVO' },
              { value: 'Administrativo', label: 'Administrativo' },
            ]}
          />
          <FilterSelect
            label="Filtrar por período"
            value={period}
            onChange={onPeriodChange}
            options={[
              { value: 'today', label: 'Período: Hoje' },
              { value: 'week', label: 'Período: Últimos 7 dias' },
              { value: 'all', label: 'Período: Todo o período' },
            ]}
          />
        </div>
      </div>
      <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Setor</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Motorista</th>
              <th>Veículo</th>
              <th>Horário</th>
              <th>Status</th>
              <th>Ocupação</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length ? (
              filteredRequests.map((request) => (
                <tr key={request.protocol}>
                  <td className="protocol-cell">{request.protocol}</td>
                  <td>{request.sector}</td>
                  <td>{request.origin}</td>
                  <td>{request.destination}</td>
                  <td>{request.driver}</td>
                  <td>{request.vehicle}</td>
                  <td>{request.time}</td>
                  <td>
                    <span
                      className={`status-badge ${request.status === 'Em execução' ? 'in-progress' : 'completed'}`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td>{request.occupancy}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-table" colSpan={9}>
                  Nenhuma rota para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const [sector, setSector] = useState<DashboardSector | 'all'>('all');
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [selectedAlert, setSelectedAlert] = useState<DashboardAlert | null>(null);

  return (
    <div className="dashboard-shell">
      <DashboardSidebar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-breadcrumb">
            <span>SVO</span>
            <span>/</span>
            <span>Frota administrativa</span>
            <span>/</span>
            <strong>Dashboard</strong>
          </div>
          <h1>Visão geral da frota</h1>
          <p>
            Período: 30/09–06/10/2026 <span>•</span> Atualização: 06/10/2026 14:20
          </p>
          <div className="dashboard-user-bar">
            <div className="user-summary">
              <span className="user-summary-badge">AC</span>
              <span>
                <strong>Ana Coordenadora</strong>
                <small>Gestora / Administrativo + SVO</small>
              </span>
            </div>
            <span className="scope-badge">Âmbito: Administrativo + SVO</span>
            <button
              className="exit-button"
              disabled
              title="Autenticação não implementada"
              type="button"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="fleet-kpis">
          {fleetIndicators.map((indicator) => (
            <article className="fleet-kpi" key={indicator.label}>
              <div className="kpi-caption">
                <span className={`kpi-icon ${indicator.color}`}>
                  <MetricIcon name={indicator.icon} />
                </span>
                <span>{indicator.caption}</span>
              </div>
              <strong className="kpi-value">{indicator.value}</strong>
              <span className="kpi-label">{indicator.label}</span>
            </article>
          ))}
        </div>

        <div className="dashboard-overview-grid">
          <section aria-labelledby="triage-heading" className="dashboard-panel triage-panel">
            <div className="panel-heading">
              <h2 id="triage-heading">Triagem e alocação</h2>
              <span className="updated-label">Atualizado às 14:20</span>
            </div>
            <div className="triage-stats">
              {operationIndicators.map((item) => (
                <div className="triage-stat" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="requests-chart-heading"
            className="dashboard-panel request-chart-panel"
          >
            <div className="panel-heading">
              <h2 id="requests-chart-heading">Solicitações / dia</h2>
              <span>30/09–06/10</span>
            </div>
            <div
              aria-label="Solicitações diárias de 30 de setembro a 6 de outubro"
              className="request-chart"
              role="img"
            >
              {requestsPerDay.map((item) => (
                <div className="chart-column" key={item.day}>
                  <span
                    className={item.day === '05/10' ? 'chart-bar highlight' : 'chart-bar'}
                    style={{ height: `${Math.round((item.count / 20) * 100)}%` }}
                    title={`${item.count} solicitações`}
                  />
                  <small>{item.day}</small>
                </div>
              ))}
            </div>
            <p className="chart-note">Série histórica demonstrativa: 30/09–06/10/2026.</p>
          </section>

          <section aria-labelledby="fleet-status-heading" className="dashboard-panel status-panel">
            <h2 id="fleet-status-heading">
              Frota por status <span>• 10</span>
            </h2>
            {fleetIndicators.map((item) => (
              <div className="status-meter" key={item.label}>
                <span>
                  {item.label} · {item.value}
                </span>
                <div>
                  <i
                    className={item.color}
                    style={{ width: `${(Number(item.value) / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </section>
        </div>

        <FleetTable
          sector={sector}
          period={period}
          onSectorChange={setSector}
          onPeriodChange={setPeriod}
        />

        <div className="dashboard-bottom-grid">
          <section aria-labelledby="consumption-heading" className="dashboard-panel compact-panel">
            <div className="panel-heading">
              <h2 id="consumption-heading">Consumo / veículo</h2>
              <strong className="mini-unit">km/l</strong>
            </div>
            {consumptionByVehicle.map((item) => (
              <div className="vehicle-metric" key={item.vehicle}>
                <span>
                  <strong>{item.vehicle}</strong>
                  <small>{item.distance}</small>
                </span>
                <b>{item.consumption}</b>
              </div>
            ))}
          </section>
          <section aria-labelledby="fuel-heading" className="dashboard-panel compact-panel">
            <div className="panel-heading">
              <h2 id="fuel-heading">Abastecimento</h2>
              <strong className="mini-unit">R$ / L</strong>
            </div>
            {fuelByVehicle.map((item) => (
              <div className="vehicle-metric" key={item.vehicle}>
                <span>
                  <strong>{item.vehicle}</strong>
                  <small>{item.detail}</small>
                </span>
                <b>{item.amount}</b>
              </div>
            ))}
          </section>
          <section aria-labelledby="alerts-heading" className="dashboard-panel alerts-panel">
            <div className="panel-heading">
              <h2 id="alerts-heading">Alertas</h2>
              <button
                className="text-action"
                onClick={() => setSelectedAlert(dashboardAlerts[0]!)}
                type="button"
              >
                Abrir detalhes
              </button>
            </div>
            {dashboardAlerts.map((alert) => (
              <article className="alert-row" key={alert.title}>
                <span aria-hidden="true" className="alert-icon">
                  <svg viewBox="0 0 20 20">
                    <path d="M3 12V9l2-4h9l3 4v4h-2M3 12h11M6 15h.01M14 15h.01" />
                    <circle cx="6" cy="14" r="2" />
                    <circle cx="14" cy="14" r="2" />
                    <path d="M8 3h4" />
                  </svg>
                </span>
                <div>
                  <strong>{alert.title}</strong>
                  <small>{alert.description}</small>
                </div>
                <button
                  className="text-action"
                  onClick={() => setSelectedAlert(alert)}
                  type="button"
                >
                  Abrir
                </button>
              </article>
            ))}
          </section>
        </div>
        <footer className="dashboard-footer">
          <span>Dados demonstrativos • Sem integração com serviços</span>
          <span>FSPH / Frota administrativa</span>
        </footer>
      </main>

      <Dialog
        open={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Detalhe do alerta</DialogTitle>
        <DialogContent>
          <div className="alert-dialog-content">
            <strong>{selectedAlert?.title}</strong>
            <p>{selectedAlert?.description}</p>
            <span>Informação demonstrativa; nenhuma ação operacional foi realizada.</span>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAlert(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
