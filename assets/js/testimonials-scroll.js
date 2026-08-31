(function initTestimonialsScroll() {
  function setup() {
    const pin = document.querySelector('.testimonials__pin');
    const viewport = pin && pin.querySelector('.testimonials__quotes');
    const track = viewport && viewport.querySelector('.testimonials__quotes-track');

    if (!pin || !viewport || !track || !window.gsap || !window.ScrollTrigger) return;

    window.gsap.registerPlugin(window.ScrollTrigger);

    const mm = window.gsap.matchMedia();

    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const getTravel = () => {
        const styles = getComputedStyle(viewport);
        const visible = viewport.clientWidth
          - (parseFloat(styles.paddingLeft) || 0)
          - (parseFloat(styles.paddingRight) || 0);
        return Math.max(0, track.scrollWidth - visible);
      };

      pin.classList.add('is-scroll-driven');

      window.gsap.to(track, {
        x: () => -getTravel(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          pin: true,
          pinSpacing: true,
          pinType: 'fixed',
          scrub: true,
          anticipatePin: 1,
          start: () => {
            const header = document.querySelector('.site-header');
            const offset = header ? Math.ceil(header.getBoundingClientRect().bottom + 10) : 80;
            return `top ${offset}px`;
          },
          end: () => '+=' + Math.max(getTravel(), 1),
          invalidateOnRefresh: true,
        },
      });

      return () => {
        pin.classList.remove('is-scroll-driven');
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
