# Mastermind 1.0 — Linux Desktop (primeira versão)

## Arquitetura e fidelidade

O aplicativo desktop reutiliza **os mesmos arquivos HTML, CSS, JavaScript, catálogos e regras** que o Mastermind v0.90 para Android. A interface Linux é uma camada adicional carregada somente no desktop, em `desktop/desktop.css` e `desktop/renderer.js`, sem alterar o aplicativo Android.

O contêiner é Electron, com `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` e chamadas IPC restritas à página local do RPG. O Pixel Portrait Creator original do lyime é carregado em `WebContentsView` isolada, sem acesso às bridges do Mastermind. Não redistribuímos os recursos do artista.

### Funcionalidades incluídas

- Fichas, personagens, sistemas Ordem Paranormal, D&D e GURPS, poderes, perícias, grimório, inventário e dados: **mesmo motor web da versão Android**.
- Canvas infinito, mesa, mapas, bestiário e demais módulos web: **mesmo código compartilhado**.
- Interface com sidebar persistente, barra superior desktop, resoluções de 1024 px a 4K, scroll com mouse, atalhos `Ctrl+K` e `F11`.
- Ateliê Godot incorporado ao painel, zoom, enquadramento, recarga e captura de retrato/token.
- Importação e armazenamento de PDFs no diretório de dados do usuário, abertura no visualizador padrão e pesquisa textual com `pdftotext` (Poppler).
- Salvar PDF, retrato e token com diálogo nativo Linux.
- Persistência local via armazenamento do Chromium/Electron, sem conta ou servidor obrigatório.

### Limitações conhecidas

Este é o **primeiro port funcional**, não uma afirmação de paridade absoluta com todos os recursos Android:

- O servidor LAN embutido, o host de campanhas Android, bridges específicas de câmera, Android Storage Access Framework, indexação nativa de PDFs e integrações Android não foram reproduzidos integralmente. A UI e seus módulos web continuam incluídos, mas funções que dependam dessas bridges exigem implementação desktop adicional.
- A biblioteca de PDFs local do Linux é própria; não importa automaticamente o conteúdo privado do Android.
- Dados das fichas salvos no navegador do Android não migram automaticamente. Use as opções de exportação/importação de personagens disponíveis na interface.
- O Godot HTML5 precisa de internet, WebAssembly e aceleração gráfica compatível.
- O recurso de pesquisa de PDFs exige Poppler instalado: no CachyOS/Arch, `sudo pacman -S poppler`.
- Não há verificação visual em máquina CachyOS/Hyprland real no CI. O workflow compila em Ubuntu 24.04.

## Executar no CachyOS / Hyprland

### AppImage

```bash
chmod +x Mastermind-v1.0.0-Linux-x86_64.AppImage
./Mastermind-v1.0.0-Linux-x86_64.AppImage
```

Se o AppImage reclamar de FUSE, use:

```bash
./Mastermind-v1.0.0-Linux-x86_64.AppImage --appimage-extract-and-run
```

### Tarball

```bash
tar -xzf Mastermind-v1.0.0-Linux-x64.tar.gz
./mastermind
```

O caminho exato do executável pode variar conforme o layout do pacote gerado.

### Desenvolvimento

```bash
npm install
npm run start
npm run test:desktop
npm run dist:linux
```

## Privacidade e dados

O Electron usa o diretório de dados próprio do aplicativo, geralmente `~/.config/mastermind-rpg-desktop/`. PDFs adicionados pela biblioteca desktop são copiados para `mastermind-books`. Não remova esse diretório sem fazer backup.

A primeira abertura **não apaga nem migra automaticamente** a instalação Android. A versão Android v0.90 permanece independente.
