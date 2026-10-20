/**
 * Inline qualification for /bfcm-landing.
 * Yes on all three questions books onboarding. Any no offers a free audit.
 */

const NEXT_ON_YES = { q1: 'q2', q2: 'q3', q3: 'success' };
const SLIDE_MS = 320;

const root = document.querySelector('[data-bfcm-qualify]');

if (root) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentView = 'q1';
  let slideTimer = 0;
  let sliding = false;

  function viewEl(id) {
    return root.querySelector(`[data-qualify-view="${id}"]`);
  }

  function showInstant(view) {
    currentView = view;
    root.dataset.view = view;
    root.querySelectorAll('[data-qualify-view]').forEach((el) => {
      const active = el.dataset.qualifyView === view;
      el.hidden = !active;
      el.classList.toggle('is-active', active);
      el.classList.remove('is-enter', 'is-leave');
    });
  }

  function focusHeading(view) {
    const heading = viewEl(view)?.querySelector('h3');
    if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
  }

  function setView(view, { animate = true } = {}) {
    if (view === currentView) return;
    const fromEl = viewEl(currentView);
    const toEl = viewEl(view);
    if (!toEl) return;

    window.clearTimeout(slideTimer);
    sliding = false;

    if (!animate || reduceMotion.matches || !fromEl) {
      showInstant(view);
      focusHeading(view);
      return;
    }

    sliding = true;
    currentView = view;
    root.dataset.view = view;

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
      sliding = false;
      focusHeading(view);
    }, SLIDE_MS);
  }

  function answer(value) {
    if (sliding) return;
    if (value === 'no') {
      setView('reject');
      return;
    }
    if (value === 'yes' && NEXT_ON_YES[currentView]) {
      setView(NEXT_ON_YES[currentView]);
    }
  }

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const restart = target.closest('[data-bfcm-restart]');
    if (restart) {
      showInstant('q1');
      focusHeading('q1');
      return;
    }

    const button = target.closest('[data-bfcm-answer]');
    if (button instanceof HTMLElement) answer(button.dataset.bfcmAnswer);
  });

  showInstant('q1');
}
