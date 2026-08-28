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
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      if (lightbox) {
        lightbox.innerHTML = item.innerHTML;
        lightbox.classList.remove('hidden');
        lightbox.addEventListener('click', () => lightbox.classList.add('hidden'), { once: true });
      }
    });
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
