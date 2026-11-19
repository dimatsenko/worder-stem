#!/usr/bin/env python3
"""Render shared HTML templates and preserve the existing CSS cascade."""
from __future__ import annotations

import re
from dataclasses import dataclass
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / 'templates'
INCLUDE = re.compile(r'{%\s*include\s+"([^"]+)"\s*%}')
VARIABLE = re.compile(r'{{\s*([a-z_]+)\s*}}')

# Keep the shared cascade first, then section and document overrides.
STYLE_FILES = (
    'tokens.css',
    'base.css',
    'components/header.css',
    'sections/layout.css',
    'sections/hero.css',
    'sections/social-proof.css',
    'sections/features.css',
    'sections/reviews.css',
    'sections/faq.css',
    'components/footer.css',
)


@dataclass(frozen=True)
class Page:
    slug: str
    title: str
    document: bool = False
    app: bool = False


PAGES = (
    Page('app', 'Worder — вивчення англійських слів', app=True),
    Page('index', 'Worder — вивчення англійських слів з картками на iPhone'),
    Page('terms', 'Умови використання Worder', document=True),
    Page('privacy', 'Політика конфіденційності Worder', document=True),
)


def expand_includes(name: str, stack: tuple[str, ...] = ()) -> str:
    """Expand trusted local includes, rejecting missing files and cycles."""
    path = (TEMPLATES / name).resolve()
    if not path.is_relative_to(TEMPLATES.resolve()):
        raise ValueError(f'Template outside template directory: {name}')
    if name in stack:
        raise ValueError(f'Circular template include: {" -> ".join((*stack, name))}')
    text = path.read_text(encoding='utf-8')
    return INCLUDE.sub(
        lambda match: expand_includes(match[1], (*stack, name)).rstrip(), text
    )


def render(name: str, context: dict[str, str]) -> str:
    """Render explicit HTML slots. Text values are escaped by their caller."""
    def substitute(match: re.Match[str]) -> str:
        key = match[1]
        if key not in context:
            raise ValueError(f'Missing template value {key!r} in {name}')
        return context[key]

    return VARIABLE.sub(substitute, expand_includes(name))


def render_page(page: Page) -> str:
    if page.app:
        return render('pages/app.html', {
            'home': 'index.html',
            'bootstrap': (ROOT / 'src/scripts/app/bootstrap.js').read_text(encoding='utf-8'),
            'header_action': '<a class="download" href="index.html">Про Worder</a>',
        })
    home = 'index.html' if page.document else ''
    action = 'language-switch' if page.document else 'download-link'
    context = {
        'home': home,
        'header_action': render(f'components/{action}.html', {}),
        'title': escape(page.title),
        'body_attributes': ' class="legal-page"' if page.document else '',
        'metadata': '' if page.document else render('components/home-meta.html', {}),
        'page_styles': '<link rel="stylesheet" href="legal.css">' if page.document else '',
    }
    if page.document:
        context['document_content'] = '\n'.join(
            (ROOT / 'content' / 'legal' / page.slug / f'{lang}.html').read_text(encoding='utf-8')
            for lang in ('uk', 'en')
        )
        context['content'] = render('pages/legal.html', context)
    else:
        context['content'] = render('pages/home.html', context)
    return render('base.html', context)


def bundle_styles() -> str:
    """Bundle styles once so the browser avoids a chain of CSS imports."""
    return '\n'.join(
        f'/* {name} */\n' + (ROOT / 'src/styles' / name).read_text(encoding='utf-8')
        for name in STYLE_FILES
    )


def build() -> None:
    # Render before writing, so a missing include does not leave half-built pages.
    outputs = {f'{page.slug}.html': render_page(page) for page in PAGES}
    outputs['site.css'] = bundle_styles()
    outputs['app.css'] = (ROOT / 'src/styles/app/app.css').read_text(encoding='utf-8')
    outputs['legal.css'] = (ROOT / 'src/styles/pages/legal.css').read_text(encoding='utf-8')
    for name, content in outputs.items():
        (ROOT / name).write_text(content, encoding='utf-8')
    print(f'Built {len(PAGES)} pages, styles and the local-file fallback.')


if __name__ == '__main__':
    build()
