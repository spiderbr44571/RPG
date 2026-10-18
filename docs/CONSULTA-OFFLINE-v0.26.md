# RPG Mesa v0.26 — Consultar livros sem IA

A consulta antiga por OpenRouter foi substituída por uma **pesquisa de trechos no próprio dispositivo**. Não utiliza modelos de IA, token, chave de API, proxy ou conexão de rede para pesquisar regras já indexadas.

## Como funciona

1. Abra **Consultar livros**.
2. Escolha o sistema e, se necessário, a edição; também é possível pesquisar no acervo geral.
3. Digite uma pergunta em português, como **"Como funciona o descanso em Ordem Paranormal?"**.
4. O mecanismo normaliza acentos e palavras, busca os trechos mais relevantes, seleciona sentenças que correspondem à pergunta e exibe uma **resposta extrativa**, com título do livro e página.

O mecanismo não compõe novas regras nem deduz uma mecânica a partir de informações incompletas. Se não encontrar a resposta em um texto consultável, mostra o que falta. Os resultados de diferentes sistemas e edições são separados, salvo quando o usuário escolhe expressamente o acervo inteiro.

## Conteúdo da biblioteca

O cadastro atualmente conhece **39 sistemas** e mais de **200 documentos**. Este cadastro contém principalmente metadados (nome, edição aproximada e link no Google Drive); **não contém o texto integral** de todos esses PDFs.

Já é possível pesquisar as informações estruturadas existentes do motor de Ordem Paranormal 1.3, D&D 5e (2014) e GURPS 4e, além de todos os índices privados que forem importados. Livros que aparecem apenas no catálogo do Drive não podem responder às perguntas até que seu conteúdo seja indexado.

## Como incluir outras regras

No Linux, instale Python e PyMuPDF:

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
pip install pymupdf
python3 scripts/indexar_pdf.py "/caminho/livro.pdf" --system gurps --edition 4e --output indice.json
\`\`\`

No Android, entre em **Consultar livros → Vincular índice ao sistema**, selecione o sistema correspondente e importe o **indice.json**.

O índice é salvo no armazenamento privado da WebView (IndexedDB) e continuará disponível offline. Se um arquivo não tiver texto selecionável (PDF apenas de imagens), este indexador não realizará OCR. PDFs comerciais não são publicados com o APK.

## Diferença em relação à IA

A pesquisa sem IA é rápida e previsível, mas limitada ao texto disponível. Ela **não compreende a pergunta como um modelo generativo**, nem garante que cada trecho recuperado responda completamente. Por isso a interface exibe os fragmentos e a origem para o jogador ou mestre conferir a regra.

Os comandos determinísticos de fichas e dados permanecem separados deste leitor; a função não muda os valores dos personagens.
