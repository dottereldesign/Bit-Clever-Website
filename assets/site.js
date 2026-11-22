    document.querySelector('.quote-form')?.addEventListener('submit', event => event.preventDefault());
    const mobileMenu = document.querySelector('#mobile-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileScreen = matchMedia('(max-width: 700px)');
    for (const child of document.querySelector('.header-nav').children) document.querySelector('.mobile-menu__nav').append(child.cloneNode(true));
    for (const child of document.querySelector('.header-actions').children) document.querySelector('.mobile-menu__actions').append(child.cloneNode(true));
    const closeMobileMenu = () => {
      document.documentElement.classList.remove('mobile-menu-open');
      mobileMenu.close();
      menuToggle.setAttribute('aria-expanded', 'false');
    };
    menuToggle.addEventListener('click', () => {
      mobileMenu.querySelector('img').src = document.querySelector('.site-logo img').src;
      mobileMenu.showModal();
      menuToggle.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('mobile-menu-open');
    });
    mobileMenu.querySelector('.mobile-menu-close').addEventListener('click', closeMobileMenu);
    mobileMenu.addEventListener('cancel', event => { event.preventDefault(); closeMobileMenu(); });
    mobileMenu.addEventListener('close', () => {
      document.documentElement.classList.remove('mobile-menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
    mobileMenu.addEventListener('click', event => { if (event.target.closest('a')) closeMobileMenu(); });
    mobileScreen.addEventListener('change', () => { if (!mobileScreen.matches && mobileMenu.open) closeMobileMenu(); });
    const header = document.querySelector('.site-header');
    let compact = false, scrollFrame = 0;
    const updateHeader = () => {
      scrollFrame = 0;
      const next = compact ? window.scrollY > 16 : window.scrollY > 64;
      if (next !== compact) {
        compact = next;
        header.classList.toggle('is-compact', compact);
      }
    };
    window.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
    }, { passive: true });
    window.addEventListener('pageshow', updateHeader);
    updateHeader();
    const menu = document.querySelector('.settings');
    document.addEventListener('pointerdown', event => { if (menu && !menu.contains(event.target)) menu.open = false; });
    let activeSettingsButton = null;
    const settingsHome = (restoreFocus = false) => {
      if (!menu) return;
      menu.querySelector('.settings-home').hidden = false;
      menu.querySelectorAll('.settings-submenu').forEach(panel => { panel.hidden = true; });
      menu.querySelectorAll('[data-settings-target]').forEach(button => button.setAttribute('aria-expanded', 'false'));
      if (restoreFocus) activeSettingsButton?.focus();
      activeSettingsButton = null;
    };
    menu?.addEventListener('click', event => {
      const button = event.target.closest('[data-settings-target]');
      if (button) {
        activeSettingsButton = button;
        menu.querySelector('.settings-home').hidden = true;
        const panel = document.getElementById(button.dataset.settingsTarget);
        panel.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        panel.querySelector('.settings-back').focus();
      } else if (event.target.closest('.settings-back')) settingsHome(true);
    });
    menu?.addEventListener('toggle', () => { if (!menu.open) settingsHome(); });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !menu?.open) return;
      if (activeSettingsButton) settingsHome(true);
      else { menu.open = false; menu.querySelector('summary').focus(); }
    });

    // Real anchors work across pages, with JavaScript disabled, and in new tabs.
    // Only enhance same-page clicks; never replace a cross-page URL with a query.
    document.addEventListener('click', event => {
      const link = event.target.closest('a.quote-cta[href="./#contact"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (mobileMenu.open) closeMobileMenu();
      const target = document.querySelector('#contact');
      if (!target) return;
      event.preventDefault();
      if (location.hash !== '#contact') history.pushState(null, '', '#contact');
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    // Support old bookmarked quote URLs without waiting for load/animation assets.
    const legacyURL = new URL(location.href);
    if (legacyURL.searchParams.get('quote') === '1') {
      legacyURL.searchParams.delete('quote');
      legacyURL.hash = 'contact';
      history.replaceState(null, '', legacyURL);
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'instant' });
    }
