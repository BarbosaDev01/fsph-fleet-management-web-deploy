# Integração das três branches no fork de deploy

## Origem e isolamento

Somente o fork `BarbosaDev01/fsph-fleet-management-web-deploy` recebe os commits
da branch `staging/integracao-tres-branches-20261111`, baseada em
`perf/staging-deploy-login-20261111` (`17541e1`).

Foram feitos merges com histórico e autoria preservados das três branches de
`cardosojse/fsph-fleet-management-web`:

| Branch de origem                    | Commit integrado | Conteúdo                                                         |
| ----------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `feat/frontend-motoristas-veiculos` | `c9e6548`        | Listas e formulários de motoristas e veículos                    |
| `feat/novas-telas-usuarios`         | `5f49524`        | Login, cadastro, recuperação, usuários e dashboard               |
| `feature/tela-atendimento-svo`      | `83129bb`        | Dashboard SVO, atendimento, agendamento, solicitações e usuários |

O checkout é independente dos diretórios de trabalho anteriores. `origin` aponta
somente para o fork. `upstream` aponta para a equipe para fetch e tem push
bloqueado localmente (`pushurl=DISABLED`). Não há force push, reset, merge em
branches da equipe ou publicação de Java/migrations no repositório de frontend.

## Resolução dos conflitos

As branches sobrepõem a home, o router e duas implementações de dashboard.
Simplesmente escolher uma versão apagaria telas ou substituiria o login JWT por
uma simulação. A integração mantém ambos os dashboards e separa os protótipos dos
módulos reais:

- `/login`, `/conta`, `/veiculos`, `/motoristas` e os demais módulos existentes
  continuam usando a API real e a autorização do backend.
- `/demonstracoes` apresenta as novas telas, com aviso explícito de dados
  simulados e sem persistência de cadastros no banco.
- Todas as demonstrações exigem a sessão real pelo mesmo `AppLayout`. Fora de
  `VITE_APP_ENV=staging`, o layout de demonstração retorna página não encontrada.
- `/demonstracoes/frota/*` reúne listas e formulários de motoristas e veículos.
- `/demonstracoes/dashboard` mantém o dashboard SVO; `/demonstracoes/dashboard-usuarios`
  mantém o outro dashboard, cujo código foi preservado em `features/dashboard-usuarios`.
- As demais páginas ficam em `/demonstracoes/atendimento-svo`, `/solicitacoes`,
  `/solicitacoes/nova`, `/cadastro-usuarios`, `/diretorio`, `/login`, `/cadastro`,
  `/recuperar-senha` e `/alterar-senha`, sempre com o prefixo `/demonstracoes`.
- A saída do dashboard demonstrativo volta ao sistema real sem descartar um JWT
  localmente. O botão global Sair mantém a revogação no backend.

Os testes importados acompanham o novo namespace. Fixtures de sessão são usadas
somente nos testes locais das interfaces, não no código de autenticação. A suíte
real de staging não intercepta a API e verifica login, listagem real de veículos,
as 13 páginas demonstrativas, logout e revogação do JWT.

## Publicação e segurança

O projeto Vercel `fsph-fleet-web-staging` não tem conexão Git configurada. O alias
`fsph-fleet-web-staging.vercel.app` recebe promoção manual de um artefato pronto,
não um push automático para a `main` do fork. Antes desta atualização, o deploy
era `dpl_9xgbogRTSkMvKqtmK1WokAMTGqab`, código `21c65a7`.

Mantidos pnpm 11.25.0, lockfile congelado, typecheck, validação da URL HTTPS,
carregamento por rota e configuração Vercel de staging. O build usa
`VITE_APP_ENV=staging` e `VITE_API_URL=https://fsph-fleet-api-staging.onrender.com`.
Nenhuma senha é incluída no bundle ou no Git. O cache `.pnpm-store` trazido por
uma branch foi removido do estado final e excluído de Git/upload.

O backend permanece no repositório `cardosojse/fsph-fleet-management`, serviço
Render `srv-dbn0cg0u01pc73fpooqg`, branch `perf/staging-deploy-login-20261111`,
commit publicado `c804cb1`, deploy `dep-dbqb3v6c6qcc73fqvjbg`. Não houve alteração
de configuração, segredos, CORS, migrations ou dados do Neon nesta integração.
O domínio de frontend continua o mesmo autorizado pelo CORS existente.

## Validação e limites

Executar com Node 24 e pnpm 11.25.0:

```text
pnpm install --frozen-lockfile --prefer-offline
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
pnpm exec playwright test --workers=2
```

O Vitest foi limitado a um worker: a primeira execução abriu vinte workers no
Windows e causou concorrência de recursos e timeouts. O cenário de usuários que
percorre seis telas recebeu os mesmos 15 segundos já usados pelos testes de
cadastro da frota; as asserções e os testes de autenticação não foram relaxados.

As novas telas continuam demonstrativas onde as branches de origem usam mocks;
esta integração não implementa APIs inexistentes nem apresenta simulações como
cadastros persistidos. O cold start do Render Free continua possível e não é
resolvido por este merge. Nenhum plano pago foi contratado.

Rollback do frontend: promover novamente `dpl_9xgbogRTSkMvKqtmK1WokAMTGqab` no
mesmo projeto Vercel, sem reverter banco, migrations ou branches da equipe.
