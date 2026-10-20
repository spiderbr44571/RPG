# Prévia instalada paralelamente — NÃO MESCLE ESTE BRANCH

Este branch muda apenas o applicationId e o rótulo visível para criar um aplicativo paralelo de teste. Dados locais não são migrados. Não mesclar em main, pois substituiria o identificador do aplicativo original.

# Mastermind v0.57 — correção das telas que não carregavam (20/10/2026)

A v0.55 incluía código para os poderes e a roda de ferramentas, mas **não estava operacional em todas as interfaces**. A v0.56 acrescentou a aba de poderes à tela principal do Android, mas faltavam duas correções cruciais. Foram identificadas em execução real em navegador com resolução mobile e corrigidas nesta versão:

1. **Android principal:** uma função embutida no arquivo `demo-offline.html` chamava uma variável `select` inexistente durante a inicialização do bestiário, causando `ReferenceError: select is not defined`. A mesma cópia incorreta existia em `rpg06.js`. Ambas agora usam um seletor explícito e nulo-seguro para `#canvas-creature-select`. A tela principal passou por teste no navegador, com navegação até **Fichas → Poderes / Transcender**, 22 opções no catálogo e nenhum erro de JavaScript no fluxo.
2. **Cena ao vivo:** `mastermind52_player_experience.js` consultava `#r52-sheet`, que nunca existiu, e acessava `.classList` em `null`. Isso interrompia a cadeia de inicialização antes de montar a roda v0.54 e o painel v0.55. Foi substituído por `#sheet-modal` com optional chaining. O teste mobile abriu a roda, a ficha e a seção **Poderes e Transcender** (22 cartões) sem exceções.
3. **Ficha do jogador pelo navegador:** o teste mobile também abriu **Poderes / Transcender** com os 22 cartões, verificando que a interface legada está acessível.
4. **Scripts sempre atualizados:** as rotas de JavaScript da mesa ao vivo agora devolvem `Cache-Control: no-store`, reduzindo o risco de servir recursos antigos após atualizar o APK.

O aplicativo exibe **v0.57** no cabeçalho para o usuário verificar a versão realmente instalada. Não desinstale versões antigas: atualize por cima para preservar personagens e campanhas. Estes testes automatizados e testes de interface em navegador não substituem uma sessão real em dois celulares Android.

---

# Mastermind v0.56 — hotfix de funcionalidades invisíveis na ficha principal

A v0.55 tinha sido compilada, mas **a nova aba de poderes não era carregada em `demo-offline.html`**, a interface principal do aplicativo Android. A maior parte do código estava nas páginas LAN usadas por jogadores conectados. O aplicativo também importava fichas de Ordem Paranormal para campanhas sem `systemId`, fazendo a aba desaparecer para jogadores conectados. Ambas as causas foram corrigidas nesta versão.

**Onde a mudança é visível:** abra **Personagens** no Mastermind Android. Junto ao seletor do personagem há o botão **✦ Poderes / Transcender**, e na navegação da ficha há a aba **✦ Poderes / Transcender**. A tela lista os 22 poderes paranormais, sugestões de poderes de classe, escolhas disponíveis por NEX, pré-requisito de dois poderes de Morte para Surto Temporal, opções aprendidas e histórico de progressão do personagem selecionado. Registrar uma escolha local grava `powers` e `powerChoices` na ficha específica, usando a mesma função de persistência de múltiplos personagens já utilizada no aplicativo. A fórmula local de sanidade considera as escolhas de Transcender no cálculo de SAN máximo.

**Mesa LAN:** a ficha do jogador conectada também ganhou aba de poderes independente de Habilidades/Rituais e a tela de cenário reconhece fichas antigas de Ordem sem identificador de sistema. Novas importações da Mestragem definem `systemId: 'ordem-paranormal'`, habilitando o módulo de poderes e o cálculo de distância correto.

**Como verificar:** a barra de navegação do Android passa a exibir **v0.56**. O teste automatizado v0.56 executa o widget de poderes da tela principal em um ambiente simulado, prova aprendizagem progressiva em NEX 15/30/45 e bloqueia Surto Temporal antes de duas escolhas de Morte; também verifica as rotas de entrada da ficha principal, da ficha LAN e do cenário.

**Limitação:** registrar poderes na ficha offline não é uma aprovação automática na campanha. Na mesa LAN o jogador ainda precisa solicitar e aguardar o mestre; habilidades individuais sem mecânicas confiáveis continuam exigindo revisão. As alterações da experiência visual radial continuam específicas do **Cenário LAN**, não da tela principal da Mestragem.

Não desinstale nem limpe os dados do aplicativo ao atualizar, para preservar fichas e campanhas. A compilação Android e o teste automatizado não substituem uma sessão real no celular.

---

# Mastermind v0.55 — progressão de poderes, Transcender e decisões do mestre

- A ficha pessoal e a ficha da Mesa ao Vivo agora oferecem a seção **Poderes e Transcender**, com as 22 escolhas paranormais cadastradas no pacote de Ordem Paranormal. As classes Combatente, Especialista e Ocultista recebem uma lista inicial de sugestões de poderes de classe e podem enviar outros nomes do livro à aprovação do mestre. **Essas sugestões e pré-requisitos além de Surto Temporal dependem de revisão pelo mestre**; não representamos o catálogo de classes como exaustivo ou integralmente automatizado.
- O motor de progressão registra escolhas em NEX **15, 30, 45, 60, 75 e 90%**, contando cada Transcender como uma escolha de poder de classe. Ao aprovar Transcender, o mestre aplica a renúncia ao ganho de sanidade da progressão (3/4/5 de SAN, conforme a classe) à ficha. A aquisição fica registrada por NEX e elemento, e nenhum pedido altera a ficha antes de passar pela aprovação do mestre.
- O pré-requisito específico **Morte 2** é verificado para **Surto Temporal**: são exigidos dois poderes paranormais anteriores do elemento Morte aprovados e registrados. Os demais pré-requisitos do livro ainda exigem conferência humana (cada escolha só entra na ficha após a aprovação do mestre).
- Na roda da Mesa ao Vivo há agora um atalho **Ações**. Em seu próprio turno o jogador pode solicitar **passar a vez**, **atrasar a iniciativa para depois de outro participante** ou **ativar Surto Temporal** (3 PE, uma vez por cena na implementação inicial). O mestre recebe uma fila de pedidos, com botões Aprovar/Recusar.
- Pela regra-base, Surto Temporal concede **uma ação padrão adicional**, não uma rodada completa. O mestre também tem um botão especial **Turno inteiro (regra da mesa)** para permitir a variante solicitada pelo grupo. O servidor debita 3 PE somente após autorização e acompanha ações/turnos extras em contadores explícitos; apenas o jogador pode marcar sua ação padrão extra como utilizada.
- Os pedidos são autenticados por jogador e só o mestre pode aprovar, rejeitar e reordenar a iniciativa. Rolagens permanecem livres fora do turno e as restrições de fog-of-war, token próprio e Interlúdio continuam.
- **Limite honesto:** os demais poderes do catálogo são apresentados e podem ser aprendidos com validação do mestre, mas os efeitos individuais ainda não possuem automações completas, porque o pacote de regras contém seus nomes e referências, não as regras descritivas integrais necessárias para a execução correta. Não serão inventados efeitos.

