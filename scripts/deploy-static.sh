#!/usr/bin/env bash
set -euo pipefail
DEST="${1:?Indica el directorio de destino}"
cd "$(dirname "$0")/.."
mkdir -p "$DEST"
cp -R apps/web/. "$DEST"/

# Keep links shared while Pages was serving the repository root.
mkdir -p "$DEST/apps/web"
for source in apps/web/*.html; do
  page=${source##*/}
  cat > "$DEST/apps/web/$page" <<HTML
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>CIYA Navidad 2026</title>
  <script>
    const target = new URL('../../$page', location.href);
    target.search = location.search;
    target.hash = location.hash;
    location.replace(target.href);
  </script>
</head>
<body><a href="../../$page">Abrir CIYA Navidad 2026</a></body>
</html>
HTML
done
