/**
 * Scrubbable progress bar for the VSL player.
 *
 * Visual fill uses an ease-out curve so the bar races ahead early,
 * then crawls through the rest of the video (marketing pacing).
 */

/** Higher = faster early movement / slower later. */
const EASE_POWER = 2.4;

/**
 * Actual playback ratio (0–1) → displayed bar ratio (0–1).
 * @param {number} t
 */
function toVisual(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, EASE_POWER);
}

/**
 * Displayed bar ratio (0–1) → actual playback ratio (0–1).
 * @param {number} v
 */
function fromVisual(v) {
  const clamped = Math.min(1, Math.max(0, v));
  return 1 - Math.pow(1 - clamped, 1 / EASE_POWER);
}

/**
 * @param {{
 *   onSeek: (time: number) => void,
 *   getDuration: () => number,
 * }} options
 */
export function createProgressBar({ onSeek, getDuration }) {
  const el = document.createElement('div');
  el.className = 'vsl-progress';
  el.innerHTML = `
    <input
      class="vsl-progress__input"
      type="range"
      min="0"
      max="1000"
      value="0"
      step="1"
      aria-label="Seek"
      data-vsl-progress
    />
    <div class="vsl-progress__track" aria-hidden="true">
      <div class="vsl-progress__fill" data-vsl-progress-fill></div>
    </div>
  `;

  const input = /** @type {HTMLInputElement} */ (el.querySelector('[data-vsl-progress]'));
  const fill = /** @type {HTMLElement} */ (el.querySelector('[data-vsl-progress-fill]'));

  let scrubbing = false;

  function applyVisual(visualRatio) {
    const clamped = Math.min(1, Math.max(0, visualRatio));
    const pct = `${clamped * 100}%`;
    fill.style.width = pct;
    input.value = String(Math.round(clamped * 1000));
  }

  function seekFromInput() {
    const duration = getDuration();
    if (!Number.isFinite(duration) || duration <= 0) return;
    const visualRatio = Number(input.value) / 1000;
    onSeek(fromVisual(visualRatio) * duration);
  }

  input.addEventListener('pointerdown', () => {
    scrubbing = true;
    el.classList.add('vsl-progress--scrubbing');
  });

  input.addEventListener('pointerup', () => {
    scrubbing = false;
    el.classList.remove('vsl-progress--scrubbing');
    seekFromInput();
  });

  input.addEventListener('change', () => {
    scrubbing = false;
    el.classList.remove('vsl-progress--scrubbing');
    seekFromInput();
  });

  input.addEventListener('pointercancel', () => {
    scrubbing = false;
    el.classList.remove('vsl-progress--scrubbing');
  });

  input.addEventListener('input', () => {
    applyVisual(Number(input.value) / 1000);
    if (scrubbing) {
      seekFromInput();
    }
  });

  return {
    el,
    /**
     * @param {number} currentTime
     * @param {number} duration
     */
    update(currentTime, duration) {
      if (scrubbing) return;
      if (!Number.isFinite(duration) || duration <= 0) {
        applyVisual(0);
        return;
      }
      applyVisual(toVisual(currentTime / duration));
    },
  };
}
