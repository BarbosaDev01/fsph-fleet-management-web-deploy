# Consolidação do frontend — 16/11/2026

**Destino:** `BarbosaDev01/fsph-fleet-management-web-deploy`.
**Branch:** `staging/integracao-frontend-consolidada`.
**Classificação:** **Não apta para merge definitivo contra a API principal**, por divergência
preexistente nos contratos de transportes/viagens e ausência de validação autenticada real
nesta execução. A consolidação visual e das branches está preparada para revisão no fork.

## Histórico e autoria

| Referência verificada                            | SHA completa                               | Resultado                                      |
| ------------------------------------------------ | ------------------------------------------ | ---------------------------------------------- |
| Fork `main`                                      | `7294144a71c2f7b2bba9c425442c9099da0d394f` | Destino do PR; preservada                      |
| Fork `staging/integracao-tres-branches-20261111` | `a4699624421686f1b85526d17c09ff88251aebb8` | Base exata da nova branch                      |
| Origem `feat/frontend-motoristas-veiculos`       | `c9e65481040baf5102540d3a3f54c524f65cc9ee` | Já ancestral da base; sem commits pendentes    |
| Origem `feat/novas-telas-usuarios`               | `5f4952420fe63b41831003cd190d45b9af468f8c` | Já ancestral da base; sem commits pendentes    |
| Origem `feature/tela-atendimento-svo`            | `83129bb8769304e45d660bbbe7b0d0fb716597fc` | Já ancestral da base; sem commits pendentes    |
| Origem `feat/cartoes-combustiveltela`            | `c670688e1d61b2ae43296bd4de38e10ec8f3e22c` | Um commit pendente; incorporado por merge real |
| Backend oficial `main`                           | `411793f64406a9eb21f0bf8b16e2de62634294db` | Inspeção somente de leitura                    |

As referências foram obtidas por `git ls-remote` e fetch seletivo. Não foram incorporadas
branches do Dependabot nem novas branches de deploy. Os três merges anteriores não foram
repetidos. O merge dos cartões preserva seu commit original, autoria e a ancestralidade da base.

O checkout inicial `fsph-fleet-management-web-integration`, na branch
`chore/preview-integracao-telas`, foi preservado. O trabalho ocorreu no worktree isolado
`C:/Users/barbo/fsph-fleet-management-web-consolidated`.

## Conflito e funcionalidades preservadas

Houve um único conflito Git, em `src/app/router.tsx`: a branch de cartões partia de uma
versão anterior, sem os layouts de autenticação e demonstração da integração. A resolução
manteve os imports e todas as rotas existentes e inseriu os cartões sob o mesmo layout
autenticado e a guarda de staging. Não foi selecionada uma versão inteira do roteador.

Foram preservados login JWT, sessão, minha conta, alteração de senha, revogação no logout,
cadastros de setores/usuários/veículos/motoristas, documentos de veículos, CNHs, perfis,
permissões e os módulos de transportes/viagens da base. Também permanecem os dois dashboards,
SVO, agendamento, solicitações, diretório, recuperação de senha e formulários demonstrativos
das três branches anteriores.

Cartões incluem listagem, pesquisa, filtros por status/setor, cadastro, edição, detalhes,
vínculo/desvínculo de veículos, confirmação de mudança de status, estados de erro/carregamento/
vazio, números mascarados e visualização responsiva. Os exemplos SVO e as operações em memória
foram preservados, sem requisições a endpoints de cartões.

## Rotas finais

| Grupo                                          | Caminhos                                                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação real                              | `/login`                                                                                                                                                                   |
| Sistema autenticado                            | `/`, `/conta`, `/setores`, `/usuarios`, `/veiculos`, `/motoristas`, `/permissoes`                                                                                          |
| Documentos reais                               | `/veiculos/:id/documentos`, `/motoristas/:id/cnhs`                                                                                                                         |
| Módulos preservados com contrato de integração | `/transportes`, `/transportes/:id`, `/viagens`, `/viagens/:id`                                                                                                             |
| Catálogo de demonstrações                      | `/demonstracoes`                                                                                                                                                           |
| Frota demonstrativa                            | `/demonstracoes/frota` → `/demonstracoes/frota/motoristas`, `/demonstracoes/frota/motoristas/novo`, `/demonstracoes/frota/veiculos`, `/demonstracoes/frota/veiculos/novo`  |
| Dashboards demonstrativos                      | `/demonstracoes/dashboard`, `/demonstracoes/dashboard-usuarios`                                                                                                            |
| SVO e solicitações demonstrativas              | `/demonstracoes/atendimento-svo`, `/demonstracoes/solicitacoes`, `/demonstracoes/solicitacoes/nova`, `/demonstracoes/cadastro-usuarios`                                    |
| Interfaces institucionais demonstrativas       | `/demonstracoes/diretorio`, `/demonstracoes/login`, `/demonstracoes/cadastro`, `/demonstracoes/recuperar-senha`, `/demonstracoes/alterar-senha`                            |
| Cartões demonstrativos                         | `/demonstracoes/cartoes-combustivel`, `/demonstracoes/cartoes-combustivel/novo`, `/demonstracoes/cartoes-combustivel/:id`, `/demonstracoes/cartoes-combustivel/:id/editar` |
| Alias interno de cartões                       | `/demonstracoes/cartoes-combustivel/inicio` → listagem, com `replace`                                                                                                      |
| Rota desconhecida                              | `*` → página não encontrada                                                                                                                                                |

