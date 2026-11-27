from base64 import b64encode
from functools import partial
from html.parser import HTMLParser
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from runpy import run_path
import re
from threading import Thread
from urllib.parse import urljoin
import unittest


REPO = Path(__file__).resolve().parents[2]
STAGE = run_path(str(REPO / 'tools/local-stage.py'))
HOST = f"{STAGE['HOST']}:{STAGE['PORT']}"
AUTH = 'Basic ' + b64encode(b'escenario:clave-ficticia').decode()


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'script' and values.get('src'):
            self.paths.append(values['src'])
        if tag == 'link' and values.get('rel') == 'stylesheet':
            self.paths.append(values['href'])


class QuietStageHandler(STAGE['StageHandler']):
    def log_message(self, *args):
        pass


class LocalStageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = partial(QuietStageHandler, directory=str(STAGE['ROOT']))
        cls.server = ThreadingHTTPServer((STAGE['HOST'], 0), handler)
        cls.server.stage_auth = AUTH.encode()
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, path, *, authorization=AUTH, host=HOST, method='GET'):
        connection = HTTPConnection(STAGE['HOST'], self.server.server_port, timeout=2)
        headers = {'Host': host}
        if authorization is not None:
            headers['Authorization'] = authorization
        try:
            connection.request(method, path, headers=headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_requires_credentials_before_serving_stage(self):
        code, headers, _ = self.request('/escenario.html?modo=local', authorization=None)
        self.assertEqual(code, 401)
        self.assertIn('Basic', headers['WWW-Authenticate'])

    def test_rejects_incorrect_credentials(self):
        code, _, _ = self.request('/escenario.html', authorization='Basic d3Jvbmc=')
        self.assertEqual(code, 401)

    def test_rejects_an_unexpected_host(self):
        code, _, _ = self.request('/escenario.html', host='otro-equipo.local')
        self.assertEqual(code, 400)

    def test_serves_every_stage_dependency_over_loopback(self):
        code, _, body = self.request('/escenario.html?modo=local')
        self.assertEqual(code, 200)
        self.assertIn(b'escenario-root', body)
        assets = Assets()
        assets.feed(body.decode())
        self.assertGreater(len(assets.paths), 10)
        for path in assets.paths:
            with self.subTest(path=path):
                self.assertNotIn('://', path)
                code, _, resource = self.request('/' + path)
                self.assertEqual(code, 200)
                if path.endswith('.css'):
                    for dependency in re.findall(r"""url\(['"]?([^'")]+)""", resource.decode()):
                        resolved = urljoin('/' + path, dependency)
                        self.assertTrue(resolved.startswith('/'))
                        status, _, payload = self.request(resolved)
                        self.assertEqual(status, 200, resolved)
                        if resolved.endswith('.woff2'):
                            self.assertTrue(payload.startswith(b'wOF2'))

    def test_serves_only_stage_files(self):
        for path in ['/portal.html', '/cronograma.html', '/recepcion.html', '/.env.example', '/README.md']:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)

    def test_response_headers_apply_to_assets_and_errors(self):
        for path in ['/shared/js/sound.js', '/inexistente']:
            with self.subTest(path=path):
                _, headers, _ = self.request(path)
                self.assertEqual(headers['Cache-Control'], 'no-store')
                self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')

    def test_head_probes_the_console_without_downloading_it(self):
        code, headers, data = self.request('/escenario.html?modo=local', method='HEAD')
        self.assertEqual(code, 200)
        self.assertGreater(int(headers['Content-Length']), 0)
        self.assertEqual(data, b'')
