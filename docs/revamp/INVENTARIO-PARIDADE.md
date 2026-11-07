# Inventário de paridade (Fase 0)

Cada linha é uma função ou integração que existe hoje e precisa continuar no app depois do revamp. A coluna
**No protótipo** diz como ela aparece na Fase 1:

- **Interativo:** desenhado e funcionando com dados de exemplo.
- **Desenhado:** a tela ou o controle existe, mas é estático.
- **Indicado:** há um botão ou menu que leva a ela, e ela será desenhada depois.
- **Fora da fase:** ainda não aparece; entra na fase indicada.

Nenhuma linha está **migrada**: a implementação começa na Fase 2, depois da aprovação do protótipo.
Todos os arquivos citados foram conferidos no repositório.

## Mesa ao vivo (mestre)

| Função | Origem | No novo design | No protótipo | Fase |
|---|---|---|---|---|
| Mover tokens | `rpg31_master_table.js`, servidor `move` | Ferramenta Mover, arrastar no mapa | Interativo | 2 |
| Limite de movimento por token, ficha e sistema | servidor `movementLimit`, ações `token-speed` e `movement-system` | Casas douradas de alcance e contador "x de y casas" | Interativo (alcance e gasto) | 2 |
| Iniciativa: rolar, definir, próximo, limpar | ações `initiative-roll`, `-set`, `-next`, `-clear` | Painel Iniciativa e cartão do token | Interativo | 2 |
| Rodadas e turno | ação `turn`, servidor `advance` | Selo "Combate · rodada N" no menu da sala | Interativo | 2 |
| Combate e Interlúdio | ação `session-mode`, servidor `sessionMode` | Menu da sala e card Ritmo da Mestragem | Interativo | 2 |
| Rolagem pública e privada | ações `roll-public`, `roll-private`, servidor `table-roll` | Bandeja de Dados: "Todos" ou "Só eu" | Interativo (simulado no navegador) | 2 |
| Modos de soma: soma, maior, menor | servidor `sum`, `highest`, `lowest` | Bandeja de Dados | Interativo | 2 |
| Notação de Ordem (`3O+10`) | dados do bestiário | Bandeja e botões Atacar e Dano | Interativo | 2 |
| Ficha de criatura: PV, Defesa, ataque, dano, fonte | `rpg19_order_creatures.js`, `rpg18_bestiary.js` | Cartão do token | Interativo (dados reais do catálogo) | 2 |
| Ajustar PV | ação `hp`, servidor `resource` | Cartão do token e menu de contexto | Interativo | 2 |
| Efeitos com duração | ação `effect`, servidor `effects`, `effects-group` | Selo no cartão do token | Desenhado | 2 |
| Ocultar token dos jogadores | servidor `hide` | Menu de contexto, selo "oculto" | Interativo | 2 |
| Girar token | `mastermind52_range.js`, servidor `rotate` | Menu de contexto | Interativo | 2 |
| Lanterna | ação `m72-flashlight`, servidor `flashlight`, `mastermind72_volume.js` | Ferramenta Lanterna | Interativo (efeito visual) | 2 |
| Zoom e ajuste do mapa | ações `zoom-in`, `zoom-out`, `fit`, `rpg33_camera.js` | Controle de zoom, roda, pinça, tecla 0 | Interativo | 2 |
| Abrir o Estúdio a partir da mesa | ação `edit` | Menu da sala | Indicado | 3 |
| Canvas privado do mestre | `lan_master.html`, servidor `canvas` | Menu da sala e card na Mestragem | Indicado | 3 |
| Vincular token a jogador | `rpg31_master_table.js` (`r34-token-bind`), servidor `bind` | Aba Jogadores | Desenhado | 2 |

## Mestragem e campanha

| Função | Origem | No novo design | No protótipo | Fase |
|---|---|---|---|---|
| Acesso do mestre com chave | `lan_master.html` | Tela de Mestragem (fora do recorte visual) | Fora da fase | 2 |
| Criar e escolher campanha | `lan_master.html`, `rpg11_campaigns.js` | Cabeçalho da Mestragem | Desenhado | 2 |
| Convite: endereço, código e cópia | `lan_master.html`, servidor `join`, `info` | Card Mesa ao vivo e botão Convidar na mesa | Interativo | 2 |
| Atribuir ficha a jogador | servidor `assign` | Card Jogadores | Desenhado | 2 |
| Aprovar ficha enviada pelo jogador | servidor `approve` | Card Jogadores | Desenhado | 2 |
| Pedidos de poder e Transcender | servidor `power-request`, `power-requests`, `transcend` | Card Pedidos | Desenhado | 2 |
| Cenários: até 16, publicar um | servidor `scenarios`, `scenario` | Card Cenários e menu da sala | Desenhado | 3 |

