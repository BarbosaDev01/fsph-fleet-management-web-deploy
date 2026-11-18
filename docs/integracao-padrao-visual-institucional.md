# Integração do padrão visual institucional

Integração de 18/11/2026, America/Fortaleza, na branch `integration/colega-godev28-20261118`, para revisão contra a `main` de `BarbosaDev01/fsph-fleet-management-web-deploy`.

## Origem e escopo

A `main` do destino estava em `7294144a71c2f7b2bba9c425442c9099da0d394f`, somente com a infraestrutura inicial. O frontend integrado estava em `staging/integracao-frontend-consolidada`, em `2a593efc50399a427f701f7a352b22b961fb6603`, já proposto no PR #4. O usuário confirmou a inclusão dessa consolidação como dependência do novo PR para `main`.

O remoto do destino é `integration-fork`; `origin` continua apontando para o repositório oficial. A origem do colega foi adicionada como `colleague`, em `https://github.com/GoDev28/fsph-fleet-management-web.git`. A branch foi criada da `main` atualizada antes de incorporar a consolidação. O checkout inicial e seus arquivos locais foram preservados.

Antes de editar, foram examinados branches, histórico e diferenças. As entregas de motoristas/veículos, usuários, atendimento SVO e cartões já estavam no histórico consolidado. Havia duas alternativas visuais ainda pendentes:

| Branch de origem                   | Commit                                     | Escopo                                                                               |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `feat/padrao-visual-institucional` | `ae576ad843df650b848ce4fca8454e23c4fb62f9` | Componentes reais integrados à API e à sessão JWT; entrega selecionada pelo usuário. |
| `feat/redesign-institucional`      | `c1898ba51ec777f39d3ef8100133d531f9f735b4` | Versão anterior sobre telas demonstrativas; não incorporada.                         |

O commit selecionado, de **Guilherme Oliveira (GoDev28)**, parte de `9c0f8c6`, ancestral da consolidação. Foi incorporado por merge, preservando seu SHA e autoria. O merge `db21d41` não apresentou conflitos. Os commits anteriores da consolidação também foram preservados. A comparação do PR com `main` inclui toda essa dependência; a comparação com `2a593ef` permite revisar somente a entrega visual e sua validação.

## Implementação e referência existente

A referência é a implementação funcional de `src/app/AppLayout.tsx`, `src/features/auth/LoginPage.tsx`, `src/features/overview/OverviewPage.tsx` e dos componentes compartilhados `PageHeading` e `DataTable` na base consolidada.

- O tema MUI recebe tokens institucionais, fonte Inter hospedada no próprio bundle, cores de estado e estilos comuns de formulários e tabelas. As variáveis CSS `--fsph-*` continuam atendendo às telas existentes.
- O `AppLayout` agrupa os mesmos links por área, com ícones e indicação da rota ativa. Cada item continua filtrado por `useAccess().canVisit`; grupos sem itens permitidos desaparecem. A identificação do cabeçalho vem da sessão real.
- Login e 404 reutilizam `src/shared/layout/Institutional.tsx`, com cabeçalho, cartão de conteúdo e rodapé comuns.
- Início, painel, cabeçalhos e tabelas usam o tema e os componentes existentes. A densidade da tabela muda, mantendo a região de rolagem acessível por teclado.
- Os imports de ícones são específicos por arquivo. As únicas dependências novas são `@mui/icons-material` e `@fontsource-variable/inter`, já definidas no commit do colega e instaladas com lockfile congelado.

O cliente `openapi-fetch`, `authToken`, `authApi`, `useSession`, `useAccess`, `ModuleAccess`, rotas e tratamento `ApiFeedback`/Problem Detail permanecem os da consolidação. A entrega não cria outro cliente HTTP nem outro fluxo de autenticação. Não foi necessária adaptação funcional adicional ao commit do colega.

As alterações adicionais desta integração são testes, evidências e documentação. O runner de staging passa argumentos opcionais ao Playwright, permitindo selecionar o cenário desta tarefa sem executar o CRUD completo.

## Contratos e integração real

O OpenAPI publicado em `https://fsph-fleet-api-staging.onrender.com/v3/api-docs` foi consultado em 18/11 pelo cliente de requisições do Playwright. As tentativas anteriores por PowerShell e curl expiraram; a consulta posterior e o fluxo real no navegador funcionaram.

