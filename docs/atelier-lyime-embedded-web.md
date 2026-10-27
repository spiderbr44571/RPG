# Mastermind v0.87 — Pixel Portrait Creator incorporado pelo navegador interno

O Mastermind exibe **a versão HTML5 oficial** do [Pixel Portrait Creator de lyime](https://lyime.itch.io/pixel-portrait-creator) numa Activity Android com WebView dedicada.

## Funcionamento
1. No menu **Ateliê**, abra **Personalizar dentro do app**.
2. O editor HTML5 original é carregado pela internet numa tela própria do Mastermind.
3. Escolha cabelo, olhos, expressão, roupas e acessórios usando os controles da ferramenta original.
4. Toque **Capturar tela para a ficha**, quando disponível. O Android captura somente a área do WebView com PixelCopy.
5. De volta ao Mastermind, arraste e amplie a captura para enquadrar apenas o rosto/personagem, então **Salvar retrato e token na ficha**.
6. **Abrir no navegador** permite usar o site externamente caso o jogo HTML5 não rode adequadamente no WebView Android.
7. **Versão completa para PC** continua abrindo a página oficial. É o único ambiente do lyime em que a exportação PNG nativa está disponível.

## Segurança, licença e limites
- A versão incorporada precisa de internet. Não existe cópia offline do motor Godot/HTML, sprites, arquivos `.pck` ou executável no APK.
- A interface remota roda em **WebView separado**, sem qualquer `addJavascriptInterface`, sem permissão de abrir arquivos internos e sem acesso às fichas. O acesso aos dados locais continua apenas no WebView offline do Mastermind.
- O autor não oferece exportação PNG na versão web. A captura é uma imagem da **tela**, podendo incluir controles do site; o usuário precisa recortar antes de salvar. Não altera a ferramenta nem injeta código nela.
- O criador declara entradas de teclado e mouse. O uso por toque no Android depende da compatibilidade da página e do seu motor web; por isso há botão de navegador externo como alternativa.
- Não remover aviso de crédito ou redistribuir sprites ou programa do lyime. A licença gratuita é para uso não comercial.

## Verificação
Os testes automatizados inspecionam o código da Activity isolada, o registro no manifesto Android, a transferência local de captura e a ausência das sprites e do programa do lyime na build. **Um teste automatizado não confirma que o jogo online funciona via toque em todos os aparelhos Android.**
