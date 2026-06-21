(() => {
  const KEY = 'elegant-theme';

  const apply = (theme) => {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(KEY, nextTheme);

    const button = document.getElementById('themeToggle');
    if (button) {
      const isLight = nextTheme === 'light';
      button.innerHTML = isLight
        ? '<i class="fas fa-moon"></i><span>Тёмная тема</span>'
        : '<i class="fas fa-sun"></i><span>Светлая тема</span>';
      button.setAttribute('aria-label', isLight ? 'Включить тёмную тему' : 'Включить светлую тему');
      button.title = isLight ? 'Включить тёмную тему' : 'Включить светлую тему';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.id = 'themeToggle';
    button.type = 'button';
    button.className = 'theme-toggle';
    button.addEventListener('click', () => {
      apply(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    });

    const header = document.querySelector('header');
    const nav = header?.querySelector('nav');
    if (header && nav) {
      header.insertBefore(button, nav);
    } else if (header) {
      header.appendChild(button);
    } else {
      document.body.prepend(button);
    }

    apply(localStorage.getItem(KEY) || 'dark');
  });
})();
