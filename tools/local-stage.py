#!/usr/bin/env python3
"""Serve the stage from the laptop during a network outage."""

from base64 import b64encode
from functools import partial
from getpass import getpass
from hmac import compare_digest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
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
        static_files = ['/escenario.html', '/assets/css/app.css']
        static_files.extend('/assets/js/' + name + '.js' for name in (
            'config', 'data', 'store', 'ui', 'sound', 'draw', 'escenario'
        ))
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
