# Lotação administrativa de usuários

Entrega local de 18/11/2026. Acesse **Administração → Usuários** (`/usuarios`) e
**Novo usuário** (`/usuarios/novo`); use **Editar** na linha da pessoa para transferir
sua lotação ou alterar seu perfil. Os campos **Perfil de acesso** e **Setor de lotação**
carregam os valores atuais na edição e aparecem separadamente na listagem. Salvar
um campo mantém o valor selecionado no outro. Recarregar a página consulta a API.

## Fontes e contratos preservados

- Frontend React/TypeScript: este repositório, worktree
  `C:/Users/barbo/fsph-fleet-management-web-integration`, base `e587776`.
- Backend **Spring Boot**, worktree Git próprio em
  `.deploy-validation/backend-perfis`, branch `feat/perfis-atribuicao-20261118`,
  base `97d9d92`, remoto `cardosojse/fsph-fleet-management`.
  Esta é a API compatível com os contratos `Transport/Route` e `TripRequest/Trip`
  usados pelo frontend. O checkout principal `../gestao-frotas` tem trabalho
  independente em andamento; não foi sobrescrito. O backend consolidado tem outros
  contratos e não foi usado como substituto.
- O pedido anexado é a referência para o DVP e as cinco unidades do Anexo A.
  Foram conferidos os requisitos operacionais versionados, as migrations V1–V25,
  controllers, serviços e DTOs da API compatível. O DVP/Anexo A integral não está
  disponível nesse checkout.
- `UsersPage` real fica em `src/features/registry/RegistryPages.tsx`.
  `src/features/users` e `src/features/registration` contêm protótipos;
  seus mocks não são o cadastro administrativo integrado.
- `usersApi`/`sectorsApi` em `src/features/registry/api.ts` usam o cliente JWT
  `openapi-fetch`. POST `/api/v1/users` e PUT `/api/v1/users/{id}` enviam `role`
  e `sectorId` distintos. O cadastro real **já enviava o perfil selecionado**;
  não foi encontrado envio fixo de “Gestor” nesse fluxo. Não há setor padrão no formulário.
- Os sete enums existentes foram preservados. `EMPLOYEE`, apresentado como
  **Colaborador**, corresponde ao solicitante institucional; `MOTORISTA`,
  apresentado como **Motorista**, corresponde ao motorista/operador.

## Regras, autorização e preservação dos dados

`User.sector` é `ManyToOne` e a migration V1 exige uma FK de setor não nula.
`CreateUserRequest` e `UpdateUserRequest` exigem `sectorId` e `role`;
`UserService` consulta a existência do setor antes de alterar a pessoa e executa
a atualização em transação. Setor inexistente devolve `404 / RESOURCE_NOT_FOUND`.
`FormDialog` e `ApiFeedback` preservam o detalhe e as violações retornados pela API.

A migration V5 atribui `USERS_READ/WRITE`, `SECTORS_READ/WRITE` e
`PERMISSIONS_READ/WRITE` ao ADMIN; os outros perfis recebem inicialmente
`SECTORS_READ`. As migrations seguintes acrescentam as permissões de cada domínio.
`RolePermissionService` mantém ADMIN com todas as permissões, independentemente do
setor. Os controllers de usuário continuam exigindo `USERS_READ` para consulta e
`USERS_WRITE` para alterações. Não se acrescentou uma regra baseada apenas no nome
do perfil: a matriz personalizada continua valendo. Para selecionar setores no
formulário também é necessário `SECTORS_READ`.

O administrador inicial usa `ADMIN_SECTOR_NAME` (padrão `Administrativo`).
`AdminInitializer` reutiliza setor administrativo equivalente e não modifica uma
conta que já exista. Alterar sua lotação não reduz seu alcance administrativo global.
A proteção existente contra remoção/rebaixamento do último ADMIN ativo permanece.

A migration **V25** completa somente unidades ausentes:

| Nome de referência            | Equivalências reconhecidas, sem diferenciar caixa, acentos ou espaços repetidos      |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Administrativo                | Administrativo, Administração, Setor Administrativo                                  |
| Superintendência Lacen        | Lacen, Superintendência Lacen, Superintendência do Lacen                             |
| Superintendência Hemose       | Hemose, Superintendência Hemose, Superintendência do Hemose                          |
| Superintendência SVO          | SVO, Superintendência SVO, Superintendência do SVO, Serviço de Verificação de Óbitos |
| Coordenação de Infraestrutura | Infraestrutura, Coordenação de Infraestrutura, Coordenação Infraestrutura            |

IDs e nomes existentes são mantidos; não há renomeação, fusão de setores, atualização
de contas nem criação de contas pessoais. Nomes diferentes dos aliases explícitos
continuam sujeitos à conferência administrativa. A migration não remove duplicatas
que já existam. Não foi feita inspeção nem alteração de cadastros em bancos remotos.

Embora o esquema atual proíba setor nulo, a resposta e a UI tratam defensivamente
contas legadas/importadas sem lotação: mostram **Lotação pendente**, sem escolher
Administrativo. Na edição o administrador precisa selecionar um setor válido.
O snapshot OpenAPI e os tipos gerados permitem `sectorId`/`sectorName` nulos na resposta;
os contratos de criação/atualização continuam exigindo setor.

