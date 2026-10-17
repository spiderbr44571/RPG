# RPG Mesa 0.20 — Consulta multissistema e IA

## Como usar sem IA

1. Abra **Consulta IA → Busca offline**.
2. Escolha **Todos os sistemas** ou um dos **39 sistemas do catálogo**.
3. Escolha a **edição** quando precisar evitar misturar versões.
4. Digite uma pergunta ou nome. O aplicativo distingue duas situações:
   - **Fonte com texto pesquisável:** conteúdo estruturado de Ordem Paranormal, D&D 5e/2014 e GURPS 4e, ou PDF cujo índice privado já foi importado.
   - **Livro catalogado no Drive:** apenas metadados (título, caminho, link). O resultado abre o arquivo, mas **não inventa uma resposta sobre regras**.

O aplicativo não distribui PDFs comerciais. Um link do Drive não dá automaticamente acesso ao texto de seu PDF para a busca local.

## Indexar qualquer PDF do seu acervo (Linux)

Execute no PC Linux com Python instalado (fora da pasta de documentos pessoais do aplicativo):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pymupdf
python3 scripts/indexar_pdf.py "/caminho/do/livro.pdf" --system alien-rpg --edition "" --output meu-livro-index.json
```

Em **Consulta IA → Biblioteca pesquisável**, escolha **Vincular índice ao sistema → Alien RPG** e importe `meu-livro-index.json`. Outros exemplos de IDs: `ordem-paranormal`, `d-d`, `gurps`, `tormenta-20`, `basic-roleplaying`.

O JSON guarda texto e páginas **dentro do armazenamento privado do aplicativo**. A numeração indicada é da página física do PDF; pode diferir da numeração impressa. Não compartilhe os JSONs derivados de livros sem autorização.

O indexador **não extrai regras estruturadas para o motor de fichas**. Ele apenas prepara busca contextual. PDFs digitalizados sem texto selecionável precisam de tratamento separado.

## Chat opcional com OpenRouter Free

No PC Linux:

```bash
export OPENROUTER_API_KEY="SUA_CHAVE_AQUI"
python3 server/ai_proxy.py --host 0.0.0.0 --port 8790
```

A aplicação imprime um token de sessão aleatório. No celular conectado à mesma rede local, abra **Consulta IA → Chat IA · Free**, informe `http://IP_DO_PC:8790`, cole o token e pressione **Conectar**. Selecione somente um sistema, marque o consentimento para enviar a pergunta e até 4 trechos, e pergunte.

**Segurança:** nunca coloque a chave no APK, nunca encaminhe a porta 8790 no roteador, não use Wi-Fi público com o proxy sem tunelamento seguro. O token vai pela rede local via HTTP; se precisar acessar de fora da LAN, utilize uma VPN/Tailscale.

O proxy só permite `openrouter/free` ou modelos realmente anunciados como `:free` sem preço por token. O serviço pode limitar taxa, modelos e disponibilidade. Na falha, o aplicativo continua funcionando com busca offline.

O assistente é um **bibliotecário de regras**, não um mestre automático. Não deve alterar fichas nem compilar regras dos PDFs. O motor determinístico precisa de pacotes de regras cadastrados e validados por sistema/edição.

## Limites conhecidos

- Os **39 sistemas** são pesquisáveis pelo catálogo de livros. Consultar o texto completo exige importar o índice do livro daquele sistema.
- O conteúdo estruturado de referência já incluído é mais amplo em Ordem Paranormal; D&D 5e e GURPS possuem apenas regras básicas implementadas.
- Pesquisa por edição exata não inclui automaticamente livros sem versão identificada.
- O modo IA usa o servidor local; sem servidor ou sem autorização, usa a busca offline.
- PDFs e JSONs de índices não são enviados ao OpenRouter por inteiro: até quatro excertos da pergunta são transmitidos mediante consentimento.
