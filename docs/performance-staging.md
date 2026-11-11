# Deploy e carregamento de homologação — 11/11/2026

## Escopo

Branch `perf/staging-deploy-login-20261111`, derivada de
`chore/preview-integracao-telas` (`8dd65c5`), em worktree novo. O repositório oficial
está disponível somente para leitura nesta conta. O PR de revisão usa a branch
de staging do fork `BarbosaDev01/fsph-fleet-management-web-deploy`, já utilizado
na publicação, para conter somente as mudanças desta tarefa. As branches e os
arquivos originais da equipe não foram alterados; não houve merge automático.

## Evidências e mudanças

O deploy anterior `dpl_3Y5TuXiBWznps7ksycMi2xUDvPiw` restaurou seu cache e levou
16,83 s de build até Ready. Os logs registram cerca de 14 s no comando de build,
3,37 s na instalação (970 ms dentro do pnpm), 1,04 s no Vite e aproximadamente
12 s para criar o cache depois de publicar. O cache tem cerca de 50,61 MiB.
O JavaScript inicial publicado era de 779,55 kB, ou 239,14 kB gzip.

Os logs confirmam pnpm 11.25.0, Node 24.x no deploy e cache funcional. Não foram
trocadas versões ou dependências. O projeto tem defaults diferentes na interface
da Vercel, mas `package.json` e `vercel.json` definem os valores efetivamente usados
no build; o default não foi confundido com a configuração do deploy.

- A instalação mantém a versão exata do pnpm e `--frozen-lockfile`, adicionando
  `--prefer-offline` para aproveitar os artefatos já presentes.
- O build usa `npm run build`, executando o mesmo `tsc -b && vite build`, sem
  inicializar o pnpm novamente via `npm exec`. A validação da URL HTTPS permanece.
- As telas internas são importadas por rota com `route.lazy`. Login, sessão,
  redirecionamento e autorização continuam nos mesmos componentes.
- Documentos, E2E, snapshots OpenAPI e scripts de geração não são enviados no
  upload CLI. As verificações de TypeScript continuam com todos os arquivos de
  configuração e testes que já faziam parte do build; a CI completa permanece.

Não há função serverless nesse frontend: o site é estático e servido pela CDN.
O despertar do backend Render deve ser medido separadamente do carregamento dos
assets e do build Vercel. A primeira visita a uma tela interna baixa seu chunk;
o teste de navegação e login valida esse caminho.

## Login de staging

Definir `VITE_APP_ENV=staging` exclusivamente no projeto isolado de homologação.
O formulário preenche apenas `demo@frota.test`, mantém a senha vazia e informa
que a equipe fornece a senha. Em builds sem a variável, `production` ou
`development`, o campo de e-mail começa vazio. A senha não faz parte do bundle,
de variáveis Vite ou do Git. O servidor exige o usuário, sua senha e os perfis
normais; esse preenchimento não concede acesso.

O backend correspondente exige `SPRING_PROFILES_ACTIVE=staging`,
`APP_ENVIRONMENT=staging`, `STAGING_DEMO_ENABLED=true` e um segredo
`STAGING_DEMO_PASSWORD`. O e-mail reservado também é rejeitado na autenticação
fora do staging autorizado, inclusive para JWTs previamente emitidos.

Não promover o frontend de demonstração antes de ativar e validar seu backend.
Um deploy Vercel com destino `production` e `--skip-domain`, neste projeto de
homologação, permite medir o build sem alterar o domínio público anterior.
O destino da Vercel é diferente do ambiente funcional: este projeto hospeda
staging; nenhum projeto de produção da equipe é usado.

## Validação reproduzível

Com Node 24 e pnpm 11.25.0:

```text
pnpm install --frozen-lockfile --prefer-offline
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

O cenário real `e2e/staging-demo.spec.ts` recebe `STAGING_API_URL` e
`STAGING_DEMO_PASSWORD` apenas no processo. Usar o build de homologação e uma
configuração Playwright com a URL do frontend a verificar. O teste envia o
formulário, acessa `/conta`, verifica e-mail/perfil, faz logout e confirma HTTP 401
com o JWT revogado. Não grava traces, vídeos ou screenshots desse cenário.
Sem credenciais, somente os testes de integração externa são ignorados.

Os benchmarks locais usam as mesmas dependências e Node 24, alternam antes/depois
e removem apenas o cache de TypeScript entre as amostras. Builds com cache de
typecheck não são comparados a builds sem esse cache. Seus resultados não são
tratados como duração de deploy remoto. Logs e credenciais locais ficam em
`.deploy-validation/`, ignorado pelo Git e pelo upload Vercel.

## Limites e riscos

O frontend publicado precisa que `CORS_ALLOWED_ORIGINS` inclua sua origem exata.
Um novo URL de preview não recebe autorização automaticamente. Não ampliar CORS
com wildcard nem desligar Deployment Protection para validar um preview.
O rollout do backend aguarda confirmação do workspace Render. A retenção do banco
anterior está documentada para **12/11/2026 às 16h, America/Fortaleza** e precisa
ser confirmada. O domínio público anterior permanece apontado ao deploy anterior
até a validação dos dois serviços.

## Referências verificadas

- [Gerenciadores de pacotes Vercel](https://vercel.com/docs/package-managers)
- [Configuração de build](https://vercel.com/docs/builds/configure-a-build)
- [React Router: carregamento de rotas](https://reactrouter.com/api/data-routers/createBrowserRouter#opts.patchroutesonnavigation)
