#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import ast

ROOT = Path(__file__).resolve().parent.parent / "apps" / "web"
LOCAL = {".css", ".js", ".html", ".png", ".svg", ".ico"}


class Inspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.assets = []
        self.stylesheets = []
        self.scripts = []

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
            if tag == "link" and values.get("rel") == "stylesheet":
                self.stylesheets.append(parts.path)
            elif tag == "script" and key == "src":
                self.scripts.append(parts.path)


def local_stage_files(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "static_files" for target in node.targets
        ):
            value = ast.literal_eval(node.value)
            if isinstance(value, set):
                return value
    return set()


def main():
    errors = []
    stage_assets = None
    for page in sorted(ROOT.glob("*.html")):
        inspector = Inspector()
        inspector.feed(page.read_text(encoding="utf8"))
        repeated = {item for item in inspector.ids if inspector.ids.count(item) > 1}
        if repeated:
            errors.append(f"{page.name}: IDs duplicados {sorted(repeated)}")
        for asset in inspector.assets:
            if not (ROOT / asset).is_file():
                errors.append(f"{page.name}: falta {asset}")
        if inspector.stylesheets and inspector.stylesheets[-1] != "shared/css/responsive.css":
            errors.append(f"{page.name}: shared/css/responsive.css debe cargarse al final")
        if page.name == "index.html":
            if "modules/formularios-datos/js/acceso.js" not in inspector.scripts:
                errors.append("index.html: falta modules/formularios-datos/js/acceso.js")
        if page.name == "portal.html":
            try:
                portal_idx = inspector.scripts.index("modules/portal-linterna/js/portal.js")
                for child in (
                    "modules/formularios-datos/js/inscripciones.js",
                    "modules/formularios-datos/js/buzon.js",
                ):
                    if inspector.scripts.index(child) < portal_idx:
                        errors.append(f"portal.html: portal.js debe cargarse antes que {child}")
            except ValueError as exc:
                errors.append(f"portal.html: falta script esperado ({exc})")
        if page.name == "escenario.html":
            try:
                ignite_idx = inspector.scripts.index("modules/hardware-encendido/js/encendido.js")
                stage_idx = inspector.scripts.index("modules/pantalla-gigante/js/escenario.js")
                if stage_idx < ignite_idx:
                    errors.append("escenario.html: encendido.js debe cargarse antes que escenario.js")
            except ValueError as exc:
                errors.append(f"escenario.html: falta script esperado ({exc})")
            stage_assets = {"/" + a.lstrip("/") for a in inspector.stylesheets + inspector.scripts}
    if stage_assets is not None:
        listed = local_stage_files(ROOT.parent.parent / "tools" / "local-stage.py")
        missing_in_stage = sorted((stage_assets | {"/escenario.html"}) - listed)
        if missing_in_stage:
            errors.append(f"tools/local-stage.py: faltan recursos de escenario {missing_in_stage}")
    for migration in sorted((ROOT.parent.parent / "supabase" / "migrations").glob("*.sql")):
        text = migration.read_text(encoding="utf8")
        if "begin;" not in text or "commit;" not in text:
            errors.append(f"{migration.name}: falta begin/commit")
    if errors:
        raise SystemExit("\n".join(errors))
    print("Estructura y recursos locales correctos.")


if __name__ == "__main__":
    main()