Recomendação: depois de instalar, confira o poder e a classe de cada personagem importado de versões anteriores, pois escolhas legadas em `powers` sem histórico de NEX não são contadas automaticamente como aquisições novas.

---

# Mastermind v0.54 — mapa limpo, roda de ferramentas e personalização unificada

**Objetivo:** devolver a maior parte da tela do celular ao mapa compartilhado com o mestre, sem perder acesso à ficha nem às ferramentas úteis durante a sessão.

- **Roda de ferramentas:** um único botão flutuante abre um menu radial de ações: ficha, dados, caderno, medição de distância, marcadores pessoais, inspeção de tokens, ordem de iniciativa e movimentação. O menu fecha após escolher uma ferramenta, ao tocar fora ou com Esc; fica fora da navegação por teclado enquanto fechado.
- **HUD compacto:** o retrato e os recursos principais ficam num cartão pequeno no canto inferior, que pode ser expandido quando necessário. Zoom do mapa e ajustes estão disponíveis por botões pequenos no cabeçalho. Rolações, mesa, turno e interlúdio continuam operando com os controles e o servidor anteriores.
- **Ficha completa e configurações:** o novo botão ⚙ abre a aparência no mesmo painel que contém a ficha completa. Um seletor alterna **Ficha completa ↔ Aparência**; a ficha detalhada original continua acessível diretamente do painel e permite editar atributos, perícias, inventário, rituais e textos conforme as permissões da campanha.
- **Tema consistente:** as preferências de tema (Base, Sangue, Conhecimento, Energia, Morte, Medo), cor personalizada, modo claro/escuro e tamanho da fonte usam exatamente a chave `rpg-player-look:<id da campanha>` da ficha original. O mapa, modal de dados, ficha e caderno aplicam o mesmo esquema. Alterações feitas na ficha original são relidas ao voltar para a mesa ao vivo, no foco e quando a aba retorna ao primeiro plano.
- **Autoria preservada:** as escolhas são privadas daquele aparelho/campanha. A interface não altera o tema artístico do grid escolhido pelo mestre, as posições de tokens, o mapa, áreas de névoa nem as regras de movimento/iniciativa. O servidor e seus endpoints continuam iguais, com duas rotas estáticas adicionais para os novos recursos visuais.
- **Acessibilidade e mobile:** botões de tamanho apropriado, nomes de ação, foco visível, fechamento da roda ao tocar fora, suporte à paisagem e respeito à redução de movimento do Android.

Este é um redesign do *cliente jogador* na mesa ao vivo, não uma mudança no sistema de RPG nem uma promessa de sincronizar preferências visuais entre aparelhos diferentes. O modo claro/escuro e o desenho radial ainda precisam de validação em celular real.

---

# Mastermind v0.53 — testes livres e Interlúdio

**Rolagens do jogador:** os testes e dados da mesa podem ser lançados quantas vezes forem necessários, inclusive fora da vez do personagem. O tempo mínimo de 1,2 segundo entre rolagens foi removido do servidor. A rolagem continua autenticada, validada e registrada no histórico compartilhado; o jogador não pode escolher o resultado. O consumo de movimento, as restrições de posicionamento e a execução narrativa de ações durante combate continuam sob controle das regras e do mestre.

**Modo Interlúdio:** o mestre alterna **Combate ↔ Interlúdio** tanto no painel de campanha quanto na mesa ao vivo e na interface web de mestragem. No Interlúdio, jogadores podem movimentar seus próprios tokens sem limite de quadrados e sem respeitar a ordem da iniciativa. A UI sinaliza **∞**, oculta a prioridade de turnos e pausa o avanço de rodadas. Os dados de iniciativa e rodada são preservados e retornam quando o mestre reativa o Combate. Ao alternar entre os modos, o deslocamento gasto é reiniciado, evitando que movimentos no Interlúdio consumam a cota do combate seguinte.

**Segurança da mesa:** somente a chave do mestre pode trocar o modo. Jogadores continuam restritos aos seus próprios tokens, áreas cobertas pela névoa permanecem inacessíveis e os dados ocultos não são enviados. Não houve mudança nas fichas, campanhas existentes ou no identificador do APK. Campanhas anteriores sem configuração de modo iniciam em Combate.

---

# Mastermind v0.52 — experiência do jogador na mesa ao vivo

**Mesa ao vivo reorganizada no celular:** o jogador mantém mapa, ficha, recursos e rolagens acessíveis sem precisar abandonar a cena. O painel contém **Mover**, **Medir**, **Marcar**, **Inspecionar** e **Caderno**. O HUD de movimento é compacto e o mapa continua com zoom, pinça, reposicionamento, tokens próprios e áreas encobertas. A ficha tem visualização legível de atributos, perícias, inventário, habilidades e recursos atuais. Os controles PV/PE/SAN (Ordem), PV (D&D) e HP/FP (GURPS) respeitam a ficha própria e são confirmados pelo servidor. O jogador não altera atributos nem edita fichas alheias.

**Distâncias orientativas por sistema:** escala calculada a partir do sistema do personagem vinculado à mesa. Ordem Paranormal: grid de 1,5 m por quadrado, corpo a corpo / toque adjacente, curto 9 m, médio 18 m, longo 36 m, extremo 90 m, indicação de alcance ilimitado somente se o efeito permitir. D&D 5e: 5 pés por quadrado; alcance de ações depende da regra específica. GURPS: aproximação de 1 m por quadrado neste mapa, já que seu grid real costuma ser hexagonal. O cálculo segue a diagonal equivalente a um quadrado usada na movimentação do servidor. Obstáculos, elevação, visibilidade e regras opcionais não são avaliados automaticamente. O mestre continua sendo a autoridade da cena.

**Anotações imersivas:** caderno por jogador com entradas de texto extensas, títulos, busca, registros vinculados à cena e marcadores diretamente no mapa. As notas são salvas pelo servidor da campanha (rota privada autenticada), com cache local separado por identidade de jogador para contingência, botão de sincronização e opção de copiar o registro completo. Marcadores próprios **não são publicados para outros jogadores**. O mestre que administra o servidor continua tendo acesso administrativo aos dados da campanha, portanto o caderno não deve ser tratado como um cofre secreto contra o administrador.

**Integração visual:** o modo claro e a cor personalizada selecionados na ficha do jogador também são aplicados à mesa ao vivo. A cena continua respeitando névoa do mestre e restrições de posse, turnos, deslocamento e resultados de dados confirmados no backend. A rolagem do menor entre dois d20 foi adicionada ao servidor para atributos 0 de Ordem Paranormal.

**Limites:** esta versão não implementa regras integrais de todos os RPGs, chat por voz, áudio espacial, compartilhamento universal de anotações nem verificação automática de linha de visão. São recursos possíveis em futuras etapas, após testes reais em dispositivos.

---

# Mastermind v0.51 — PDFs particulares em todos os sistemas

