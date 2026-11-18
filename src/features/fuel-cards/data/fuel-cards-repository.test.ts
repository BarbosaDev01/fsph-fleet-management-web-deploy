import { isFuelCardsDemoEnabled } from './fuel-cards-repository';

afterEach(() => vi.unstubAllEnvs());

it.each([
  { environment: 'staging', flag: 'true', dev: false, enabled: true },
  { environment: 'staging', flag: 'false', dev: true, enabled: false },
  { environment: 'production', flag: 'true', dev: false, enabled: false },
  { environment: 'production', flag: 'true', dev: true, enabled: false },
  { environment: 'development', flag: 'true', dev: true, enabled: false },
  { environment: undefined, flag: 'true', dev: false, enabled: false },
])(
  'restringe dados demonstrativos ao staging explícito: %j',
  ({ environment, flag, dev, enabled }) => {
    vi.stubEnv('VITE_APP_ENV', environment);
    vi.stubEnv('VITE_FUEL_CARDS_DEMO', flag);
    vi.stubEnv('DEV', dev);
    expect(isFuelCardsDemoEnabled()).toBe(enabled);
  },
);
