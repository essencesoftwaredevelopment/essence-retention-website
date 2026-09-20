/**
 * Custom Mux-backed VSL player.
 *
 * Marketing teaser: muted loop of the opening seconds + “already playing” overlay.
 * On click: exit teaser, seek to 0, unmute, play the full VSL.
 */

import { createVSLAnalytics } from './vsl-analytics.mjs';
import { createProgressStore, shouldResume } from './vsl-progress.mjs';
import { createUnmuteOverlay } from './VSLUnmuteOverlay.mjs';
import { createControls } from './VSLControls.mjs';
import { createTransportOverlay } from './VSLTransport.mjs';

const MUX_PLAYER_URL = '/assets/vendor/mux-player/mux-player.mjs';
const PLAYBACK_RATES = [1, 1.25, 1.4, 1.5, 1.75, 2];
const BACKWARD_SEEK = 10;
const UI_THROTTLE_MS = 250;
const DEFAULT_PREVIEW_LOOP_SECONDS = 6;
const DEFAULT_PLAYBACK_RATE = 1.5;

/** @type {Promise<void> | null} */
let muxLoader = null;

function loadMuxPlayer() {
  if (customElements.get('mux-player')) {
    return Promise.resolve();
  }
  if (!muxLoader) {
    muxLoader = import(MUX_PLAYER_URL).then(() => undefined);
  }
  return muxLoader;
}

/**
 * @typedef {object} VSLPlayerOptions
 * @property {string} playbackId
 * @property {string} [title]
 * @property {boolean} [autoplay]
 * @property {boolean} [initialMuted]
 * @property {boolean} [showUnmuteOverlay]
 * @property {boolean} [captions]
 * @property {boolean} [resume]
 * @property {number} [previewLoopSeconds] Loop opening seconds as a muted teaser. 0 disables.
 * @property {string} [poster]
 * @property {string} [className]
 * @property {(time: number, meta: { duration: number, progress: number, teaser: boolean }) => void} [onTimeUpdate]
 * @property {(state: object) => void} [onStateChange]
 */

/**
 * @param {HTMLElement} root
 * @param {VSLPlayerOptions} options
 */
