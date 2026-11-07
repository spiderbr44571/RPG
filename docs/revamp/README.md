# Revamp da mesa (estilo Owlbear) — Fases 0 e 1

Esta pasta guarda o trabalho das duas primeiras fases do revamp descrito em [`PROMPT.md`](PROMPT.md).

**Status: revisão 4, interface padrão dos apps** (Android v0.109, Linux e Windows v1.3.0). A interface fica em
`app/src/main/assets/revamp/` e abre por padrão; a clássica continua no app (Central → Interface clássica).
Mestragem, mesa ao vivo, Cenários e a entrada do jogador falam com o servidor da mesa na rede local; sem servidor,
tudo roda na campanha de treino, só no aparelho. Biblioteca, Buscar nos livros e Fichas usam os dados do app.

| Arquivo | O que é |
|---|---|
| [`INVENTARIO-PARIDADE.md`](INVENTARIO-PARIDADE.md) | Fase 0: cada função e integração atual, a origem no código e onde ela aparece no novo design. |
| [`app/src/main/assets/revamp/index.html`](../../app/src/main/assets/revamp/index.html) | Fase 1: estrutura e estilo de todas as telas. |
| `app/src/main/assets/revamp/cena.js` | Modelo de cena, 22 terrenos, 66 objetos, regras de passagem e desenho do mapa. Usado pela Mesa e pelo Estúdio. |
| `app/src/main/assets/revamp/mesa.js` | Mesa ao vivo (mestre e jogador). |
| `app/src/main/assets/revamp/estudio.js` | Estúdio de cenários. |
| `app/src/main/assets/revamp/app.js` | Telas de gestão, Central, entrada do jogador, Bestiário, tutorial e rotas. |
| `app/src/main/assets/revamp/base.js` | Estado compartilhado e utilidades. |
| `app/src/main/assets/revamp/dados.js` | Bestiário gerado de `rpg19_order_creatures.js` e `rpg18_bestiary.js`. Não editar à mão. |
| `app/src/main/assets/revamp/personalizacao.js` | Personalização do app: temas elementais, efeitos, destaque, fontes, densidade e textura (mesmas chaves salvas da interface atual). |
| `app/src/main/assets/revamp/livros.js` | Buscar nos livros: Ctrl+F nos PDFs e resumo **O que é** montado pelo motor da busca clássica com as regras do app e os trechos dos PDFs. |
| `app/src/main/assets/revamp/biblioteca.js` | Biblioteca dos quatro sistemas: livros do aparelho (leitor dentro do app), catálogo do Drive e editor de regras (`mastermind_system_editor.js`). |
| `app/src/main/assets/revamp/servidor.js` | Conexão com o servidor da mesa: pontes do mestre e do jogador, sincronização da mesa, Mestragem e Entrar. |
| `app/src/main/assets/revamp/adaptador.js` | Conversão entre o cenário do Estúdio e o formato do servidor (camadas, salas ocultas, tokens, dados). Funções puras, testadas em `tests/revamp_adaptador.test.cjs`. |
| `app/src/main/assets/revamp/fichas.js` | Fichas do aparelho dos quatro sistemas, recursos para o HUD e a tela Fichas. |
| `app/src/main/assets/revamp/dados-ordem.js` | Pacote de regras de Ordem 1.3, gerado por `scripts/revamp_dados.cjs`. Não editar à mão. |
| `app/src/main/assets/revamp/fontes/` | Cormorant Garamond, DM Sans e Space Grotesk (OFL), para funcionar offline. |
| `app/src/main/assets/revamp/icones.js` | 104 ícones do pacote oficial Tabler (MIT), o mesmo conjunto do app. |
| [`capturas/`](capturas/) | 33 capturas: desktop, celular em retrato e em paisagem, escuro e claro, tutorial em ação. |

## Revisão 4: implementada de verdade

