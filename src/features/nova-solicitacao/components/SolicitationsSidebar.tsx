import { Link } from 'react-router-dom';

type NavName =
  'dashboard' | 'requests' | 'routes' | 'vehicles' | 'drivers' | 'maintenance' | 'users' | 'logout';

function NavIcon({ name }: { name: NavName }) {
  const icons: Record<NavName, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    requests: (
      <>
        <path d="M3 7h12l3 4v7H3z" />
        <path d="M15 7v5h6M7 18a1.5 1.5 0 1 0 0 .01M16 18a1.5 1.5 0 1 0 0 .01" />
      </>
    ),
    routes: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" />
      </>
    ),
    vehicles: (
      <>
        <path d="M3 14v-3l2-5h12l3 5v6h-2" />
        <path d="M3 14h14M6 17h.01M15 17h.01" />
        <circle cx="6" cy="17" r="2" />
        <circle cx="15" cy="17" r="2" />
      </>
    ),
    drivers: (
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
    logout: (
      <>
        <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="nova-nav-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {icons[name]}
    </svg>
  );
}

const unavailableItems: Array<{ name: Exclude<NavName, 'requests' | 'logout'>; label: string }> = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'routes', label: 'Rotas' },
  { name: 'vehicles', label: 'Veículos' },
  { name: 'drivers', label: 'Condutores' },
  { name: 'maintenance', label: 'Manutenções' },
  { name: 'users', label: 'Usuários' },
];

export function SolicitationsSidebar() {
  return (
    <aside className="nova-sidebar">
      <Link aria-label="SVO, início" className="nova-brand" to="/">
        SVO
      </Link>
      <nav aria-label="Navegação principal" className="nova-side-nav">
        {unavailableItems.slice(0, 1).map((item) => (
          <span
            aria-disabled="true"
            className="nova-nav-item unavailable"
            key={item.name}
            title="Indisponível neste protótipo"
          >
            <NavIcon name={item.name} />
            <span>{item.label}</span>
          </span>
        ))}
        <Link aria-current="page" className="nova-nav-item active" to="/solicitacoes/nova">
          <NavIcon name="requests" />
          <span>Solicitações</span>
        </Link>
        {unavailableItems.slice(1).map((item) => (
          <span
            aria-disabled="true"
            className="nova-nav-item unavailable"
            key={item.name}
            title="Indisponível neste protótipo"
          >
            <NavIcon name={item.name} />
            <span>{item.label}</span>
          </span>
        ))}
      </nav>
      <section aria-label="Perfil demonstrativo" className="nova-profile">
        <div className="profile-identity">
          <span className="profile-avatar">AC</span>
          <strong>Ana Coordenadora</strong>
        </div>
        <p>
          Gestora
          <br />
          Administrativo + SVO
        </p>
        <span
          aria-disabled="true"
          className="profile-logout unavailable"
          title="Autenticação não implementada"
        >
          <NavIcon name="logout" />
          <span>Sair</span>
        </span>
      </section>
    </aside>
  );
}