export async function mountVSLPlayer(root, options) {
  const playbackId = options.playbackId?.trim();
  if (!playbackId) {
    root.innerHTML = `
      <div class="vsl-player vsl-player--empty" role="status">
        <p class="vsl-player__empty">Video coming soon</p>
      </div>
    `;
    return null;
  }

  const title = options.title || 'ESSENCE Retention VSL';
  const autoplay = options.autoplay !== false;
  const initialMuted = options.initialMuted !== false;
  const showUnmuteOverlay = options.showUnmuteOverlay !== false;
  const captionsEnabled = false;
  const captionsFeature = options.captions !== false;
  const resumeEnabled = options.resume !== false;
  const previewLoopSeconds = Number.isFinite(options.previewLoopSeconds)
    ? Math.max(0, Number(options.previewLoopSeconds))
    : DEFAULT_PREVIEW_LOOP_SECONDS;

  root.replaceChildren();
  root.classList.add('vsl-root');

  const shell = document.createElement('div');
  shell.className = `vsl-player${options.className ? ` ${options.className}` : ''}`;
  shell.setAttribute('role', 'region');
  shell.setAttribute('aria-label', title);

  const mediaSlot = document.createElement('div');
  mediaSlot.className = 'vsl-player__media';

  const posterUrl =
    options.poster ||
    `https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.webp?time=0&width=1280`;

  const poster = document.createElement('img');
  poster.className = 'vsl-player__poster';
  poster.alt = '';
  poster.decoding = 'async';
  poster.src = posterUrl;
  poster.setAttribute('aria-hidden', 'true');

  mediaSlot.append(poster);
  shell.append(mediaSlot);
  root.append(shell);

  await loadMuxPlayer();

  /** @type {any} */
  const player = document.createElement('mux-player');
  player.className = 'vsl-player__mux';
  player.setAttribute('playback-id', playbackId);
  player.setAttribute('stream-type', 'on-demand');
  player.setAttribute('playsinline', '');
  player.setAttribute('exportparts', 'video');
  player.setAttribute('max-resolution', '1080p');
  player.setAttribute('backward-seek-offset', String(BACKWARD_SEEK));
  player.setAttribute('playbackrates', PLAYBACK_RATES.join(' '));
  player.setAttribute('primary-color', '#ffffff');
  player.setAttribute('secondary-color', 'rgba(0,0,0,0.55)');
  player.setAttribute('metadata-video-title', title);
  player.setAttribute('metadata-video-id', playbackId);
  player.setAttribute('no-muted-pref', '');
  player.setAttribute('no-volume-pref', '');
  player.setAttribute('default-hidden-captions', '');
  player.defaultHiddenCaptions = true;
  if (options.poster) {
    player.setAttribute('poster', options.poster);
  }
  player.style.setProperty('--controls', 'none');
  player.style.setProperty('--loading-indicator', 'none');
  player.style.setProperty('--center-controls', 'none');
  player.style.setProperty('--dialog', 'none');
  player.muted = initialMuted;
  player.volume = 1;
  player.defaultVolume = 1;
  player.playbackRate = DEFAULT_PLAYBACK_RATE;
  if (autoplay && initialMuted) {
    player.setAttribute('autoplay', 'muted');
  }

  mediaSlot.append(player);

  const analytics = createVSLAnalytics({ playbackId });
  const progressStore = createProgressStore({ playbackId });

  /** @type {{
   *   playing: boolean,
   *   muted: boolean,
   *   autoplaySucceeded: boolean,
   *   teaser: boolean,
   *   duration: number,
   *   currentTime: number,
   *   progress: number,
   *   volume: number,
   *   playbackRate: number,
   *   captionsEnabled: boolean,
   *   captionsAvailable: boolean,
   *   overlayMode: 'unmute' | 'play' | 'hidden',
   * }} */
  const state = {
    playing: false,
    muted: initialMuted,
    autoplaySucceeded: false,
    teaser: previewLoopSeconds > 0,
    duration: 0,
    currentTime: 0,
    progress: 0,
    volume: 1,
    playbackRate: DEFAULT_PLAYBACK_RATE,
    captionsEnabled,
    captionsAvailable: false,
    overlayMode: 'hidden',
  };

  let lastUiPaint = 0;
  let resumeApplied = false;
  let engagementStarted = false;
  let destroyed = false;

  if (state.teaser) {
    shell.classList.add('vsl-player--teaser');
  }

  const overlay = createUnmuteOverlay({
    onActivate: () => {
      void startEngagement();
    },
  });

  const transport = createTransportOverlay({
    onToggle: () => {
      if (!engagementStarted) {
        void startEngagement();
        return;
      }
      if (player.paused) {
        void player.play().catch(() => {});
      } else {
        player.pause();
      }
    },
  });

  const controls = createControls({
    getDuration: () => state.duration,
    onToggleMute: () => {
      if (!engagementStarted) {
        void startEngagement();
        return;
      }
      if (player.muted || player.volume === 0) {
        player.muted = false;
        player.volume = 1;
      } else {
        player.muted = true;
      }
      syncFromPlayer({ force: true });
      updateOverlay();
    },
    onSeek: (time) => {
      if (!engagementStarted) {
        void startEngagement();
        return;
      }
      player.currentTime = time;
      syncFromPlayer({ force: true });
    },
  });

  shell.append(overlay.el, transport.el, controls.el);

  function emitTimeUpdate() {
    options.onTimeUpdate?.(state.currentTime, {
      duration: state.duration,
      progress: state.progress,
      teaser: state.teaser,
    });
    root.dispatchEvent(
      new CustomEvent('vsl:timeupdate', {
        bubbles: true,
        detail: {
          playbackId,
          currentTime: state.currentTime,
          duration: state.duration,
          progress: state.progress,
          teaser: state.teaser,
        },
      })
    );
  }

  function emitState() {
    options.onStateChange?.(state);
    root.dispatchEvent(
      new CustomEvent('vsl:state', {
        bubbles: true,
        detail: { ...state, playbackId },
      })
    );
  }

  function paintUi(force = false) {
    const now = Date.now();
    if (!force && now - lastUiPaint < UI_THROTTLE_MS) return;
    lastUiPaint = now;
    controls.update(state);
    emitState();
  }

  function syncFromPlayer({ force = false } = {}) {
    const duration = Number(player.duration);
    const currentTime = Number(player.currentTime);
    state.playing = !player.paused && !player.ended;
    state.muted = Boolean(player.muted);
    state.volume = Number(player.volume) || 0;
    state.playbackRate = Number(player.playbackRate) || 1;
    state.duration = Number.isFinite(duration) ? duration : state.duration;
    state.currentTime = Number.isFinite(currentTime) ? currentTime : state.currentTime;
    state.progress =
      state.duration > 0 ? Math.min(100, (state.currentTime / state.duration) * 100) : 0;
    paintUi(force);
  }

  function setCaptionsEnabled(enabled) {
    state.captionsEnabled = enabled;
    const tracks = player.textTracks;
    if (!tracks) {
      paintUi(true);
      return;
    }
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        // 'disabled' fully turns the track off; 'hidden' can still load cues.
        track.mode = enabled ? 'showing' : 'disabled';
        state.captionsAvailable = true;
      }
    }
    paintUi(true);
  }

  function refreshCaptionsAvailability() {
    const tracks = player.textTracks;
    let available = false;
    if (tracks) {
      for (let i = 0; i < tracks.length; i += 1) {
        const track = tracks[i];
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          available = true;
          break;
        }
      }
    }
    state.captionsAvailable = available;
    // Always re-apply preference — Mux can re-enable captions when tracks attach.
    setCaptionsEnabled(state.captionsEnabled);
  }

  function updateOverlay() {
    if (!showUnmuteOverlay) {
      overlay.hide();
      state.overlayMode = 'hidden';
      return;
    }

    // Marketing teaser: always show click-to-unmute copy until real engagement.
    if (!engagementStarted) {
      overlay.setMode('unmute');
      state.overlayMode = 'unmute';
      shell.classList.add('vsl-player--active');
      return;
    }

    overlay.hide();
    state.overlayMode = 'hidden';
  }

  function hideOverlayAfterSound() {
    overlay.hide();
    state.overlayMode = 'hidden';
  }

  /**
   * Exit teaser → start the real VSL from 0:00 with sound.
   */
  async function startEngagement() {
    if (engagementStarted) return;
    engagementStarted = true;
    state.teaser = false;
    shell.classList.remove('vsl-player--teaser');
    shell.classList.add('vsl-player--engaged');

    player.muted = false;
    player.volume = 1;
    player.playbackRate = DEFAULT_PLAYBACK_RATE;
    player.currentTime = 0;

    hideOverlayAfterSound();
    syncFromPlayer({ force: true });

    try {
      await player.play();
      state.autoplaySucceeded = true;
    } catch {
      // Gesture-initiated play should usually succeed; if not, leave controls visible.
    }

    analytics.play({
      currentTime: 0,
      duration: player.duration,
      via: 'teaser_click',
    });
    analytics.unmute({
      currentTime: 0,
      duration: player.duration,
    });

    root.dispatchEvent(
      new CustomEvent('vsl:unmute', {
        bubbles: true,
        detail: { playbackId, currentTime: 0 },
      })
    );

    syncFromPlayer({ force: true });
    updateOverlay();
    transport.flashPlaying();
    bumpActivity();
  }

  function applyResumeIfNeeded() {
    // Never resume into the teaser — always open on the looping hook.
    if (state.teaser || !resumeEnabled || resumeApplied || engagementStarted) return;
    const duration = Number(player.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;
    const saved = progressStore.read();
    if (shouldResume(saved, duration)) {
      player.currentTime = /** @type {number} */ (saved);
    }
    resumeApplied = true;
  }

  let idleTimer = 0;
  function bumpActivity() {
    if (!engagementStarted) return;
    shell.classList.add('vsl-player--active');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (state.playing && !shell.matches(':hover')) {
        shell.classList.remove('vsl-player--active');
      }
    }, 2500);
  }

  shell.addEventListener('pointerenter', () => {
    if (!engagementStarted) return;
    shell.classList.add('vsl-player--hover');
    shell.classList.add('vsl-player--active');
  });
  shell.addEventListener('pointerleave', () => {
    shell.classList.remove('vsl-player--hover');
    if (engagementStarted && state.playing) {
      shell.classList.remove('vsl-player--active');
    }
  });
  shell.addEventListener('pointermove', bumpActivity);
  shell.addEventListener('pointerdown', bumpActivity);
  shell.addEventListener('focusin', bumpActivity);

  mediaSlot.addEventListener('click', () => {
    if (!engagementStarted) {
      void startEngagement();
      return;
    }
    if (state.overlayMode !== 'hidden') return;
    if (player.paused) void player.play().catch(() => {});
    else player.pause();
  });

  player.addEventListener('loadedmetadata', () => {
    poster.classList.add('is-hidden');
    refreshCaptionsAvailability();
    setCaptionsEnabled(false);
    syncFromPlayer({ force: true });
  });

  player.addEventListener('play', () => {
    state.playing = true;
    shell.classList.remove('vsl-player--paused');
    if (engagementStarted) {
      player.volume = 1;
    }
    // Teaser muted looping does not count as the real VSL play event.
    if (engagementStarted && !analytics.hasFired('vsl_play')) {
      analytics.play({
        currentTime: player.currentTime,
        duration: player.duration,
      });
    }
    if (engagementStarted) {
      transport.flashPlaying();
    }
    syncFromPlayer({ force: true });
    updateOverlay();
    bumpActivity();
  });

  player.addEventListener('playing', () => {
    state.playing = true;
    shell.classList.remove('vsl-player--paused');
    if (!engagementStarted) {
      state.autoplaySucceeded = true;
    }
    poster.classList.add('is-hidden');
    syncFromPlayer({ force: true });
    updateOverlay();
  });

  player.addEventListener('pause', () => {
    state.playing = false;
    if (engagementStarted && !player.ended) {
      shell.classList.add('vsl-player--paused');
      transport.showPaused();
      shell.classList.add('vsl-player--active');
    } else {
      transport.hide();
    }
    syncFromPlayer({ force: true });
    updateOverlay();
  });

  player.addEventListener('ended', () => {
    if (!engagementStarted) {
      // Teaser should never reach the real end — loop handler covers it.
      player.currentTime = 0;
      void player.play().catch(() => {});
      return;
    }
    state.playing = false;
    shell.classList.add('vsl-player--paused');
    transport.showPaused();
    progressStore.clear();
    analytics.complete({
      currentTime: player.currentTime,
      duration: player.duration,
    });
    syncFromPlayer({ force: true });
    shell.classList.add('vsl-player--active');
  });

  player.addEventListener('volumechange', () => {
    syncFromPlayer({ force: true });
    updateOverlay();
  });

  player.addEventListener('ratechange', () => {
    syncFromPlayer({ force: true });
  });

  player.addEventListener('timeupdate', () => {
    // Marketing teaser: loop only the opening seconds.
    if (!engagementStarted && previewLoopSeconds > 0) {
      const t = Number(player.currentTime) || 0;
      if (t >= previewLoopSeconds) {
        player.currentTime = 0.01;
      }
      syncFromPlayer();
      updateOverlay();
      return;
    }

    syncFromPlayer();
    emitTimeUpdate();
    analytics.progress(state.progress, {
      currentTime: state.currentTime,
      duration: state.duration,
    });
    if (resumeEnabled && engagementStarted) {
      progressStore.update(state.currentTime, state.duration);
    }
  });

  player.addEventListener('error', () => {
    updateOverlay();
    shell.classList.add('vsl-player--active');
  });

  if (player.textTracks) {
    player.textTracks.addEventListener('addtrack', () => {
      setCaptionsEnabled(state.captionsEnabled);
    });
  }

  analytics.impression();
  root.dispatchEvent(
    new CustomEvent('vsl:impression', {
      bubbles: true,
      detail: { playbackId },
    })
  );

  async function waitForMediaReady() {
    if (Number.isFinite(player.duration) && player.duration > 0) return;
    await new Promise((resolve) => {
      const done = () => {
        player.removeEventListener('loadedmetadata', done);
        player.removeEventListener('loadeddata', done);
        resolve();
      };
      player.addEventListener('loadedmetadata', done, { once: true });
      player.addEventListener('loadeddata', done, { once: true });
      window.setTimeout(done, 2500);
    });
  }

  async function attemptMutedTeaserAutoplay() {
    if (!(autoplay && initialMuted)) {
      updateOverlay();
      return;
    }
    player.muted = true;
    player.playbackRate = DEFAULT_PLAYBACK_RATE;
    player.currentTime = 0;
    try {
      await player.play();
      player.playbackRate = DEFAULT_PLAYBACK_RATE;
      state.autoplaySucceeded = true;
    } catch {
      try {
        await new Promise((resolve, reject) => {
          const onReady = () => {
            player.removeEventListener('canplay', onReady);
            player.play().then(resolve).catch(reject);
          };
          player.addEventListener('canplay', onReady, { once: true });
          window.setTimeout(() => reject(new Error('autoplay-timeout')), 2000);
        });
        player.playbackRate = DEFAULT_PLAYBACK_RATE;
        state.autoplaySucceeded = true;
      } catch {
        state.autoplaySucceeded = false;
        player.removeAttribute('autoplay');
      }
    }
  }

  await waitForMediaReady();
  // Teaser always opens at 0 — skip resume until after engagement on a later visit.
  if (!state.teaser) {
    applyResumeIfNeeded();
  }
  await attemptMutedTeaserAutoplay();

  updateOverlay();
  syncFromPlayer({ force: true });
  paintUi(true);

  return {
    player,
    getState: () => ({ ...state }),
    startEngagement,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.clearTimeout(idleTimer);
      transport.destroy();
      if (resumeEnabled && engagementStarted) {
        progressStore.update(state.currentTime, state.duration, { force: true });
      }
      player.pause?.();
      root.replaceChildren();
    },
    trackCtaShown(props) {
      analytics.ctaShown(props);
    },
    trackCtaClicked(props) {
      analytics.ctaClicked(props);
    },
  };
}