Não existe endpoint de edição livre da própria conta nesta API. O recurso
`PATCH /users/me/password` recebe somente `currentPassword`/`newPassword`; não mapeia
perfil ou setor. PUT de usuário sem `USERS_WRITE` é recusado, inclusive para o próprio ID.
O teste verifica também a tentativa de injetar perfil/setor no endpoint de senha e
confere o cadastro depois. Não foi criada outra via de atualização.

A entidade User dessa base não possui histórico de alterações de perfil/lotação nem
um serviço de auditoria de usuários reutilizável. A aba demonstrativa “Auditoria”
não é uma trilha persistida da API. Os mecanismos existentes de segurança,
transação, proteção do ADMIN e registros operacionais foram preservados;
esta entrega não afirma implementar uma auditoria nova.

## Escopos e decisões da Fundação

- **Solicitantes:** `TripRequestService.listMine` filtra por ID do solicitante;
  a visibilidade de ID alheio depende de permissão global, não de compartilhar setor.
- **Gestor de frota:** `TRIP_REQUESTS_READ/MANAGE` mantém o escopo global existente.
  O DVP descrito no pedido não define quais unidades cada gestor supervisiona.
  A Fundação precisa confirmar eventual supervisão por unidades antes de restringir esse escopo.
- **Motorista:** mudar setor não altera o enum, as permissões, os veículos alocados
  ou o registro Driver. Conta de motorista e cadastro Driver são recursos distintos;
  veículo é alocado por viagem. Lotação SVO não concede análise de solicitações gerais.
  Nesta base, `/vehicles/me` devolve `503` porque `VehicleAssignmentQuery` não tem
  implementação configurada. O teste registra essa lacuna e comprova que o cadastro
  da frota, as rotas do motorista e o Driver permanecem iguais após a transferência
  (exceto o setor derivado do usuário). Não se afirma que a consulta de veículos
  vinculados esteja operacional.
- **Perfis SVO:** não foi encontrada regra operacional formalizada exigindo setor
  SVO para ATENDENTE_SVO, GESTOR_SVO ou EQUIPE_COLETA_SVO. O formulário recomenda SVO
  e permite outras lotações. A Fundação precisa decidir a obrigatoriedade e outras
  restrições perfil–setor antes de introduzir validação no backend.
- **Atendimento e coleta:** continuam perfis distintos. A API compatível não contém
  triagem da população nem ordens de coleta alocadas à equipe; esses fluxos não
  podem ser obtidos concedendo leitura global de TripRequests. `/atendimento-svo`
  nessa integração corresponde à análise/agendamento de viagens institucionais.
  Definição e implementação do atendimento especializado, escopo por equipe/plantão
  e coleta permanecem pendentes, como já registrado em `perfis-cadastro-acessos.md`.
- **População:** não é um perfil interno nem foi incluída no cadastro de funcionários.
  Não há endpoint público de solicitação de atendimento identificado nesta base;
  o protótipo não é um canal público integrado. Nenhum requisito novo de lotação
  foi imposto a um canal externo. A Fundação precisa identificar o canal externo
  e seu contrato para futura integração.

## Arquivos alterados

Frontend:

- `src/features/registry/RegistryPages.tsx`: campos, colunas, busca e pendência.
- `src/features/registry/UserAssignment.test.tsx`: edição independente, pendência e erros.
- `src/features/registry/registry.test.tsx`: seletores dos novos rótulos.
- `openapi/gestao-frotas.json`, `src/shared/api/generated/schema.d.ts`,
  `scripts/snapshot-api.mjs`: nulabilidade defensiva da lotação na resposta.
- `e2e/user-assignment-local.spec.ts`: cenários reais desta entrega.
- `e2e/profiles-local.spec.ts`, `e2e/staging-functional.spec.ts`: rótulos atualizados.
- `e2e/profiles-local.config.ts`, `scripts/test-profiles-local.ps1`: execução isolada,
  regressão SQL e suíte backend sem dependência de Docker.
- `README.md`, este documento, evidências em `docs/evidencias/lotacao/` e
  [patch transportável do backend](backend/lotacao-usuarios.patch).

Backend (todos os caminhos abaixo são relativos a `.deploy-validation/backend-perfis`):

- `src/main/resources/db/migration/V25__seed_institutional_sectors.sql`.
- `src/main/java/br/com/gestaofrota/infra/config/startup/AdminInitializer.java`.
- `src/main/java/br/com/gestaofrota/api/v1/dtos/responses/UserResponse.java`.
- `src/test/java/br/com/gestaofrota/infra/startup/AdminInitializerTests.java`.
- `src/test/java/br/com/gestaofrota/application/services/UserServiceTests.java`.
- `src/test/java/br/com/gestaofrota/api/v1/controllers/AdminCrudAuthorizationTests.java`.
- `src/test/java/br/com/gestaofrota/api/v1/dtos/responses/UserResponseTests.java`.
- `src/test/resources/db/sector-catalog-regression.sql`.
- `docs/lotacao-usuarios.md`.

