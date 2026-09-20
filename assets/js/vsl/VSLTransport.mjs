/**
 * Center play/pause transport overlay.
 * Persistent while paused; flashes ~1s after resume.
 */

const ICONS = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5L8 5.5z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z"/></svg>`,
};

/**
 * @param {{ onToggle: () => void }} options
 */
export function createTransportOverlay({ onToggle }) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'vsl-transport';
  el.hidden = true;
  el.setAttribute('aria-label', 'Play');

  el.innerHTML = `
    <span class="vsl-transport__card">
      <span class="vsl-transport__icon" data-vsl-transport-icon>${ICONS.play}</span>
    </span>
  `;

  const icon = el.querySelector('[data-vsl-transport-icon]');

  /** @type {'hidden' | 'paused' | 'flash'} */
  let mode = 'hidden';
  let flashTimer = 0;

  function render() {
    window.clearTimeout(flashTimer);

    if (mode === 'hidden') {
      el.hidden = true;
      el.style.display = 'none';
      el.classList.remove('vsl-transport--paused', 'vsl-transport--flash');
      return;
    }

    el.hidden = false;
    el.style.display = '';
    el.classList.toggle('vsl-transport--paused', mode === 'paused');
    el.classList.toggle('vsl-transport--flash', mode === 'flash');

    if (mode === 'paused') {
      icon.innerHTML = ICONS.play;
      el.setAttribute('aria-label', 'Play');
    } else {
      // Flash after resume — play glyph confirms playback started.
      icon.innerHTML = ICONS.play;
      el.setAttribute('aria-label', 'Playing');
      flashTimer = window.setTimeout(() => {
        if (mode === 'flash') {
          mode = 'hidden';
          render();
        }
      }, 500);
    }
  }

  el.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  });

  return {
    el,
    showPaused() {
      mode = 'paused';
      render();
    },
    flashPlaying() {
      mode = 'flash';
      render();
    },
    hide() {
      mode = 'hidden';
      render();
    },
    destroy() {
      window.clearTimeout(flashTimer);
    },
  };
}
