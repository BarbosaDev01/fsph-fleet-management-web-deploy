import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DashboardSidebar } from '../dashboard/components/DashboardSidebar';
import { solicitations } from './data/solicitacoesMock';
import type { RequestSector, SolicitationRow } from './data/solicitacoesMock';
import './solicitacoes.css';
import '../dashboard/dashboard.css';

type StatusFilter = 'Todos' | SolicitationRow['status'];

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4 4" />
    </svg>
  );
}

function FilterControl<T extends string>({
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
    <label className="sol-filter">
      <span className="visually-hidden">{label}</span>
      <select
        aria-label={label}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
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

function StatusPill({ status }: { status: SolicitationRow['status'] }) {
  const variants: Record<SolicitationRow['status'], string> = {
    'Em execução': 'execution',
    Aprovado: 'approved',
    'Em triagem': 'triage',
    Complemento: 'complement',
  };
  return (
    <span className={`sol-status ${variants[status]}`}>{status.toLocaleUpperCase('pt-BR')}</span>
  );
}

export function SolicitacoesPage() {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<RequestSector | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('Todos');
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return solicitations.filter((item) => {
      const matchesQuery =
        !term ||
        [item.protocol, item.origin, item.destination, item.driver].some((value) =>
          value.toLocaleLowerCase('pt-BR').includes(term),
        );
      return (
        matchesQuery &&
        (sector === 'all' || item.sector === sector) &&
        (status === 'Todos' || item.status === status)
      );
    });
  }, [query, sector, status]);

  return (
    <div className="solicitacoes-shell">
      <DashboardSidebar active="requests" />
      <main className="solicitacoes-main">
        <header className="solicitacoes-header">
          <h1>Solicitações</h1>
          <p>06/10/2026 • 14:20 • Gestora / Administrativo + SVO</p>
          <Link className="new-request-cta" to="/demonstracoes/solicitacoes/nova">
            <span aria-hidden="true" className="cta-progress">
              <i />
              <b>+</b>
              <i />
            </span>
            <strong>Nova solicitação</strong>
          </Link>
        </header>

        <div className="solicitacoes-breadcrumb">
          <span>Início</span>
          <span>/</span>
          <strong>Solicitações</strong>
          <span>/</span>
          <span>Lista</span>
        </div>
        <nav aria-label="Seções de solicitações" className="request-tabs">
          <span aria-current="page" className="request-tab active">
            Solicitações
          </span>
          <button
            className="request-tab unavailable"
            disabled
            title="Tela de Ordens ainda não disponível"
            type="button"
          >
            Ordens
          </button>
        </nav>

        <div className="request-toolbar">
          <label className="request-search">
            <SearchIcon />
            <span className="visually-hidden">Buscar solicitação</span>
            <input
              aria-label="Buscar solicitação"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por protocolo, origem, destino ou motorista..."
              value={query}
            />
          </label>
          <FilterControl
            label="Filtrar por setor"
            value={sector}
            onChange={setSector}
            options={[
              { value: 'all', label: 'Todos os setores' },
              { value: 'SVO', label: 'SVO' },
              { value: 'Administrativo', label: 'Administrativo' },
            ]}
          />
          <FilterControl
            label="Filtrar por status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'Todos', label: 'Status: Todos' },
              { value: 'Em execução', label: 'Em execução' },
              { value: 'Aprovado', label: 'Aprovado' },
              { value: 'Em triagem', label: 'Em triagem' },
              { value: 'Complemento', label: 'Complemento' },
            ]}
          />
        </div>

        <section aria-label="Lista de solicitações" className="requests-table-panel">
          <div
            className="requests-table-scroll"
            role="region"
            aria-label="Tabela de solicitações; role para rolagem horizontal"
            tabIndex={0}
          >
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Setor</th>
                  <th>Origem → Destino</th>
                  <th>Motorista / Veículo</th>
                  <th>Horário</th>
                  <th>Status</th>
                  <th>Ocupação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.map((item) => (
                    <tr key={item.protocol}>
                      <td className="request-protocol">{item.protocol}</td>
                      <td>{item.sector}</td>
                      <td>
                        {item.origin} → {item.destination}
                      </td>
                      <td>
                        {item.driver} / {item.vehicle}
                        {item.vehicleCode && (
                          <small className="vehicle-subline">{item.vehicleCode}</small>
                        )}
                      </td>
                      <td>{item.time}</td>
                      <td>
                        <StatusPill status={item.status} />
                      </td>
                      <td className="occupancy-cell">{item.occupancy}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-requests" colSpan={7}>
                      Nenhuma solicitação corresponde aos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="request-summary-grid">
          <section className="request-summary-card">
            <h2>SVO fila / status / protocolo / espera</h2>
            <p>3 aguardam análise / complemento</p>
            <p>1 SVO aguarda alocação</p>
            <p>2 em triagem + 1 complemento</p>
            <p>Espera estimada: 20 min</p>
          </section>
          <section className="request-summary-card">
            <h2>Administrativo aprovado pelo gestor</h2>
            <p>1 solicitação aprovada</p>
            <p>1 aguarda alocação</p>
            <p>1 em execução</p>
            <p>Gestora responsável: Ana Coordenadora</p>
          </section>
        </div>
      </main>
    </div>
  );
}
