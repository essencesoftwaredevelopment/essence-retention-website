/**
 * Chapter bar for the VSL player.
 *
 * Markup lives in the page (one button per chapter with `data-time` in seconds) so the
 * list reads without JS. This module sizes each segment by chapter length, shows
 * progress, and seeks the player on click.
 */

const EDGE_ALIGN_THRESHOLD = 0.12;

/**
 * @param {HTMLElement} el `[data-vsl-chapters]` list
 * @param {{ player: any, getState: () => any, startEngagement: () => Promise<void> }} api
 * @param {HTMLElement} root `[data-vsl-root]` — emits `vsl:timeupdate`
 */
export function mountChapters(el, api, root) {
  const buttons = Array.from(el.querySelectorAll('[data-time]'));
  if (!buttons.length) return null;

  const chapters = buttons.map((button) => ({
    button,
    start: Number(button.dataset.time) || 0,
    title: button.querySelector('[data-chapter-title]')?.textContent?.trim() || '',
  }));
  const current = el.parentElement?.querySelector('[data-vsl-chapter-current]');
  const { player } = api;
  let activeIndex = -1;

  function layout() {
    const duration = Number(player.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;

    chapters.forEach((chapter, i) => {
      const end = chapters[i + 1]?.start ?? duration;
      chapter.end = end;
      const item = chapter.button.closest('li') || chapter.button;
      item.style.setProperty('--chapter-span', String(Math.max(end - chapter.start, 1)));

      // Keep tooltips on-screen for segments near either edge of the bar.
      const centre = (chapter.start + end) / 2 / duration;
      chapter.button.dataset.align =
        centre < EDGE_ALIGN_THRESHOLD ? 'start' : centre > 1 - EDGE_ALIGN_THRESHOLD ? 'end' : 'center';
    });
    el.classList.add('is-ready');
  }

  function setActive(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    chapters.forEach((chapter, i) => {
      if (i === index) chapter.button.setAttribute('aria-current', 'true');
      else chapter.button.removeAttribute('aria-current');
    });
    const chapter = chapters[index];
    if (current && chapter) {
      current.textContent = `${chapter.button.querySelector('[data-chapter-time]')?.textContent || ''} · ${chapter.title}`;
    }

    // Touch layout scrolls horizontally — keep the active chip in view without moving the page.
    if (chapter && el.scrollWidth > el.clientWidth) {
      const left = chapter.button.offsetLeft - (el.clientWidth - chapter.button.offsetWidth) / 2;
      el.scrollTo({ left, behavior: 'smooth' });
    }
  }

  function paint(time) {
    let index = 0;
    chapters.forEach((chapter, i) => {
      if (time >= chapter.start) index = i;
      const span = (chapter.end ?? chapter.start) - chapter.start;
      const fill = span > 0 ? Math.min(1, Math.max(0, (time - chapter.start) / span)) : 0;
      chapter.button.style.setProperty('--chapter-fill', String(fill));
    });
    setActive(index);
  }

  async function seekTo(time) {
    const state = api.getState();
    // First click from the muted teaser should start the real VSL with sound.
    if (state.teaser || state.overlayMode === 'unmute') {
      await api.startEngagement();
    }
    player.currentTime = time;
    if (player.paused) {
      player.play?.().catch(() => {});
    }
    paint(time);
  }

  chapters.forEach((chapter) => {
    chapter.button.addEventListener('click', () => {
      seekTo(chapter.start);
    });
  });

  player.addEventListener('durationchange', layout);
  player.addEventListener('loadedmetadata', layout);
  root.addEventListener('vsl:timeupdate', (event) => {
    paint(Number(event.detail?.currentTime) || 0);
  });

  layout();
  paint(0);

  return { seekTo };
}
