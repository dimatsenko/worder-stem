const LANGUAGES = {
  uk: {
    label: 'УКР',
    accessibleLabel: 'Мова документа: українська. Перемкнути на English',
    title: 'Switch to English',
  },
  en: {
    label: 'EN',
    accessibleLabel: 'Document language: English. Switch to Ukrainian',
    title: 'Перемкнути на українську',
  },
};

/** Show one document translation without navigating or scrolling the page. */
export function initDocumentLanguage() {
  const button = document.querySelector('button.language-switch');
  if (!button) return;

  const sections = [...document.querySelectorAll('[data-document-language]')];
  let selectedLanguage = 'uk';

  function showLanguage(language) {
    selectedLanguage = language;
    const labels = LANGUAGES[language];

    sections.forEach((section) => {
      section.hidden = section.dataset.documentLanguage !== language;
    });
    button.textContent = labels.label;
    button.setAttribute('aria-label', labels.accessibleLabel);
    button.title = labels.title;

    const heading = sections.find((section) => !section.hidden)?.querySelector('h1');
    if (heading) document.title = heading.textContent;
  }

  // Keep existing links to individual sections working in either translation.
  function followLanguageAnchor() {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    const section = document.getElementById(id)?.closest('[data-document-language]');
    if (section) showLanguage(section.dataset.documentLanguage);
  }

  const initialLanguage = new URLSearchParams(location.search).get('lang');
  showLanguage(initialLanguage === 'en' ? 'en' : 'uk');
  followLanguageAnchor();

  button.addEventListener('click', () => {
    const nextLanguage = selectedLanguage === 'uk' ? 'en' : 'uk';
    const url = new URL(location.href);
    url.hash = '';
    url.searchParams.set('lang', nextLanguage);
    history.replaceState(null, '', url);
    showLanguage(nextLanguage);
  });
  window.addEventListener('hashchange', followLanguageAnchor);
}
