const LOTTIE_SRC = new URL('../animations/booking-success.json', import.meta.url).href;

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const mark = document.getElementById('ty-mark');
const lottieHost = document.getElementById('ty-lottie');
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

if (mark && lottieHost && !prefersReducedMotion) {
  Promise.all([
    import('../vendor/lottie-web/lottie.min.esm.js'),
    fetch(LOTTIE_SRC, { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error('lottie');
      return response.json();
    }),
  ]).then(([{ default: lottie }, animationData]) => {
    const animation = lottie.loadAnimation({
      container: lottieHost,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData,
    });
    animation.addEventListener('DOMLoaded', () => {
      mark.classList.add('is-animated');
      animation.resize();
      animation.goToAndPlay(0, true);
    });
  }).catch(() => {
    // Keep the static checkmark if the animation cannot load.
  });
}