- **Servidor da mesa.** O `LocalCampaignServer` serve a nova interface em `/v2/join/<campanha>/<convite>` e
  `/v2/play/<campanha>` (só arquivos da pasta `revamp/`, CSP restrita) e ganhou: tamanho e lado dos tokens,
  aparência do cenário (`look`) e `hiddenCells` (casas que o jogador não enxerga, sem o conteúdo delas).
- **Pontes do jogador pelo app:** `RpgCampaignBridge.playerRequest` (Android) e
  `MastermindDesktop.action('campaign-player-request')` (computador), restritas às rotas de entrar e jogar.
- **Cenário no servidor:** terreno e objetos vão em `layers` (com apelido da paleta clássica), névoa vira salas
  ocultas (até 75), paredes e portas viram arestas; notas, objetos ocultos e portas secretas fechadas ficam em `v2`,
  que só o mestre recebe. Ao salvar, os tokens que o servidor já conhece mantêm posição e dono do servidor.
- **Fluxos testados** em Chromium contra o servidor real (`tests/revamp_live.e2e.cjs`).

## Revisão 3: o que mudou a partir do retorno

1. **Menos botões para a mesma coisa.** Mestragem virou a única entrada: dentro dela há três abas, Campanha, Mesa ao
   vivo e Cenários (o antigo Estúdio). A Central caiu de 12 para 9 destinos, o Painel inicial tem um só caminho para
   a Mestragem, a mesa tem um botão "voltar à Mestragem" no lugar da grade e o Cenários perdeu o ícone repetido.
2. **Personalização do app de volta**, igual à atual: temas elementais Base, Sangue, Conhecimento, Energia, Morte e
   Medo (com selo, frase e texto originais), efeitos de partículas desligados, leves ou máximos, destaque Dourado,
   Ametista, Esmeralda, Azul ou cor livre, fonte dos títulos e do texto, densidade e textura. Usa as mesmas chaves
   salvas (`v10-global-element`, `v10-intensity`, `rpg-*`), então vale nas duas interfaces.
3. **Busca de livros como um Ctrl+F.** Ctrl+F leva à busca; Enter e Shift+Enter andam entre os resultados; cada
   ocorrência fica destacada e a página abre no leitor do app. O resumo mostra em quantas páginas o termo aparece,
   até 3 frases tiradas do PDF com a página de cada uma e as palavras que aparecem junto. Usa o índice que o app já
   tem (Android: `RpgBookBridge.searchPersonalBook`; desktop: `book-index.cjs`). No navegador, o PDF é lido no
   próprio aparelho com pdf.js.
4. **Nos apps.** A WebView do Android e a janela do desktop passaram a aceitar a página `revamp/index.html`, com as
   mesmas pontes nativas; no desktop, os scripts de integração antigos só entram na interface atual.

## Como abrir

Nos apps: Central (o d20) → **Nova interface**. No computador, sem o app: abra
`app/src/main/assets/revamp/index.html` no navegador. As fontes vêm do Google Fonts quando há internet; sem rede, o
navegador usa fontes de reserva. A barra tracejada no topo ("Protótipo") troca de tela e não faz parte do design.

## Revisão 2: o que mudou a partir do retorno

### 1. Todo painel tem botão de fechar

Painéis da mesa (Iniciativa, Biblioteca da mesa, cartão do token, Dados, Convite, ficha do jogador), do Estúdio
(Biblioteca, Propriedades, confirmações) e das telas (detalhe do Bestiário, Central, boas-vindas do tutorial) ganharam
um cabeçalho padrão com ✕. A Biblioteca da mesa também tem **Concluir** no rodapé, e o aviso depois de adicionar uma
criatura diz como fechar. **Esc** fecha o que estiver por cima: menu, Central, gaveta, cartão, ficha.

### 2. Estúdio de cenários: montagem completa do mapa

Tela nova (`#estudio`), aberta pela Central, pela Mestragem, pelo menu da sala da mesa ou pelo Painel inicial.

