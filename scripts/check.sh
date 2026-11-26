#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1; then
  for file in $(find apps/web -type f -name '*.js' | sort); do
    node --check "$file"
  done
  node --test tests/unit/*.test.cjs
else
  python3 - <<'PY'
from pathlib import Path
import esprima
import re
for path in sorted(Path('apps/web').rglob('*.js')):
    code = re.sub(r'catch\s*\{', 'catch (ignored) {', path.read_text(encoding='utf8'))
    esprima.parseScript(code)
print('JavaScript parseado con esprima (node no disponible).')
PY
fi
python3 tools/check-structure.py