| Operação usada              | Conferência                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/login`   | Corpo `email`/`password`; resposta `accessToken`, `tokenType`, `expiresIn`. Login real retornou 200. |
| `GET /api/v1/auth/me`       | Identidade, papel e permissões da sessão. ADMIN real retornou 200.                                   |
| `POST /api/v1/auth/logout`  | Retornou 204; o mesmo JWT passou a receber 401 em `/auth/me`.                                        |
| `GET /api/v1/vehicles`      | Coleção com `active`; a quantidade exibida no painel foi comparada à resposta real.                  |
| `GET /api/v1/drivers`       | Campos usados na contagem: `active` e `userActive`. Operação presente no contrato publicado.         |
| `GET /api/v1/trip-requests` | Filtro `status` e estados usados pelo painel presentes no contrato publicado.                        |

O snapshot versionado normaliza `required`, `nullable` e enums referenciados; o OpenAPI Spring publicado descreve alguns desses metadados de outra forma. O servidor inclui ainda `inMaintenance` e `available` em veículos, que não são consumidos nesta alteração. Não foram encontrados nomes, tipos ou enums incompatíveis entre os campos consumidos. O snapshot e os tipos não foram regenerados por esta tarefa visual.

Nenhuma operação desta entrega depende de endpoint ausente. As limitações herdadas continuam explícitas: cartões sem persistência (cadastro, edição, vínculo/desvínculo e situação em memória), triagem específica SVO demonstrativa e recuperação de senha por e-mail indisponível. A tarefa não transforma esses controles em operações reais. O inventário mais amplo está em [Entrega da consolidação](entrega-unificacao-visual.md).

O teste real usa HTML/assets do build local sob a origem de frontend já autorizada, por meio do harness existente. O domínio da API não é interceptado nem recebe respostas simuladas. Não houve publicação de deployment, alteração de CORS, banco, credenciais ou serviços remotos. O cenário desta tarefa faz autenticação e leituras; **não executa CRUD nem comprova gravação de entidades nesta execução**. As credenciais são lidas de arquivo local ignorado, sem screenshots, vídeos ou traces de dados reais.

## Validação

- Instalação com `pnpm install --frozen-lockfile`, pnpm 11.25.0 e Node 24.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` e `git diff --check`.
- `pnpm test`: **197 aprovados em 30 arquivos**, na execução final com Node 24.22.3, em 226,19 s. A primeira execução teve 196 aprovados e um timeout de 5 s no fluxo multietapas de cartões SVO. Os três testes desse arquivo passaram isoladamente; depois, a suíte completa passou sem alteração das asserções ou dos limites de tempo.
- `pnpm test:e2e --workers=2`: **36 aprovados, 5 condicionais sem execução**, em 52,3 s. Os cinco são o cenário real novo, o CRUD real abrangente e três cenários externos legados dependentes de suas configurações. O cenário real desta tarefa foi executado separadamente.
- `pnpm test:e2e:staging <arquivo-local-de-acesso> --grep 'padrão institucional'`: **1 aprovado**, em aproximadamente 1,1 minuto. Login ADMIN, redirecionamento à tela solicitada, painel conferido com a API, menu e conta nos três tamanhos, sessão após recarga, logout e revogação JWT.

O teste novo de permissões usa um ADMIN com somente `VEHICLES_READ` e comprova que o menu mantém os links permitidos e omite itens/grupos sem concessão. O novo teste de navegador valida login, 404, nome longo no cabeçalho, ausência de overflow da página, fechamento do menu por link/Escape, rota ativa e acesso à conta em 390, 768 e 1440 px. A suíte existente continua cobrindo erros HTTP, validação, carregamento e listas vazias com fixtures.

## Evidências visuais

Estas imagens usam somente fixtures de interface; os nomes e registros não são dados institucionais reais. As nove capturas foram geradas pelo Playwright. A inspeção visual incluiu o login de 390 px e a tela de veículos de 768 e 1440 px, inclusive com nome longo no cabeçalho.

| Tela     | 390 px                                                             | 768 px                                                            | 1440 px                                                             |
| -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Login    | [Celular](evidencias/padrao-visual-institucional/login-390.png)    | [Tablet](evidencias/padrao-visual-institucional/login-768.png)    | [Desktop](evidencias/padrao-visual-institucional/login-1440.png)    |
| Veículos | [Celular](evidencias/padrao-visual-institucional/veiculos-390.png) | [Tablet](evidencias/padrao-visual-institucional/veiculos-768.png) | [Desktop](evidencias/padrao-visual-institucional/veiculos-1440.png) |
| 404      | [Celular](evidencias/padrao-visual-institucional/404-390.png)      | [Tablet](evidencias/padrao-visual-institucional/404-768.png)      | [Desktop](evidencias/padrao-visual-institucional/404-1440.png)      |

A [captura anterior de veículos em desktop](evidencias/unificacao-visual/veiculos-1440.png) permite comparar o layout da consolidação com o padrão novo.

## Como revisar pela interface

1. Use Node 24, execute `pnpm install --frozen-lockfile` e configure a URL da API no ambiente local conforme o README. Para staging, use a origem já autorizada ou o harness de teste existente; localhost não é uma origem CORS autorizada no staging.
2. Abra `/veiculos` sem sessão: o sistema deve encaminhar para `/login` no padrão institucional. Entre com uma conta autorizada e confirme o retorno a Veículos.
3. Navegue pelo menu para Painel da frota, Solicitações, Motoristas e os módulos concedidos à conta. Confira indicação da rota atual, tabelas e botões. Uma conta sem permissões administrativas deve omitir esses links.
4. Confira Minha conta e Sair no cabeçalho. Após sair, uma rota protegida deve exigir login novamente.
5. Repita a navegação em celular/tablet e abra um endereço inexistente para conferir a página 404 e seu retorno ao início.

O PR se destina à revisão humana. As configurações de ambiente/deploy são idênticas às da consolidação, incluindo `git.deploymentEnabled=false`; não houve merge final, deploy nem push nos repositórios oficiais ou do colega.