- **Biblioteca:** 66 objetos em 7 categorias (Mobília 14, Arquitetura 9, Natureza 11, Paranormal 10, Moderno 12,
  Luzes 5, Efeitos 5), 22 terrenos, 6 modelos prontos (Em branco, Masmorra, Taverna, Clareira na floresta, Caverna,
  Rua à noite) e importação de imagens próprias (JPG, PNG, WebP), como o editor atual já permite. Tem busca e filtro
  por categoria. Para colocar, arraste para o mapa ou escolha e toque.
- **Ferramentas:** Selecionar e mover, Pintar terreno (pincel 1, 2, 3 ou 5 casas), Balde, Sala (piso e paredes de
  uma vez), Parede (entre cantos da grade), Porta e janela (porta, dupla, secreta, janela, grade), Objeto, Luz, Área
  oculta (por casa ou por sala), Nota do mestre, Borracha (automática, objetos, paredes, piso) e Mover a vista.
- **Propriedades da peça:** nome no mapa, coluna e linha, largura e altura, rotação (90° e ajuste fino de 15°),
  opacidade, tom, camada, visível para os jogadores, bloqueia movimento, bloqueia visão, travada, emite luz (alcance e
  cor). Também tem duplicar, frente e trás, e excluir.
- **Cena:** sistema, tamanho (até 60 × 60, o limite do servidor), metros por casa, grade (mostrar, só sobre o piso,
  intensidade, cor, espessura), fundo, imagem de mapa com opacidade, horário (dia, entardecer, noite) e clima
  (chuva, neve, neblina).
- **Camadas:** fundo e terreno, decoração do chão, paredes e portas, objetos, luzes, efeitos, tokens, névoa e notas.
  Cada uma pode ser escondida ou travada no Estúdio.
- **Fluxo:** desfazer e refazer (Ctrl Z e Ctrl Y), ver como jogador, salvar rascunho e **Publicar na mesa**. A mesa só
  muda ao publicar. Fechar com mudanças não publicadas pede confirmação na própria página.
- **Mesa e Estúdio usam a mesma cena.** O Corredor do Forte agora é montado com as peças do Estúdio. Paredes, portas
  fechadas e objetos sólidos bloqueiam o movimento na mesa, e a diagonal não corta quina. Na mesa, a ferramenta
  **Portas** abre e fecha portas durante a sessão.

### 3. Equilíbrio com o resto do app

A primeira versão tinha uma barra lateral que o app não tem. Agora as telas seguem o app atual:

- a **Central da mesa** (mesmo título, texto e grade de destinos de `rpg09.js`), aberta pelo botão de grade dourado no
  rodapé, pelo atalho `C` ou pelo botão de grade na mesa e no Estúdio;
- o **Painel inicial** com "Seu universo, sob controle.", o cartão "Continuar de onde parou" e as ferramentas
  numeradas como no app (01 a 07, mais 08 para o Estúdio);
- topo "Workspace / tela", títulos em Cormorant com itálico dourado, rótulos espaçados e o fundo listrado nas laterais;
- os painéis da mesa e do Estúdio usam os mesmos títulos, rótulos e cartões das telas de gestão;
- o **Bestiário** entrou como tela, com as 48 criaturas de Ordem e as 3 do SRD, filtro por elemento, busca e detalhe
  com a página do livro.

### 4. Jogador entra pelo app ou pelo navegador

- **Pelo app (recomendado):** endereço e nome, e a lista de **fichas salvas no celular**. A ficha do mesmo sistema da
  campanha pode ser enviada para aprovação; as de outro sistema aparecem bloqueadas, com o motivo. Também dá para
  entrar sem ficha. O mestre recebe uma cópia; a original continua no aparelho.
- **Pelo navegador:** o convite mostra como entrar pelo app e mantém as opções atuais (esperar o mestre ou enviar um
  arquivo JSON).
- A Mestragem e o botão Convidar mostram os dois endereços, e a lista de jogadores indica quem entrou por cada um.
- **É viável com o que o app já tem:** `MainActivity.java` expõe `CampaignBridge.request(base, chave, método, rota,
  corpo)`, que a página offline do app já usa para mandar fichas locais a uma campanha (`rpg11_campaigns.js`, linhas
  157 e 161). O servidor já aceita a ficha proposta pelo jogador (`proposedSheet`, lida em `lan_master.html`). Falta,
  na Fase 2, ligar a tela de entrada do app a essa rota.

