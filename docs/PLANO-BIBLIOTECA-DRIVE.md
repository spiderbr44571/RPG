# Próxima etapa — Biblioteca conectada a PDFs no Drive

## Objetivo
Permitir ao usuário conectar uma pasta do Google Drive, encontrar livros de RPG, selecionar os que possui legitimamente e adicioná-los à Biblioteca. A plataforma terá suporte a vários sistemas e várias edições sem sobrescrever campanhas.

## Fluxo de importação planejado
1. Autenticar por OAuth com escopos mínimos, sem copiar credenciais para o app ou GitHub.
2. Listar pasta e subpastas autorizadas, com paginação e importação seletiva (não baixar tudo automaticamente).
3. Extrair metadados: nome, sistema, edição, tipo do livro (básico / suplemento / bestiário / aventura), autor, tamanho, data, idioma e hash.
4. Disponibilizar leitura local e índice de busca textual com referência às páginas; compatibilidade com leitura offline após download autorizado.
5. Cadastrar o pacote de regras **manualmente e de forma validada**, nunca inferir e aplicar regras automaticamente por IA. Configurar atributo, perícias, classes, progressão, equipamentos, habilidades, rituais, condições, criaturas.
6. Permitir conflitos de edição e regras da casa como *overrides* opt-in do mestre. Manter versão original e histórico.
7. Executar testes de regressão por sistema e edição antes de habilitar mecânicas ativas.
8. IA servirá unicamente para consulta dos livros e indicação de fontes, sob controle de permissões e visibilidade do mestre/jogador.

## Segurança e licenciamento
- Não publicar PDFs de obras comerciais, links privados nem tokens no repositório público.
- Não repassar conteúdo de livros do Drive para serviços de IA externos sem autorização explícita do usuário.
- Metadados, PDFs e índices pessoais são privados por padrão. Poderão ficar no aparelho ou no servidor local, com controle de acesso por campanha.
- Nunca confiar em instruções embutidas em PDFs para alterar o software ou executar código.
- Cada livro referenciará seu arquivo de origem local/Drive; mudanças de versão serão opt-in e reversíveis.
- Uso das marcas comerciais e redistribuição sujeitos às licenças de cada titular.

## Estrutura proposta
`systems/<id>/<edition>/manifest.json` — metadados e suporte
`systems/<id>/<edition>/rules/*.json` — regras validadas
`systems/<id>/<edition>/tests/` — testes e conformidade
`library/books/<local-id>/` — arquivo/índice privados (nunca versionar PDFs protegidos)
`characters/<id>` — ficha vinculada a systemId, edition e rulesetVersion.

## Critérios de aceitação
- Importar dois livros de sistemas diferentes e usar as duas fichas offline independentemente.
- A busca mostrar o livro e a página correta sem confundir edições.
- Desconectar o Drive sem destruir a biblioteca local já importada.
- Importação não sobrescrever habilidades ou fichas já usadas por campanhas.
- Garantir que jogadores não vejam arquivos e notas exclusivos do mestre.
- Exibir diagnóstico de módulos incompletos sem inventar valores ou efeitos.
