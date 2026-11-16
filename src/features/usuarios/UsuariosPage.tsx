import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert, Button, MenuItem, TextField } from '@mui/material';
import { Link } from 'react-router-dom';

import { DashboardSidebar } from '../dashboard/components/DashboardSidebar';
import { accessProfiles, emptyUserValues } from './data/usuariosMock';
import type { UserFormValues } from './data/usuariosMock';
import '../dashboard/dashboard.css';
import './usuarios.css';

export function UsuariosPage() {
  const { register, handleSubmit, reset, setValue, control } = useForm<UserFormValues>({
    defaultValues: emptyUserValues,
  });
  const profile = useWatch({ control, name: 'profile' });
  const sector = useWatch({ control, name: 'sector' });
  const status = useWatch({ control, name: 'status' });
  const [showPassword, setShowPassword] = useState(false);
  const [savedUser, setSavedUser] = useState<Pick<UserFormValues, 'name' | 'email'> | null>(null);
  const [feedback, setFeedback] = useState('');

  function generatePassword() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    setValue('password', Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(''), {
      shouldDirty: true,
    });
    setFeedback('Senha temporária gerada.');
  }

  function saveUser(values: UserFormValues) {
    // Somente dados de apresentação: a senha não permanece na confirmação local.
    setSavedUser({ name: values.name, email: values.email });
    reset(emptyUserValues);
    setShowPassword(false);
    setFeedback('');
  }

  function cancel() {
    reset(emptyUserValues);
    setSavedUser(null);
    setShowPassword(false);
    setFeedback('Cadastro cancelado. Formulário limpo.');
  }

  return (
    <div className="dashboard-shell users-shell">
      <DashboardSidebar active="users" />
      <main className="users-main">
        <header className="users-header">
          <nav aria-label="Localização" className="users-breadcrumb">
            <Link to="/demonstracoes/dashboard">SVO</Link>
            <span>/</span>
            <span>Administrativo</span>
            <span>/</span>
            <span>Administrativo + SVO</span>
            <span>/</span>
            <strong>Usuários</strong>
          </nav>
          <div className="dashboard-user-bar">
            <div className="user-summary">
              <span className="user-summary-badge">AC</span>
              <span>
                <strong>Ana Coordenadora</strong>
                <small>Gestora / Administrativo + SVO</small>
              </span>
            </div>
            <span className="scope-badge">Âmbito: Administrativo + SVO</span>
          </div>
        </header>

        <form
          className="users-form"
          onSubmit={handleSubmit(saveUser)}
          onChange={() => {
            setSavedUser(null);
            setFeedback('');
          }}
        >
          <div className="users-panel">
            <section aria-labelledby="user-registration-title" className="users-registration">
              <h1 id="user-registration-title">Credenciamento do colaborador</h1>
              <div className="users-section-intro">
                <p>
                  Cadastro por e-mail institucional. Perfil e setor definidos pelo administrador.
                </p>
                <span className="users-admin-tag">Painel administrativo</span>
              </div>
              <div className="users-fields">
                <TextField
                  label="Nome completo"
                  placeholder="Ex: Paula Mendes"
                  {...register('name')}
                  fullWidth
                />
                <TextField
                  label="E-mail institucional"
                  placeholder="Ex: p.mendes@fsph.gov.br"
                  type="email"
                  {...register('email')}
                  fullWidth
                />
                <TextField
                  label="Perfil de acesso"
                  select
                  value={profile}
                  {...register('profile')}
                  fullWidth
                >
                  {['Administrador', 'Gestor', 'Atendente', 'Logística', 'Motorista'].map(
                    (item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ),
                  )}
                </TextField>
                <div className="users-password">
                  <TextField
                    label="Senha temporária"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                  />
                  <Button variant="outlined" type="button" onClick={generatePassword}>
                    Gerar senha
                  </Button>
                  <label className="users-password-toggle">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(event) => setShowPassword(event.target.checked)}
                    />
                    Mostrar senha
                  </label>
                </div>
              </div>
              <h2>Vínculo de Sistema</h2>
              <div className="users-section-intro">
                <p>
                  Defina o setor e o status da conta. As permissões correspondem ao perfil de acesso
                  selecionado.
                </p>
                <span className="users-restriction-tag">Restrição admin</span>
              </div>
              <div className="users-fields">
                <TextField label="Setor" select value={sector} {...register('sector')} fullWidth>
                  {['SVO', 'Administrativo', 'Administrativo + SVO'].map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Status da conta"
                  select
                  value={status}
                  {...register('status')}
                  fullWidth
                >
                  {['Ativa', 'Inativa'].map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
                {profile === 'Motorista' && (
                  <>
                    <TextField
                      label="CNH"
                      placeholder="Número da CNH"
                      {...register('license')}
                      fullWidth
                    />
                    <TextField
                      label="Validade da CNH"
                      type="date"
                      {...register('licenseExpiresAt')}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                    />
                  </>
                )}
              </div>
              <div className="users-permissions">
                <strong>Permissões</strong>
                <p>Acesso definido pelo perfil e setor.</p>
              </div>
              {feedback && (
                <Alert severity="info" role="status">
                  {feedback}
                </Alert>
              )}
              {savedUser && (
                <Alert severity="success" role="status">
                  Cadastro de {savedUser.name || savedUser.email || 'colaborador'} preparado nesta
                  sessão. A conta será criada após a integração com a API.
                </Alert>
              )}
            </section>

            <section aria-labelledby="user-profiles-title" className="users-profiles">
              <h2 id="user-profiles-title">Perfil e permissões</h2>
              <p>Destino pós-login e ações previstas por perfil</p>
              {accessProfiles.map((item) => (
                <article className={`users-profile-card ${item.tone}`} key={item.name}>
                  <div className="users-profile-heading">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <span className="users-destination">{item.destination}</span>
                  </div>
                  <ul>
                    {item.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          </div>
          <div className="users-actions">
            <Button variant="outlined" type="button" onClick={cancel}>
              Cancelar
            </Button>
            <Button variant="contained" type="submit" disableElevation>
              Criar usuário
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
