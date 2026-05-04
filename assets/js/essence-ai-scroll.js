(function initEssenceAIScroll() {
  const stages = [
    {
      icon: 'neurology',
      heading: 'Dynamically learns your brand 24/7',
      sub: 'Visual identity, voice, products, & real-time feedback all in one place.',
    },
    {
      icon: 'calendar_check',
      heading: 'On-brand campaigns',
      sub: 'Campaigns built around your customer segments, product drops, and front end marketing.',
    },
    {
      icon: 'auto_awesome_motion',
      heading: 'AI email generations, refined by human designers',
      sub: 'AI-generated email designs and copy, refined by our team to ensure brand consistency and high performance.',
    },
    {
      icon: 'inbox',
      heading: 'From idea to scheduled without the headaches',
      sub: 'Review, comment, and approve, our system handles the rest.',
    },
    {
      icon: 'bar_chart_4_bars',
      heading: "See performance in real-time",
      sub: 'Live revenue, metrics, campaign history, and flow performance in one view.',
    },
  ];

  let activeIndex = 0;
  let targetIndex = 0;
  let activeTween = null;
  let initialized = false;

  function setCardContent(card, stage) {
    const icon = card.querySelector('[data-icon]');
    const step = card.querySelector('[data-step]');
    const heading = card.querySelector('[data-heading]');
    const sub = card.querySelector('[data-sub]');
    const body = card.querySelector('[data-body]');

    if (icon) icon.innerHTML = `<span class="material-symbols-rounded">${stage.icon}</span>`;
    if (step) step.textContent = stage.step;
    if (heading) heading.textContent = stage.heading;
    if (sub) sub.textContent = stage.sub;
    if (body) body.textContent = stage.body;
  }

  function updatePinnedCard(index) {
    if (index === targetIndex || !stages[index]) return;

    const card = document.querySelector('[data-pinned-card]');
    const detailCards = Array.from(document.querySelectorAll('.detail-card'));
    const stage = stages[index];
    const fields = card.querySelectorAll('[data-icon], [data-step], [data-heading], [data-sub], [data-body]');

    targetIndex = index;
    detailCards.forEach((detailCard, detailIndex) => {
      detailCard.classList.toggle('is-active', detailIndex === index);
    });

    if (!window.gsap) {
      setCardContent(card, stage);
      activeIndex = index;
      return;
    }

    if (activeTween) activeTween.kill();
    window.gsap.set(fields, { opacity: 1, y: 0 });

    activeTween = window.gsap.timeline()
      .to(fields, {
        opacity: 0,
        y: -8,
        duration: 0.2,
        stagger: 0.04,
        ease: 'power2.in',
        onComplete: () => {
          setCardContent(card, stage);
          activeIndex = index;
        },
      })
      .to(fields, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.04,
        ease: 'power2.out',
      });
  }

  function init() {
    const section = document.querySelector('.essence-ai__stage');
    if (!section) return;

    const pinnedCard = section.querySelector('[data-pinned-card]');
    const detailCards = Array.from(section.querySelectorAll('.detail-card'));
    if (!pinnedCard || detailCards.length !== stages.length) return;

    setCardContent(pinnedCard, stages[0]);

    if (
      initialized ||
      window.matchMedia('(max-width: 900px)').matches ||
      !window.gsap ||
      !window.ScrollTrigger
    ) {
      return;
    }

    initialized = true;
    window.gsap.registerPlugin(window.ScrollTrigger);

    window.ScrollTrigger.create({
      trigger: section,
      start: 'top top+=12%',
      end: 'bottom bottom-=12%',
      pin: pinnedCard,
      pinSpacing: false,
      invalidateOnRefresh: true,
    });

    detailCards.forEach((card, index) => {
      window.ScrollTrigger.create({
        trigger: card,
        start: 'center center',
        end: '+=1',
        onEnter: () => updatePinnedCard(index),
        onEnterBack: () => updatePinnedCard(index),
      });
    });

    function updateFromViewportCenter() {
      const viewportCenter = window.innerHeight / 2;
      const sectionRect = section.getBoundingClientRect();
      if (sectionRect.top > viewportCenter || sectionRect.bottom < viewportCenter) return;

      let nextIndex = targetIndex;
      let closestDistance = Number.POSITIVE_INFINITY;

      detailCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextIndex = index;
        }
      });

      updatePinnedCard(nextIndex);
    }

    window.ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onUpdate: updateFromViewportCenter,
      onEnter: updateFromViewportCenter,
      onEnterBack: updateFromViewportCenter,
    });

    window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
