# Prompt do revamp

Texto do prompt como foi aprovado, seguido das correções encontradas na Fase 0. Em caso de conflito, valem as correções.

```text
PROMPT: REVAMP VISUAL DO RPG MESA (ESTILO OWLBEAR RODEO), COM TODAS AS INTEGRAÇÕES E TUTORIAL GUIADO OPCIONAL

CONTEXTO
Repositório spiderbr44571/RPG. O app (RPG Mesa / Mastermind) tem um único código para três plataformas:
- Android: APK com WebView, gerado de app/ (Gradle).
- Linux e Windows: Electron, gerado de desktop/.
- Os dois usam os mesmos arquivos em app/src/main/assets.
O modo multijogador é uma mesa em rede local (LAN) hospedada pelo aparelho do mestre, com servidor em LocalCampaignServer.java. Existem duas cópias idênticas desse arquivo (app/src/main/java/... e desktop/server/java/...). Qualquer mudança de regra precisa ser replicada nas duas.
A versão exibida no app vem de MM_VERSAO em mastermind39_ui.js, e os testes conferem esse valor com app/build.gradle e package.json.

OBJETIVO
Refazer a interface inteira com o padrão de ergonomia do Owlbear Rodeo: o mapa em tela cheia como protagonista, ferramentas em uma barra lateral flutuante com submenus, painéis flutuantes discretos e um tutorial guiado opcional. Todas as funções atuais e todas as integrações listadas abaixo devem continuar disponíveis, integradas ao novo visual.

REFERÊNCIA DE INTERAÇÃO (OWLBEAR RODEO)
Antes de desenhar, abra o Owlbear Rodeo ao vivo, navegue pelas ferramentas e tire capturas de tela. Copie o modelo de interação, não a marca:
- mapa em tela cheia, sem cabeçalho fixo ocupando espaço do mapa;
- barra de ferramentas vertical flutuante, com ícones, tooltip e atalho de teclado; ferramentas agrupadas, com submenu para variações (movimento, desenho, formas, medição, névoa);
- menu da sala no canto superior esquerdo e avatares dos jogadores no canto superior direito;
- arrastar um token da biblioteca direto para o mapa;
- menu de contexto (clique direito ou toque longo) sobre token, com as ações mais comuns;
- painel de propriedades do token aparece ao selecioná-lo;
- zoom com roda + Ctrl e com pinça; deslocamento do mapa com botão do meio ou espaço + arrastar;
- medição de distância na grade;
- ferramenta de névoa com pincel para ocultar e revelar áreas.
Não copie logotipos, ícones, textos, código ou ativos da Owlbear sem verificar a licença. Recrie o padrão de interação com os ativos do projeto.

DIFERENÇAS OBRIGATÓRIAS EM RELAÇÃO À OWLBEAR
- O multijogador continua sendo LAN, com convite por link e endereço IP do anfitrião. Não introduza contas, nuvem, serviços externos nem novos hosts de rede sem autorização explícita.
- As regras (limites de movimento, iniciativa, filtragem de dados ocultos, rolagens) continuam no servidor. A interface nunca decide resultado de regra e nunca exibe dado que o jogador não deveria ver.
- Os modos Combate e Interlúdio e os limites de movimento por sistema são funções existentes e precisam ser preservados.

INTEGRAÇÕES E FUNÇÕES QUE PRECISAM CONTINUAR
Use esta lista como inventário de paridade. Cada item deve aparecer no novo design, com a origem indicada entre parênteses:
1. Sistemas: 39 sistemas catalogados (rpg_system_catalog.json, catalog_*.json), motor D&D 5e com SRD 5.1 (rpg18_dnd_engine.js), motor GURPS 4e (rpg16_gurps_engine.js), Call of Cthulhu 7e (mastermind_coc7_engine.js) e Ordem Paranormal (pacote systems/ordem-paranormal-v1.3.pack.json e 22 poderes em mastermind55_powers.json).
2. Bestiário multissistema: 48 criaturas de Ordem Paranormal, criaturas de D&D e criaturas personalizadas. Imagens e dados importados são reutilizados. Cada instância no encontro tem PV próprios (rpg18_bestiary.js, rpg19_order_creatures.js).
3. Biblioteca no Google Drive: 209 livros cadastrados somente como links e metadados, abertos na conta autorizada. Nenhum livro comercial é copiado (mastermind50_drive_library.css, docs/PLANO-BIBLIOTECA-DRIVE.md).
4. PDFs pessoais: importação pelo seletor do sistema, extração e indexação locais (PdfBox-Android e SQLite FTS4 no Android), páginas renderizadas por PdfRenderer, busca com trechos e referência de página, indexação retomável com progresso (mastermind51_private_books.js, PdfTextSearch.java).
5. Consulta offline (rpg28_context_search.js), que funciona sem IA e sem rede, e Consulta com IA opcional (rpg23_ai_core.js, rpg24_ai_quality.js). A IA nunca inventa regra fora dos trechos indexados.
6. Mesa ao vivo LAN: Mestragem, convite, sincronização por polling a cada ~2 s, rolagens autenticadas com histórico compartilhado, fichas de jogadores, aprovação de fichas enviadas, atribuição de token a jogador, Canvas privado do mestre.
7. Ficha do jogador: ficha completa, aba Poderes e Transcender (mastermind55_player_powers.js, mastermind56_local_powers.js), aparência, e exportação de ficha em PDF (rpg17_sheet_pdf.js, mastermind_system_pdf.js, mastermind_ordem_template.js).
8. Estúdio de cenários: mapas em grade (até 60 × 60), salas ocultáveis, até 16 cenários, 75 áreas e 250 tokens por cenário. Camadas do mapa (mastermind68_map_layers.js), atmosfera (mastermind69_atmosphere.js), volume e marcações (mastermind72_volume.js), rotação de token (mastermind52_range.js).
9. Ateliê e retratos: criador de retratos pixel (mastermind99_atelier*.js, pixelportrait86_companion.*) e os scripts scripts/atelie_*.py que geram as camadas.
10. Canvas por campanha: cartões, ligações coloridas e mídia local em IndexedDB (mídia não vai para localStorage).
11. Editor de sistemas e studio de fichas (mastermind_system_editor.js, mastermind_sheet_studio.js).
12. Dados e rolagens: dado flutuante que abre a Central, rolagem pública ou só para o mestre, notação com modificador.
13. Desktop: Electron (desktop/main.cjs, desktop/campaign-host.cjs, desktop/preload.cjs). Confirme antes de remover o health check do Godot (desktop/godot-health.cjs).
14. Temas e aparência: tema paranormal, modo claro e escuro, cor personalizada, roda RGB e fontes escolhidas em Configurações.

DESIGN
- Parta dos tokens existentes, depois consolide em tokens semânticos em :root. Valores atuais observados: fundo #0c0e16, painel #1c1c28, linha #574d57, destaque #dca4bd, texto #f1e8e3, texto secundário #afa1b0. Preserve os temas e a cor personalizada escolhidos pelo usuário.
- Mapa é o fundo. Painéis flutuam sobre ele com borda sutil e sombra leve. Use um único destaque por tela.
- Um único conjunto de ícones (mastermind74_icons.js). Os emojis hoje usados como ícones de ferramenta devem ser avaliados para substituição, para manter a consistência visual.
- Tipografia: a fonte escolhida pelo usuário em Configurações tem prioridade. Use escala tipográfica fixa e números tabulares em valores que se alinham.
- Movimento de 150 a 220 ms. Respeite prefers-reduced-motion.
- Densidade confortável no celular e compacta no desktop. Alvos de toque com pelo menos 44 px.
- Responsivo: Android em retrato e paisagem, tablet e desktop, sem rolagem horizontal da página.
- Acessibilidade: foco visível, navegação completa por teclado, rótulos ARIA em todas as ferramentas, contraste AA nos temas claro e escuro.
- Qualidade visual é requisito, não acabamento. A nova interface deve ser comparável em acabamento às melhores ferramentas de mesa virtual, e visivelmente do mesmo app.

TUTORIAL GUIADO (OPCIONAL)
- Na primeira abertura, o app oferece "Fazer o tutorial" e "Pular". O tutorial também pode ser reaberto em Configurações > Ajuda.
- "Pular tutorial" fica visível em todas as etapas, e "Pular etapa" também.
- Cada etapa destaca o controle real com um recorte sobre a tela (spotlight) e mostra um cartão curto com três partes: o nome do controle, o que ele faz, e um passo "Experimente: ..." que só avança quando a ação real acontece. Quando o usuário não consegue fazer a ação agora, há a opção de pular a etapa.
- Ordem sugerida para o mestre: ferramentas do mapa, adicionar token da biblioteca, mover token, medir distância, névoa, rolagem de dados, iniciativa, painel de jogadores, convite, modo Interlúdio, Canvas.
- Ordem sugerida para o jogador: entrar com o convite, ver a mesa, mover o próprio token, rolar dado, abrir ficha e poderes.
- O tutorial usa uma "Campanha de treino" separada, com tokens de exemplo. Ele nunca altera campanhas reais, fichas reais ou o histórico de rolagens reais. A campanha de treino pode ser apagada ao final.
- Nenhuma ferramenta fica bloqueada durante o tutorial. O usuário pode usar o app livremente.
- Texto em português direto, curto e sem jargão. Evite explicações longas dentro do cartão.
- O progresso é salvo em localStorage com try/catch. Se o armazenamento não estiver disponível, o tutorial funciona sem salvar progresso.
- Cada etapa precisa de teste automatizado de navegador (Playwright). Rode os testes sem trace por padrão (--trace off).

PROCESSO E ENTREGÁVEIS
- Fase 0, inventário de paridade: uma lista com cada função e integração acima, o arquivo de origem e o status (migrada, pendente ou não migrada, com motivo).
- Fase 1, design e protótipo: um protótipo navegável das telas principais (Mestragem, Mesa ao vivo, Entrada pelo IP, Biblioteca, Ficha e Configurações). Capturas em celular (retrato e paisagem) e desktop, nos temas claro e escuro. Peça aprovação antes de implementar.
- Fase 2, shell e mesa ao vivo: estrutura de telas, navegação, mesa do mestre e mesa do jogador.
- Fase 3, telas restantes: biblioteca, bestiário, ficha, ateliê, consulta, configurações e estúdio de cenários.
- Fase 4, tutorial guiado.
- Fase 5, validação: testes existentes e novos, builds de Android, Linux e Windows, atualização de MM_VERSAO e de versionName/package.json, e entrada no README no mesmo padrão das versões anteriores.

REGRAS DE TRABALHO
- Não remova função sem autorização. Se algo não couber no novo design, registre em "Não migrado" com o motivo.
- Não quebre dados. Campanhas, fichas, Canvas, mídia e preferências precisam continuar legíveis. Migrações devem ser idempotentes e não apagar registros existentes.
- Desenvolva na branch designada. Não abra pull request sem pedido explícito.
- Não inclua identificadores de modelo de IA em commits, PRs, código ou comentários.
- Nada é publicado na internet. Use somente a rede local.
- Não invente resultados de regra. Quando uma regra não estiver automatizada, o app deve dizer isso.

CRITÉRIOS DE ACEITE
- Todas as linhas do inventário estão migradas ou justificadas.
- Nenhum erro de console nas telas principais, no WebView do Android, no Chromium e nos executáveis empacotados.
- O tutorial pode ser pulado em qualquer etapa, sem efeito colateral sobre dados.
- Capturas aprovadas em retrato e paisagem, claro e escuro, sem sobreposição, texto cortado ou elemento fora da tela.
- Os testes existentes em tests/ e desktop/tests/ continuam passando, ou têm a mudança de comportamento documentada.
```

