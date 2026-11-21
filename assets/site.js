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
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu?.open) { menu.open = false; menu.querySelector('summary').focus(); } });

    // Keep normal anchor URLs, with a smooth arrival when coming from a subpage.
    document.addEventListener('click', event => {
      const link = event.target.closest('a.quote-cta');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (mobileMenu.open) closeMobileMenu();
      const target = document.querySelector('#contact');
      if (target) {
        event.preventDefault();
        history.replaceState(null, '', '#contact');
        target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      } else {
        event.preventDefault();
        const destination = new URL(link.href);
        destination.hash = '';
        destination.searchParams.set('quote', '1');
        location.assign(destination.href);
      }
    });
    if (new URLSearchParams(location.search).get('quote') === '1' && document.querySelector('#contact')) {
      const arrive = () => {
        const url = new URL(location.href);
        url.searchParams.delete('quote');
        url.hash = 'contact';
        history.replaceState(null, '', url);
        requestAnimationFrame(() => document.querySelector('#contact').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
      };
      if (document.readyState === 'complete') arrive();
      else window.addEventListener('load', arrive, { once: true });
    }
