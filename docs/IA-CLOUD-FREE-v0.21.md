# RPG Mesa v0.21 — IA cloud gratuita, sem servidor

A partir da v0.21, **o chat consulta o OpenRouter diretamente via HTTPS**. Você não precisa hospedar nenhum serviço para conversar com modelos gratuitos no Android. O servidor de campanha/mestre em rede é um recurso separado e opcional.

## Configuração no Android

1. Abra o RPG Mesa → **Consulta IA → Chat IA · Free**.
2. Cole sua **chave pessoal de API do OpenRouter** no campo indicado. A conta e a chave devem cumprir os termos e requisitos de elegibilidade do provedor.
3. Opcional: marque **Guardar chave criptografada neste Android**. Com essa opção, o segredo é protegido com Android Keystore e nunca entra no HTML ou no APK distribuído.
4. Pressione **Conectar à nuvem**. O seletor exibe `openrouter/free` e, se disponível, variantes de modelo terminadas em `:free` anunciadas pelo catálogo do provedor com custo zero.
5. Escolha o sistema/edição, marque o consentimento para compartilhar os **trechos relevantes** e faça a pergunta.

É possível desligar a IA e apagar a chave guardada no botão **Desconectar e apagar chave**. Sem autorização para enviar fontes, o assistente utiliza a busca local.

## Garantia de não selecionar modelos pagos

- O modo automático usa **apenas** `openrouter/free`, não `openrouter/auto`.
- Modelos individuais exigem o sufixo `:free` e preços de entrada/saída iguais a zero na lista do provedor.
- Há uma segunda validação na ponte nativa Android antes de enviar a requisição.
- Não há acesso aos endpoints genéricos de URL fornecida pela interface: somente `https://openrouter.ai/api/v1/models` e `https://openrouter.ai/api/v1/chat/completions`.
- O código não possui chaves incorporadas. O provedor pode atualizar modelos, limites e políticas a qualquer momento.

## Como protege os dados

- **Android:** o token de API fica somente na memória ou criptografado em preferências privadas com **Android Keystore** (AES-GCM), caso a pessoa escolha guardar. O código JavaScript nunca recebe de volta a chave salva.
- **Desktop no navegador:** ao abrir o HTML sem ponte Android, a chave vive somente na memória da aba; não existe opção de armazenamento persistente nem um backend.
- Só a pergunta e até quatro trechos recuperados **do sistema selecionado** são enviados para o OpenRouter, após consentimento.
- Nenhuma regra, fórmula, classe, perícia ou ficha é criada pelo modelo; a IA responde dúvidas das fontes indexadas.
- A busca offline continua funcionando mesmo sem Internet.

## Fontes disponíveis

O catálogo reconhece 39 sistemas, mas **o link no Google Drive não é um índice de texto**. O conteúdo interno de cada livro continua exigindo um índice privado importado, salvo no dispositivo. Para gerar índices de PDFs com texto extraível: `python3 scripts/indexar_pdf.py livro.pdf --system d-d --edition 5e-2014`.

O modo cloud usa apenas as fontes já indexadas/curadas. Ele **não baixa PDFs ou extrai regras automaticamente**.

## Limites e riscos

- OpenRouter fornece serviços gratuitos, mas **a quantidade de requisições é limitada** e varia por conta.
- Uma chave pessoal do provedor ainda é necessária, embora nenhum servidor próprio seja necessário.
- O provedor cloud recebe a pergunta e os trechos que você consentiu em compartilhar; nunca envie material sigiloso.
- Em ambientes sem ponte nativa, a requisição HTTPS é feita diretamente pelo navegador; se o navegador/provedor impedir chamadas CORS, use o aplicativo Android.
- O armazenamento de dados no Android permanece local. Preserve um backup de fichas antes de trocar de APK de teste.

Links: [OpenRouter Free Router](https://openrouter.ai/openrouter/free) · [Modelos gratuitos](https://openrouter.ai/models?max_price=0).

**Nota:** o arquivo histórico `server/ai_proxy.py` foi descontinuado na v0.21; ele não é necessário para usar a IA.
