// A classic script can explain local-file restrictions before ES modules load.
const appRoot = document.getElementById('web-app');

if (location.protocol === 'file:') {
  appRoot.innerHTML = `<section class="app-empty">
    <h1>Відкрий вебнавчання</h1>
    <p>Навчання потрібно відкривати через адресу сайту, а не як файл із папки.</p>
    <a class="app-button primary" href="http://127.0.0.1:8765/app.html">Відкрити Worder</a>
    <p class="storage-note">Для локального запуску виконай <code>npm run dev</code> у папці проєкту, а потім натисни кнопку вище.</p>
  </section>`;
} else {
  window.addEventListener(
    'error',
    (event) => {
      if (!event.target?.matches?.('script[type="module"]')) return;
      appRoot.innerHTML = `<section class="app-empty">
      <h1>Не вдалося запустити навчання</h1>
      <p>Перевір з’єднання та онови сторінку. Збережений прогрес залишився в браузері.</p>
      <button type="button" class="app-button primary" id="reload-app">Спробувати ще раз</button>
    </section>`;
      document.getElementById('reload-app').addEventListener('click', () => location.reload());
    },
    true,
  );
}
