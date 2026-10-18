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