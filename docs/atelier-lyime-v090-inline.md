# Mastermind v0.90 — Ateliê Godot original incorporado na própria página

## Objetivo implementado
Atender ao pedido: abrir **Casinha → Ateliê** e já encontrar o **Pixel Portrait Creator** do lyime carregando dentro do painel, sem clicar em “Personalizar dentro do app”, sem abrir Activity separada e sem ter de escolher navegador.

## Arquitetura

Há dois WebViews diferentes:

1. WebView principal: aplicação Mastermind, offline, contendo as fichas e bridges originais do RPG.
2. `InlinePixelPortraitStage.java`: WebView isolada, SEM `addJavascriptInterface` e sem acesso a arquivos locais, que carrega o HTML5 Godot original de `html.itch.zone`.

Nunca carregar o conteúdo remoto em um iframe dentro do WebView principal, pois as bridges Android ficariam expostas a frames externos.

A `MainActivity` contém um `FrameLayout` pai com o WebView offline e um segundo container nativo, inicialmente oculto. A cada ciclo curto, consulta **apenas** o DOM local do Mastermind para saber se o Ateliê está selecionado e obter o retângulo real de `#p90-native-stage`. O container nativo é posicionado exatamente sobre o placeholder da página.

A sobreposição respeita os limites do bloco rolável `#content` e esconde/pausa o editor quando o usuário muda de tela ou o painel sai da região visível. Isso mantém os tokens e dados do RPG protegidos e a navegação pela casinha disponível.

## Interface no celular

- Cabeçalho compacto, seguido imediatamente do Godot original.
- Ao entrar, primeira carga automática da exportação HTML5; ao voltar, preserva o editor criado.
- O painel usa quase toda a largura da tela e recalcula o encaixe do `canvas#canvas`.
- Barra discreta acima do editor: zoom − / +, Ajustar, Mover, Recarregar.
- Barra abaixo do editor: “Usar imagem na ficha”.
- A imagem capturada retorna ao mesmo Ateliê; a página rola até o painel de retrato e token, onde pode ser recortada e salva.
- “Abrir no navegador” permanece secundário, apenas para incompatibilidade de WebGL ou conexão.

O jogo Godot não foi modificado. Recursos são transmitidos dos servidores originais do autor. O código, executável e assets do lyime não são republicados no APK.

## Testes e limitações

Os testes no CI verificam o registro da View nativa, a atualização de geometria e recorte durante rolagem, a separação das WebViews, o carregamento automático, a persistência do estado, a captura PixelCopy, os mecanismos de fichas e a assinatura do APK.

Limites: requer conexão e suporte de WebView a WebAssembly/WebGL. Não há exportação nativa pelo editor web; a captura PNG recortável do Mastermind atende a essa etapa. O comportamento do toque e o encaixe visual final dependem de confirmação no aparelho Android.
