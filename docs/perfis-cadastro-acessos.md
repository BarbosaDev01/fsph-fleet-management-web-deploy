# Cadastro de usuários e experiência por perfil

Entrega local de 18/11/2026. Frontend: `feat/perfis-cadastro-acessos-20261118`.

## Base preservada

O remoto `integration-fork` aponta para `BarbosaDev01/fsph-fleet-management-web-deploy`;
`origin`, para `cardosojse/fsph-fleet-management-web`; `colleague`, para `GoDev28/fsph-fleet-management-web`.
Após `git fetch integration-fork`, a branch inicial e
`integration-fork/integration/colega-godev28-20261118` eram idênticas em `ee62b80` (divergência 0/0).
A branch de trabalho parte desse commit. As telas incorporadas e os clientes Spring Boot foram mantidos.

A API local compatível vem de `fsph-fleet-management-integration`, branch
`chore/preview-integracao-telas`, base `2281d1f`. Ela contém os dois fluxos existentes:
`TripRequest` e `Transport/Route`. O outro checkout `fsph-fleet-management-backend-consolidated`
contém recursos SVO diferentes, mas não é substituto compatível dos contratos de transportes/rotas desta integração.

## Como usar

1. Entre como administrador e abra **Usuários → Novo usuário**. Também há um atalho destacado no início e acesso direto por `/usuarios/novo`.
2. Preencha nome, e-mail, senha (8 a 72 caracteres), setor e um dos sete perfis em português. Salve.
3. Confira o perfil na lista. Clique **Sair** e entre com o novo e-mail e senha. O logout explícito limpa o destino anterior; o próximo login abre o início da nova conta.
4. Confira o nome, perfil, atividades prioritárias e menu. Abra uma atividade permitida e tente uma rota sem autorização.

O POST continua sendo `/api/v1/users`, com `name`, `email`, `password`, `sectorId` e `role`.
Os valores persistidos são `ADMIN`, `EMPLOYEE`, `GESTOR_FROTA`, `MOTORISTA`, `ATENDENTE_SVO`,
`GESTOR_SVO` e `EQUIPE_COLETA_SVO`. O perfil determina a ordem e o texto da apresentação;
**as permissões efetivas de `/auth/me` determinam os links e botões**.

O cadastro exige `USERS_WRITE`, e a seleção de setor exige `SECTORS_READ`.
`USERS_READ` controla a lista, sem ser requisito adicional do POST. Uma conta com escrita e consulta de setores,
mas sem leitura de usuários, consegue cadastrar sem executar GET da lista. Sem consulta de setores,
a tela explica a dependência e bloqueia o formulário incompleto. Uma lista de setores vazia oferece acesso
ao cadastro de setores quando autorizado.

Criar uma conta `MOTORISTA` não cria automaticamente o registro `Driver`.
Para alocação, cadastre o motorista vinculado à conta e sua CNH conforme a API.
O veículo é escolhido em cada viagem/agendamento; não há veículo fixo no cadastro do condutor.

## Matriz e escopos efetivos

Fontes: migrations V5, V10, V13, V15, V17, V19 e V23; `RolePermissionService`,
controllers e serviços `TripRequest`, `Transport`, `Route`, `User` e `Sector` da API compatível.
O relatório de execução em `.deploy-validation/perfis-local/evidence.json` registra as permissões
retornadas pela sessão e o menu de cada conta. A tabela abaixo descreve a matriz padrão dessa base;
uma matriz personalizada continua prevalecendo.