## Estúdio de cenários

| Função | Origem | No novo design | No protótipo | Fase |
|---|---|---|---|---|
| Fundo de mapa, salas, círculos | `rpg29_scene_editor.js` (`rect`, `circle`) | Ferramenta Desenhar e Estúdio | Interativo (desenho livre, retângulo, círculo) | 3 |
| Paredes e portas | `rpg29_scene_editor.js` (`wall`, `door`) | Ferramenta Paredes e portas | Indicado | 3 |
| Névoa: pintar e apagar | `rpg29_scene_editor.js` (`paint`, `erase-paint`) | Ferramenta Névoa: pincel, sala, revelar tudo | Interativo | 2 |
| Tokens da biblioteca, importar imagens | `rpg29_scene_editor.js` (`token`) | Gaveta Adicionar: Fichas, Bestiário, Objetos | Interativo (arrastar ou tocar) | 2 |
| Criaturas por sistema | `rpg18_bestiary.js`, `rpg19_order_creatures.js` | Gaveta Adicionar > Bestiário | Interativo | 2 |
| Camadas do mapa e atmosfera | `mastermind68_map_layers.js`, `mastermind69_atmosphere.js` | Estúdio | Fora da fase | 3 |
| Limites: 60 × 60 casas, 75 áreas, 250 tokens | servidor (`gridNumber`) | Mantidos | Fora da fase | 2 |

## Jogador

| Função | Origem | No novo design | No protótipo | Fase |
|---|---|---|---|---|
| Entrar por convite: nome e escolha de ficha | `lan_join.html` | Tela Entrar pelo IP | Interativo (conexão simulada) | 2 |
| Conectar pelo endereço da rede local | `MainActivity.java` (modo LAN) | Tela Entrar pelo IP | Interativo (simulado) | 2 |
| Retomar mesa | servidor `/resume/` | "Mesas recentes" na tela Entrar | Desenhado | 2 |
| Mover só o próprio token, na vez dele | servidor (checagem de `activeId`) | Mesa do jogador | Interativo | 2 |
| Névoa e tokens ocultos filtrados | servidor (`visibleTokens`, filtro de áreas) | Névoa opaca no jogador | Interativo | 2 |
| Mover, Medir, Marcar, Inspecionar, Lanterna | `mastermind52_player_experience.js` (`move`, `measure`, `pin`, `inspect`, `light`) | Barra de ferramentas do jogador | Interativo | 2 |
| HUD de recursos por sistema | `rpg31_player_table.js`, `mastermind54_player_shell.js` | HUD inferior | Interativo (Ordem) | 2 |
| Ficha sobre o mapa, com abas | `mastermind54_player_shell.js` | Painel inferior da ficha | Interativo (Resumo e Poderes) | 2 |
| Poderes e Transcender | `mastermind55_player_powers.js`, `mastermind56_local_powers.js` | Aba Poderes, "Pedir ao mestre" | Interativo | 2 |
| Caderno do jogador | servidor `journal` | Menu da sala | Indicado | 2 |
| Rolagem do jogador para todos | servidor `table-roll` | Botão Dados do HUD | Interativo | 2 |
| Aparência própria aplicada à mesa | `mastermind54_player_shell.js` (`light`) | Ajustes | Desenhado | 3 |

## Fichas e sistemas

