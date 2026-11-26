#!/usr/bin/env bash
set -euo pipefail
DEST="${1:?Indica el directorio de destino}"
cd "$(dirname "$0")/.."
mkdir -p "$DEST"
cp -R apps/web/. "$DEST"/