| Perfil            | Início e ações disponíveis                                                                      | Escopo da API                                                                                  | Verificação local                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ADMIN             | Administração de usuários/acessos; cadastrar, consultar e administrar permissões                | Cadastros e frota globais; editar/cancelar TripRequest exige autoria mesmo para ADMIN          | Cadastro/login, menu e POST; restrição de autoria                  |
| EMPLOYEE          | Solicitar viagem e acompanhar solicitações; solicitar transportes                               | `/trip-requests/mine` e transportes próprios; ID alheio negado                                 | Cadastro/login, menu, listas próprias e bloqueios de rota/API      |
| GESTOR_FROTA      | Analisar solicitações, aprovar/rejeitar, selecionar veículo/condutor e planejar viagens         | TripRequests de todos os setores e frota global; execução exige concessão própria e atribuição | Cadastro/login, análise, aprovação/agendamento e execução restrita |
| MOTORISTA         | Minhas viagens; iniciar, concluir e registrar paradas conforme o estado                         | Rotas e paradas atribuídas ao usuário do condutor                                              | Cadastro/login, lista atribuída, execução e ID alheio restrito     |
| ATENDENTE_SVO     | Atendimento SVO; conta e consulta de setores; ausência de atividades habilitadas informada      | Setores institucionais; sem consulta de TripRequests por padrão                                | Cadastro/login, setores permitidos; rota geral e API negadas       |
| GESTOR_SVO        | Gestão SVO; conta e consulta de setores; ausência de atividades habilitadas informada           | Setores institucionais; sem consulta de TripRequests por padrão                                | Cadastro/login, setores permitidos; rota geral e API negadas       |
| EQUIPE_COLETA_SVO | Equipe de coleta SVO; conta e consulta de setores; ausência de atividades habilitadas informada | Setores institucionais; sem consulta de TripRequests por padrão                                | Cadastro/login, setores permitidos; rota geral e API negadas       |

`TRIP_REQUESTS_READ` autoriza leitura **global**, inclusive lista, consulta por ID e calendário;
não representa atendimento SVO nem limita os dados ao setor. A URL `/atendimento-svo` foi preservada
para compatibilidade, mas o menu e a página passam a se chamar **Análise e agendamento de viagens**.
A consulta continua exigindo READ; aprovação, rejeição, disponibilidade e agendamento exigem MANAGE.
Somente o solicitante com WRITE vê edição/cancelamento de uma solicitação pendente.
Em Solicitações, quem possui READ e WRITE pode alternar entre as próprias demandas e todos os setores.

`TRANSPORTS_READ` limita lista/ID ao solicitante; MANAGE permite acesso global.
`ROUTES_READ` limita lista, ID e paradas ao condutor autenticado; MANAGE permite consulta global.
EXECUTE permite execução somente das próprias viagens (ADMIN é exceção de escopo, mas ainda precisa da permissão).
Cancelar parada planejada exige MANAGE; em andamento, exige EXECUTE e atribuição.
O servidor mantém todas essas validações. TripRequests agendadas e Routes são recursos distintos
na API atual; esta entrega não inventa conversão automática entre eles.

## Ajuste pequeno no backend

Branch `feat/perfis-atribuicao-20261118`, commit `97d9d92`, em
`.deploy-validation/backend-perfis`. O DTO `RouteResponse` passa a informar `driverUserId`,
separado do ID do cadastro do motorista. Isso resolve a identificação da atribuição quando uma
conta personalizada tem MANAGE e EXECUTE, mas não pode consultar o cadastro de motoristas.
As regras e permissões dos endpoints não foram ampliadas. Há teste unitário do mapeamento e
asserção adicional no teste de integração existente.

O [patch do backend](backend/0001-fix-expoe-usuario-atribuido-nas-viagens-para-control.patch)
está versionado junto da entrega para revisão/aplicação em outro checkout. O snapshot OpenAPI
e os tipos do frontend incluem o campo como opcional para compatibilidade com APIs anteriores.
Sem esse campo, o front aproveita a consulta de motorista quando autorizada; sem dados suficientes,
oculta a execução na combinação de permissões ambígua, mantendo a autorização final no servidor.

## Repetir a validação real

Requer Windows, Node 24, dependências instaladas, PostgreSQL 18 e JDK 21. Os caminhos podem ser
ajustados pelos parâmetros do runner. O backend deve conter o commit acima; neste workspace já
existe no checkout indicado. Em outro checkout compatível, aplique o patch com `git am` numa branch de trabalho.

```powershell
pnpm test:e2e:profiles
# Para escolher os executáveis e o checkout:
./scripts/test-profiles-local.ps1 -BackendPath .deploy-validation/backend-perfis `
  -PostgresBin 'C:/Program Files/PostgreSQL/18/bin' `
  -JavaHome 'C:/Program Files/Java/jdk-21.0.12.1' -NodePath node
# Executável Node 24 utilizado neste workspace:
./scripts/test-profiles-local.ps1 -NodePath 'C:/Users/barbo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
```