**Novo:** no detalhe de qualquer um dos 39 sistemas catalogados (incluindo D&D), a Biblioteca oferece o botão **Adicionar PDFs**. O seletor de documentos do Android permite selecionar um ou vários PDFs, inclusive os que a conta do usuário autoriza acessar via Google Drive. Cada documento é associado ao sistema selecionado, mantém permissão de acesso SAF e possui seu próprio índice de texto SQLite pesquisável (sem duplicar ou redistribuir os arquivos no APK). Um livro importado não substitui os outros; o leitor legado de Ordem Paranormal continua disponível.

**Pesquisa:** a seção *Consultar livros* agora consulta os PDFs pessoais importados do sistema escolhido, apresenta trechos curtos com referências às páginas físicas e abre as páginas selecionadas. A importação em lote registra até 40 arquivos de uma vez; apenas o primeiro começa a ser indexado imediatamente para não esgotar a RAM ao abrir arquivos grandes. Os demais mostram **Indexar/retomar**. Limites técnicos existentes de processamento (até 1400 páginas por PDF, necessidade de texto selecionável e espaço temporário suficiente) permanecem.

**Sistemas:** Ordem Paranormal, D&D 5e e GURPS mantêm seus motores de regras existentes. Para os demais sistemas, há agora uma **ficha manual personalizável por sistema**, com personagem, campanha, anotações e campos definidos pelo mestre. Isso é uma base de trabalho, não a implementação completa das regras oficiais de todos os 39 RPGs: regras, progressões, testes e condições dependem de módulos curados e validados especificamente.

**Direitos autorais e acesso:** os 209 livros do acervo do Drive continuam **somente como links/metadados** para abrir na conta autorizada. O APK não incorpora cópias integrais de livros comerciais de terceiros. PDFs particulares selecionados no próprio Android permanecem no armazenamento autorizado pelo usuário e são indexados localmente.

**Atualização segura:** mantém o identificador Android original, dados de fichas, biblioteca legada, Canvas, preferências e campanhas. Evite desinstalar versões anteriores antes de verificar o backup.

---

# Mastermind v0.50 — seleção de sistemas e catálogo do Drive

Corrige a tela **Consultar livros**, que carregava antes do catálogo de sistemas e exibia seletores vazios. O catálogo de 39 sistemas, o motor D&D 5e, o motor GURPS 4e e as criaturas de Ordem Paranormal agora são carregados antes da pesquisa. A pesquisa passa a oferecer os 39 sistemas, incluindo D&D, sem perder os filtros de edição.

A consulta traz um painel recolhível **Livros do seu Google Drive**, com links catalogados dos 209 livros/arquivos presentes na pasta Livros do Drive informado. O mestre pode selecionar um sistema (por exemplo, D&D, com 9 documentos), filtrar títulos e abri-los no Drive usando as permissões de acesso de sua conta. O APK guarda **somente metadados e referências**, não redistribui os PDFs comerciais.

**Limitação atual:** o índice local de texto PDF usado pela busca nativa ainda corresponde ao livro de Ordem Paranormal importado no Android. A pesquisa em D&D utiliza as regras estruturadas (SRD 5.1) e os links do catálogo; para texto integral de outras obras é necessário indexá-las por um fluxo autorizado, que não está incluído nesta versão. A interface impede misturar trechos locais de Ordem com resultados de D&D.

---

# Mastermind v0.49 — suporte a livros PDF maiores

Removido o limite fixo de 180 MB. A pesquisa local agora aceita PDFs grandes conforme o espaço livre, com cópia em blocos, verificação de armazenamento e progresso em MB. A extração e o índice continuam usando arquivos temporários e SQLite. PDFs volumosos podem levar tempo; falta de espaço é informada claramente. O limite de 1400 páginas e a necessidade de texto selecionável continuam.

---

# Mastermind v0.48 — busca PDF mais estável, sem travamento de memória

A pesquisa em palavras frequentes (por exemplo, **vida**) da v0.47 podia criar uma lista com até 1400 páginas inteiras na memória do aplicativo, causando lentidão e potencial fechamento do processo. A v0.48 usa SQLite FTS4 com consulta **paginada, apenas 20 ocorrências por vez**, contagem separada e sem importar todo o texto para Java a cada Ctrl+F.

A extração do PDF agora usa arquivos temporários para aliviar o heap Android (`MemoryUsageSetting.setupTempFileOnly()`), obtém a contagem de páginas rapidamente com `PdfRenderer` e tenta uma cópia local quando o provedor SAF não oferece arquivo navegável. Erros de extração, ausência de memória e problemas na leitura são registrados e apresentados na interface, com opção de **Retomar indexação**, em vez de mostrar "0/?" indefinidamente ou ocultar o motivo da falha. Os índices parciais válidos permanecem disponíveis.

**Observação:** o teste automatizado não substitui a verificação com seu PDF real em aparelho Android. PDFs protegidos, danificados ou digitalizados podem continuar sem extração de texto. Os dados pessoais do Mastermind não foram redefinidos.

---

# Mastermind v0.47 — pesquisa Ctrl+F progressiva com resumo por página

**Antes:** o app extraía o PDF inteiro dentro de uma única transação de banco de dados. As páginas só ficavam disponíveis para pesquisa ao final desse trabalho, mesmo quando o livro era muito grande.

**Agora:**
- O PDF pessoal é extraído localmente em uma thread separada e indexado em pequenos lotes confirmados (6 páginas por transação). A busca FTS4 consulta as páginas que já estão prontas enquanto o restante do livro é processado, com SQLite WAL para separar leituras e escrita.
- A interface atualiza as correspondências durante a extração, exibe cobertura parcial (ex.: 60/300 páginas) e mostra um resumo **extrativo** de até 3 passagens, com número de página e abertura no livro. Não inventa fatos, não usa IA e não reproduz capítulos inteiros.
- O índice fica salvo no dispositivo. Em consultas seguintes, o Ctrl+F usa o texto pronto e não precisa extrair tudo novamente. Uma indexação interrompida pode retomar da última página confirmada, sem apagar resultados anteriores.
- O usuário pode clicar em **Retomar indexação** se uma leitura parar. Ao importar outro livro, os resultados nunca misturam trechos do PDF anterior.
- **Limite técnico:** a primeira extração ainda pode demorar em PDFs muito grandes, complexos ou escaneados. Durante esse tempo, a pesquisa cobre apenas as páginas já indexadas. PDFs sem camada de texto ainda exigem OCR (não incluído nesta versão).

Os dados de fichas, campanhas e preferências permanecem inalterados. A biblioteca PdfBox-Android continua incluída, por isso o APK mantém o tamanho maior que versões anteriores.

---

# Mastermind v0.46 — correção de falha ao iniciar

Na v0.45 o indexador de PDF era criado como campo de `MainActivity` antes de o Android preparar o Context, causando falha ao iniciar o aplicativo. A v0.46 corrige a ordem: o indexador é criado somente após `super.onCreate`, com Context válido. Há um novo teste de regressão no CI para bloquear a inicialização prematura.

