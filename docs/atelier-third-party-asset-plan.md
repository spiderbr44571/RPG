# Mastermind — Novo criador com assets de terceiros (planejamento)

Situação após v0.84: o Ateliê anterior foi removido da interface, scripts, sprites e workflows atuais. Fichas, fotos e tokens já salvos continuam intactos.

## Condições para a próxima implementação
1. Selecionar um único pacote-base de retratos com camadas realmente intercambiáveis (não recortar personagens completos).
2. Conferir a licença específica para distribuir sprites **dentro de um aplicativo editor com exportação de retratos e tokens**. Licença para uso em jogos pode não autorizar distribuir um editor/gerador.
3. Solicitar autorização direta ao criador se a licença proibir redistribuição do pack ou uso em criadores de personagem.
4. Receber arquivo original obtido legalmente e conferi-lo (PNG transparentes, metadados, resolução e atlas).
5. Fixar âncoras e ordem das camadas da coleção escolhida; não misturar pacotes de grades e estilos diferentes.
6. Implementar o motor de edição e teste de combinatória; manter fichas e upload manual de imagens.
7. Adicionar crédito e termos da licença ao repositório e à seção de créditos do aplicativo.

## Fontes pré-selecionadas para revisão de licença
- Pixel Persona: https://oxyoxy.itch.io/pixelpersona — partes modulares de retrato; licença permite uso no projeto, mas não redistribuição independente. Confirmar uso em editor exportável.
- Swappable Portraits: https://lofi-kier.itch.io/swappable-portraits — retratos em camadas; requer compra/licença; confirmar exportação de tokens.
- Pixel Portrait Creator: https://lyime.itch.io/pixel-portrait-creator — retrato 64x64; licença gratuita só não comercial; licença paga permite comercial, mas proíbe redistribuição de assets.
- Universal LPC: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator — sprites para corpo inteiro/top-down; licenças variam por peça (CC0, CC-BY, CC-BY-SA, OGA-BY, GPL). Não adequado visualmente como base do retrato anime desejado.
- Modular Pixel Characters: https://riclmbr.itch.io/modular-pixel-characters-character-creator-pack-350-items-48x48 — CC0, mas personagens de corpo inteiro 48x48, outro estilo.

Nenhum pacote de terceiros foi copiado para o projeto nesta etapa. Evitar uso de assets sem confirmar a licença e a adequação visual.
