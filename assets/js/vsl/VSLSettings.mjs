/**
 * Playback-speed menu for the VSL player.
 */

const RATES = [1, 1.25, 1.4, 1.5, 1.75, 2];

/**
 * @param {{
 *   rates?: number[],
 *   onRateChange: (rate: number) => void,
 * }} options
 */
export function createSettingsMenu({ rates = RATES, onRateChange }) {
  const el = document.createElement('div');
  el.className = 'vsl-settings';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'vsl-btn vsl-settings__toggle';
  toggle.setAttribute('aria-label', 'Playback speed');
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = `<span data-vsl-rate-label>1x</span>`;

  const menu = document.createElement('div');
  menu.className = 'vsl-settings__menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');

  rates.forEach((rate) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'vsl-settings__item';
    item.setAttribute('role', 'menuitemradio');
    item.dataset.rate = String(rate);
    item.textContent = rate === 1 ? '1x' : `${rate}x`;
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      onRateChange(rate);
      setOpen(false);
    });
    menu.appendChild(item);
  });

  el.append(toggle, menu);

  function setOpen(open) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    el.classList.toggle('vsl-settings--open', open);
  }

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(menu.hidden);
  });

  document.addEventListener('click', (event) => {
    if (!el.contains(/** @type {Node} */ (event.target))) {
      setOpen(false);
    }
  });

  return {
    el,
    /**
     * @param {number} rate
     */
    setRate(rate) {
      const label = el.querySelector('[data-vsl-rate-label]');
      if (label) label.textContent = Number.isInteger(rate) ? `${rate}x` : `${rate}x`;
      menu.querySelectorAll('.vsl-settings__item').forEach((item) => {
        const active = Number(item.dataset.rate) === rate;
        item.setAttribute('aria-checked', active ? 'true' : 'false');
        item.classList.toggle('is-active', active);
      });
    },
    close() {
      setOpen(false);
    },
  };
}
