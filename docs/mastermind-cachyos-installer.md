# Instalar o Mastermind no CachyOS / Arch Linux

## Instalação de verdade pelo pacman

A versão nativa instala o Mastermind no sistema como qualquer outro aplicativo. Ela não precisa de executar um AppImage manualmente.

1. Baixe `mastermind-rpg-1.0.0-1-x86_64.pkg.tar.zst` na release **Mastermind Linux — Instalador CachyOS**.
2. Abra o terminal na pasta onde o arquivo foi baixado.
3. Instale:

```bash
sudo pacman -U ./mastermind-rpg-1.0.0-1-x86_64.pkg.tar.zst
```

O pacman verifica as dependências, instala o executável e registra o pacote.

Depois, procure **Mastermind** no lançador de aplicativos do Hyprland/Ryoku, ou abra pelo terminal:

```bash
mastermind
```

A instalação inclui:
- `/usr/bin/mastermind` — comando global para iniciar.
- `/usr/share/applications/mastermind.desktop` — entrada padrão no menu.
- `/usr/share/pixmaps/mastermind.png` — ícone do Mastermind.
- `/opt/mastermind/` — arquivos executáveis do aplicativo.
- Dependências nativas do Electron declaradas no pacote.

## Remover

```bash
sudo pacman -Rns mastermind-rpg
```

O gerenciador remove os arquivos instalados. Os dados pessoais da aplicação no diretório do usuário não são apagados automaticamente por um comando `pacman -Rns`.

## Alternativa para problemas de GPU/Wayland

O iniciador detecta Wayland automaticamente. Se a NVIDIA ou a WebView apresentar problemas gráficos no Hyprland, tente iniciar uma sessão XWayland:

```bash
MASTERMIND_X11=1 mastermind
```

## Pesquisa de PDFs locais

A pesquisa de livros por texto usa Poppler:

```bash
sudo pacman -S poppler
```

É uma dependência **opcional**, não exigida para abrir o Mastermind.

## Transparência

Este instalador usa os binários da primeira versão Linux `1.0.0`. Ele **não implementa novas funções** que ainda faltam no port desktop em relação ao Android; apenas permite instalar e desinstalar pelo pacman, com menu e ícone nativos.

O pacote é produzido pelo GitHub Actions e validado pelo próprio `pacman` dentro de um contêiner Arch Linux antes da publicação. O pacote não é assinado com uma chave GPG de repositório Arch; ao instalar um pacote local, confirme a origem na release do GitHub e, se desejar, compare com o arquivo SHA256 publicado.

A versão Android permanece independente, assim como os dados das fichas salvos nela.
