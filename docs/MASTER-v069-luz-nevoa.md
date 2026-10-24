# Mastermind v0.69 — Iluminação e névoa

## Novidades

- Iluminação dinâmica 2.5D sobre grid 2D, com fontes de luz coloridas, intensidade, raio e animação suave.
- Névoa atmosférica animada, intensidade e qualidade de renderização configuráveis.
- Névoa de guerra opcional calculada pelo servidor da campanha Android, sem requerer servidor externo.
- Campo de visão baseado no token atribuído ao jogador, bloqueado por paredes e portas fechadas da v0.68.
- Revelação progressiva de células; o servidor conserva as células exploradas separadamente para cada jogador.
- Máscara aplicada no servidor aos elementos de mapa e à imagem de fundo, evitando vazamento de partes não descobertas.
- Ferramentas do mestre para colocar luzes, ajustar configurações e reiniciar exploração.

## Compatibilidade e limitações

- Campanhas anteriores continuam com iluminação desligada por padrão.
- A simulação é 2.5D, não ray tracing volumétrico 3D. Alvos e efeitos são vinculados às células do grid.
- Iluminação e névoa só são enviadas aos jogadores a partir do servidor após autenticação, preservando dados ocultos.
- A névoa de guerra não impõe colisão física: esse comportamento exige atualização separada do motor de deslocamento.
- Compatível com as fichas e funcionalidades das versões anteriores; antes de reinstalar o APK, recomenda-se backup.
