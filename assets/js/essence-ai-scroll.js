(function initEssenceAIScroll() {
  const stages = [
    {
      step: '01 / 05',
      icon: 'neurology',
      heading: 'Learns your brand 24/7, updates from trusted sources',
      sub: 'Voice, products, design defaults, all in one place.',
      body: 'During onboarding, we build a living profile of your brand inside ESSENCE AI, turning products, offers, voice, and design rules into reusable campaign context.',
    },
    {
      step: '02 / 05',
      icon: 'calendar_check',
      heading: 'Better ideas, faster, grounded in your context',
      sub: 'Calendar moments, products, and brand context turned into a campaign plan.',
      body: 'ESSENCE AI maps product pushes, seasonal moments, list segments, and revenue goals into a campaign calendar your team can review before production starts.',
    },
    {
      step: '03 / 05',
      icon: 'auto_awesome_motion',
      heading: 'Hero images and email sections, produced at 5x agency pace',
      sub: 'AI creative, refined by designers and copywriters before it ever reaches you.',
      body: 'The system drafts campaign angles, modules, subject lines, and visual directions quickly, then our creative team edits for taste, accuracy, and brand fit.',
    },
    {
      step: '04 / 05',
      icon: 'inbox',
      heading: 'From draft to scheduled without the headaches',
      sub: 'Review, comment, approve, and publish to Klaviyo in one flow.',
      body: 'Campaigns move from draft to approval with fewer handoffs, keeping feedback, revisions, and publishing status visible in the same operating system.',
    },
    {
      step: '05 / 05',
      icon: 'bar_chart_4_bars',
      heading: "See what's shipping and what's working",
      sub: 'Live revenue cards, campaign history, and flow performance in one view.',
      body: 'Reporting connects shipped work to revenue outcomes, so you can see campaign history, flow performance, and the next opportunities without waiting for a manual recap.',
    },
  ];

  let activeIndex = 0;
  let targetIndex = 0;
  let activeTween = null;
  let initialized = false;

  function setCardContent(card, stage) {
    card.querySelector('[data-icon]').innerHTML = `<span class="material-symbols-rounded">${stage.icon}</span>`;
    card.querySelector('[data-heading]').textContent = stage.heading;
    card.querySelector('[data-sub]').textContent = stage.sub;
    card.querySelector('[data-body]').textContent = stage.body;
  }

  function updatePinnedCard(index) {
    if (index === targetIndex || !stages[index]) return;

    const card = document.querySelector('[data-pinned-card]');
    const detailCards = Array.from(document.querySelectorAll('.detail-card'));
    const stage = stages[index];
    const fields = card.querySelectorAll('[data-icon], [data-heading], [data-sub], [data-body]');

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
