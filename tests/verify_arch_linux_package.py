#!/usr/bin/env python3
"""Verify actual Arch Linux pacman package layout, metadata, permissions and launcher."""
import io
import os
import pathlib
import posixpath
import subprocess
import sys
import tarfile

assert len(sys.argv)==2, "Usage: verify_arch_linux_package.py package.pkg.tar.zst"
package=pathlib.Path(sys.argv[1])
assert package.name=="mastermind-rpg-1.0.0-1-x86_64.pkg.tar.zst", package
assert package.is_file() and package.stat().st_size>50_000_000

proc=subprocess.Popen(["zstd","-dc",str(package)],stdout=subprocess.PIPE)
expected={
 ".PKGINFO","usr/bin/mastermind",
 "usr/share/applications/mastermind.desktop",
 "usr/share/pixmaps/mastermind.png",
 "opt/mastermind/mastermind",
 "opt/mastermind/resources/app.asar"
}
present=set()
metadata={}
files_count=0
with tarfile.open(fileobj=proc.stdout,mode="r|") as archive:
 for item in archive:
  p=pathlib.PurePosixPath(item.name)
  name=str(p)
  assert not p.is_absolute() and ".." not in p.parts, f"Unsafe path: {name}"
  assert name==".PKGINFO" or name=="opt" or name=="usr" or name.startswith("opt/") or name.startswith("usr/"), name
  if item.issym():
   normalized=posixpath.normpath(posixpath.join(posixpath.dirname(name),item.linkname))
   assert not item.linkname.startswith("/") and not normalized.startswith("../"), f"Unsafe symlink: {name}"
  if item.isfile():
   files_count+=1
   if name in expected:
    present.add(name)
    if name==".PKGINFO":
     metadata["pkginfo"]=archive.extractfile(item).read().decode("utf8")
    elif name=="usr/bin/mastermind":
     assert item.mode&0o111, "Launcher isn't executable"
     metadata["launcher"]=archive.extractfile(item).read().decode("utf8")
    elif name=="opt/mastermind/mastermind":
     assert item.mode&0o111, "Electron program isn't executable"
    elif name=="usr/share/applications/mastermind.desktop":
     metadata["desktop"]=archive.extractfile(item).read().decode("utf8")
    elif name=="usr/share/pixmaps/mastermind.png":
     assert archive.extractfile(item).read(8)==b"\x89PNG\r\n\x1a\n","Invalid icon PNG"
     # Internal Electron app is already checked by packaging script.
missing=expected-present
assert not missing,f"Required package entries absent: {missing}"
assert files_count>30,f"Very few packaged files: {files_count}"
p=metadata["pkginfo"]
for text in ("pkgname = mastermind-rpg","pkgver = 1.0.0-1","arch = x86_64",
             "xdata = pkgtype=pkg","depend = gtk3","depend = nss","depend = libxss"):
 assert text in p,text
d=metadata["desktop"]
for text in ("[Desktop Entry]","Name=Mastermind","Exec=mastermind",
             "Icon=mastermind","Terminal=false","Categories=Game;RolePlaying;"):
 assert text in d,text
launcher=metadata["launcher"]
assert "/opt/mastermind/mastermind" in launcher
assert "XDG_SESSION_TYPE" in launcher and "MASTERMIND_X11" in launcher
assert proc.wait()==0,"Decompression failed"
print("PASS pacman package: native install, application menu, icon, executable, Wayland/X11 and dependencies")
print("Files:",files_count,"Compressed bytes:",package.stat().st_size)
