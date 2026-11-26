#!/usr/bin/env bash
set -euo pipefail
DEST="${1:?Indica el directorio de destino}"
cd "$(dirname "$0")/.."
mkdir -p "$DEST"
cp -R apps/web/. "$DEST"/

write_redirect() {
  local destination="$1" target="$2"
  cat > "$destination" <<HTML
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>CIYA Navidad 2026</title>
  <script>
    const target = new URL('$target', location.href);
    target.search = location.search;
    target.hash = location.hash;
    location.replace(target.href);
  </script>
</head>
<body><a href="$target">Abrir CIYA Navidad 2026</a></body>
</html>
HTML
}

# Keep links shared while Pages was serving the repository root.
mkdir -p "$DEST/apps/web"
for source in apps/web/*.html; do
  page=${source##*/}
  write_redirect "$DEST/apps/web/$page" "../../$page"
done

# Former links into the schedule continue to resolve.
write_redirect "$DEST/bases.html" 'cronograma.html'
write_redirect "$DEST/apps/web/bases.html" '../../cronograma.html'
