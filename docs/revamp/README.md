# Revamp da mesa (estilo Owlbear) — Fases 0 e 1

Esta pasta guarda o trabalho das duas primeiras fases do revamp descrito em [`PROMPT.md`](PROMPT.md):

| Arquivo | O que é |
|---|---|
| [`INVENTARIO-PARIDADE.md`](INVENTARIO-PARIDADE.md) | Fase 0: cada função e integração atual, o arquivo de origem e onde ela aparece no novo design. |
| [`prototipo/index.html`](prototipo/index.html) | Fase 1: protótipo navegável de todas as telas principais, com o tutorial guiado funcionando. |
| [`prototipo/icones.js`](prototipo/icones.js) | Ícones usados no protótipo, do pacote oficial Tabler (mesmo conjunto e licença do app). |
| [`capturas/`](capturas/) | 22 capturas: desktop, celular em retrato e em paisagem, temas escuro e claro, tutorial em ação. |

**Status: aguardando aprovação.** O prompt pede aprovação do protótipo antes da implementação (Fase 2). Nada do
app foi alterado: o protótipo é uma página separada, com dados de exemplo, que não fala com o servidor.

## Como abrir o protótipo

Abra `docs/revamp/prototipo/index.html` direto no navegador (Chrome, Edge ou Firefox). As fontes vêm do Google
Fonts quando há internet; sem rede, o navegador usa fontes de reserva. A barra fina no topo ("Protótipo · Fase 1")
troca entre as telas e não faz parte do design.

O que dá para fazer nele:

- **Mesa do mestre:** arrastar tokens (as casas douradas mostram o alcance da rodada), medir em casas e metros,
  pintar névoa por casa ou por sala, desenhar, marcar ponto, ligar a lanterna, arrastar criaturas do bestiário para
  o mapa, clique direito (ou toque longo) num token para o menu de ações, rolar dados (`1d20+3`, `2d6`, `3O+5`),
  avançar a iniciativa, trocar Combate/Interlúdio no menu da sala, convidar jogadores.
- **Mesa do jogador:** só o próprio token se move, só na vez dele, e não entra na névoa. Tokens ocultos não
  aparecem. HUD com Vida, Esforço e Sanidade; ficha e Poderes abrem por cima do mapa.
- **Entrar pelo IP**, **Mestragem**, **Biblioteca**, **Ficha** e **Ajustes** (tema, cor de destaque, grade, nomes
  dos tokens, refazer tutoriais, atalhos).
- **Tutorial:** na primeira visita à Mesa do mestre (11 etapas) ou à tela Entrar (6 etapas do jogador), ou pelo
  botão "Ver tutorial". Cada etapa destaca o controle real e só avança quando a ação é feita de verdade. "Pular
  etapa" e "Pular tutorial" ficam sempre visíveis; `Esc` também pula.

## O que foi verificado

- Um script de navegador (Playwright/Chromium) exercitou 12 interações: arrastar token gastando movimento, medir
  (4 casas = 6 m), pintar névoa, rolar `3O+5`, arrastar criatura do bestiário, avançar iniciativa, menu de
  contexto e ocultar token, cartão com os dados do catálogo (Carente: Defesa 40, p.188), Interlúdio, e no jogador:
  token oculto não vaza, token alheio não move, ficha e aba Poderes. Todas passaram, sem erro de console.
- As 22 capturas foram geradas sem erro de página e sem rolagem horizontal em nenhuma largura.
- **Não verificado:** WebView do Android e Electron empacotado. O protótipo só rodou no Chromium do ambiente.

## Achados que mudam o plano

1. **A paleta citada no prompt estava errada.** `#dca4bd` (rosa) é das páginas LAN antigas (`lan_master.html`,
   `lan_join.html`). O app principal (v0.107) usa fundo `#0b0d12`, painel `#12151d`, destaque dourado `#c7a87b`,
   roxo `#9c90dd`, verde `#86bd9c`, e um tema claro (`.light`, destaque `#917149`), definidos em
   `app/src/main/assets/demo-offline.html`. O protótipo usa esses valores. A correção está anotada em `PROMPT.md`.