## Correções da Fase 0

1. **Paleta (seção DESIGN).** Os valores `#0c0e16`, `#1c1c28`, `#574d57`, `#dca4bd`, `#f1e8e3` e `#afa1b0` são das
   páginas LAN antigas (`lan_master.html`, `lan_join.html`), não do app principal. Os tokens do app v0.107 estão em
   `app/src/main/assets/demo-offline.html`:
   - escuro: fundo `#0b0d12`, painel `#12151d`, painel 2 `#181c25`, linha `#292c37`, texto `#e8e7e7`,
     secundário `#92939f`, destaque `#c7a87b`, roxo `#9c90dd`, verde `#86bd9c`;
   - claro (`.light`): fundo `#f3f0ea`, painel `#fffdf9`, linha `#d6d1ca`, texto `#242632`, destaque `#917149`.
2. **Fontes.** O app declara Cormorant Garamond (títulos) e DM Sans (texto), mas nenhum arquivo de fonte está no
   repositório. As duas (licença OFL) precisam ser empacotadas para funcionar offline e igual em todos os aparelhos.
3. **Godot (item 13).** Confirmado em uso: o Ateliê do desktop usa o Godot (`desktop/main.cjs`,
   `desktop/renderer.js`). O health check fica.
4. **Owlbear Rodeo.** O ambiente onde a Fase 1 foi feita bloqueia `owlbear.rodeo`. As capturas da referência
   ficaram pendentes; o protótipo segue o modelo de interação descrito neste prompt.
5. **Ícones.** `mastermind74_icons.js` tem 44 ícones. A nova interface usa 89; os 50 que faltam vêm do mesmo pacote
   Tabler (MIT) e estão listados em `prototipo/icones.js`.
