# Mastermind v0.68 — Construtor de Mapas

## Conteúdo

- Novas camadas persistentes de terreno, decoração e paredes/portas com compatibilidade com mapas anteriores.
- Biblioteca de 36 elementos vetoriais originais organizados por pacotes e temas, sem downloads externos.
- Pincéis de 1 a 5 células, arrastar no grid e borracha por camada.
- Edição de portas abertas/fechadas, duplicação de mapas, desfazer e refazer.
- Renderização dos elementos nas visões do mestre e dos jogadores por sincronização do servidor da campanha.
- Correção dos ícones de Iniciativa, Jogadores e Movimento e do título “Jogadores e Efeitos”.

## Limites

- As paredes e portas são representações visuais nesta versão; colisão e linha de visão dinâmica pertencem ao futuro módulo de iluminação.
- Assets são vetoriais 2D originais. Não há modelos 3D nem névoa volumétrica nesta etapa.
- O servidor valida no máximo 3.600 marcas por camada de pintura e 720 segmentos de parede por mapa.
- Os arquivos de mapas anteriores continuam no mesmo formato com propriedades adicionais opcionais.

## Verificação

Executar `node tests/mastermind_v68.test.cjs` e `gradle :app:assembleDebug` no GitHub Actions.