| Função | Origem | No novo design | No protótipo | Fase |
|---|---|---|---|---|
| Catálogo de 39 sistemas | `rpg_system_catalog.json`, `catalog_*.json` | Biblioteca (seletor de sistema) | Desenhado | 3 |
| Motor D&D 5e (SRD 5.1) | `rpg18_dnd_engine.js`, `rpg18_dnd_ui.js` | Ficha | Fora da fase | 3 |
| Motor GURPS 4e | `rpg16_gurps_engine.js`, `rpg16_gurps_ui.js` | Ficha | Fora da fase | 3 |
| Chamado de Cthulhu 7e | `mastermind_coc7_engine.js`, `mastermind_coc7_ui.js` | Ficha | Fora da fase | 3 |
| Ordem Paranormal: pacote e 22 poderes | `systems/ordem-paranormal-v1.3.pack.json`, `mastermind55_powers.json` | Ficha (Ordem) | Desenhado | 3 |
| Grimório e rituais | `mastermind66_grimoire_engine.js`, `mastermind66_grimoire_ui.js`, `mastermind66_spells.js` | Aba Rituais | Indicado | 3 |
| Exportar ficha em PDF | `rpg17_sheet_pdf.js`, `mastermind_system_pdf.js`, `mastermind_ordem_template.js`, ponte `RpgSheetPdfBridge` | Botão Exportar PDF | Indicado | 3 |
| Editor de sistemas e studio de fichas | `mastermind_system_editor.js`, `mastermind_sheet_studio.js` | Ficha e Ajustes | Fora da fase | 3 |
| Regras e descrições | `rpg37_rules.js`, `mastermind62_descriptions.js`, `mastermind63_*` | Ficha e Consulta | Fora da fase | 3 |

## Consulta e biblioteca

| Função | Origem | No novo design | No protótipo | Fase |
|---|---|---|---|---|
| Biblioteca do Google Drive (209 livros, só links) | `mastermind50_drive_library.css`, `docs/PLANO-BIBLIOTECA-DRIVE.md`, ponte `RpgDriveBridge` | Card Google Drive | Desenhado | 3 |
| PDFs pessoais: importar, indexar, retomar | `mastermind51_private_books.js`, `PdfTextSearch.java`, ponte `RpgBookBridge` | Card Seus PDFs | Desenhado | 3 |
| Busca com trecho e página | `mastermind51_private_books.js`, `mastermind45_pdf_search.css` | Busca e resultado na Biblioteca | Desenhado | 3 |
| Consulta offline, sem IA | `rpg28_context_search.js`, `rpg26_*` | Busca da Biblioteca | Desenhado | 3 |
| Consulta com IA opcional | `rpg23_ai_core.js`, `rpg24_ai_quality.js` | Busca da Biblioteca | Fora da fase | 3 |

## Ateliê, Canvas e outros

| Função | Origem | No novo design | No protótipo | Fase |
|---|---|---|---|---|
| Ateliê de retratos pixel | `mastermind99_atelier*.js`, `pixelportrait86_companion.*`, ponte `RpgPixelPortraitBridge` | Menu lateral e Ficha | Indicado | 3 |
| Ateliê no desktop com Godot | `desktop/main.cjs`, `desktop/renderer.js`, `desktop/godot-health.cjs` | Menu lateral | Fora da fase | 3 |
| Imagens de criaturas | ponte `RpgCreatureImageBridge` | Tokens e Bestiário | Fora da fase | 3 |
| Canvas infinito: cartões, ligações, mídia em IndexedDB | `mastermind40_canvas_images.js`, `mastermind42_workspace.js` | Menu lateral e Mestragem | Indicado | 3 |
| Bestiário completo | `rpg18_bestiary.js` | Menu lateral | Indicado | 3 |
| Temas, cor, roda RGB, fontes, escala | `mastermind39_ui.js`, `rpg15_theme_fix.js` | Ajustes | Interativo (tema, cor, grade, nomes) | 3 |
| Ícones (Tabler, MIT) | `mastermind74_icons.js` | Todo o app; faltam 50 ícones | Interativo | 2 |

## Plataformas e pontes nativas

| Função | Origem | No novo design | Fase |
|---|---|---|---|
| Android (WebView) com 9 pontes nativas | `MainActivity.java`: `RpgSceneDisplay`, `RpgBookBridge`, `RpgLanBridge`, `RpgCampaignBridge`, `RpgLocalHost`, `RpgDriveBridge`, `RpgSheetPdfBridge`, `RpgPixelPortraitBridge`, `RpgCreatureImageBridge` | Mesma interface; nenhuma ponte muda de nome | 2 a 5 |
| Servidor LAN (duas cópias idênticas) | `app/src/main/java/.../LocalCampaignServer.java`, `desktop/server/java/.../LocalCampaignServer.java` | Contratos de API mantidos | 2 |
| Linux e Windows (Electron) | `desktop/main.cjs`, `desktop/campaign-host.cjs`, `desktop/preload.cjs` | Mesma interface | 5 |
| Versão exibida | `MM_VERSAO` em `mastermind39_ui.js`, `app/build.gradle`, `package.json` | v2.0 (provisório) | 5 |

## Não migrado

Nenhum item foi descartado até agora.
