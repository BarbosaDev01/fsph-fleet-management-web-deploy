# Atualização da homologação — lotação administrativa

Atualização autorizada pelo usuário após a validação local do fluxo de lotação.
Os serviços existentes de homologação foram mantidos. O backend consolidado aberto
no IDE não foi publicado, pois seus contratos e seu histórico de migrations
divergem da API usada por este frontend.

## Fontes e destinos

| Recurso                           | Versão anterior                                          | Versão de lotação                                                                         |
| --------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Frontend `fsph-fleet-web-staging` | `e587776`, deployment `dpl_H6eWUtWA1uB5yRhavoqEBeFDj5Mi` | `2f4511b6d29ea1d92f5af48c577b7dbf928b6e6c`, deployment `dpl_D9iZZg6GzK3m2oc8ofhP6YrATfkK` |
| Backend `fsph-fleet-api-staging`  | `10dc153`, deployment `dep-dbv2krk9v7es738g4png`         | `71df10edc611d4127cfc92b9253fc1b37effb07f`, deployment `dep-dbv4c31srm7s73bcprn0`         |

- Frontend: `BarbosaDev01/fsph-fleet-management-web-deploy`, branch
  `feat/perfis-cadastro-acessos-20261118`; projeto Vercel
  `prj_1rYgCg3ttNkG1cyavfNNqExJ2XrY`, no time `barbosas-projects-5a2b240e`.
- Backend: `cardosojse/fsph-fleet-management`, branch publicada
  `perf/staging-deploy-login-20261111`; serviço Render
  `srv-dbn0cg0u01pc73fpooqg`, workspace `tea-dbkhptm7bikc73a946p0`.
- A alteração backend foi aplicada sobre o commit que já estava publicado,
  no worktree `.deploy-validation/backend-release-20261118`, preservando cache
  Maven, configuração de homologação e isolamento da conta demo.
- Pushes normais e restritos às branches acima; nenhum force push, merge em main,
  mudança de plano, CORS, credenciais, banco de destino ou criação de serviço.
- `.gitattributes` trata os patches de backend como dados de patch para não
  interpretar o espaço obrigatório das linhas de contexto como erro de whitespace.

## Publicação e banco

O build do frontend foi preparado no ambiente **Production do projeto de
homologação**, sem atribuição inicial de domínio. Framework Vite, Node 24.x,
pnpm 11.25.0 e origem da API `https://fsph-fleet-api-staging.onrender.com`
conferidos no artefato remoto. HTML e chunks protegidos foram lidos com a CLI
autenticada, sem desativar Deployment Protection.
Após a conferência do backend, esse mesmo build foi promovido, sem recompilação.
O alias público confirmou o deployment `dpl_D9iZZg6GzK3m2oc8ofhP6YrATfkK` com
status **READY**.

O conector Vercel retornou 403 para o time; a CLI local já autenticada acessou
o mesmo projeto e escopo. O Render foi atualizado pelo conector autenticado,
com deploy automático desativado e cache preservado.

O Render confirmou o commit pretendido e status **live**. Os logs Flyway
registraram schema na versão 24, aplicação de uma migration e schema na versão 25. A inicialização posterior reconfirmou versão 25 sem migration pendente.
Não houve `repair`, `clean`, reset, renomeação de setor ou reassociação de contas.

As restrições de domínio anteriores permanecem documentadas em
[lotacao-usuarios.md](lotacao-usuarios.md): supervisão de gestores, obrigatoriedade
de setor SVO, fluxos especializados/canal externo, auditoria e provedor de veículos.

## Validação

- **153 testes backend aprovados**, com pacote Spring Boot gerado a partir da
  versão que preserva os ajustes existentes de staging. Classes dependentes de
  Testcontainers não foram executadas nessa suíte.
- Validação funcional local anterior: 36 testes frontend, 2 cenários Playwright
  com PostgreSQL real e regressão SQL da V25, descritos no relatório da funcionalidade.
- Estado anterior da API registrado por leitura autenticada: 5 contas e 3 setores.
  A comparação utiliza hashes de contas e matriz de permissões, sem publicar
  nomes, e-mails, senhas ou JWTs.
- **Comparação após atualização aprovada:** as cinco contas, seus vínculos e a
  matriz de permissões permanecem idênticos aos registros anteriores. Os três
  setores anteriores mantiveram IDs e nomes; quatro unidades ausentes foram
  acrescentadas, totalizando sete setores. O ADMIN continua consultando e
  administrando usuários.
- **Navegador público aprovado, sem mocks:** login real; colunas distintas;
  cadastro com sete perfis e setores vindos da API; nenhum perfil/setor pré-marcado;
  seleção de SVO mantendo MOTORISTA; edição com os valores atuais; recarga da
  lista; logout e rejeição do token revogado. Os formulários foram cancelados,
  sem criar ou editar contas de homologação.
- **Regressão publicada aprovada:** indicadores do painel comparados com a API,
  listas de veículos/motoristas/usuários/setores/solicitações, contrato legado de
  atribuição de rotas, aviso de protótipos e encerramento de sessão.
- Nenhum erro JavaScript de página no percurso de lotação e nenhum log de erro
  de aplicação na janela pós-promoção consultada (`14:33:00Z`–`14:34:59Z`, UTC,
  em 19/11/2026).
- A primeira tentativa de comparação expirou durante o reinício a frio do Render.
  Os logs confirmaram a inicialização; a saúde retornou UP e a nova conferência
  passou. Não foi necessário novo deploy, alteração de configuração ou rollback.

Evidência resumida, sem credenciais ou dados pessoais de contas reais:
[deploy-20261119.json](evidencias/lotacao/deploy-20261119.json).

## Endereços

- Aplicação: <https://fsph-fleet-web-staging.vercel.app>
- Administração: <https://fsph-fleet-web-staging.vercel.app/usuarios>
- API: <https://fsph-fleet-api-staging.onrender.com>

Rollback de código, se necessário, não desfaz a V25. A migration é aditiva e
preserva a compatibilidade da versão anterior; não é necessário remover unidades
ou restaurar o banco para retornar ao código precedente.
