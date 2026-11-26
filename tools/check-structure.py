#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent / "apps" / "web"
LOCAL = {".css", ".js", ".html", ".png", ".svg", ".ico"}


class Inspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.assets = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])
        for key in ("href", "src"):
            target = values.get(key, "")
            parts = urlsplit(target)
            if parts.scheme or not parts.path or Path(parts.path).suffix not in LOCAL:
                continue
            self.assets.append(parts.path)


def main():
    errors = []
    for page in sorted(ROOT.glob("*.html")):
        inspector = Inspector()
        inspector.feed(page.read_text(encoding="utf8"))
        repeated = {item for item in inspector.ids if inspector.ids.count(item) > 1}
        if repeated:
            errors.append(f"{page.name}: IDs duplicados {sorted(repeated)}")
        for asset in inspector.assets:
            if not (ROOT / asset).is_file():
                errors.append(f"{page.name}: falta {asset}")
    for migration in sorted((ROOT.parent.parent / "supabase" / "migrations").glob("*.sql")):
        text = migration.read_text(encoding="utf8")
        if "begin;" not in text or "commit;" not in text:
            errors.append(f"{migration.name}: falta begin/commit")
    if errors:
        raise SystemExit("\n".join(errors))
    print("Estructura y recursos locales correctos.")


if __name__ == "__main__":
    main()
