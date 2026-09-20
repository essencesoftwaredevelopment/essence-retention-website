/**
 * Custom control bar for the VSL player.
 */

import { createProgressBar } from './VSLProgress.mjs';

const ICONS = {
  volume: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  muted: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><path d="m16 9 5 5M21 9l-5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
};

/**
 * @param {{
 *   onToggleMute: () => void,
 *   onSeek: (time: number) => void,
 *   getDuration: () => number,
 * }} options
 */
export function createControls(options) {
  const el = document.createElement('div');
  el.className = 'vsl-controls';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Video controls');

  const progress = createProgressBar({
    onSeek: options.onSeek,
    getDuration: options.getDuration,
  });

  el.innerHTML = `
    <div class="vsl-controls__bar">
      <div class="vsl-controls__right">
        <button type="button" class="vsl-btn" data-vsl-mute aria-label="Unmute">
          ${ICONS.muted}
        </button>
      </div>
    </div>
    <div class="vsl-controls__progress" data-vsl-progress-slot></div>
  `;

  const progressSlot = el.querySelector('[data-vsl-progress-slot]');
  progressSlot.append(progress.el);

  const muteBtn = /** @type {HTMLButtonElement} */ (el.querySelector('[data-vsl-mute]'));

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    options.onToggleMute();
  });

  el.addEventListener('click', (e) => e.stopPropagation());

  return {
    el,
    /**
     * @param {{
     *   muted: boolean,
     *   volume: number,
     *   currentTime: number,
     *   duration: number,
     * }} state
     */
    update(state) {
      muteBtn.innerHTML = state.muted || state.volume === 0 ? ICONS.muted : ICONS.volume;
      muteBtn.setAttribute('aria-label', state.muted || state.volume === 0 ? 'Unmute' : 'Mute');
      progress.update(state.currentTime, state.duration);
    },
  };
}
