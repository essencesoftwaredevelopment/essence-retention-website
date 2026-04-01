(function initCoreUi() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  (function ensureLogoVideoLoops() {
    const logoVideo = document.querySelector('.site-header__logo');
    if (!(logoVideo instanceof HTMLVideoElement)) return;

    const replay = () => {
      logoVideo.currentTime = 0;
      logoVideo.play().catch(() => {});
    };

    logoVideo.addEventListener('ended', replay);
    logoVideo.play().catch(() => {});
  })();

  (function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;

    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (isCoarse) {
      cursor.style.display = 'none';
      return;
    }

    document.body.classList.add('has-custom-cursor');

    function handleMove(event) {
      const x = event.clientX;
      const y = event.clientY;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      cursor.classList.add('is-visible');
    }

    window.addEventListener('pointermove', handleMove, { passive: true });
  })();
})();