2. **As fontes do app não são empacotadas.** O CSS declara Cormorant Garamond (títulos) e DM Sans (texto), mas não
   há nenhum arquivo de fonte no repositório. Hoje o app aparece com fontes de reserva (a captura do app atual
   mostra uma serifa genérica). Para o novo visual ficar igual em todos os aparelhos e offline, as duas fontes
   (ambas com licença OFL) precisam ser incluídas no APK e no Electron.
3. **O Owlbear Rodeo está bloqueado pela rede deste ambiente** (`owlbear.rodeo` e `docs.owlbear.rodeo` devolvem
   403 no proxy). Não foi possível abrir o app e tirar capturas, como o prompt pede. O protótipo segue o modelo de
   interação descrito no próprio prompt. Para comparar lado a lado, libere esses domínios no acesso de rede do
   ambiente, ou faça a comparação no seu computador.
4. **O Godot está em uso no desktop.** `desktop/main.cjs` e `desktop/renderer.js` usam o Godot no Ateliê
   (`createGame`, `godot-bounds`, `godot-capture`). O health check (`desktop/godot-health.cjs`) não pode ser removido.
5. **Faltam 50 ícones no app.** O conjunto atual (`mastermind74_icons.js`) tem 44. A mesa nova usa 89; os 50
   que faltam estão listados no topo de `prototipo/icones.js` e vêm do mesmo pacote Tabler (MIT).
6. **Movimento de Ordem, a conferir no livro.** O app usa 9 casas como padrão para Ordem Paranormal
   (`rpg31_master_table.js:61` e `defaultSquares` no servidor). As criaturas do catálogo trazem deslocamento em
   metros (Carente: `12M`). No protótipo, a Aurora tem 6 casas por valor do próprio token, e as criaturas foram
   convertidas a 1,5 m por casa. Vale confirmar no livro qual conversão a mesa deve usar antes da Fase 2.

## Decisões provisórias do protótipo

Estas cinco perguntas continuam abertas. O protótipo assume uma resposta para poder ser desenhado; todas podem mudar.

| Pergunta | Assumido no protótipo | Por quê |
|---|---|---|
| Tema | Escuro e claro | O app já tem os dois; o claro aparece nas capturas `*-light-*`. |
| Grade | Quadrada | É a que o servidor e o editor de cenários usam hoje. |
| Desenho do mapa | Canvas para o mapa, névoa e desenhos; tokens em HTML | Mapas de até 60 × 60 casas ficam leves no Canvas; tokens em HTML facilitam toque, acessibilidade e testes. |
| Migração | Gradual | A tela nova convive com a antiga até o inventário estar completo. |
| Versão | v2.0 | Aparece no topo das telas de gestão como "v2.0 · protótipo". |

## Pontos para decidir na revisão

- **Celular em paisagem:** o mapa cabe inteiro, mas fica pequeno (cerca de 26%). Alternativa: abrir já com zoom no
  token da vez, como acontece no retrato.
- **Cartão do token:** no desktop ele fica embaixo, no centro. Outra opção, mais próxima do Owlbear, é um menu
  flutuante colado ao token.
- **Painel da direita:** abre por padrão no desktop e fica fechado no celular. Dá para inverter.

## Capturas

`desktop-*`: 1280 × 800 · `retrato-*`: 390 × 844 · `paisagem-*`: 844 × 390. Todas em escala 2, JPEG.

- Mestre: `desktop-dark-mesa`, `desktop-light-mesa`, `paisagem-dark-mesa`, `retrato-dark-mesa`
- Jogador: `desktop-dark-jogador`, `desktop-light-jogador`, `retrato-dark-jogador`, `retrato-light-jogador`,
  `paisagem-dark-jogador`
- Gestão: `*-mestragem`, `desktop-dark-biblioteca`, `desktop-dark-ficha`, `desktop-dark-ajustes`
- Entrada: `desktop-dark-entrar`, `retrato-dark-entrar`
- Tutorial: `desktop-dark-boas-vindas`, `desktop-dark-tutorial-mestre-1`, `desktop-dark-tutorial-mestre-3`,
  `retrato-dark-tutorial-mestre-1`, `retrato-dark-tutorial-jogador-1`