O runner cria um cluster PostgreSQL novo em porta local disponível, compila o backend,
executa `RouteResponseTests`, inicia Spring Boot e Vite (`127.0.0.1:5183`) e roda
`e2e/profiles-local.spec.ts` **sem interceptação ou respostas simuladas**.
O administrador local é `admin.perfis@fsph.test`, senha exclusiva do teste `PerfisLocal-2026!`.
As outras contas são criadas pela interface; seus e-mails ficam em `accounts.json`, sem tokens.
Ao terminar, os processos desse runner são encerrados e os artefatos ficam em
`.deploy-validation/perfis-local/`. Nenhum banco ou deployment remoto é alterado.

O teste percorre administrador → cadastro → sete seleções de perfil → POST e GET persistido →
logout/revogação → login → início/menu → ação permitida → rota/API restrita, sempre na mesma aba.
Na troca de contas, o teste mantém a aplicação montada, sem recarregar a página, para verificar a limpeza do cache e dos menus. Também consulta setores e usuários por ID para conferir as autorizações desses recursos.
Também cria dados próprios, alheios e de outro setor; testa viagens atribuídas e paradas,
execução completa pelo motorista, aprovação/agendamento pelo gestor, restrição de autoria do ADMIN,
cadastro com WRITE sem READ, dependência de SECTORS_READ e a combinação MANAGE+EXECUTE sem DRIVERS_READ.
As matrizes temporárias do teste são restauradas em `finally`.

## Dúvidas de negócio registradas

- Quais operações de atendimento, triagem, gestão e coleta pertencem a cada perfil SVO?
  Não há requisito especializado vigente nem endpoints correspondentes na API compatível examinada.
  O protótipo visual não define uma regra de autorização.
- O SVO deve consultar registros próprios, da equipe, do plantão, do setor ou de toda a instituição?
  Conceder READ hoje libera todas as solicitações gerais; é necessário definir o escopo antes de criar um fluxo especializado.
- Contas com USERS_WRITE devem receber uma consulta mínima de setores automaticamente, ou a concessão
  conjunta de SECTORS_READ deve continuar explícita na matriz? Esta entrega preserva a regra existente.

As tarefas definidas continuam funcionando; nenhuma atribuição SVO foi presumida nem concedida.

## Evidências e limites da verificação

- **Execução real local:** o runner completo terminou com 1 cenário aprovado, contendo todos os passos dos sete perfis e das matrizes personalizadas. A execução final, incluindo troca de contas sem recarregar a aplicação, passou em aproximadamente 1,3 minuto. Spring Boot e PostgreSQL reais; nenhum mock de API nesse percurso. O processo de teste restaurou as matrizes temporárias e encerrou seus serviços.
- **Qualidade do frontend:** typecheck, lint, formatação, build e `git diff --check` aprovados. Uma suíte completa passou com 210 testes em 30 arquivos. A repetição junto dos demais testes teve 208 aprovações e dois timeouts (validação de setor em `App.test.tsx` e fluxo demonstrativo de cartões). A reexecução isolada desses dois arquivos passou com 31 testes, sem mudar asserções ou limites de tempo.
- **Regressão de navegador com fixtures:** 36 cenários aprovados e 6 condicionais ignorados. Os condicionais dependem de ambientes externos ou do runner local específico; este último foi executado separadamente. A regressão inclui o layout institucional em 390, 768 e 1440 px.
- **Backend:** build e `RouteResponseTests` aprovados. A nova asserção em `TransportRouteIntegrationTests` foi conferida no código e compilada; essa classe não foi executada, pois sua configuração exige Testcontainers e o Docker local está indisponível. A atribuição, as listas, os IDs e a execução foram exercitados pela API real no cenário local.
- **Conferência de código:** requisitos, migrations, permissões dos controllers e validações dos serviços. Não se afirma validação de produção, staging remoto nem de todas as operações de módulos fora do escopo alterado.
- [Permissões e menus observados](evidencias/perfis/evidence.json), [início ADMIN](evidencias/perfis/admin-inicio.png), [início EMPLOYEE](evidencias/perfis/employee-inicio.png), [início MOTORISTA](evidencias/perfis/motorista-inicio.png) e [início ATENDENTE_SVO](evidencias/perfis/atendente_svo-inicio.png). As capturas contêm somente contas fictícias criadas no banco local isolado.
