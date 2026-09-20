/**
 * Click-to-unmute / play-fallback overlay for the VSL player.
 */

const ICONS = {
  unmute: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5L8 5.5z"/></svg>`,
};

/**
 * @param {{ onActivate: () => void }} options
 */
export function createUnmuteOverlay({ onActivate }) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'vsl-overlay';
  el.setAttribute('aria-live', 'polite');
  el.hidden = true;

  el.innerHTML = `
    <span class="vsl-overlay__card">
      <span class="vsl-overlay__pulses" aria-hidden="true">
        <span class="vsl-overlay__pulse"></span>
        <span class="vsl-overlay__pulse"></span>
        <span class="vsl-overlay__pulse"></span>
      </span>
      <span class="vsl-overlay__icon" data-vsl-overlay-icon></span>
      <span class="vsl-overlay__copy">
        <span class="vsl-overlay__eyebrow" data-vsl-overlay-eyebrow></span>
        <span class="vsl-overlay__title" data-vsl-overlay-title></span>
      </span>
    </span>
  `;

  const icon = el.querySelector('[data-vsl-overlay-icon]');
  const eyebrow = el.querySelector('[data-vsl-overlay-eyebrow]');
  const title = el.querySelector('[data-vsl-overlay-title]');

  /** @type {'unmute' | 'play' | 'hidden'} */
  let mode = 'hidden';

  function render() {
    if (mode === 'hidden') {
      el.hidden = true;
      el.style.display = 'none';
      el.classList.remove('vsl-overlay--unmute', 'vsl-overlay--play');
      return;
    }

    el.hidden = false;
    el.style.display = '';
    el.classList.toggle('vsl-overlay--unmute', mode === 'unmute');
    el.classList.toggle('vsl-overlay--play', mode === 'play');

    if (mode === 'unmute') {
      icon.innerHTML = ICONS.unmute;
      eyebrow.textContent = 'Your video is already playing';
      title.textContent = 'Click to Unmute';
      el.setAttribute('aria-label', 'Your video is already playing. Click to Unmute');
    } else {
      icon.innerHTML = ICONS.play;
      eyebrow.textContent = '';
      title.textContent = 'Play video';
      el.setAttribute('aria-label', 'Play video');
    }
  }

  el.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate();
  });

  return {
    el,
    /** @param {'unmute' | 'play' | 'hidden'} next */
    setMode(next) {
      mode = next;
      render();
    },
    getMode() {
      return mode;
    },
    hide() {
      mode = 'hidden';
      render();
    },
  };
}
