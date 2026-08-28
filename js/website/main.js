document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav');
  menuToggle?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    menuToggle.classList.toggle('active');
  });

  // Close mobile menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav?.classList.remove('open');
      menuToggle?.classList.remove('active');
    });
  });

  // Active nav on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector(`.nav-link[href="#${id}"]`);
      if (link) {
        link.classList.toggle('active', scrollY >= top && scrollY < top + height);
      }
    });
  });

  // Header shadow on scroll
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  reveals.forEach(el => revealObserver.observe(el));

  // Gallery filter
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      galleryItems.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  // Gallery lightbox
  const lightbox = document.getElementById('lightbox');

  function openLightbox(content) {
    if (!lightbox) return;
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Gallery image');
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="Close lightbox">✕</button>
      <div class="lightbox-content">${content}</div>`;
    lightbox.classList.remove('hidden');
    // Focus the close button for keyboard users
    lightbox.querySelector('.lightbox-close')?.focus();
    // Close on backdrop click (not on content)
    lightbox.addEventListener('click', function onBgClick(e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        closeLightbox();
        lightbox.removeEventListener('click', onBgClick);
      }
    });
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    lightbox.innerHTML = '';
    lightbox.removeAttribute('role');
    lightbox.removeAttribute('aria-modal');
    lightbox.removeAttribute('aria-label');
  }

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox?.classList.contains('hidden')) {
      closeLightbox();
    }
  });

  galleryItems.forEach(item => {
    item.addEventListener('click', () => openLightbox(item.innerHTML));
  });

  // Contact form
  const contactForm = document.getElementById('contact-form');
  contactForm?.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;
    contactForm.querySelectorAll('[required]').forEach(input => {
      const error = input.parentElement.querySelector('.form-error');
      if (error) error.remove();
      if (!input.value.trim()) {
        valid = false;
        input.classList.add('error');
        const err = document.createElement('div');
        err.className = 'form-error';
        err.textContent = 'This field is required';
        input.parentElement.appendChild(err);
      } else {
        input.classList.remove('error');
      }
      if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        valid = false;
        input.classList.add('error');
        const err = document.createElement('div');
        err.className = 'form-error';
        err.textContent = 'Please enter a valid email';
        input.parentElement.appendChild(err);
      }
    });
    if (valid) {
      const formWrap = contactForm.closest('.form-wrap') || contactForm.parentElement;
      let success = formWrap.querySelector('.form-success');
      if (!success) {
        success = document.createElement('div');
        success.className = 'form-success';
        contactForm.insertAdjacentElement('afterend', success);
      }
      success.textContent = 'Thank you for your message! We will get back to you soon.';
      success.style.display = 'block';
      contactForm.reset();
    }
  });
});
