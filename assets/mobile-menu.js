/* Mobile navigation toggle — behavior only; no desktop layout changes. */
(function () {
  'use strict';

  var menu = document.getElementById('mobileMenuBtn');
  var links = document.getElementById('navLinks');

  if (!menu || !links || menu.dataset.menuReady === 'true') return;
  menu.dataset.menuReady = 'true';

  function closeMenu() {
    links.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = '☰';
  }

  menu.addEventListener('click', function (event) {
    event.stopPropagation();
    var isOpen = links.classList.toggle('open');
    menu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menu.textContent = isOpen ? '✕' : '☰';
  });

  links.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('click', function (event) {
    if (!links.contains(event.target) && event.target !== menu) closeMenu();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });
})();