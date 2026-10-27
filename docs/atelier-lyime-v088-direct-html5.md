# Mastermind v0.88 — Godot HTML5 original do lyime diretamente no app

## Resultado da inspeção da página real (27/10/2026)

Página do autor: https://lyime.itch.io/pixel-portrait-creator

Foi analisado o **HTML real** com uma execução controlada no GitHub Actions em `scripts/inspect_lyime_web.py`. A página oficial responde HTTP 200 e declara:

- Container de jogo `#html_embed_4745213` com área **600×720** no HTML analisado.
- `data-iframe` aponta diretamente para o endereço **https://html.itch.zone/html/18379448/index.html?v=1785079497**.
- O componente `init_HtmlEmbed` do itch.io tem como caminho de fallback `https://itch.io/embed-upload/18379448` com parâmetros específicos do upload.
- A página normal `lyime.itch.io` tem CSP `frame-ancestors 'self' https://itch.io`, logo não deve ser incorporada a um iframe próprio dentro do Mastermind.
- O endereço **html.itch.zone** abre diretamente com HTTP 200 e entrega `<canvas id="canvas">`, `index.js` e o carregador do Godot.
- O HTML declara `index.wasm` com aproximadamente 39,5 MB e `index.pck` com aproximadamente 1,22 MB; declara `GODOT_THREADS_ENABLED = false`.
- A resposta direta traz `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp`, permitindo isolamento necessário caso o runtime exija.
- O HTML do próprio `itch.io/embed-upload` também contém um iframe apontando ao mesmo endereço direto.

**Conclusão:** usar a URL de `html.itch.zone` como *documento principal* de uma `WebView` Android isolada é a forma de tentar iniciar o mesmo jogo Godot do itch.io, sem carregar sua página intermediária e sem copiar arquivos privados.

## Implementação

- Activity não exportada `PixelPortraitActivity` sem `addJavascriptInterface` e sem acesso a arquivos locais.
- Na abertura, consulta a página do lyime em uma thread de I/O, até 256 KiB, com limite de tempo e um único padrão de URL permitindo apenas `https://html.itch.zone/html/<upload>/index.html?v=<version>`.
- Carrega no WebView diretamente o endereço encontrado, com fallback para o endereço do upload verificado acima.
- Usa JavaScript e DOM Storage apenas no WebView remoto necessário ao Godot; não registra as bridges nativas do Mastermind nessa Activity.
- Mantém Voltar, Recarregar e Navegador. Em caso de falha, o navegador pode abrir a página original.
- PixelCopy captura o conteúdo visível do WebView e devolve ao componente offline de edição do Mastermind, que permite recortar/ajustar/gerar token antes de salvar na ficha.
- Todos os outros dados e serviços do RPG permanecem no WebView original, isolados da página do artista.

## Licença e limitações

- O projeto é de uso pessoal/não comercial do usuário, mas a licença do autor **continua impedindo redistribuição do programa e das sprites**.
- Nenhum `index.js`, `index.wasm`, `index.pck` ou sprite de lyime é copiado ao repositório ou ao APK. Tudo é carregado do site oficial **em tempo de execução**.
- Godot no navegador depende de conexão com a internet, WebGL/WASM e suporte da WebView Android. **Compilação Android bem-sucedida não garante funcionamento em todos os aparelhos**; teste no dispositivo necessário.
- A versão HTML5 continua sem exportação nativa. Capturamos a tela e o usuário escolhe o recorte, podendo excluir os controles na imagem final.
- Não podemos garantir controles de toque originais se o jogo exigir teclado/mouse. A aplicação fornece abrir em navegador como alternativa.

## Critérios de aceitação

1. O botão Ateliê → Personalizar dentro do app carrega o endereço HTML5 direto de `html.itch.zone` sem passar pela página `lyime.itch.io`.
2. A Activity é isolada, não exportada e sem bridges para dados do RPG.
3. Se o artista atualizar o upload, o app tenta descobrir o endereço novo via página oficial.
4. Capturar tela → recortar → salvar retrato/token na ficha selecionada funciona.
5. APK não contém binários nem sprites proprietários do artista; os livros/fichas/dados do Mastermind são preservados.

Código na branch `feature/mastermind-v088-direct-godot-embed`.
