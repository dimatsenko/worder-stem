/** Close the native mobile menu when the visitor follows a navigation link. */
export function initNavigation() {
  const menu = document.querySelector('.menu');
  if (!menu) return;

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) menu.open = false;
  });
}