/**
 * @param {ParentNode} [scope]
 * @param {Partial<VSLPlayerOptions>} [defaults]
 */
export async function mountAllVSLPlayers(scope = document, defaults = {}) {
  const nodes = scope.querySelectorAll('[data-vsl-root]');
  const instances = [];

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    const cfg = window.__ESSENCE_RUNTIME_CONFIG__ || {};
    const playbackId =
      node.dataset.playbackId ||
      defaults.playbackId ||
      cfg.vslPlaybackId ||
      '';

    const previewRaw = node.dataset.previewLoopSeconds;
    const previewLoopSeconds =
      previewRaw != null && previewRaw !== ''
        ? Number(previewRaw)
        : defaults.previewLoopSeconds;

    const instance = await mountVSLPlayer(node, {
      playbackId,
      title: node.dataset.title || defaults.title,
      poster: node.dataset.poster || defaults.poster,
      autoplay: node.dataset.autoplay !== 'false',
      initialMuted: node.dataset.initialMuted !== 'false',
      showUnmuteOverlay: node.dataset.showUnmuteOverlay !== 'false',
      captions: node.dataset.captions !== 'false',
      resume: node.dataset.resume !== 'false',
      previewLoopSeconds,
      className: node.dataset.className,
      onTimeUpdate: defaults.onTimeUpdate,
      onStateChange: defaults.onStateChange,
    });
    instances.push(instance);
  }

  return instances;
}
