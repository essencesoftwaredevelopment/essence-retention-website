(function initResultsLightbox() {
  const root = document.getElementById('results-lightbox');
  if (!root) return;

  const triggers = Array.from(document.querySelectorAll('[data-results-shot]'));
  if (!triggers.length) return;

  const dialog = root.querySelector('.results-lightbox__dialog');
  const image = document.getElementById('results-lightbox-image');
  const caption = document.getElementById('results-lightbox-caption');
  const counter = document.getElementById('results-lightbox-count');
  const prev = root.querySelector('[data-results-lightbox-prev]');
  const next = root.querySelector('[data-results-lightbox-next]');
  const closeButtons = root.querySelectorAll('[data-results-lightbox-close]');

  let index = 0;
  let lastTrigger = null;
  let touchStartX = 0;
  let touchTracking = false;

  function render() {
    const trigger = triggers[index];
    const src = trigger.getAttribute('data-full');
    if (image.getAttribute('src') !== src) {
      image.setAttribute('src', src);
    }
    image.alt = trigger.getAttribute('data-alt') || '';
    image.width = Number(trigger.getAttribute('data-width')) || 1024;
    image.height = Number(trigger.getAttribute('data-height')) || 450;
    caption.textContent = trigger.getAttribute('data-caption') || '';
    counter.textContent = (index + 1) + ' / ' + triggers.length;
    prev.disabled = index === 0;
    next.disabled = index === triggers.length - 1;
  }

  function open(nextIndex, trigger) {
    index = nextIndex;
    lastTrigger = trigger;
    render();
    root.hidden = false;
    document.body.classList.add('results-lightbox-open');
    const closeButton = root.querySelector('.results-lightbox__close');
    if (closeButton) closeButton.focus();
  }

  function close() {
    root.hidden = true;
    image.removeAttribute('src');
    document.body.classList.remove('results-lightbox-open');
    if (lastTrigger) lastTrigger.focus();
  }

  function move(delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= triggers.length) return;
    index = nextIndex;
    render();
  }

  function focusable() {
    return Array.from(dialog.querySelectorAll('button:not([disabled])'));
  }

  triggers.forEach(function (trigger, triggerIndex) {
    trigger.addEventListener('click', function () {
      open(triggerIndex, trigger);
    });
  });

  closeButtons.forEach(function (button) {
    button.addEventListener('click', close);
  });

  prev.addEventListener('click', function () { move(-1); });
  next.addEventListener('click', function () { move(1); });

  document.addEventListener('keydown', function (event) {
    if (root.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
      return;
    }

    if (event.key !== 'Tab') return;

    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  dialog.addEventListener('touchstart', function (event) {
    if (event.touches.length !== 1) return;
    touchTracking = true;
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  dialog.addEventListener('touchend', function (event) {
    if (!touchTracking) return;
    touchTracking = false;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 48) return;
    move(delta < 0 ? 1 : -1);
  }, { passive: true });
})();

(function initResultsCarousel() {
  const root = document.querySelector('.client-results');
  if (!root) return;

  const list = root.querySelector('.client-results__list');
  const viewport = root.querySelector('.client-results__viewport');
  const live = root.querySelector('.client-results__live');
  const prev = root.querySelector('[data-results-prev]');
  const next = root.querySelector('[data-results-next]');
  const slides = list ? Array.from(list.children).filter(function (el) {
    return el.classList.contains('case-study');
  }) : [];
  if (!list || !viewport || !prev || !next || slides.length < 2) return;

  let index = 1;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchTracking = false;
  let animating = false;
  let animToken = 0;
  let slideEnd = null;

  function gapSize() {
    const parsed = parseFloat(getComputedStyle(list).columnGap);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function currentTranslate() {
    const match = /translateX\(([-\d.]+)px\)/.exec(list.style.transform || '');
    return match ? parseFloat(match[1]) : 0;
  }

  function place() {
    const slide = slides[index];
    const shift = viewport.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
    const height = slides.reduce(function (max, item) {
      return Math.max(max, item.offsetHeight);
    }, 0);
    list.style.transform = 'translateX(' + shift + 'px)';
    viewport.style.height = height + 'px';
    const gutter = Math.max(12, (viewport.clientWidth - slide.offsetWidth) / 2 - 58);
    prev.style.left = gutter + 'px';
    next.style.right = gutter + 'px';
  }

  function arrange(activeIndex) {
    const count = slides.length;
    for (let offset = 0; offset < count; offset += 1) {
      list.appendChild(slides[(activeIndex - 1 + offset + count) % count]);
    }
  }

  function render() {
    prev.disabled = false;
    next.disabled = false;
    slides.forEach(function (slide, slideIndex) {
      const active = slideIndex === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      slide.querySelectorAll('button, a, [tabindex]').forEach(function (el) {
        if (active) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
    });
    const title = slides[index].querySelector('.case-study__title');
    if (live) {
      live.textContent = 'Case study ' + (index + 1) + ' of ' + slides.length + (title ? ', ' + title.textContent : '');
    }
    place();
  }

  function prepareClone(clone) {
    clone.classList.remove('is-active');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-results-clone', '');
    clone.inert = true;
    clone.querySelectorAll('button, a').forEach(function (el) {
      el.setAttribute('tabindex', '-1');
    });
  }

  function finishSnap(token) {
    if (token !== animToken || !animating) return;
    animating = false;
    if (slideEnd) {
      list.removeEventListener('transitionend', slideEnd);
      slideEnd = null;
    }
    list.querySelectorAll('[data-results-clone]').forEach(function (clone) {
      clone.remove();
    });
    // Swap the temporary copy for the real card without moving anything on screen.
    list.style.transition = 'none';
    arrange(index);
    place();
    void list.offsetWidth;
    list.style.transition = '';
  }

  function move(delta) {
    if (!delta) return;
    if (animating) finishSnap(animToken);
    const count = slides.length;
    const nextIndex = (index + delta + count) % count;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      index = nextIndex;
      arrange(index);
      render();
      return;
    }

    const target = slides[nextIndex];
    if (delta > 0) {
      const incoming = slides[(nextIndex + 1) % count];
      if (target.nextElementSibling !== incoming) {
        const clone = incoming.cloneNode(true);
        prepareClone(clone);
        list.appendChild(clone);
      }
    } else {
      const incoming = slides[(nextIndex - 1 + count) % count];
      if (target.previousElementSibling !== incoming) {
        const clone = incoming.cloneNode(true);
        prepareClone(clone);
        list.insertBefore(clone, list.firstElementChild);
        const shift = clone.getBoundingClientRect().width + gapSize();
        list.style.transition = 'none';
        list.style.transform = 'translateX(' + (currentTranslate() - shift) + 'px)';
        void list.offsetWidth;
        list.style.transition = '';
      }
    }

    index = nextIndex;
    const token = ++animToken;
    animating = true;
    slideEnd = function (event) {
      if (event.target !== list || event.propertyName !== 'transform') return;
      finishSnap(token);
    };
    list.addEventListener('transitionend', slideEnd);
    window.setTimeout(function () { finishSnap(token); }, 600);
    render();
  }

  prev.addEventListener('click', function () { move(-1); });
  next.addEventListener('click', function () { move(1); });

  slides.forEach(function (slide) {
    slide.addEventListener('click', function () {
      if (slide === slides[index]) return;
      move(slide.offsetLeft < slides[index].offsetLeft ? -1 : 1);
    });
  });

  viewport.addEventListener('keydown', function (event) {
    const lightbox = document.getElementById('results-lightbox');
    if (lightbox && !lightbox.hidden) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    }
  });

  viewport.addEventListener('touchstart', function (event) {
    if (event.touches.length !== 1) return;
    touchTracking = true;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  viewport.addEventListener('touchend', function (event) {
    if (!touchTracking) return;
    touchTracking = false;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    move(deltaX < 0 ? 1 : -1);
  }, { passive: true });

  slides.forEach(function (slide) {
    slide.querySelectorAll('img').forEach(function (img) {
      if (img.complete) return;
      img.addEventListener('load', place);
    });
  });

  window.addEventListener('resize', place);

  list.style.transition = 'none';
  arrange(index);
  render();
  void list.offsetWidth;
  list.style.transition = '';
})();