O aumento do APK em relação às versões de ~500 KB é causado pela dependência PdfBox-Android necessária para extrair texto de PDFs no dispositivo; os dados do usuário não são enviados a terceiros. Esta correção mantém as funcionalidades de busca da v0.45. Não desinstale nem limpe os dados do aplicativo antes de instalar uma atualização compatível.

---

# Mastermind v0.45 — pesquisa real nos PDFs da Biblioteca (offline)

**Problema resolvido:** importar o PDF na Biblioteca anteriormente permitia apenas ler/renderizar páginas; a pesquisa consultava somente registros resumidos e índices JSON opcionais. Na versão Android, o PDF pessoal selecionado agora é extraído e indexado em segundo plano pelo PdfBox-Android, com busca SQLite FTS4 privada no aparelho. A indexação é iniciada na importação ou ao abrir a consulta em instalações já existentes.

- **Busca abrangente:** palavras isoladas, expressões e prefixos de termos existentes na camada de texto do PDF (incluindo vida e nomes próprios). Remoção de acentos, normalização e tokens que ignoram perguntas introdutórias. Resultados paginados, até 20 páginas por vez, com referência à página física do arquivo.
- **Bestiário pesquisável:** catálogo estruturado do app passou a incluir nomes e registros de criaturas já cadastradas (por exemplo, Aracnasita).
- **Página original:** o botão de cada resultado abre a imagem daquela página gerada localmente pelo PdfRenderer. A extração de texto e o armazenamento SQLite não usam IA, rede, serviços externos ou cópias do PDF no APK.
- **Estado e diagnóstico:** a tela mostra páginas indexadas e andamento. PDFs escaneados sem texto selecionável não podem ser extraídos sem OCR; o aplicativo informa essa limitação em vez de alegar uma busca completa.
- **Escopo atual:** a extração nativa desta versão utiliza o PDF pessoal da Biblioteca de Ordem Paranormal associado via seletor Android. Outros sistemas continuam com o catálogo próprio e índices JSON importados. O novo PDF substitui o índice nativo anterior. Textos extraídos permanecem privados ao armazenamento do aplicativo.
- **Segurança:** leitura restrita à URI escolhida pelo usuário (SAF) e limites por tamanho/páginas. Os resultados são trechos curtos para localização, não reprodução integral da obra.

---

# Mastermind v0.44 — fotos individuais, perícias e rituais por NEX

- **Retrato por ficha:** novas fichas começam sem foto e não copiam a imagem de outro personagem. O upload fica ligado ao ID da ficha no momento da seleção (mesmo que o jogador troque de personagem antes de terminar). A ficha pode remover seu retrato individualmente. Retratos duplicados em arquivos antigos são preservados para evitar perda involuntária; remova-os na ficha correspondente caso tenham sido herdados.
- **Perícias em Ordem Paranormal:** mostra separadamente vagas para **perícias adicionais** e **upgrades de treinamento**. Seleções treinadas a +5 usam vagas de perícias; elevar o grau de +5 para +10 ou +10 para +15 usa pontos de upgrade, sem gastar uma nova seleção. Os ganhos de upgrade são calculados nos marcos de NEX **35% e 70%** (2 + Intelecto por marco). O máximo é Treinado antes de 35%, Veterano até 69%, Expert a partir de 70%. Origens e obrigatórias são preservadas.
- **Rituais:** progressão adaptada à regra da mesa solicitada: **1 escolha por patamar de NEX de Ocultista + 3 a cada círculo liberado**. 1º círculo em NEX 5%, 2º no 25%, 3º no 55% e 4º no 85%. O seletor desabilita opções de círculo indisponível, a ação recusa escolhas acima do limite e o contador mostra saldo. Essa quantidade de +3 por círculo é uma regra específica da mesa e não deve ser confundida com a progressão publicada no livro.
- **Compatibilidade:** não altera o identificador Android, personagens anteriores, dados do Canvas, mídia ou preferências. Registros preexistentes acima de novos limites não são apagados: recebem alerta e podem ser corrigidos pelo usuário.

---

# Mastermind v0.43 — excluir ligações diretamente no Canvas

- **Toque/clique na linha colorida:** abre um menu flutuante com nome dos dois pontos ligados e a ação **Excluir ligação**. A linha recebe uma zona transparente de toque de 23 px, funcionando também no Android. Selecionar a ligação não move o fundo do Canvas.
- **Edição acessível:** links podem ser selecionados com teclado por Enter/Espaço; botão Cancelar ou um toque fora fecha o menu.
- **Menos poluição visual:** a lista completa de ligações fica recolhida por padrão em **Ver lista de ligações (N)**; só é montada quando expandida, útil para campanhas grandes.
- **Segurança dos dados:** a exclusão afeta apenas o link escolhido do Canvas ativo. Se o salvamento falhar, a exclusão é desfeita para evitar perda acidental.
- **Compatibilidade:** mantém múltiplos Canvas, ligações por cor, áudios, vídeos, imagens e criaturas, preservando as personalizações e o identificador Android da v0.42.

---

# Mastermind v0.42 — Canvas por campanha, ligações coloridas e mídia local

- **Biblioteca de Canvas:** crie, nomeie, duplique, selecione e exclua quadros independentes com nome de campanha. Cada Canvas preserva separadamente suas anotações, imagens, criaturas, ligações e enquadramento (zoom/pan). A primeira execução migra o Canvas local da v0.41 sem apagar o snapshot anterior.
- **Relações coloridas:** modo Conectar itens; escolha uma cor livre ou predefinida e toque em dois elementos (cartões de texto, imagens, criaturas, vídeos ou áudios). Links podem ser removidos individualmente e são salvos por Canvas. O posicionamento das linhas acompanha os elementos ao arrastar.
- **Vídeos/áudios:** anexos locais via seletor nativo, com arquivos originais armazenados em IndexedDB, sem acrescentar blobs de vídeo/áudio ao localStorage. Suporta mídias aceitas pelo WebView do dispositivo (MP4/H.264 e MP3 costumam ser mais compatíveis). Limite por arquivo: 75 MB de vídeo, 25 MB de áudio, sujeito à quota do dispositivo. O Canvas salva apenas identificadores; mídia armazenada em um celular não é transferida automaticamente para outros aparelhos. Não há sincronização de áudio/vídeo na rede.
- **Mestragem:** seletor da biblioteca e minimapa contextual no painel do mestre para visualizar cartões/criaturas e conexões da campanha, com atalho para abrir o Canvas completo. Esse painel é local ao aplicativo e não envia automaticamente o conteúdo multimídia aos jogadores. Os controles de cena e turno continuam na Mestragem, mas foram retirados da tela do Canvas.
- **Compatibilidade:** não altera o identificador Android nem os temas/fontes existentes. Mantém o bestiário corrigido da v0.41 e os dados locais. Recomendado fazer backup dos dados antes de atualizar.

---

# Mastermind v0.41 — imagem no Canvas e bestiário corrigido