O antigo endereço `/cartoes-combustivel` não se torna um módulo real: retorna página não
encontrada. A única autenticação real é `/login`; a tela de login dentro de demonstrações é
um protótipo identificado e protegido pela sessão real.

As demonstrações exigem JWT validado pelo `AppLayout` e `VITE_APP_ENV=staging`. Cartões exigem
também `VITE_FUEL_CARDS_DEMO=true`. A ausência da flag mantém o estado de integração indisponível.
`import.meta.env.DEV` não controla mais esse recurso: builds de staging podem apresentá-lo,
enquanto produção e ambiente ausente continuam bloqueados mesmo com a flag ligada.
`.env.example` documenta o opt-in; nenhuma variável remota foi alterada.

O rewrite de todas as rotas para `index.html` no `vercel.json` foi preservado, assim como
`git.deploymentEnabled=false`. A abertura direta e recarga das rotas foram exercitadas no
preview local do artefato compilado; não houve publicação na Vercel.

## API e modelagem

O código oficial confirma:

- `POST /api/v1/auth/login`, `GET /api/v1/auth/me` e `POST /api/v1/auth/logout` são compatíveis
  com o cliente preservado. O logout recebe o bearer token e retorna 204 após revogação.
- `CreateDriverRequest` recebe `userId`; `Driver` possui relação obrigatória com `User`.
  O cadastro real continua selecionando o usuário motorista. Não foi criada relação permanente
  entre motorista e veículo.
- `CreateVehicleRequest` recebe `sectorId` opcional, placa, modelo, capacidade, tipo de uso e
  odômetro. O formulário real preserva esse contrato e permite veículo sem setor.
- Os controllers de usuários, setores, documentos e CNHs correspondem aos caminhos usados
  pelo cadastro real. A autorização permanece no backend; respostas 401/403 e demais erros
  continuam passando pelo cliente e feedback existentes.
- A `main` oficial define `/api/v1/trip-requests` e `/api/v1/trips`. Solicitações possuem
  criação, análise de disponibilidade, aprovação, rejeição, cancelamento e agendamento;
  viagens possuem início, conclusão e histórico. Não são equivalentes, por simples renomeação,
  a `Transport` e `Route`.
- A base frontend usa `/api/v1/transports` e `/api/v1/routes`, descritos pelo snapshot de
  integração já existente. Esses controllers não existem na `main` oficial inspecionada.
  Os módulos foram preservados para não quebrar o staging anterior; sua compatibilidade
  com a API principal **não está comprovada**. Nenhum formulário novo foi conectado a eles.
- Existem abastecimentos (`Fueling`) e postos (`PrimeFuelStation`), mas nenhum controller,
  DTO ou entidade de cartões de combustível no backend inspecionado. Não foi inventado
  endpoint ou DTO de cartões, nem anunciada persistência real.

Fontes verificadas no backend: `api/v1/controllers/{Auth,Driver,Vehicle,Trip,TripRequest}Controller.java`,
`api/v1/dtos/requests/{CreateDriver,CreateVehicle,CreateUser}Request.java` e `domain/models/Driver.java`,
no SHA acima. O snapshot OpenAPI do frontend não foi regenerado a partir de uma API diferente.

Uma tentativa de leitura de `https://fsph-fleet-api-staging.onrender.com/v3/api-docs` expirou
após 40 segundos. Nenhuma senha ou configuração de testes reais estava disponível neste
worktree/ambiente. Não foi consultado nem modificado o banco, Render, Neon ou secrets.

## Padronização visual e navegação

O tema MUI existente fornece agora tokens CSS compartilhados para cor institucional,
menu lateral, texto, bordas, fundo e fonte. Os estilos SVO, solicitações e dashboards
reutilizam esses tokens; as cores de estado específicas foram preservadas.

O CSS do menu do dashboard SVO foi limitado aos seus contêineres. Isso evita que regras
globais de `.dashboard-sidebar` contaminem o dashboard de usuários depois de navegar
entre módulos. Os cartões compõem o cabeçalho institucional existente, sem repetir outro
cabeçalho de marca, e reutilizam cores do tema nos estados e formulários.

O catálogo inclui os cartões e mantém todas as telas anteriores. Os menus SVO, dashboard
e nova solicitação passam a abrir os veículos e motoristas já integrados. O menu de
solicitações retorna à listagem. O dashboard de usuários abre módulos disponíveis; os
itens que continuam sem tela preservam seu feedback explícito de indisponibilidade.

