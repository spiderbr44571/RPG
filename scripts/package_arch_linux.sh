#!/usr/bin/env bash
# Build a real installable Arch Linux/CachyOS package from the trusted Linux release.
# Installs in /opt/mastermind and exposes /usr/bin/mastermind and an app-menu entry.
set -euo pipefail
if [[ $# -lt 2 ]]; then
  echo "Uso: $0 <Mastermind-v1.0.0-Linux-x64.tar.gz> <diretorio-destino>" >&2
  exit 2
fi
archive="$(realpath "$1")"
destination="$(realpath -m "$2")"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
name=mastermind-rpg
version=1.0.0
release=1
arch=x86_64
file="$name-$version-$release-$arch.pkg.tar.zst"
[[ -s "$archive" ]] || { echo "Archive Linux ausente: $archive" >&2; exit 2; }
[[ -f "$repo/app/src/main/assets/mastermind_logo.png" ]] || {
  echo "Logo original Mastermind não encontrada" >&2; exit 2;
}
mkdir -p "$destination"
workspace="$(mktemp -d)"
trap 'rm -rf "$workspace"' EXIT
root="$workspace/pkg"
install_root="$root/opt/mastermind"
mkdir -p "$install_root" "$root/usr/bin" "$root/usr/share/applications" "$root/usr/share/pixmaps"
tar -xzf "$archive" -C "$install_root" --no-same-owner

# electron-builder tar.gz normally contains its executable at the archive root.
# Handle a single top-level folder gracefully, but never assume an arbitrary path.
if [[ ! -x "$install_root/mastermind" ]]; then
  mapfile -t possible < <(find "$install_root" -maxdepth 3 -type f -name mastermind -perm /111)
  if [[ ${#possible[@]} -ne 1 ]]; then
    echo "Pacote Electron inesperado: executável mastermind não localizado" >&2
    find "$install_root" -maxdepth 2 -type f | head -35 >&2 || true
    exit 3
  fi
  nested="$(dirname "${possible[0]}")"
  if [[ "$nested" != "$install_root" ]]; then
    mkdir -p "$workspace/flattened"
    cp -a "$nested"/. "$workspace/flattened/"
    rm -rf "$install_root"
    mkdir -p "$install_root"
    cp -a "$workspace/flattened"/. "$install_root/"
  fi
fi
[[ -x "$install_root/mastermind" ]] || { echo "Binário principal não executável" >&2; exit 3; }
[[ -f "$install_root/resources/app.asar" ]] || {
  echo "Pacote Electron sem resources/app.asar — interface do Mastermind ausente" >&2
  exit 3
}
cat > "$root/usr/bin/mastermind" <<'LAUNCHER'
#!/usr/bin/env bash
# Installed, desktop-integrated Mastermind launcher for Arch/CachyOS.
set -e
cd /opt/mastermind
if [[ "${MASTERMIND_X11:-0}" == "1" ]]; then
  exec /opt/mastermind/mastermind --ozone-platform=x11 "$@"
fi
if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
  exec /opt/mastermind/mastermind --ozone-platform-hint=auto "$@"
fi
exec /opt/mastermind/mastermind "$@"
LAUNCHER
chmod 755 "$root/usr/bin/mastermind"
cat > "$root/usr/share/applications/mastermind.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Version=1.0
Name=Mastermind
GenericName=Plataforma de RPG de mesa
Comment=Fichas, mapas, mesa virtual, livros e Ateliê de personagens
Exec=mastermind
TryExec=/usr/bin/mastermind
Icon=mastermind
Terminal=false
StartupNotify=true
StartupWMClass=mastermind
Categories=Game;RolePlaying;
Keywords=RPG;Mastermind;Ordem Paranormal;Dungeons;GURPS;Mesa;Ficha;Dados;
DESKTOP
chmod 644 "$root/usr/share/applications/mastermind.desktop"
install -m 644 "$repo/app/src/main/assets/mastermind_logo.png" "$root/usr/share/pixmaps/mastermind.png"

# Local packages use the Pacman .PKGINFO specification; no post-install script
# or remote downloads are needed. Files are owned by root inside the archive.
installed_size="$(du -sb "$root/opt" "$root/usr" | awk '{sum+=$1} END{print sum}')"
cat > "$root/.PKGINFO" <<PKG
pkgname = $name
pkgbase = $name
pkgver = $version-$release
pkgdesc = Mastermind RPG para Linux (desktop, Ateliê Godot, fichas, canvas e mesa)
url = https://github.com/spiderbr44571/RPG
builddate = $(date +%s)
packager = Mastermind GitHub Actions
size = $installed_size
arch = $arch
license = custom
xdata = pkgtype=pkg
depend = glibc
depend = gtk3
depend = nss
depend = alsa-lib
depend = libxss
depend = libxtst
depend = libnotify
depend = xdg-utils
depend = at-spi2-core
depend = libsecret
optdepend = poppler: pesquisa de texto em livros PDF locais
PKG

if command -v desktop-file-validate >/dev/null 2>&1; then
  desktop-file-validate "$root/usr/share/applications/mastermind.desktop"
fi

uncompressed="$workspace/package.pkg.tar"
tar -C "$root" --sort=name --owner=0 --group=0 --numeric-owner \
  -cf "$uncompressed" .PKGINFO opt usr
zstd -q -f -T0 -8 "$uncompressed" -o "$destination/$file"
(
  cd "$destination"
  sha256sum "$file" > "$file.sha256"
)
echo "Package: $destination/$file"
echo "Install: sudo pacman -U \"$file\""
echo "Open: mastermind (or the Mastermind icon in the application launcher)"
echo "Remove: sudo pacman -Rns mastermind-rpg"