**Canvas:** o botão "Adicionar imagem" agora é botão primário original do cabeçalho, idêntico em tamanho e estilo ao "Novo cartão". O seletor de arquivos fica em nó próprio visível ao WebView Android (não dentro do cabeçalho legado ocultado), e abre diretamente a galeria/arquivos em um toque, com feedback após selecionar PNG, JPG ou WebP. O processamento comprime a imagem localmente e permite mover, dimensionar e salvar seus cartões, mantendo o Canvas anterior.

**Bestiário:** eliminado o antigo listener de captura que inseria uma Aberração de Carne fixa e o seletor temporário da demonstração. Apenas o catálogo multissistema determina o ID e os dados de cada criatura. Fichas oficiais como Kerberos usam nome, HP, defesa, ataques e origem da entrada correspondente; as fichas existentes continuam preservadas.

**Instalação:** versão Android 0.41.0 usa o mesmo applicationId e armazenamento, com versionCode incrementado para atualização sobre v0.40. APK de depuração (debug) e testes automáticos; recomenda-se backup dos personagens e do Canvas antes de atualizar.

---

# Mastermind v0.40 — imagens no Canvas infinito

O botão **Adicionar imagem** aceita PNG, JPG e WebP (arquivo original até 10 MB) em dispositivos Android e desktop, além de arrastar e soltar arquivos no Canvas no computador. As imagens são redimensionadas e comprimidas localmente, sem necessidade de servidor ou IA, e surgem como cartões de tipo **IMAGEM**, que podem ser movidos, redimensionados, duplicados, editados e removidos. O Canvas continua com zoom/pan por toque ou mouse e mantém cartões anteriores e os controles de criatura. A identidade visual e a personalização do Mastermind permanecem intactas.

O conteúdo comprimido das imagens fica salvo no mesmo snapshot local de anotações e pode acompanhar o snapshot manual enviado à campanha, respeitando os limites do armazenamento local e do servidor. Se a capacidade acabar, o aplicativo avisa e não insere o novo cartão. Não há ainda biblioteca de imagens independente nem sincronização contínua automática das imagens.

---

# Mastermind v0.39 — interface redesenhada e ficha real no painel inicial

**Painel inicial conectado à ficha real:** o cartão “Continuar de onde parou” consulta o controlador ativo de personagens, não exemplos ou uma segunda ficha. Ele mostra nome, retrato salvo no formato PNG/JPEG/WebP, classe, trilha, NEX, PV/PE/SAN e seus máximos calculados no motor de Ordem Paranormal. O botão **Abrir esta ficha** passa o identificador do personagem ao controlador e abre a ficha exata. A lista de fichas também possui atalhos individuais, respeitando a seleção salva.

**Correções no armazenamento:** novos personagens são persistidos imediatamente após a criação; cada troca salva a ficha anterior, confirma a nova, persiste o ID e notifica a página inicial. Não modifica os dados existentes nem o identificador do APK Android.

**Mudança visual completa:** nova tela de abertura com painel de sessão, apresentação do personagem real, ferramentas em cartões, painel de personagens e navegação mais clara. Estilos aplicados também à Mestragem, personagens, pesquisa, biblioteca, canvas e bestiário, reutilizando ações e módulos funcionais. No celular, barra inferior com atalhos de Início, Personagens, Mesa, Biblioteca, Canvas e menu “Mais” para consulta, bestiário e Configurações.

**Aparência existente preservada:** roda RGB, fontes, temas paranormais, escala e modo claro/escuro permanecem em Configurações, reutilizando os próprios componentes. A folha v0.39 deriva todas as cores principais das variáveis existentes (`--accent`, `--panel`, `--fg`, `--muted`), sem redefinir preferências.

**Nota:** a imagem do personagem é carregada apenas dos dados locais já aprovados e inseridos pelo usuário. Não existem retratos fictícios pré-carregados.

---

# Mastermind 0.38 — interface unificada e carregamento sem telas antigas

**Nome oficial:** Mastermind. O nome visível e o título Android são atualizados, mantendo o mesmo `applicationId`, armazenamento local, chaves de preferências e compatibilidade com atualizações anteriores. A logo permanece provisória; nenhum ícone definitivo foi introduzido.

**Nova entrada:** o aplicativo não mostra mais a antiga página de demonstração no primeiro frame. A interface principal fica protegida até os módulos iniciarem, quando a nova página de trabalho substitui os cartões antigos. A tela inicial dá acesso direto às fichas, biblioteca, mestragem, bestiário, canvas e pesquisa offline, com indicação da ficha atualmente selecionada. Os dados são lidos dos registros locais, sem inventar campanhas.

**Navegação:** sidebar aprimorada em desktop, modo recolhido opcional, navegação inferior no celular e painéis responsivos. As telas funcionais continuam ativas; a ficha fictícia que apenas sustentava o protótipo antigo permanece invisível como compatibilidade temporária de código, não como aba ou página acessível.

**Personalização preservada:** roda RGB, temas paranormais, fontes, escala, animações, modo claro/escuro e cores de destaque seguem controlados pelos mesmos ajustes e armazenamento. Os botões de tema foram transferidos para Configurações sem reconstruir seus listeners. Nenhuma rotina apaga ou redefine preferências personalizadas; o antigo nome padrão 'PROJETO RPG' é a única opção migrada visualmente para 'Mastermind'.

**Funcionalidades mantidas:** hospedagem LAN pelo celular, mesa virtual, personagens, regras determinísticas, rituais, fichas de múltiplos sistemas, biblioteca, bestiário, pesquisa contextual sem IA obrigatória, canvas, assets, iniciativa e nevoeiro.

---

# RPG Mesa v0.37 — ficha individual, perícias e inventário

**Controle do mestre:** removidos da ficha os botões de turno, encerramento de cena e editor de efeitos temporários. A ficha mantém habilidades próprias, suas ações e exportação/importação; efeitos gerados por poderes continuam no motor de regras, mas são gerenciados na Mesa ao Vivo.

**Troca de ficha:** o seletor de personagens não é mais reconstruído durante o salvamento do personagem anterior. A nova seleção é capturada antes de persistir o anterior, então os campos e itens carregam conforme o ID selecionado.

**Perícias:** contador com escolhas livres por classe de Ordem Paranormal (Combatente 1+Intelecto, Especialista 7+Intelecto, Ocultista 3+Intelecto). Mostra treinamentos obrigatórios pendentes da classe, habilidades da origem concedidas e escolhas restantes. Ele evita novas escolhas livres acima do orçamento, sem mexer automaticamente em níveis de treinamento anteriores. Para sistemas sem fórmula cadastrada, informa que falta configurar a regra em vez de adivinhar.

**Inventário:** usa espaços (não quilogramas) e a regra de carga do livro de Ordem Paranormal: 5 espaços por ponto de Força, ou 2 se Força 0, permitindo bônus `extraCarrySpaces` definido pelo sistema/ficha. A categoria final agrega modificações e maldições. A patente define a quantidade de itens de categoria I/II/III/IV, usando a tabela 3.1; categoria 0 não consome limite de patente. Valores de espaços e limites ficam visíveis e exibem avisos de sobrecarga e excesso por categoria. **Itens não são removidos nem bloqueados** quando excedem esses limites.

A interface da ficha continua armazenada localmente, com fichas diferentes possuindo inventários e rituais independentes.

