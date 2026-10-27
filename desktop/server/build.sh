#!/usr/bin/env bash
# Build a self-contained JVM server from the exact Android LocalCampaignServer.java engine.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
temp="$(mktemp -d)"
trap 'rm -rf "$temp"' EXIT
mkdir -p "$temp/lib" "$temp/classes" "$temp/merge"
source_base="$repo/desktop/server/java"
# Dependencies from canonical Maven Central, no runtime network dependency.
curl -fsSL --retry 3 -o "$temp/lib/nanohttpd.jar" \
  https://repo.maven.apache.org/maven2/org/nanohttpd/nanohttpd/2.3.1/nanohttpd-2.3.1.jar
curl -fsSL --retry 3 -o "$temp/lib/json.jar" \
  https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar
find "$source_base" -type f -name '*.java' -print0 | sort -z | xargs -0 javac \
  --release 17 -encoding UTF-8 \
  -cp "$temp/lib/nanohttpd.jar:$temp/lib/json.jar" -d "$temp/classes"
(cd "$temp/merge" && jar -xf "$temp/lib/nanohttpd.jar" && jar -xf "$temp/lib/json.jar")
# Discard outdated signatures and manifests from dependencies, retaining classes.
rm -f "$temp/merge/META-INF/MANIFEST.MF"
find "$temp/merge/META-INF" -type f \( -name '*.SF' -o -name '*.RSA' -o -name '*.DSA' \) -delete || true
mkdir -p "$repo/desktop/server/dist"
jar --create --file "$repo/desktop/server/dist/mastermind-campaign-server.jar" \
  --main-class dev.rpgmesa.demo.LinuxCampaignMain \
  -C "$temp/classes" . -C "$temp/merge" .
java -jar "$repo/desktop/server/dist/mastermind-campaign-server.jar" --help 2>&1 | head -2 || true
ls -lh "$repo/desktop/server/dist/mastermind-campaign-server.jar"
