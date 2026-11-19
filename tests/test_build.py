"""Build safety and generated-site checks; run with Python's unittest module."""
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from unittest.mock import patch
from urllib.parse import unquote, urlsplit

from scripts import build


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.assets = []
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag in ('img', 'script') and 'src' in attrs:
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'icon'):
            self.assets.append(attrs['href'])


class BuildTests(unittest.TestCase):
    def test_render_is_deterministic_and_outputs_are_current(self):
        for page in build.PAGES:
            with self.subTest(page=page.slug):
                html = build.render_page(page)
                self.assertEqual(html, build.render_page(page))
                self.assertEqual(html, (build.ROOT / f'{page.slug}.html').read_text())
                self.assertNotRegex(html, r'{{|{%')
                self.assertNotIn('data:image/', html)
        self.assertEqual(build.bundle_styles(), (build.ROOT / 'site.css').read_text())

    def test_local_links_assets_and_ids(self):
        documents = {
            f'{page.slug}.html': Document(build.render_page(page))
            for page in build.PAGES
        }
        for filename, document in documents.items():
            with self.subTest(page=filename):
                self.assertEqual(len(document.ids), len(set(document.ids)))
                for reference in document.assets + document.links:
                    url = urlsplit(reference)
                    if url.scheme or url.netloc:
                        continue
                    target = url.path.lstrip('/') or filename
                    source = build.ROOT / target
                    public_asset = build.ROOT / 'public' / target
                    self.assertTrue(source.is_file() or public_asset.is_file(), reference)
                    if url.fragment and target in documents:
                        self.assertIn(unquote(url.fragment), documents[target].ids)

    def test_template_errors_fail_explicitly(self):
        with tempfile.TemporaryDirectory() as folder:
            templates = Path(folder)
            (templates / 'missing.html').write_text('{{ missing_value }}')
            (templates / 'cycle.html').write_text('{% include "cycle.html" %}')
            with patch.object(build, 'TEMPLATES', templates):
                with self.assertRaisesRegex(ValueError, 'Missing template value'):
                    build.render('missing.html', {})
                with self.assertRaisesRegex(ValueError, 'Circular template include'):
                    build.render('cycle.html', {})
                with self.assertRaisesRegex(ValueError, 'outside template directory'):
                    build.expand_includes('../outside.html')


if __name__ == '__main__':
    unittest.main()