O patch é exportado do diff desse repositório-fonte, incluindo arquivos novos,
pois o worktree backend está dentro de uma pasta ignorada pelo Git do frontend.
Em outra cópia compatível, confira a base e use `git apply --check` antes de aplicar.

## Repetir a validação

Requer Node 24, JDK 21, PostgreSQL 18 e as dependências já instaladas:

```powershell
pnpm test:e2e:profiles
# Com caminhos explícitos neste ambiente:
./scripts/test-profiles-local.ps1 -BackendPath .deploy-validation/backend-perfis `
  -JavaHome 'C:/Program Files/Java/jdk-21.0.12.1' `
  -PostgresBin 'C:/Program Files/PostgreSQL/18/bin' `
  -NodePath 'C:/Users/barbo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
pnpm test -- src/features/registry/registry.test.tsx src/features/registry/UserAssignment.test.tsx
pnpm build
pnpm lint
```

O runner cria cluster/banco novos em portas locais disponíveis, testa a migration
com aliases e vínculos preexistentes, executa os testes Maven sem Testcontainers,
inicia Spring Boot e Vite e executa os dois testes Playwright sem interceptações.
Encerra seus processos em `finally`. Nenhum banco externo nem deploy é alterado.
Os registros são fictícios e os arquivos de evidência não contêm senhas ou tokens.

Os resultados finais, IDs dos registros e a captura da listagem ficam em
`docs/evidencias/lotacao/`; os logs detalhados ficam na pasta ignorada
`.deploy-validation/perfis-local/`.

## Resultado observado

Execução final isolada: `run-b2f700a245b5446bb9335369ae9d9d54`.
Registros e IDs: [evidence.json](evidencias/lotacao/evidence.json).
Captura conferida visualmente: [listagem](evidencias/lotacao/listagem.png).
Contagens e limites: [validacao.json](evidencias/lotacao/validacao.json).

| Cenário                                                                 | Resultado                                                                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solicitante no Lacen e solicitante no Hemose cadastrados pela interface | POST/GET 201/200; setor e perfil corretos depois de recarregar                                                                                      |
| Motorista transferido do Lacen para Superintendência SVO                | PUT/GET 200; perfil MOTORISTA e permissões preservados; frota, Driver e rotas preservados, exceto setor do usuário; análise geral recusada com 403  |
| Alterar somente perfil no Hemose                                        | Gestor de frota salvo mantendo Hemose, depois restaurado para EMPLOYEE mantendo a mesma unidade                                                     |
| Setor removido depois de abrir o formulário                             | PUT 404; mensagem real da API exibida no diálogo; conta intacta                                                                                     |
| Alterar o próprio perfil/setor ou o de outra pessoa sem autorização     | PUT 403; GET administrativo confirma cadastro intacto                                                                                               |
| Injetar perfil/setor no endpoint da própria senha                       | PATCH 204 altera somente a senha; perfil/setor injetados não são mapeados e não mudam a conta                                                       |
| Dois solicitantes no mesmo setor Lacen                                  | Cada lista própria mostra apenas seu registro; ID do outro retorna 403; verificado também na interface                                              |
| Administrador inicial lotado em Administrativo                          | Continua com USERS_READ/WRITE, GET /users 200 e botão de cadastro habilitado                                                                        |
| Migration em PostgreSQL real                                            | Aliases sem duplicatas, execução idempotente, unidade ausente criada e vínculos existentes preservados; nenhuma atribuição ao vínculo nulo simulado |

- **Backend:** 126 testes aprovados e pacote Spring Boot gerado, incluindo os testes de autorização, serviços, bootstrap e DTO. Classes `*IntegrationTests` dependentes de Testcontainers não foram executadas; o percurso desta entrega foi verificado contra PostgreSQL e Spring Boot reais pelo runner.
- **Navegador com API real:** 2 cenários Playwright aprovados em 1,8 minuto, abrangendo sete perfis, matrizes personalizadas e os casos acima. Sem mocks e sem erros JavaScript de página.
- **Frontend:** 36 testes aprovados em cinco arquivos na reexecução focada; typecheck, lint, formatação e build aprovados. O build mantém o aviso de chunk acima de 500 kB já existente.
- **Limite da suíte ampla:** a primeira execução completa terminou com 204/214 testes aprovados. Houve nove falhas nas demonstrações de cartões (timeouts e falhas de interação) e um seletor antigo de usuário. O seletor foi atualizado e os cinco arquivos envolvidos, incluindo os quatro testes novos de lotação, passaram integralmente na reexecução (36 testes). A suíte completa não foi repetida depois disso; não se afirma uma execução única limpa dos 214 testes.
- **Revisão:** diff sem erros de whitespace e patch backend conferido com `git apply --reverse --check` contra as fontes alteradas. A consulta `/vehicles/me` continua retornando 503 por falta do provedor de vínculos; isso está registrado nas evidências, sem simular sucesso.

Os resultados acima correspondem à validação local, concluída antes de qualquer
publicação. A atualização de homologação autorizada posteriormente é registrada
em `docs/deploy-lotacao-20261119.md`.
