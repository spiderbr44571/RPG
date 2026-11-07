# Revamp da mesa (estilo Owlbear) — Fases 0 e 1

Esta pasta guarda o trabalho das duas primeiras fases do revamp descrito em [`PROMPT.md`](PROMPT.md).

**Status: revisão 2 do protótipo, aguardando aprovação.** Nada do app foi alterado. O protótipo é uma página
separada, com dados de exemplo, que não fala com o servidor.

| Arquivo | O que é |
|---|---|
| [`INVENTARIO-PARIDADE.md`](INVENTARIO-PARIDADE.md) | Fase 0: cada função e integração atual, a origem no código e onde ela aparece no novo design. |
| [`prototipo/index.html`](prototipo/index.html) | Fase 1: estrutura e estilo de todas as telas. |
| `prototipo/cena.js` | Modelo de cena, 22 terrenos, 66 objetos, regras de passagem e desenho do mapa. Usado pela Mesa e pelo Estúdio. |
| `prototipo/mesa.js` | Mesa ao vivo (mestre e jogador). |
| `prototipo/estudio.js` | Estúdio de cenários. |
| `prototipo/app.js` | Telas de gestão, Central, entrada do jogador, Bestiário, tutorial e rotas. |
| `prototipo/base.js` | Estado compartilhado e utilidades. |
| `prototipo/dados.js` | Bestiário gerado de `rpg19_order_creatures.js` e `rpg18_bestiary.js`. Não editar à mão. |
| `prototipo/icones.js` | 90 ícones do pacote oficial Tabler (MIT), o mesmo conjunto do app. |
| [`capturas/`](capturas/) | 33 capturas: desktop, celular em retrato e em paisagem, escuro e claro, tutorial em ação. |

## Como abrir

Abra `docs/revamp/prototipo/index.html` no navegador. As fontes vêm do Google Fonts quando há internet; sem rede, o
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
   `prototipo/icones.js`.
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