## Verificação

- Um roteiro no Chromium exercitou 23 interações. Entre elas:
  - Central (✕ e Esc);
  - Bestiário (48 criaturas, detalhe da Carente com PV 700 e p.188, adicionar à mesa oculta);
  - mesa: arrastar gastando movimento, abrir a porta da capela, adicionar criatura e fechar a gaveta no ✕, fechar
    cartão, dados, menu e painel;
  - Estúdio: pintar grama, desenhar sala com paredes, pôr porta, colocar e girar objeto, desfazer e refazer, aplicar
    modelo com confirmação, noite com chuva, publicar e ver na mesa, confirmação ao sair;
  - entrada pelo app com ficha salva (ficha de outro sistema bloqueada) e pelo navegador;
  - jogador: não atravessa porta fechada e fecha a ficha.

  Todas passaram, sem erro de página.
- As 33 capturas foram geradas sem erro e sem rolagem horizontal.
- **Não verificado:** WebView do Android e Electron empacotado.

## Achados que continuam valendo

1. **Paleta:** o app usa dourado `#c7a87b` sobre `#0b0d12` (e o tema claro `.light`). O rosa `#dca4bd` do prompt é das
   páginas LAN antigas. Correção anotada em `PROMPT.md`.
2. **Fontes não empacotadas:** Cormorant Garamond e DM Sans são declaradas, mas não há arquivo de fonte no
   repositório. Precisam entrar no APK e no Electron para o visual ser igual offline.
3. **Owlbear Rodeo bloqueado pela rede deste ambiente** (`owlbear.rodeo`, 403 no proxy). Não houve comparação lado a
   lado com o app real.
4. **Godot em uso** no Ateliê do desktop; o health check fica.
5. **Faltam 51 ícones** no `mastermind74_icons.js` (o app tem 44, o protótipo usa 90). A lista está no topo de
   `app/src/main/assets/revamp/icones.js`.
6. **Movimento de Ordem a conferir no livro:** o app usa 9 casas como padrão; o catálogo traz deslocamento em metros
   (Carente `12M`). O protótipo converte a 1,5 m por casa e usa 6 casas para a Aurora como valor do token.

## Decisões provisórias

| Pergunta | Assumido no protótipo |
|---|---|
| Tema | Escuro e claro |
| Grade | Quadrada |
| Desenho do mapa | Canvas para mapa, luz e névoa; tokens em HTML |
| Migração | Gradual |
| Versão | v2.0 |

## Capturas

`desktop-*`: 1280 × 800 · `retrato-*`: 390 × 844 · `paisagem-*`: 844 × 390. Todas em escala 2, JPEG.

- Gestão: `*-inicio`, `*-mestragem`, `desktop-dark-central`, `desktop-dark-bestiario`, `desktop-dark-biblioteca`,
  `desktop-dark-ficha`, `desktop-dark-ajustes`
- Estúdio: `desktop-dark-estudio`, `desktop-light-estudio`, `retrato-dark-estudio`, `paisagem-dark-estudio`
- Mesa do mestre: `desktop-dark-mesa`, `desktop-light-mesa`, `retrato-dark-mesa`, `paisagem-dark-mesa`
- Jogador: `*-jogador` (desktop, retrato e paisagem; escuro e claro)
- Entrada: `desktop-dark-entrar` (app), `desktop-dark-entrar-navegador`, `retrato-dark-entrar`
- Tutorial: `desktop-dark-boas-vindas`, `desktop-dark-tutorial-mestre-1`, `desktop-dark-tutorial-mestre-3`,
  `desktop-dark-tutorial-estudio-3`, `retrato-dark-tutorial-mestre-1`, `retrato-dark-tutorial-jogador-1`
