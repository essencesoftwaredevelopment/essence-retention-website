(function initEssenceAIScroll() {
  const stages = [
    {
      icon: 'neurology',
      heading: 'It learns your brand before it writes a word',
      sub: 'Visual identity, voice, products, and real-time customer feedback — absorbed into one brand brain, 24/7.',
    },
    {
      icon: 'calendar_check',
      heading: 'Your calendar, planned weeks ahead',
      sub: 'Campaigns mapped to your segments, drops, and promos — so retention runs on strategy, never scramble.',
    },
    {
      icon: 'auto_awesome_motion',
      heading: 'AI drafts in minutes, designers perfect every pixel',
      sub: 'Machine speed gets each email to 90% instantly. Our senior team takes it the last mile to on-brand and high-converting.',
    },
    {
      icon: 'inbox',
      heading: 'You approve. We handle the rest.',
      sub: 'Review, comment, and sign off in one place — strategy, design, QA, and scheduling are all on us.',
    },
    {
      icon: 'bar_chart_4_bars',
      heading: 'Real-time proof it\'s working',
      sub: 'Live revenue, campaign history, and flow performance — see exactly what your retention channel is earning.',
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

    detailCards.forEach((card, index) => {
      const stage = stages[index];
      if (!stage || card.querySelector('.detail-card__caption')) return;
      const caption = document.createElement('div');
      caption.className = 'detail-card__caption';
      const icon = document.createElement('div');
      icon.innerHTML = `<span class="material-symbols-rounded">${stage.icon}</span>`;
      const heading = document.createElement('h3');
      heading.className = 'detail-card__caption-heading';
      heading.textContent = stage.heading;
      const sub = document.createElement('p');
      sub.className = 'detail-card__caption-sub';
      sub.textContent = stage.sub;
      caption.append(icon, heading, sub);
      card.appendChild(caption);
    });

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
