/**
 * Conversion analytics for the VSL player (PostHog).
 * Separate from Mux Data QoE analytics.
 */

import posthog from 'posthog-js';

const MILESTONES = [10, 25, 50, 75, 90];

/**
 * @param {{ playbackId: string }} options
 */
export function createVSLAnalytics({ playbackId }) {
  const fired = new Set();

  function track(event, props = {}) {
    if (fired.has(event)) return;
    fired.add(event);

    const payload = {
      playbackId,
      ...props,
    };

    try {
      posthog.capture(event, payload);
    } catch {
      // Analytics must never break playback.
    }
  }

  function impression() {
    track('vsl_impression');
  }

  function play(props) {
    track('vsl_play', props);
  }

  function unmute(props) {
    track('vsl_unmute', props);
  }

  /**
   * @param {number} progressPct 0–100
   * @param {{ currentTime: number, duration: number }} props
   */
  function progress(progressPct, props) {
    for (const milestone of MILESTONES) {
      if (progressPct >= milestone) {
        track(`vsl_${milestone}_percent`, props);
      }
    }
  }

  function complete(props) {
    track('vsl_complete', props);
  }

  function ctaShown(props) {
    track('vsl_cta_shown', props);
  }

  function ctaClicked(props) {
    track('vsl_cta_clicked', props);
  }

  return {
    impression,
    play,
    unmute,
    progress,
    complete,
    ctaShown,
    ctaClicked,
    /** @param {string} event */
    hasFired: (event) => fired.has(event),
  };
}