---

# RPG Mesa v0.36 — simplificação das fichas e da mestragem

**Ficha única.** Removido o grande painel espelhado “Ficha Viva • Base” da ficha de Ordem Paranormal. A ficha editável abaixo continua sendo a referência para atributos, perícias, PV/SAN/PE, inventário, habilidades, retrato, história e rituais. A ferramenta de dados permanece acessível.

**Rituais na própria ficha.** O “Grimório pessoal / Rituais conhecidos” mostra apenas poderes aprendidos, com **Ver regra** e **Usar** exclusivamente para rituais com executor validado. O custo em PE e os efeitos assistidos existentes foram preservados; os demais são consultivos. Rituais que não foram aprendidos não podem ser acionados pelo executor. A pesquisa offline da Biblioteca continua disponível para consultar outras habilidades.

**Mestragem única.** Foi removido o antigo “Controle de cenas — Mestragem offline”, que possuía relógio paralelo não sincronizado com a campanha. O painel de Mestragem mantém as ferramentas de hospedagem, campanhas, jogadores e **Mesa ao Vivo**. Nesta mesa, **Encerrar cena** controla o encerramento real no servidor, atualiza cena, encerra efeitos temporários da cena e reinicia a iniciativa. Modificadores temporários de ataque/defesa/perícias são registrados junto aos efeitos do personagem, com valor entre −20 e +20, para consulta no motor de regras; somente testes cujo executor tiver suporte usam esses valores automaticamente.

**Temas.** Escolher um personagem deixa de trocar o tema global do app. A escolha de aparência continua separada e voluntária na tela de temas. O controle “Trocar elemento” da ficha espelhada foi removido. Campos e dados dos personagens existentes permanecem preservados.

**Compatibilidade.** O contador local antigo não controla mais campanhas; o histórico do usuário não é apagado por esta migração. Integrações do mestre e jogadores seguem funcionando na rede local, inclusive iniciativa, fog of war, movimento e dados.

---

# RPG Mesa v0.35 — iniciativa clara, deslocamento e nevoas

**Mesa ao vivo — mestre:** o personagem/criatura da vez fica visível no topo do painel, sobre o mapa e marcado na lista de iniciativa. O token recebe contorno verde. O botão **Próximo turno** seleciona o próximo participante e reinicia o deslocamento gasto.

**Deslocamento por sistema:** padrão de Ordem Paranormal = **9 quadrados**, D&D 5e = **6**, GURPS = **5** (valor inicial editável). Em **Mesa ao vivo → Movimento por sistema**, o mestre altera o padrão; no painel do token é possível definir um limite exclusivo entre 0 e 60 quadrados. Quando a ficha tiver um campo `movementSquares`, ele tem prioridade sobre o padrão do sistema. Um deslocamento diagonal conta como um quadrado por célula diagonal (Chebyshev); o servidor soma deslocamentos parciais no turno. Jogadores ficam bloqueados após gastar o limite ou tentar agir fora da iniciativa; o mestre pode reposicionar livremente. Sem iniciativa cadastrada, **+ Rodada** reinicia o deslocamento.

**Jogadores:** barras de PV/energia continuam no HUD. Abaixo delas, a barra **MOVE** informa quadrados restantes; a interface mostra o personagem da vez e destaca seu token.

**Estilos de ocultação:** no editor de cenários, escolha o visual padrão para novas áreas ou modifique cada sala. Opções **Sombras, Escuridão, Névoa densa, Escuro total**. Só muda a aparência; todas as opções continuam secretas até reveladas, com pixels protegidos no servidor. Mapas anteriores usam **Sombras** por padrão.

**Limites:** deslocamento calculado por distância Chebyshev entre origem/destino; o aplicativo ainda não mede caminhos com obstáculos sólidos nem ajusta automaticamente ações extras de movimento ou condições particulares do sistema.

---

# RPG Mesa v0.34 — grade confinada e tokens controláveis

- **Mesa ao vivo:** corrigido o posicionamento CSS do mapa. O grid passa a ser filho de um viewport posicionado, isolado e recortado, sem atravessar o cabeçalho ou as ferramentas do mestre.
- **Posicionamento preciso:** clique/arraste e pinça usam as dimensões reais de `getBoundingClientRect()` do tabuleiro transformado, mantendo exatidão após zoom, pan e redimensionamento da tela.
- **Vinculação automática:** ao atribuir uma ficha a um jogador, o servidor cria um token de personagem numa célula livre e revelada do cenário publicado, quando ainda não existe um token daquela ficha com controle associado. O código recupera campanhas antigas ao abrir a mesa. Não cria tokens dentro de salas ocultas.
- **Controle manual:** selecione qualquer token de personagem na mesa do mestre e defina qual jogador vai controlá-lo. A mesa remove tokens automáticos substituídos e mantém proteção para outros jogadores.
- **Ficha do jogador:** em **Mesa ao vivo → Jogadores e efeitos**, escolha a ficha pelo nome no seletor do jogador. Ao atualizar, o mapa do jogador deve exibir o token, com movimentação apenas pela sessão autenticada dele.
- **Limites:** se todas as células estiverem ocultas ou o mapa alcançar 250 tokens, será necessário revelar uma área ou liberar espaço antes de gerar tokens automaticamente. O mestre deve publicar o cenário para que os jogadores o recebam.

---

# RPG Mesa 0.32 — Iniciativa e Mesa ao Vivo unificada

### Um único fluxo para mestrar

Em **Mestragem → Mesa ao vivo**, o mestre acompanha o mapa compartilhado e pode tocar **Editar mapa** sem sair da campanha. O editor de cenários abre sobre a mesa; ao fechar, a visão do mestre é restaurada e sincronizada. A antiga entrada **Cenários** foi retirada do menu da campanha para não duplicar funcionalidades.

### Iniciativa

O mestre seleciona qualquer token (personagem ou criatura) e escolhe **Rolar iniciativa** ou **Definir valor**. A lista é ordenada do maior resultado para o menor (empates pelo nome) e salva no banco local da campanha. **Próximo turno** avança o destaque e a contagem de rodada ao terminar a lista, e atualiza a duração dos efeitos de turno. É possível remover participantes ou reiniciar a ordem. Os jogadores consultam a iniciativa na mesa, mas só recebem participantes visíveis em suas cenas. Jogadores não podem alterar a ordem de iniciativa.

### Dados detalhados

Cada rolagem mostra os dados individuais. Em **3d20**, por exemplo, `[19, 10, 2]` aparece ao lado do resultado. **Por padrão, rolagens com múltiplos d20 usam o maior resultado** (sistema Ordem Paranormal); uma opção de **Somar dados** continua disponível no painel de rolagens dos jogadores para situações em que a soma seja apropriada. Modificadores são somados ao resultado escolhido. O mestre também vê os dados individuais em suas rolagens privadas, que não são publicadas.

### Compatibilidade de caracteres no navegador

Respostas HTML/JS/CSS/JSON do servidor passaram a enviar diretamente bytes UTF-8 com charset explícito. Ícones que dependiam de símbolos não disponíveis em alguns navegadores foram substituídos por textos e iniciais legíveis, inclusive para tokens sem imagem. Os arquivos da campanha existentes não são sobrescritos.

