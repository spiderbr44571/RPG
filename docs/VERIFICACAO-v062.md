# Mastermind v0.62 — GURPS em português e consulta às fontes

## Base da versão
Derivada da branch funcional Mastermind v0.61, sem substituir o pacote Android dev.rpgmesa.demo, nem apagar dados persistidos.

## Tradução GURPS
- Fonte do usuário: **GURPS 4ª ed — Lista de Características.pdf**, páginas 2–9 (vantagens e desvantagens). É uma tabela bilíngue e **não contém os textos completos das características**.
- Mapeamento de **449 nomes em português** com referências de página do Módulo Básico em português, preservando nomes ingleses para busca e compatibilidade.
- Índice passa de 664 para **771 registros** por incorporar **107 nomes/variantes da lista enviada** ausentes no acervo GCS prévio. Outros termos exclusivos da biblioteca GCS continuam identificados em inglês: a tabela enviada não traz tradução verificável deles.
- Custo em pontos nunca é inferido a partir de um nome traduzido: os registros importados sem custo inequívoco exigem custo manual; os registros GCS mantêm pontos básicos e alertas sobre modificadores.
- Nota de fonte original: nomes PT–EN do PDF disponibilizado pelo próprio usuário; dados GCS Basic Set sob MPL-2.0, descrições de livros comerciais não são incorporadas ao APK.

## Consulta universal
- Nova entrada **📖 Descrições** na barra superior Android, disponível independentemente da ficha aberta. Pesquisar nomes por sistema (Ordem Paranormal, GURPS 4e, D&D 5e).
- **GURPS**: consulta do catálogo pelo seletor, e das perícias da ficha pelo botão Descrição.
- **Ordem Paranormal**: botão na aba Poderes/Transcender para o poder selecionado. Busca geral inclui nomes de rituais, poderes, perícias, regras, equipamentos e outras categorias estruturadas.
- **D&D 5e**: botão nas perícias e registros da ficha (magias, itens, características, ataques).
- O painel mostra literalmente apenas campos **description/descricao/descricaoIntegral** já armazenados. Texto de resumo aparece identificado como resumo, e notas da ficha são identificadas como notas. Quando texto integral não está cadastrado, exibe fonte e página quando conhecidas e fornece atalho para a pesquisa dos livros privados; não inventa texto exato.
- A busca no PDF já existente depende de importação, indexação e permissão da fonte; nem todos os PDFs privados do usuário estão incluídos no pacote APK.

## UI
- Remove traço horizontal na base da casinha aplicando stroke:none na porta e na base da casa. SVG mantém personalização por tema e todas as demais partes da marca original.
- Novo painel usa variáveis existentes de cor, tema, contraste e layout mobile.

## Validação
- Testes de sintaxe e regressão Node: v0.60, v0.61, v0.62, motor GURPS.
- `tests/verify_apk.py`: byte a byte de todos os assets do APK, logo nativa e marcador v0.62.
- `apksigner verify` e SHA256 do APK.
- Workflow próprio publica `Mastermind-v0.62-Android-APK` e cria release quando as validações passarem.

**Não confundir consulta ao texto cadastrado/ao livro importado com disponibilização irrestrita de textos completos de livros protegidos.**
