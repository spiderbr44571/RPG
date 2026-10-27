# Mastermind Linux Desktop 1.0.0 — port da v0.90 Android

## Escopo

Este port utiliza exatamente a mesma interface e motores JavaScript presentes na versão Android v0.90, mas apresentados em uma janela nativa Linux pelo Electron (Chromium).

Inclui:
- Personagens e fichas (Ordem Paranormal, D&D e GURPS), habilidades, inventários, temas e dados locais.
- Biblioteca, mecanismo de pesquisa offline e bestiário original.
- Canvas e editor de cenas com mouse, rolagem e teclado.
- Mesa ao vivo e interface de mestragem em layout amplo.
- Ateliê original do lyime incorporado na página usando uma segunda WebContentsView isolada e alinhada ao bloco visual, com captura para token.
- PDFs pessoais selecionados pelo gerenciador de arquivos, indexação de texto por página no Linux e visualização externa em janela PDF.
- Exportação nativa de fichas PDF, retratos PNG e tokens PNG; backups JSON locais.
- Layouts específicos para 1366 × 768, 1920 × 1080, telas ultrawide e múltiplos tamanhos de janela; painel da mesa mais amplo.
- Atalhos de teclado Ctrl+1...9, F11 para tela cheia, Ctrl+Shift+B para backup.
- Dados persistentes em diretório do usuário do Electron (normalmente ~/.config/Mastermind).

**Diferenças importantes em relação ao Android:**
1. Dados e fichas armazenados no celular não são copiados automaticamente. Exporte PDF/JSON do celular, e importe-os no Linux. O backup JSON do desktop não inclui livros PDF; estes são importados separadamente.
2. Os métodos nativos Android baseados em SAF, PdfRenderer e Intent foram substituídos. PDFs são indexados por pdfjs-dist localmente; visualização de páginas em janelas PDF próprias, e não por imagens renderizadas no diálogo do Android.
3. A hospedagem nativa de campanhas do APK Android (LocalCampaignServer.java) não foi replicada integralmente. A interface original permanece, mas a hospedagem da mesa em rede deve ser tratada separadamente. Existe servidor LAN Python básico do repositório, mas não se deve confundir seus endpoints com o servidor completo Android.
4. O Ateliê do lyime requer internet e suporte a WebGL/WASM. As sprites e os binários Godot não estão embutidos no pacote Linux.
5. A versão AppImage é x86-64. Não é um binário ARM/Android.

## Como instalar no CachyOS / Ryoku / Hyprland

Baixe o AppImage da [GitHub Release](https://github.com/spiderbr44571/RPG/releases/tag/mastermind-linux-v1.0.0-beta) e rode:

```bash
chmod +x Mastermind-Linux-1.0.0-x64.AppImage
./Mastermind-Linux-1.0.0-x64.AppImage
```

Se o AppImage reclamar de FUSE, use a alternativa sem montagem:

```bash
./Mastermind-Linux-1.0.0-x64.AppImage --appimage-extract-and-run
```

Ou use a distribuição .tar.gz incluída na mesma release.

O Electron usa a interface Wayland/X11 disponível. O driver NVIDIA mais recente do CachyOS é recomendado para a aceleração WebGL do Godot.

## Desenvolvimento

Requer Node.js 22+, npm, Python 3 (para preparar o ícone) e dependência Python Pillow.

```bash
python3 -m pip install pillow
python3 desktop/make_icon.py
npm --prefix desktop install
npm --prefix desktop test
npm --prefix desktop start
npm --prefix desktop run dist:linux
```

Pacotes gerados em `desktop/dist/`.

## Privacidade e segurança

- `main.cjs` registra a origem local `mastermind://app`. Só essa origem recebe o preload.
- Recursos externos do Godot são exibidos numa WebContentsView separada, sem Node.js e sem bridge Electron.
- O renderer local não possui acesso irrestrito ao filesystem. PDFs entram via seletor nativo e as operações de saída exibem um diálogo de salvamento.
- PDFs pessoais são copiados para um diretório privado do usuário, indexados por página, e não enviados a servidores.
- Não são incluídos PDFs comerciais, sprites privadas do lyime ou dados particulares do usuário nos arquivos de distribuição.
- Início de sessão remota e permissões de câmera/microfone não são autorizados automaticamente.

## Qualidade

O pipeline executa testes de unidade e regressão, abre o aplicativo com um display virtual Xvfb, compila AppImage e tar.gz e publica arquivos em GitHub Releases.

O aplicativo precisa ser conferido em um desktop Linux real (especialmente HiDPI, comportamento do Godot e PDF), pois o teste virtual não cobre todas as diferenças entre Wayland/Hyprland e X11.