### Testes e limitações

```bash
node tests/scenario_v32.test.cjs
```

A iniciativa é gerenciada manualmente pelo mestre e não calcula automaticamente bônus das fichas. O modo online permanece na rede LAN do anfitrião, sem necessidade de serviços externos; o mestre deve fornecer a notação de dados desejada.

---

# RPG Mesa 0.31 — Mesa compartilhada em tempo real (LAN)

**Mestragem → ◈ Mesa ao vivo** abre o grid publicado, mantendo acesso a todos os jogadores e criaturas. O mestre pode mover tokens, abrir fichas de criaturas (PV, defesa, ataques e notas cadastradas), ajustar PV, selecionar fichas de jogadores para efeitos, avançar rodadas, abrir o estúdio para editar o cenário e rolar dados para todos ou apenas para si. Notações não automatizadas devem ser consultadas no livro: a interface não inventa resultados de regras.

**Estúdio de cenários** passa a oferecer uma lista de criaturas indexadas por sistema (Ordem Paranormal: 48 registros; D&D 5e: SRD e personalizados) e fichas atribuídas à campanha. Outros sistemas mostram criaturas se cadastradas no bestiário do APK. Escolha o sistema, procure a criatura, selecione e toque no grid. Dados e imagens previamente importados são reutilizados quando compatíveis; a instância possui PV próprios para o encontro.

**Jogadores** recebem a mesa como tela inicial do link de convite, visualizando apenas o mapa e os tokens liberados pelo mestre. O HUD persistente na parte inferior apresenta retrato, nome e recursos do sistema: PV/PE/SAN em Ordem, HP/FP em GURPS e PV em D&D (com espaços mágicos quando cadastrados). As informações da ficha ficam em abas sobre o grid, e o botão Dados publica uma rolagem calculada pelo servidor para todos os jogadores. A ficha tradicional continua acessível pelo link no painel da ficha. A orientação paisagem pode ser solicitada no navegador do jogador, dependendo das permissões do aparelho.

**Privacidade e permissões:** rolagem privada só é devolvida ao mestre; jogadores não podem editar criaturas ou controlar tokens alheios. Atributos privados de monstros ocultos não são entregues aos jogadores, e áreas secretas continuam sendo filtradas pela API. O servidor do celular funciona exclusivamente na rede local; não o publique na Internet.

**Limitações atuais:** atualização por polling aproximadamente a cada 2 s (não há WebSocket), algumas criaturas só possuem estatísticas essenciais e requerem consulta ao livro para habilidades específicas, e movimentação não aplica automaticamente custo de deslocamento. O mestre edita o mapa pelo estúdio integrado, retornando ao vivo em seguida.

---

# RPG Mesa v0.30 — Estúdio de cenários em paisagem

A ferramenta **Mestragem → ✧ Cenários** agora abre um estúdio visual em tela cheia no Android. Enquanto o estúdio estiver aberto, o app solicita orientação paisagem; **✕ Sair** (ou Voltar) devolve à interface normal. Se houver alterações não salvas, é pedida confirmação antes de sair.

**Ferramentas do estúdio:** ✋ para mover o mapa; ◉ para posicionar/mover tokens; ▭ para desenhar uma sala retangular, ◯ para definir uma área circular; ⌫ para apagar tokens; zoom +, -, ajustar; seletor de cenários, botão de publicação e de salvar. A biblioteca lateral permite selecionar objetos e importar fundo de mapa JPG/PNG e retratos de tokens JPG/PNG/WebP, redimensionados no aparelho antes do envio. Para ocultar uma sala, desenhe sua área com arrastar/soltar: áreas novas iniciam ocultas, e o mestre alterna a visibilidade no painel lateral.

**Jogadores:** continuam abrindo seus links permanentes e a opção **▦ Cenário**. O servidor retira da resposta tokens secretos e recorta áreas secretas do fundo de mapa em vez de depender apenas de CSS. Movimentação só é permitida no token cujo jogador corresponde à ficha atribuída.

**Correções:** SVG ausente da opção **Rolagens** na Central da Mesa (a opção antes ficava sem ícone), escala da interface, toque e navegação. O dado flutuante continua a abrir a Central; para rolar dados, use a opção Rolagens.

**Limites atuais:** quadrícula com até 60 × 60 células, até 16 cenários, 75 áreas e 250 tokens por cenário. As áreas circulares são elipses inscritas na seleção e não modelam paredes físicas. Sem iluminação dinâmica, turnos de movimentação automáticos ou trilhas de colisão por paredes. Os mestres devem usar somente a rede local de confiança; não exponha o servidor à Internet.

---

# RPG Mesa v0.29 — Cenários de mesa e grid (LAN)

A v0.29 inclui um **editor de cenários** e o mapa interativo da campanha: mapas em grade, biblioteca de assets (personagens, criaturas, itens, objetos e temas de terreno), importação de imagens pessoais JPG/PNG/WebP compactadas, tokens vinculados ao jogador, salas ocultáveis e publicação para participantes da sessão local.

**Mestre (APK ou painel /master):** inicie o servidor Android em **Mestragem**, conecte-se e escolha uma campanha. Toque em **✧ Cenários**, crie a sala, selecione os assets, toque/arraste para distribuir tokens e desenhe salas com a ferramenta **Sala**. Use **Revelar/Ocultar** em cada sala, **Publicar** para definir a cena compartilhada e **Salvar na campanha** para persistir. Para permitir que um jogador mova o token dele, primeiro atribua uma ficha ao jogador na campanha, depois selecione um token do tipo Personagem e vincule o jogador no campo Controle.

**Jogadores (navegador da rede local):** entrem pelo convite pessoal, abram a ficha e escolham **▦ Cenário**. Apenas o token vinculado à ficha deles tem autorização para ser movimentado. Os conteúdos de salas ocultas e tokens secretos são filtrados no servidor; a névoa impede clicar e atravessar células ocultas. Alterações aparecem via sincronização periódica (aproximadamente 2 segundos). Ao sair, volte à ficha pelo botão superior.

**Limitações da primeira versão:** não há importador de mapas vetoriais, iluminação dinâmica, cálculo automático de alcance/deslocamento por regras de cada sistema ou conexão com o catálogo completo de bestiários. O movimento no grid é livre dentro das áreas reveladas; custos por rodada ainda serão uma etapa futura. Imagens enviadas ficam privadas no banco do servidor da campanha, limitado a aproximadamente 3,8 MB para impedir corrupção de arquivos. Rede LAN privada confiável apenas; não exponha a porta 8765 à internet.

**Correção adicional:** reforço de renderização/contraste do dado de navegação em todos os temas Android.

---

# RPG Mesa 0.28 — Pesquisa contextual offline

A aba **Consulta** utiliza um motor de pesquisa 100% local (`rpg28_context_search.js`), sem IA, chaves API, servidor ou rede.

## Como funciona

