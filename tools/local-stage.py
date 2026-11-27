#!/usr/bin/env python3
"""Serve the stage from the laptop during a network outage."""

from base64 import b64encode
from functools import partial
from getpass import getpass
from hmac import compare_digest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent / 'apps' / 'web'
HOST = '127.0.0.1'
PORT = 8080


class StageHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        if self.headers.get('Host') != f'{HOST}:{PORT}':
            self.send_error(400)
            return None
        supplied = self.headers.get('Authorization', '').encode()
        if not compare_digest(supplied, self.server.stage_auth):
            self.send_response(401)
            self.send_header('WWW-Authenticate', 'Basic realm="Escenario CIYA"')
            self.end_headers()
            return None
        path = urlsplit(self.path).path
        static_files = {
            '/escenario.html',
            '/shared/css/tokens.css',
            '/shared/css/base.css',
            '/shared/css/components.css',
            '/shared/css/responsive.css',
            '/shared/fonts/plus-jakarta-sans.woff2',
            '/shared/fonts/material-symbols.woff2',
            '/modules/pantalla-gigante/css/ranking.css',
            '/modules/pantalla-gigante/css/villancicos.css',
            '/modules/pantalla-gigante/css/ruleta.css',
            '/modules/pantalla-gigante/css/respaldo.css',
            '/modules/hardware-encendido/css/encendido.css',
            '/shared/js/config.js',
            '/shared/js/data.js',
            '/shared/js/store.js',
            '/shared/js/ui.js',
            '/shared/js/sound.js',
            '/modules/pantalla-gigante/js/draw.js',
            '/modules/hardware-encendido/js/encendido.js',
            '/modules/pantalla-gigante/js/escenario.js',
        }
        if path not in static_files:
            self.send_error(404)
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


def main():
    secret = getpass('Contraseña local de escenario (mínimo 8 caracteres ASCII): ')
    if len(secret) < 8 or not secret.isascii():
        raise SystemExit('Elige una contraseña de al menos 8 caracteres ASCII.')
    handler = partial(StageHandler, directory=str(ROOT))
    with ThreadingHTTPServer((HOST, PORT), handler) as server:
        server.stage_auth = b'Basic ' + b64encode(('escenario:' + secret).encode())
        print(f'Abre http://{HOST}:{PORT}/escenario.html?modo=local con el usuario escenario.')
        server.serve_forever()


if __name__ == '__main__':
    main()
