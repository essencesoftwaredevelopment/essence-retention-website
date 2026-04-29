import posthog from 'posthog-js';

posthog.init('phc_AWPpoUk36vJppq9rYn4SVVtE78HKvHAiGA2TEpPSGfnC', {
  api_host: 'https://eu.i.posthog.com',
  defaults: '2026-01-30',
  loaded: (ph) => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ph_debug') === '1') {
      ph.set_config({ debug: true });
    }

    // Force replay to start for this session regardless of remote trigger gating.
    // We retry briefly because replay extension init can race this callback.
    const forceReplayStart = () => ph.startSessionRecording(true);
    forceReplayStart();
    setTimeout(forceReplayStart, 0);
    setTimeout(forceReplayStart, 500);
    setTimeout(forceReplayStart, 1500);
  }
});

// Expose for DevTools checks like `window.posthog.sessionRecordingStarted()`.
window.posthog = posthog;

window.posthogDebugStatus = () => ({
  started: window.posthog.sessionRecordingStarted(),
  status: window.posthog.sessionRecording?.status,
  optedOut: window.posthog.has_opted_out_capturing(),
  remoteConfig: window.posthog.get_property('$session_recording_remote_config'),
  scriptNotLoaded: window.posthog.get_property('$sdk_debug_recording_script_not_loaded'),
});