- Analisa termos da pergunta, suas flexões, famílias de conceitos e tipo de dúvida (efeitos, tempo, custos, condições, comparação e procedimento).
- Rankeia somente registros **do sistema e da edição selecionados**, com prioridade para assunto efetivo da pergunta. Quando "Todos" está ativo, pode selecionar o sistema explicitamente citado na pergunta.
- Relaciona trechos de páginas adjacentes do **mesmo livro, sistema e edição**, sem misturar sistemas.
- Monta explicação, condições, valores e fontes usando exclusivamente trechos indexados ou regras cadastradas. Informações não disponíveis não são inventadas.
- Reconhece contextos como "quando durmo, o que recupero?" e "parar depois da missão para recuperar energia", associando-os aos registros de interlúdio de Ordem Paranormal.
- Usa Índices PDF (JSON) privados importados no aparelho. Os 39 sistemas catalogados **não** significam que seus livros estejam integralmente pesquisáveis: textos não indexados não podem fundamentar respostas.

Os grupos de conceitos são editáveis na fonte. O algoritmo **não entende linguagem como uma IA**: é uma recuperação lexical-contextual com ontologia de sinônimos e priorização de evidências, sujeita a ambiguidades. Respostas devem ser verificadas nas páginas citadas.

## Testes

```bash
node tests/contextual_offline_search.test.cjs
```

---

# RPG Mesa 0.12 — Servidor dentro do Android

Agora o **APK pode hospedar campanhas diretamente no telefone**, sem computador, Termux nem Python. Todos os jogadores continuam usando o navegador da mesma rede local.

## Como hospedar
1. Instale o APK de teste no celular que ficará como anfitrião (pode ser do jogador ou do mestre).
2. No aplicativo, abra **d20 → Mestragem → Servidor neste celular → Iniciar servidor**.
3. Aguarde o status **Ativo**. O Android mantém uma notificação de serviço em primeiro plano.
4. Em **Conectar como mestre**, o aplicativo preenche automaticamente o endereço e a chave do servidor **deste próprio telefone**.
5. Crie uma campanha com nome, copie/compartilhe o convite e envie aos jogadores.
6. Cada jogador abre o link no navegador, escolhe um nickname e envia a própria ficha JSON para aprovação ou aguarda a atribuição do mestre.
7. O mestre administra as fichas, jogadores, rodadas, cenas, efeitos e snapshots do canvas dentro de Mestragem.

## Se o anfitrião for um jogador
O mestre abre o app no seu celular, acessa **Mestragem** e preenche o IP do telefone anfitrião e a chave administrativa fornecida **privadamente** pelo anfitrião. O mestre controla a campanha pelo aplicativo, mas os dados persistem no aparelho anfitrião. Isso exige confiança: o dono do telefone que hospeda pode tecnicamente ler ou alterar os dados armazenados nele.

## Limites e segurança
- É uma implementação experimental para **rede privada confiável** (Wi-Fi ou hotspot), sem conexão com servidores externos.
- O serviço não deve ser exposto à internet; não faça redirecionamento de porta no roteador.
- O endereço da campanha utiliza porta TCP **8765**. Mantenha os aparelhos na mesma rede e verifique isolamento de clientes.
- O servidor só permanece disponível enquanto o Android mantiver o processo e o serviço em primeiro plano; o sistema pode interrompê-lo, especialmente sob economia de bateria.
- O armazenamento fica privado dentro do app anfitrião, em `campanhas-android.json`. Desinstalar o aplicativo pode remover essas campanhas. Faça backup antes de atualizar/desinstalar.
- O servidor utiliza HTTP dentro da LAN, **não TLS**; informações e chave do mestre devem circular apenas numa rede confiável.
- O antigo servidor Python é legado e opcional, não mais obrigatório para hospedar campanhas.
- O APK compilado não prova o funcionamento em aparelhos físicos; use um segundo celular para validar entrada e sincronização.

---
## Documentação anterior (legada)
### Histórico da versão 0.9

Aplicativo experimental Android e protótipo web para RPG de mesa. Nome provisório. A versão 0.9 troca a antiga barra por **um d20 central**: ao tocar, rola o dado (aleatorização local) com animação de salto/rotação e abre uma central com Biblioteca, Fichas, Canvas, Bestiário, Mestragem, Consulta, Mesa em Rede e Configurações.

## Testar offline no Android
Abra o APK gerado por GitHub Actions (artefato `rpg-mesa-debug-apk`). O app funciona sem servidor. Ao importar um PDF pessoal, a miniatura da capa é gerada localmente a partir da **primeira página** e exibida na Biblioteca. O PDF não é distribuído pelo repositório nem enviado à nuvem.

Cada personagem pode receber um retrato JPEG/PNG/WebP. A ficha salva imagem e tema escolhidos no JSON local. Temas iniciais: Sigilo Rubro, Painel Tecnológico (inspirado em CRIS, sem copiar a identidade) e Dossiê Clássico.

## Servidor de mesa local
No computador (Python 3.10+):
```bash
python server/mesa_lan.py
```
Opcionalmente, defina o IP correto da LAN:
```bash
python server/mesa_lan.py --host-ip 192.168.1.10
```
O terminal imprime o endereço do **painel do mestre**, porta 8765 por padrão, e uma **chave administrativa secreta**. Ela deve permanecer privada; o arquivo `mesa-lan-privada.json` contém a chave e os convites e não deve ser versionado/compartilhado.

No Android: d20 → Mesa em Rede → **Copiar fichas locais**, depois **Conectar ao mestre** (informe o IP do PC); entre com a chave mostrada no terminal e cole o JSON no campo **Importar fichas**. O mestre passa a ver e editar todas as fichas pelo painel. O servidor cria **uma porta distinta para cada jogador** (8766, 8767, etc.) e exibe links individuais com tokens aleatórios. Os jogadores abrem os links no navegador da mesma rede e alteram exclusivamente os **recursos atuais** da própria ficha. Não podem mudar máximos, outras fichas ou configurações do mestre.

Os recursos numéricos da ficha offline são convertidos em atual/máximo no momento da importação; **revise bônus de origem, trilha e efeitos no painel mestre**, pois a conversão calcula somente os máximos base da classe.

A importação é explícita e feita uma vez para colocar os personagens na mesa. Durante a sessão, o **servidor é a fonte dos dados sincronizados**; mudanças futuras na cópia offline não se sincronizam automaticamente com o servidor (nem vice-versa). Uma evolução futura poderá integrar essa reconciliação.

### Segurança e limites
- Uso **somente em LAN confiável**. Não encaminhe portas no roteador nem exponha HTTP à internet.
- As portas dos jogadores têm tokens individuais e sessões separadas; o painel de mestre exige chave e aceita edições completas.
- Fichas são persistidas localmente, com arquivo privado e histórico de modificação via sistema de arquivos; faça backups antes de atualizar.
- A importação de PDFs é local. Livros comerciais não são redistribuídos.
- Build de teste, ainda não validado em aparelhos Android físicos.

## Desenvolvimento
```bash
python -m py_compile server/mesa_lan.py
node --check app/src/main/assets/rpg09.js
```
O workflow em `.github/workflows/android-debug.yml` compila `app-debug.apk` com Gradle/Android SDK do runner.