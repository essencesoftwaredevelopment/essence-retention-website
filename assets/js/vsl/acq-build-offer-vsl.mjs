/**
 * acq-build-offer page: mount the Mux VSL player and wire CTA conversion events.
 */

import { mountVSLPlayer } from './VSLPlayer.mjs';

function readPlaybackIdFromPage() {
  const root = document.querySelector('[data-vsl-root]');
  const fromDom = root instanceof HTMLElement ? root.dataset.playbackId : '';
  const cfg = window.__ESSENCE_RUNTIME_CONFIG__ || {};
  return (fromDom || cfg.vslPlaybackId || '').trim();
}

/**
 * Static `runtime-config.generated.js` is gitignored and often missing on Vercel.
 * Fall back to `/api/runtime-config`, which reads Production env vars at request time.
 */
async function resolvePlaybackId() {
  const fromPage = readPlaybackIdFromPage();
  if (fromPage) return fromPage;

  try {
    const response = await fetch('/api/runtime-config', { method: 'GET' });
    if (!response.ok) return '';
    const payload = await response.json();
    return typeof payload?.vslPlaybackId === 'string' ? payload.vslPlaybackId.trim() : '';
  } catch {
    return '';
  }
}

function wireCtaTracking(api) {
  if (!api) return;

  const ctas = document.querySelectorAll('[data-ph-cta]');
  if (!ctas.length) return;

  // CTA is always present on this page — count a shown event once the player is up.
  api.trackCtaShown({ location: 'acq_build_offer' });

  ctas.forEach((cta) => {
    cta.addEventListener(
      'click',
      () => {
        api.trackCtaClicked({
          location: cta.dataset.phCtaLocation || null,
          cta_id: cta.dataset.phCta || null,
        });
      },
      { capture: true }
    );
  });
}

async function boot() {
  const root = document.querySelector('[data-vsl-root]');
  if (!(root instanceof HTMLElement)) return;

  const playbackId = await resolvePlaybackId();

  const api = await mountVSLPlayer(root, {
    playbackId,
    title: root.dataset.title || 'ESSENCE Retention VSL',
    autoplay: root.dataset.autoplay !== 'false',
    initialMuted: root.dataset.initialMuted !== 'false',
    showUnmuteOverlay: root.dataset.showUnmuteOverlay !== 'false',
    captions: root.dataset.captions !== 'false',
    resume: root.dataset.resume !== 'false',
    poster: root.dataset.poster || undefined,
    onTimeUpdate(time) {
      // Parent pages can reveal timed CTAs from this callback / vsl:timeupdate.
      // Example: if (time >= 222) showCta();
      root.dataset.vslTime = String(Math.floor(time));
    },
  });

  wireCtaTracking(api);
}

boot().catch((error) => {
  console.error('[vsl] failed to mount player', error);
});
