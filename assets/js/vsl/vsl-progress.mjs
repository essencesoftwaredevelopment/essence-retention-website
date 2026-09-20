/**
 * localStorage resume helpers for VSL playback position.
 */

const PREFIX = 'vsl:';

function key(playbackId) {
  return `${PREFIX}${playbackId}:position`;
}

/**
 * @param {string} playbackId
 * @returns {number | null}
 */
export function readSavedPosition(playbackId) {
  try {
    const raw = localStorage.getItem(key(playbackId));
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} playbackId
 * @param {number} positionSeconds
 */
export function savePosition(playbackId, positionSeconds) {
  try {
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0) return;
    localStorage.setItem(key(playbackId), String(Math.floor(positionSeconds)));
  } catch {
    // Ignore quota / private mode failures.
  }
}

/**
 * @param {string} playbackId
 */
export function clearPosition(playbackId) {
  try {
    localStorage.removeItem(key(playbackId));
  } catch {
    // Ignore.
  }
}

/**
 * Decide whether a saved position should be used for resume.
 * @param {number | null} saved
 * @param {number} duration
 */
export function shouldResume(saved, duration) {
  if (saved == null || !Number.isFinite(duration) || duration <= 0) return false;
  if (saved <= 10) return false;
  if (saved >= duration * 0.95) return false;
  return true;
}

/**
 * Throttled progress persistence.
 * @param {{ playbackId: string, intervalMs?: number }} options
 */
export function createProgressStore({ playbackId, intervalMs = 5000 }) {
  let lastWrite = 0;

  return {
    /**
     * @param {number} currentTime
     * @param {number} duration
     * @param {{ force?: boolean }} [opts]
     */
    update(currentTime, duration, opts = {}) {
      if (!Number.isFinite(currentTime) || currentTime < 0) return;

      if (Number.isFinite(duration) && duration > 0 && currentTime >= duration * 0.95) {
        clearPosition(playbackId);
        return;
      }

      const now = Date.now();
      if (!opts.force && now - lastWrite < intervalMs) return;
      lastWrite = now;
      savePosition(playbackId, currentTime);
    },

    clear() {
      clearPosition(playbackId);
    },

    read() {
      return readSavedPosition(playbackId);
    },
  };
}