Os links Mermaid e Figma fornecidos não puderam ser lidos pela ferramenta web nesta
execução. A modelagem foi conferida diretamente no código oficial e o tema existente
foi usado como referência visual.

## Validação

Ambiente: Node **24.22.3**, pnpm **11.25.0**, lockfile sem alteração.
O Node inicial do host era 22.19.0; Node 24 foi usado localmente via `npm exec --package=node@24`.

| Comando solicitado               | Resultado final                             |
| -------------------------------- | ------------------------------------------- |
| `pnpm install --frozen-lockfile` | Aprovado com Node 24                        |
| `pnpm format:check`              | Aprovado                                    |
| `pnpm lint`                      | Aprovado; zero avisos                       |
| `pnpm typecheck`                 | Aprovado                                    |
| `pnpm test`                      | Aprovado: 176 testes em 27 arquivos         |
| `pnpm build`                     | Aprovado                                    |
| `pnpm test:e2e --workers=2`      | 33 aprovados; 3 cenários reais sem execução |

Os testes de interface usam sessão/respostas interceptadas explicitamente. Eles verificam
JWT no cliente, redirecionamento, 401/403, validações, atualização de listas, logout no
cliente, formulários de frota, solicitações, navegação e cartões. Não comprovam operação
contra a API remota. Os três cenários reais existentes permanecem condicionados às suas
configurações e credenciais e não foram substituídos por mocks.

A suíte E2E compila staging e produção em diretórios e portas distintos e recusa reutilizar
um servidor anterior. Produção é testada com a flag de cartões propositalmente ligada,
para provar que o ambiente bloqueia as demonstrações. O catálogo completo é percorrido
por links, na mesma sessão, em 1440 e 390 px, verificando erros JavaScript e overflow após
o carregamento; os testes da frota e cartões também cobrem tablet.

Os testes importados foram adaptados ao prefixo e à autenticação e aguardam as rotas lazy.
O fluxo unitário longo de cartões recebeu 15 segundos, em vez de 5, para comportar a sessão,
as transições lazy e as múltiplas operações; todas as asserções foram mantidas. Builds E2E
gerados são excluídos do ESLint, como já ocorria com `dist`; fontes continuam verificadas.

A execução unitária final levou 180,45 s; a execução E2E final, 42,5 s. O build de produção
com a flag ligada não contém o chunk do repositório demonstrativo de cartões nem os seus
identificadores de exemplo. As capturas abaixo usam somente fixtures, sem sessão ou dados reais.

| Tela                  | Desktop (1440 px)                                                                  | Celular (390 px)                                                                  |
| --------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Dashboard SVO         | [Captura](evidencias/integracao-frontend-consolidada/dashboard-1440.png)           | [Captura](evidencias/integracao-frontend-consolidada/dashboard-390.png)           |
| Dashboard de usuários | [Captura](evidencias/integracao-frontend-consolidada/dashboard-usuarios-1440.png)  | [Captura](evidencias/integracao-frontend-consolidada/dashboard-usuarios-390.png)  |
| Atendimento SVO       | [Captura](evidencias/integracao-frontend-consolidada/atendimento-svo-1440.png)     | [Captura](evidencias/integracao-frontend-consolidada/atendimento-svo-390.png)     |
| Cartões               | [Captura](evidencias/integracao-frontend-consolidada/cartoes-combustivel-1440.png) | [Captura](evidencias/integracao-frontend-consolidada/cartoes-combustivel-390.png) |

## Pendências para aprovação definitiva

1. Validar a API de destino e resolver explicitamente a divergência `Transport`/`Route`
   versus `TripRequest`/`Trip`, preservando os fluxos de negócio e as permissões reais.
2. Executar os cenários autenticados sem interceptação contra uma API isolada confirmada,
   incluindo login/logout/revogação e os módulos reais. Nesta execução não há comprovação
   desses fluxos remotos.
3. Conectar os protótipos somente após confirmar DTOs, disponibilidade, capacidade,
   manutenção e regras de agendamento. Cartões continuam demonstrativos por falta de contrato.

## Publicação para revisão

Somente a nova branch do fork foi publicada, sem force push. O PR aponta para a `main`
do próprio fork e permanece em rascunho por causa das pendências acima. Não há merge final,
deploy ou alteração de branches de deploy, backend, banco, produção ou fontes oficiais.

- [Branch consolidada](https://github.com/BarbosaDev01/fsph-fleet-management-web-deploy/tree/staging/integracao-frontend-consolidada)
- [Pull Request #4 em rascunho](https://github.com/BarbosaDev01/fsph-fleet-management-web-deploy/pull/4)

Merge de código validado: `439cb1ac9db0eb28de874ea863810c3e5c0b2400`, com pais
`a4699624421686f1b85526d17c09ff88251aebb8` e `c670688e1d61b2ae43296bd4de38e10ec8f3e22c`.
