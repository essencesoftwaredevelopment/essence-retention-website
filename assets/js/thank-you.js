const LOTTIE_SRC = new URL('../animations/booking-success.json', import.meta.url).href;

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const mark = document.getElementById('ty-mark');
const lottieHost = document.getElementById('ty-lottie');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      animation.goToAndPlay(0, true);
    });
  }).catch(() => {});
}

const faqList = document.getElementById('ty-faq-list');
if (faqList) {
  const faqItems = faqList.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove('is-open');
        }
      });

      item.classList.toggle('is-open', !isOpen);
    });
  });
}
