# Cartões de Combustível

Listagem, cadastro e edição de cartões, consulta de limite e saldo, vínculo e
desvinculação de veículos e alteração demonstrativa de status com confirmação.
A pesquisa permite filtrar por final do cartão, placa, status e setor, incluindo SVO.

Para executar em modo demonstrativo, abra o PowerShell na raiz do projeto:

```powershell
$env:VITE_APP_ENV = 'staging'
$env:VITE_FUEL_CARDS_DEMO = 'true'
pnpm.cmd dev
```

Acesse `http://localhost:5173/demonstracoes/cartoes-combustivel`. Reinicie o servidor se alterar a flag.
É necessária uma sessão JWT válida. O modo demonstrativo exige `VITE_APP_ENV=staging`
e a flag explícita, inclusive nos builds de homologação. Em produção, ou sem ambiente
definido, as rotas demonstrativas ficam indisponíveis e a flag é ignorada.
Nenhuma variável remota é alterada automaticamente.

Os cartões e veículos são fictícios. A frota SVO inclui três Chevrolet S10 com
identificadores demonstrativos, sem placas reais. Use apenas números fictícios.
As alterações ficam em memória e são perdidas ao recarregar a página ou sair do módulo.
O saldo inicial de um novo cartão é “Não informado”.

A integração com a API está pendente: nenhum dado é enviado ao servidor. Validações e
opções de status são provisórias e dependem de confirmação do backend. Sem o modo
demonstrativo habilitado, a tela informa que a integração está indisponível.
