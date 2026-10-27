# Mastermind v0.89 — Enquadramento, zoom e movimentação do Ateliê

## Situação anterior
A captura de tela da instalação v0.88 mostra o editor Godot original funcionando, porém desenhado no canto superior esquerdo, com uma grande área cinza vazia no celular. Era difícil escolher peças e cores por causa do tamanho dos botões.

## Correção
- O Mastermind consulta apenas o retângulo #canvas da versão HTML5 original do lyime, via JavaScript de leitura getBoundingClientRect().
- Calcula a proporção entre pixels CSS e tamanho do WebView e aplica zoom nativo à visualização, sem alterar imagens ou o código do Godot.
- Ao carregar: amplia automaticamente até o máximo que cabe na área visível e centraliza vertical e horizontalmente o quadro do personagem.
- − e +: alteram o zoom gradualmente, preservando o ponto em foco; indicador em porcentagem.
- Ajustar: centraliza e encaixa todo o quadro original na tela.
- Mover: alterna o modo panorâmica; arrastar com um dedo movimenta a visualização. Desativar permite editar normalmente usando os controles do Godot.
- Paisagem / Retrato: muda a orientação, preservando o estado do WebView, para melhor aproveitar a tela.
- A captura PNG usa só a região visível do WebView, limitada à área de jogo.
- O conjunto de controles fica fora da página remota, portanto o site não tem acesso às fichas nem às APIs nativas.

O zoom usa transformações Android de View (escala e translação); não reescreve o HTML do artista. As coordenadas de toque são tratadas pelo Android para a transformação aplicada.

## Limites e testes
- Utiliza a versão oficial do jogo Godot HTML5 em html.itch.zone; não empacota WASM, PCK, EXE ou sprites do lyime.
- Zoom máximo de 350% (mínimo 75%) para evitar tamanhos excessivos.
- Testes automatizados verificam os controles, cálculo de encaixe, proteção das fichas, compilação Android e integridade do APK.
- Teste no aparelho ainda é importante, sobretudo para conferir a precisão do toque em peças pequenas e a movimentação do editor.
