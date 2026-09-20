/**
 * Qualification modal for the acq-build-offer CTA.
 * Mobile: bottom sheet. Desktop: centered popup.
 */

const VIEWS = ['q1', 'q2', 'q3', 'success', 'reject'];
const NEXT_ON_YES = { q1: 'q2', q2: 'q3', q3: 'success' };
const SLIDE_MS = 320;

const root = document.getElementById('abo-qualify');

if (root) {
  const sheet = root.querySelector('.abo-qualify__sheet');
  const viewport = root.querySelector('.abo-qualify__viewport');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let currentView = 'q1';
  let lastFocus = null;
  let openRaf = 0;
  let closeTimer = 0;
  let slideTimer = 0;
  let sliding = false;

  function viewEl(id) {
    return root.querySelector(`[data-qualify-view="${id}"]`);
  }

  function showViewInstant(view) {
    currentView = view;
    if (viewport) viewport.dataset.view = view;

    root.querySelectorAll('[data-qualify-view]').forEach((el) => {
      const active = el.dataset.qualifyView === view;
      el.hidden = !active;
      el.classList.toggle('is-active', active);
      el.classList.remove('is-enter', 'is-leave');
    });

    sheet?.setAttribute('aria-labelledby', `abo-qualify-title-${view}`);
  }

  function setView(view, { animate = true } = {}) {
    if (!VIEWS.includes(view)) return;
    if (view === currentView && animate) return;

    const fromEl = viewEl(currentView);
    const toEl = viewEl(view);

    if (!toEl) return;

    window.clearTimeout(slideTimer);
    sliding = false;

    if (!animate || reduceMotion.matches || !fromEl || fromEl === toEl) {
      showViewInstant(view);
      return;
    }

    sliding = true;
    currentView = view;
    if (viewport) viewport.dataset.view = view;
    sheet?.setAttribute('aria-labelledby', `abo-qualify-title-${view}`);

    fromEl.classList.remove('is-enter', 'is-leave');
    toEl.classList.remove('is-enter', 'is-leave');

    toEl.hidden = false;
    toEl.classList.add('is-enter');
    fromEl.classList.add('is-leave');
    fromEl.classList.remove('is-active');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toEl.classList.add('is-active');
        toEl.classList.remove('is-enter');
      });
    });

    slideTimer = window.setTimeout(() => {
      fromEl.hidden = true;
      fromEl.classList.remove('is-leave');
      toEl.classList.remove('is-enter');
      sliding = false;
    }, SLIDE_MS);
  }

  function lockScroll(lock) {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function open() {
    if (root.classList.contains('is-open')) return;

    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    showViewInstant('q1');
    root.hidden = false;
    lockScroll(true);

    cancelAnimationFrame(openRaf);
    openRaf = requestAnimationFrame(() => {
      root.classList.add('is-open');
      sheet?.focus({ preventScroll: true });
    });
  }

  function close() {
    if (root.hidden && !root.classList.contains('is-open')) return;

    root.classList.remove('is-open');
    lockScroll(false);

    window.clearTimeout(closeTimer);
    window.clearTimeout(slideTimer);
    sliding = false;

    const finish = () => {
      if (root.classList.contains('is-open')) return;
      root.hidden = true;
      showViewInstant('q1');
    };

    const onDone = (event) => {
      if (event && event.target !== sheet) return;
      sheet?.removeEventListener('transitionend', onDone);
      finish();
    };

    sheet?.addEventListener('transitionend', onDone);
    closeTimer = window.setTimeout(finish, 400);

    if (lastFocus && document.contains(lastFocus)) {
      lastFocus.focus({ preventScroll: true });
    }
    lastFocus = null;
  }

  function answer(value) {
    if (sliding) return;
    if (value === 'no') {
      setView('reject');
      return;
    }
    if (value === 'yes') {
      const next = NEXT_ON_YES[currentView];
      if (next) setView(next);
    }
  }

  function triggerWebHaptic() {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  }

  function activateHapticHost(host) {
    if (host instanceof HTMLButtonElement && !host.disabled) {
      host.click();
      return;
    }
    if (host instanceof HTMLAnchorElement) {
      host.click();
    }
  }

  function attachHapticOverlay(host) {
    if (!(host instanceof HTMLElement) || host.querySelector(':scope > .abo-qualify-haptic')) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.className = 'abo-qualify-haptic';
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    host.appendChild(input);

    input.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    input.addEventListener('change', () => {
      triggerWebHaptic();
      activateHapticHost(host);
    });
  }

  function mountHapticOverlays() {
    root.querySelectorAll('.abo-qualify__btn').forEach(attachHapticOverlay);
  }

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const trigger = target.closest('[data-abo-qualify-trigger]');
      if (trigger) {
        event.preventDefault();
        open();
        return;
      }

      if (!root.classList.contains('is-open')) return;

      if (target.closest('[data-abo-qualify-close]')) {
        if (!(event.target instanceof Element && event.target.classList.contains('abo-qualify-haptic'))) {
          event.preventDefault();
        }
        close();
        return;
      }

      const answerBtn = target.closest('[data-abo-qualify-answer]');
      if (answerBtn) {
        if (!(event.target instanceof Element && event.target.classList.contains('abo-qualify-haptic'))) {
          event.preventDefault();
        }
        answer(answerBtn.dataset.aboQualifyAnswer);
      }
    },
    true
  );

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!root.classList.contains('is-open')) return;
    event.preventDefault();
    close();
  });

  mountHapticOverlays();
}
