'use strict';

(() => {
  document.documentElement.classList.add('js');
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#primary-nav');
  const desktop = matchMedia('(min-width: 1180px)');

  function setMenu(open, returnFocus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'მენიუს დახურვა' : 'მენიუს გახსნა');
    navigation.classList.toggle('is-open', open);
    if (returnFocus) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    setMenu(false);
    if (wasOpen && link.hash) {
      const section = document.querySelector(link.hash);
      if (section) {
        section.setAttribute('tabindex', '-1');
        section.focus({ preventScroll: true });
        section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true });
      }
    }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true); });
  desktop.addEventListener?.('change', () => { if (desktop.matches) setMenu(false); });

  const products = [...document.querySelectorAll('[data-product-category]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  function filterProducts(category) {
    let count = 0;
    products.forEach(product => {
      const visible = category === 'all' || product.dataset.productCategory === category;
      product.hidden = !visible;
      if (visible) { count += 1; product.classList.add('is-visible'); }
    });
    filters.forEach(button => {
      const active = button.dataset.filter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#product-count').textContent = `${count} სადემონსტრაციო პროდუქტი`;
  }
  filters.forEach(button => button.addEventListener('click', () => filterProducts(button.dataset.filter)));
  document.querySelectorAll('[data-category-link]').forEach(link => link.addEventListener('click', () => filterProducts(link.dataset.categoryLink)));

  const dialogs = [...document.querySelectorAll('dialog')];
  const openers = new WeakMap();
  function openDialog(dialog, opener) {
    if (typeof dialog.showModal !== 'function') {
      alert('დემო ფორმების გამოსაყენებლად გახსენი საიტი განახლებულ ბრაუზერში. შეკვეთა არ გაგზავნილა.');
      return;
    }
    const previous = dialogs.find(item => item.open);
    const returnTarget = previous ? openers.get(previous) : opener;
    if (previous) previous.close();
    const menuWasOpen = toggle.getAttribute('aria-expanded') === 'true';
    setMenu(false);
    openers.set(dialog, menuWasOpen ? toggle : returnTarget);
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('is-locked');
    dialog.querySelector('[data-close]')?.focus({ preventScroll: true });
  }
  dialogs.forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!dialogs.some(item => item.open)) {
        document.body.classList.remove('is-locked');
        openers.get(dialog)?.focus({ preventScroll: true });
      }
    });
  });

  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const configs = [
    { dialog: document.querySelector('#preorder-dialog'), form: document.querySelector('#preorder-form'), title: 'preorder-title', successTitle: 'preorder-success-title' },
    { dialog: document.querySelector('#cake-dialog'), form: document.querySelector('#cake-form'), title: 'cake-title', successTitle: 'cake-success-title' }
  ];
  function resetForm(config) {
    config.form.reset();
    [...config.form.elements].forEach(field => { if (field.setCustomValidity) field.setCustomValidity(''); });
    config.form.elements.date.min = today();
    config.dialog.querySelector('.form-view').hidden = false;
    config.dialog.querySelector('.form-success').hidden = true;
    config.form.querySelector('.form-error').textContent = '';
    config.dialog.setAttribute('aria-labelledby', config.title);
  }
  function validate(config) {
    const fields = config.form.elements;
    [...fields].forEach(field => {
      if (!field.setCustomValidity) return;
      field.setCustomValidity('');
      let message = '';
      if (field.required && !field.value.trim()) message = 'გთხოვ, შეავსე ეს ველი.';
      if (!message && field.validity.tooLong) message = 'გთხოვ, შეამცირე ტექსტის სიგრძე.';
      if (!message && field.name === 'name' && !field.value.trim()) message = 'გთხოვ, მიუთითე სახელი.';
      if (!message && field.name === 'phone') {
        const digits = field.value.replace(/\D/g, '');
        if (!/^[+\d() .-]+$/.test(field.value) || digits.length < 7 || digits.length > 15) message = 'მიუთითე საცდელი ტელეფონის ნომერი, რომელიც 7–15 ციფრს შეიცავს.';
      }
      if (!message && field.name === 'date') {
        const value = field.value;
        const parsed = new Date(value + 'T00:00:00Z');
        const validDate = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
        if (!validDate) message = 'თარიღი მიუთითე ფორმატით: წელი-თვე-დღე, მაგალითად 2026-10-10.';
        else if (value < today()) message = 'აირჩიე დღევანდელი ან მომავალი თარიღი.';
      }
      if (!message && field.name === 'quantity' && (!Number.isInteger(Number(field.value)) || Number(field.value) < 1 || Number(field.value) > 50)) message = 'რაოდენობა უნდა იყოს მთელი რიცხვი 1-დან 50-მდე.';
      field.setCustomValidity(message);
    });
    return [...fields].find(field => field.willValidate && !field.validity.valid);
  }
  configs.forEach(config => {
    config.form.noValidate = true;
    config.form.addEventListener('input', () => { validate(config); config.form.querySelector('.form-error').textContent = ''; });
    config.form.addEventListener('change', () => { validate(config); config.form.querySelector('.form-error').textContent = ''; });
    config.form.addEventListener('invalid', event => { config.form.querySelector('.form-error').textContent = event.target.validationMessage; }, true);
    config.form.addEventListener('submit', event => {
      event.preventDefault();
      const invalid = validate(config);
      if (invalid) { config.form.querySelector('.form-error').textContent = invalid.validationMessage; invalid.focus(); return; }
      // Deliberately no fetch, email endpoint, WhatsApp link, cookies or storage.
      config.form.reset();
      [...config.form.elements].forEach(field => { if (field.setCustomValidity) field.setCustomValidity(''); });
      config.form.querySelector('.form-error').textContent = '';
      config.dialog.querySelector('.form-view').hidden = true;
      config.dialog.querySelector('.form-success').hidden = false;
      config.dialog.setAttribute('aria-labelledby', config.successTitle);
      config.dialog.scrollTop = 0;
      document.getElementById(config.successTitle).focus({ preventScroll: true });
    });
    config.dialog.addEventListener('close', () => { if (!config.dialog.open) resetForm(config); });
  });
  document.querySelectorAll('[data-preorder]').forEach(button => button.addEventListener('click', () => {
    const config = configs[0];
    resetForm(config);
    config.form.elements.product.value = button.dataset.preorder || '';
    if (button.hasAttribute('data-whatsapp')) config.form.elements.message.value = "გამარჯობა, მსურს ცომეულის წინასწარ შეკვეთა.";
    openDialog(config.dialog, button);
  }));
  document.querySelectorAll('[data-cake]').forEach(button => button.addEventListener('click', () => { resetForm(configs[1]); openDialog(configs[1].dialog, button); }));

  const demos = {
    phone: ['ტელეფონი — დემო', '+995 000 00 00 00 საცდელი, არამოქმედი ნომერია. რეალურ საიტზე ამ ღილაკით საცხობში დარეკავდი. დემოში ზარი არ ხორციელდება.'],
    email: ['ელფოსტა — დემო', 'ელფოსტის მისამართი სადემონსტრაციოა და შეტყობინებებს არ იღებს. დემოში წერილი არ იგზავნება.'],
    instagram: ['ინსტაგრამი — დემო', 'რეალურ საიტზე ეს ღილაკი საცხობის ოფიციალურ გვერდს გახსნიდა. GOLDEN CRUST გამოგონილი ბრენდია და რეალურ ანგარიშთან დაკავშირებული არ არის.']
  };
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => {
    const [title, description] = demos[button.dataset.demo];
    document.querySelector('#demo-title').textContent = title;
    document.querySelector('#demo-description').textContent = description;
    openDialog(document.querySelector('#demo-dialog'), button);
  }));

  const gallery = [...document.querySelectorAll('[data-gallery]')];
  const lightbox = document.querySelector('#lightbox');
  const lightboxImage = document.querySelector('#lightbox-image');
  let current = 0;
  let touchStart = null;
  function showPhoto(index) {
    current = (index + gallery.length) % gallery.length;
    const item = gallery[current];
    lightboxImage.src = item.href;
    lightboxImage.alt = item.querySelector('img').alt;
    document.querySelector('#lightbox-caption').textContent = item.dataset.caption;
    document.querySelector('#lightbox-count').textContent = `${current + 1} / ${gallery.length}`;
  }
  gallery.forEach((item, index) => item.addEventListener('click', event => {
    if (typeof lightbox.showModal !== 'function') return;
    event.preventDefault(); showPhoto(index); openDialog(lightbox, item);
  }));
  document.querySelector('#photo-prev').addEventListener('click', () => showPhoto(current - 1));
  document.querySelector('#photo-next').addEventListener('click', () => showPhoto(current + 1));
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showPhoto(current + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  lightboxImage.addEventListener('touchstart', event => { touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }, { passive: true });
  lightboxImage.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) showPhoto(current + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    const links = [...navigation.querySelectorAll('a[href^="#"]')];
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) links.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-14% 0px -60% 0px', threshold: 0 });
    links.forEach(link => { const section = document.querySelector(link.hash); if (section) navObserver.observe(section); });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('motion-enabled');
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
      }, { threshold: .08 });
      document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
    }
  }
  document.querySelector('#year').textContent = String(new Date().getFullYear());
})();
