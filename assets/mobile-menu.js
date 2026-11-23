/* Unified mobile navigation handler. Desktop layout and styles are untouched. */
(function () {
  'use strict';

  var menus = [
    { button: 'mobileMenuBtn', links: 'navLinks' },
    { button: 'mn', links: 'nv' },
    { button: 'menu', links: 'links' }
  ];

  function closeAll() {
    menus.forEach(function (item) {
      var button = document.getElementById(item.button);
      var links = document.getElementById(item.links);
      if (!button || !links) return;
      links.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', function (event) {
    var clickedMenu = null;

    menus.forEach(function (item) {
      if (clickedMenu) return;
      if (event.target.closest && event.target.closest('#' + item.button)) {
        clickedMenu = item;
      }
    });

    if (clickedMenu) {
      var button = document.getElementById(clickedMenu.button);
      var links = document.getElementById(clickedMenu.links);
      if (!button || !links) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      var open = !links.classList.contains('open');
      closeAll();
      if (open) {
        links.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    menus.forEach(function (item) {
      var button = document.getElementById(item.button);
      var links = document.getElementById(item.links);
      if (!button || !links) return;

      if (links.contains(event.target)) {
        if (event.target.closest && event.target.closest('a')) {
          links.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
        }
      } else {
        links.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAll();
  });
})();