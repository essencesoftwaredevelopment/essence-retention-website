import posthog from 'posthog-js';

async function ensureLocalRecorder() {
  if (window.__PosthogExtensions?.initSessionRecording) {
    return true;
  }

  const existing = document.querySelector('script[data-posthog-local-recorder="1"]');
  if (existing) {
    return window.__PosthogExtensions?.initSessionRecording ? true : false;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.dataset.posthogLocalRecorder = '1';
    script.src = '/assets/vendor/posthog-js/posthog-recorder.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.__PosthogExtensions?.initSessionRecording));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

const hasLocalRecorder = await ensureLocalRecorder();

posthog.init('phc_AWPpoUk36vJppq9rYn4SVVtE78HKvHAiGA2TEpPSGfnC', {
  api_host: 'https://eu.i.posthog.com',
  defaults: '2026-01-30',
  disable_external_dependency_loading: hasLocalRecorder,
  loaded: (ph) => {
    // Force replay to start for this session regardless of remote trigger gating.
    ph.startSessionRecording(true);
  }
});

