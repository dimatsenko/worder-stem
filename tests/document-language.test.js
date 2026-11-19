import test from 'node:test';
import assert from 'node:assert/strict';
import { initDocumentLanguage } from '../src/scripts/document-language.js';
import { initNavigation } from '../src/scripts/navigation.js';

function documentFixture(url) {
  const listeners = {};
  const button = {
    textContent: '',
    attributes: {},
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
  };
  const sections = ['uk', 'en'].map((language) => ({
    hidden: language === 'en',
    dataset: { documentLanguage: language },
    querySelector: () => ({ textContent: `Document ${language}` }),
  }));
  globalThis.location = new URL(url);
  globalThis.document = {
    title: '',
    querySelector: () => button,
    querySelectorAll: () => sections,
    getElementById: (id) => (id === 'english-section' ? { closest: () => sections[1] } : null),
  };
  globalThis.history = {
    replaceState: (_state, _unused, nextUrl) => {
      globalThis.location = new URL(nextUrl);
    },
  };
  globalThis.window = {
    addEventListener: (type, listener) => {
      listeners[type] = listener;
    },
    scrollTo: () => {
      throw new Error('Switching languages must not scroll');
    },
  };
  return { button, sections, listeners };
}

test('documents start in Ukrainian and toggle without anchor navigation', () => {
  const { button, sections, listeners } = documentFixture('http://localhost/terms.html');
  initDocumentLanguage();
  assert.deepEqual(
    sections.map((section) => section.hidden),
    [false, true],
  );
  listeners.click();
  assert.deepEqual(
    sections.map((section) => section.hidden),
    [true, false],
  );
  assert.equal(button.textContent, 'EN');
  assert.equal(document.title, 'Document en');
  assert.equal(location.search, '?lang=en');
  assert.equal(location.hash, '');
  listeners.click();
  assert.deepEqual(
    sections.map((section) => section.hidden),
    [false, true],
  );
});

test('language query and legacy section anchors are supported', () => {
  for (const url of [
    'http://localhost/privacy.html?lang=en',
    'http://localhost/privacy.html#english-section',
  ]) {
    const { sections } = documentFixture(url);
    initDocumentLanguage();
    assert.deepEqual(
      sections.map((section) => section.hidden),
      [true, false],
    );
  }
});

test('malformed anchors and unsupported languages keep the document usable', () => {
  const { sections } = documentFixture('http://localhost/terms.html?lang=unknown#%E0%A4%A');
  assert.doesNotThrow(initDocumentLanguage);
  assert.deepEqual(
    sections.map((section) => section.hidden),
    [false, true],
  );
});

test('the mobile menu closes for a nested link target, but not its summary', () => {
  let click;
  const menu = {
    open: true,
    addEventListener: (_type, listener) => {
      click = listener;
    },
  };
  globalThis.document = { querySelector: () => menu };
  initNavigation();
  click({ target: { closest: () => null } });
  assert.equal(menu.open, true);
  click({ target: { closest: () => ({ tagName: 'A' }) } });
  assert.equal(menu.open, false);
});

test('modules are safe on pages without their controls', () => {
  globalThis.document = { querySelector: () => null };
  assert.doesNotThrow(initDocumentLanguage);
  assert.doesNotThrow(initNavigation);
});
