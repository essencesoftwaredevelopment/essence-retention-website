(function initTestimonialsScroll() {
  function headerOffset() {
    const header = document.querySelector('.site-header');
    if (!header) return 80;
    return Math.max(72, Math.ceil(header.getBoundingClientRect().bottom + 8));
  }

  function setup() {
    const scene = document.querySelector('.testimonials__scene');
    const pin = scene && scene.querySelector('.testimonials__pin');
    const viewport = pin && pin.querySelector('.testimonials__quotes');
    const track = viewport && viewport.querySelector('.testimonials__quotes-track');

    if (!scene || !pin || !viewport || !track || !window.gsap || !window.ScrollTrigger) return;

    window.gsap.registerPlugin(window.ScrollTrigger);

    const mm = window.gsap.matchMedia();

    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const getTravel = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);

      const applyLayout = () => {
        const offset = headerOffset();
        pin.style.top = offset + 'px';
        scene.style.height = pin.offsetHeight + getTravel() + 'px';
      };

      const syncCarousel = (progress) => {
        viewport.scrollLeft = progress * getTravel();
      };

      scene.classList.add('is-scroll-driven');
      pin.classList.add('is-scroll-driven');
      applyLayout();

      const trigger = window.ScrollTrigger.create({
        trigger: scene,
        start: () => `top ${headerOffset()}px`,
        end: () => '+=' + Math.max(getTravel(), 1),
        invalidateOnRefresh: true,
        onRefreshInit: applyLayout,
        onUpdate: (self) => {
          syncCarousel(self.progress);
        },
        onRefresh: (self) => {
          syncCarousel(self.progress);
        },
      });

      return () => {
        trigger.kill();
        scene.classList.remove('is-scroll-driven');
        pin.classList.remove('is-scroll-driven');
        scene.style.height = '';
        pin.style.top = '';
        viewport.scrollLeft = 0;
      };
    });

    window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
