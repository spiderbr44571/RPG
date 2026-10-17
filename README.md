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