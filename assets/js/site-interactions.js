const faqData = [
  {
    question: 'What ROI do you typically generate for brands at our level?',
    answer: 'Most brands see a meaningful lift within the first 30 to 60 days. Typical outcomes range from +15% to +40% increase in email/SMS attributed revenue, depending on current setup quality, traffic volume, and inventory depth. If you\'re already sending, we focus on improving profitability and consistency, not just volume.'
  },
  {
    question: 'How do you improve what we\'ve already built without starting over?',
    answer: 'We don\'t nuke accounts. We audit what exists, keep what\'s working, and rebuild only what\'s limiting results (messaging, segmentation, structure, timing, deliverability). You keep your existing data, list, flows, learnings, and brand voice, we simply make the system perform at a higher level.'
  },
  {
    question: 'We already have flows, what else can you add or optimize?',
    answer: 'If flows exist, we upgrade them into a real retention engine:<br><br>• Better segmentation and conditional logic<br>• Higher-converting copy and creative<br>• Offer positioning without constant discounting<br>• Improved timing, split paths, and exclusions<br>• Advanced flows most brands don\'t have (replenishment, VIP, churn prevention, cross-sell, etc.)'
  },
  {
    question: 'Do you work with brands doing 7+ figures and above?',
    answer: 'Yes. We typically work with Shopify brands doing $50k to $1M/month, and also support brands well above 7 figures if there\'s enough complexity to justify a premium retention partner.'
  },
  {
    question: 'How do you segment advanced audiences for better performance?',
    answer: 'We build segmentation around:<br><br>• Purchase behavior (frequency, recency, AOV, product)<br>• Engagement levels (opens/clicks, site activity)<br>• Lifecycle stages (new, active, at-risk, lapsed, VIP)<br>• Offer sensitivity (discount buyer vs. full price buyer)<br><br>This increases revenue while reducing fatigue.'
  },
  {
    question: 'Will this actually increase LTV, or just send more emails?',
    answer: 'We\'re not here to "send more." We\'re here to increase repeat purchase rate, retention, and lifetime value. More volume without strategy kills deliverability. We prioritize quality, relevance, and customer lifecycle.'
  },
  {
    question: 'How do you avoid list fatigue and unsubscribes?',
    answer: 'We protect your list aggressively:<br><br>• Engagement-based sending (throttling unengaged users)<br>• Smart frequency caps<br>• Strong "value-first" campaign mix<br>• Deliverability monitoring<br>• Segmentation that prevents over-mailing'
  },
  {
    question: 'Can you match our brand voice and tone consistently?',
    answer: 'Yes. We run a structured tone-matching process: we analyze your site, ads, socials, customer reviews, and existing emails, then build a consistent messaging style guide. Every email follows that voice so the brand stays coherent.'
  },
  {
    question: 'How do you use data to decide what campaigns to send?',
    answer: 'We don\'t guess. Campaign planning is based on:<br><br>• Shopify product performance + margin<br>• Cohort behavior (repeat timing + product rebuys)<br>• Flow gaps and customer lifecycle needs<br>• Klaviyo reporting (what actually drives conversions)<br>• Seasonality, launches, and inventory priorities'
  },
  {
    question: 'Can you audit our current setup before making recommendations?',
    answer: 'Yes. Every partnership starts with a full audit:<br><br>• Flows and campaigns<br>• Tracking + event setup<br>• Popups / list growth<br>• Segmentation<br>• Deliverability<br>• Creative and conversion structure<br><br>You\'ll get a clear roadmap before execution starts.'
  },
  {
    question: 'What does your reporting look like, can we track performance clearly?',
    answer: 'Yes. We provide clear reporting that ties actions to results:<br><br>• Email + SMS revenue (accounting for attribution nuance)<br>• Campaign vs. flow split<br>• Revenue per recipient<br>• Deliverability and list health<br>• Weekly/monthly highlights + next actions'
  },
  {
    question: 'How do you ensure deliverability stays high at our list size?',
    answer: 'Deliverability is part of the system:<br><br>• Proper DNS setup (SPF/DKIM/DMARC + dedicated sending domain)<br>• Engagement filtering<br>• Smart warmup and ramping strategy<br>• Bounce/complaint monitoring<br>• Routine list cleaning and suppression management'
  },
  {
    question: 'What\'s your onboarding process, how fast can we launch?',
    answer: 'Fast. Most brands are live in 7 to 14 days. Onboarding includes:<br><br>• Account access + baseline capture<br>• Audit + roadmap<br>• Flow fixes + quick wins first<br>• Campaign engine setup (calendar + approvals)'
  },
  {
    question: 'Do you handle everything or just consult and guide?',
    answer: 'We do both, but most clients choose done-for-you. We can:<br><br>• fully manage retention (strategy + copy + design + build)<br>• or consult and direct your internal team'
  },
  {
    question: 'How do you tie email strategy into product launches and promos?',
    answer: 'We build launch sequences that maximize conversion without exhausting the list:<br><br>• Warmup/education<br>• Waitlist and early access<br>• Drop day sequencing<br>• Segmented urgency (VIP first, engaged next)<br>• Post-launch follow-up to capture missed buyers'
  },
  {
    question: 'How do you work with our in-house team or other contractors?',
    answer: 'Clean collaboration, no stepping on toes. We can plug into your existing ecosystem (designer, media buyer, brand team) and handle retention end-to-end while coordinating on creative priorities and promo schedule.'
  },
  {
    question: 'Can you help increase repeat purchase rate and retention?',
    answer: 'Yes, that\'s the main focus. We target:<br><br>• higher repeat purchase rate<br>• higher LTV<br>• better second purchase conversion<br>• more predictable monthly revenue from returning customers'
  },
  {
    question: 'Do you handle both campaigns and automations?',
    answer: 'Yes. We handle:<br><br>• flows/automations (retention backbone)<br>• campaigns (weekly revenue engine)<br>• list growth (so the system scales)'
  }
];

(function initCalendlyAndLeadModal() {
  const calendlyUrl = 'https://calendly.com/essencesoftwaredevelopment/discovery-call';

  const openCalendlyPopup = () => {
    if (window.Calendly && typeof window.Calendly.initPopupWidget === 'function') {
      window.Calendly.initPopupWidget({ url: calendlyUrl });
    } else {
      window.location.href = calendlyUrl;
    }
  };

  const wireCalendlyPopup = () => {
    const buttons = document.querySelectorAll('.button--primary[href*="calendly.com/essencesoftwaredevelopment/discovery-call"]');
    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openCalendlyPopup();
      });
    });
  };

  if (document.readyState === 'complete') {
    wireCalendlyPopup();
  } else {
    window.addEventListener('load', wireCalendlyPopup);
  }

  const leadModal = document.getElementById('lead-modal');
  const leadModalDialog = document.getElementById('lead-modal-dialog');
  const teaserButton = document.getElementById('lead-modal-teaser');
  const nextButton = document.getElementById('lead-modal-next');
  const backButton = document.getElementById('lead-modal-back');
  const bookButton = document.getElementById('lead-modal-book');
  const restartButton = document.getElementById('lead-modal-restart');
  const leadForm = document.getElementById('lead-modal-form');
  const websiteInput = document.getElementById('lead-modal-website');
  const resultsTitle = document.getElementById('lead-modal-results-title');
  const resultsProgressBar = document.getElementById('lead-modal-progress-bar');
  const resultsStatus = document.getElementById('lead-modal-results-status');
  const resultsContainer = document.getElementById('lead-modal-results');
  const resultsLogos = document.getElementById('lead-modal-results-logos');
  const resultsColors = document.getElementById('lead-modal-results-colors');
  const resultsProducts = document.getElementById('lead-modal-results-products');
  if (!leadModal) return;
  const generationCards = Array.from(leadModal.querySelectorAll('.lead-modal__generation-card'));

  const closeTriggers = leadModal.querySelectorAll('[data-lead-modal-close]');
  let resultsTitleTimers = [];
  let resultsExpandTimer = null;
  let assetRevealTimers = [];
  let heroGenerationRunId = 0;
  let generatedHeroReadyCount = 0;
  const enableGenerationBodyBlur = true;

  const isLeadModalBlocked = () => window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;

  const clearResultsTitleTimers = () => {
    resultsTitleTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    resultsTitleTimers = [];
  };

  const clearResultsExpandTimer = () => {
    if (resultsExpandTimer !== null) {
      window.clearTimeout(resultsExpandTimer);
      resultsExpandTimer = null;
    }
  };

  const clearAssetRevealTimers = () => {
    assetRevealTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    assetRevealTimers = [];
  };

  const clientValidateLeadWebsite = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
      return 'Enter a website address or domain.';
    }

    const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;

    let parsed;
    try {
      parsed = new URL(withProtocol);
    } catch {
      return 'Enter a valid website address or domain.';
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Only http and https website addresses are supported.';
    }

    const hostname = parsed.hostname.toLowerCase();
    const labels = hostname.split('.');
    const hostLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    const tldPattern = /^[a-z]{2,24}$/i;

    if (labels.length < 2) {
      return 'Enter a full domain like brand.com.';
    }

    if (labels.some((label) => !hostLabelPattern.test(label))) {
      return 'This domain has invalid characters.';
    }

    if (!tldPattern.test(labels.at(-1) || '')) {
      return 'Enter a domain with a valid top-level domain.';
    }

    if (parsed.username || parsed.password) {
      return 'Website addresses cannot include login credentials.';
    }

    return '';
  };

  const updateLeadWebsiteValidity = () => {
    if (!(websiteInput instanceof HTMLInputElement)) {
      return true;
    }

    const validationMessage = clientValidateLeadWebsite(websiteInput.value);
    websiteInput.setCustomValidity(validationMessage);
    return !validationMessage;
  };

  const preloadImage = (source) => new Promise((resolve) => {
    if (typeof source !== 'string' || !source.trim()) {
      resolve();
      return;
    }

    const image = new Image();
    const finalize = () => resolve();

    image.addEventListener('load', finalize, { once: true });
    image.addEventListener('error', finalize, { once: true });
    image.src = source;

    if (image.complete) {
      resolve();
    }
  });

  const wait = (duration) => new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });

  const preloadLeadModalAssets = async (brandData, productData) => {
    const sources = new Set();
    const logos = Array.isArray(brandData?.logos) ? brandData.logos : [];
    const products = Array.isArray(productData?.products) ? productData.products : [];

    logos.forEach((logo) => {
      if (logo && typeof logo.url === 'string' && logo.url.trim()) {
        sources.add(logo.url);
      }
    });

    products.forEach((product) => {
      if (product && typeof product.imageUrl === 'string' && product.imageUrl.trim()) {
        sources.add(product.imageUrl);
      }
    });

    await Promise.all(Array.from(sources, preloadImage));
  };

  const seededRatio = (seed, offset) => {
    const value = Math.sin((seed + 1) * (offset + 1) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };

  const getStoredLeadModalProductImages = () => {
    try {
      const rawProducts = sessionStorage.getItem('leadModalBrandProducts');
      if (!rawProducts) return [];

      const parsed = JSON.parse(rawProducts);
      const products = Array.isArray(parsed?.products) ? parsed.products : [];

      return products
        .map((product) => (typeof product?.imageUrl === 'string' ? product.imageUrl.trim() : ''))
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  const buildGenerationBody = (seed, productImages = []) => {
    const body = document.createElement('div');
    body.className = 'lead-modal__generation-email-body';

    const imageCount = productImages.length;
    const firstImage = imageCount ? productImages[(seed - 1 + imageCount) % imageCount] : '';
    const secondImage = imageCount ? productImages[seed % imageCount] : '';
    const thirdImage = imageCount ? productImages[(seed + 1) % imageCount] : '';

    body.innerHTML = `
      <div style="width: 100%; height: 100%; padding-left: 10px; padding-right: 10px; padding-top: 9px; padding-bottom: 9px; background: white; overflow: hidden; flex-direction: column; justify-content: flex-start; align-items: center; gap: 19px; display: inline-flex">
        <div style="align-self: stretch; padding: 3px; justify-content: flex-start; align-items: flex-start; gap: 10px; display: inline-flex">
          <div style="flex: 1 1 0; align-self: stretch; padding: 3px; overflow: hidden; flex-direction: column; justify-content: flex-start; align-items: flex-start; gap: 3px; display: inline-flex">
            <div style="color: black; font-size: 7px; font-family: Inter; font-weight: 700; word-wrap: break-word">Lorem Ipsum</div>
            <div style="align-self: stretch; color: black; font-size: 7px; font-family: Inter; font-weight: 400; word-wrap: break-word">Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.</div>
          </div>
          <div style="flex: 1 1 0; height: 70px; padding: 3px; background: #E9E9E9">${firstImage ? `<img src="${firstImage}" alt="Product image" style="display: block; width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : ''}</div>
        </div>
        <div style="align-self: stretch; padding: 3px; justify-content: flex-start; align-items: flex-start; gap: 10px; display: inline-flex">
          <div style="flex: 1 1 0; height: 70px; padding: 3px; background: #E9E9E9">${secondImage ? `<img src="${secondImage}" alt="Product image" style="display: block; width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : ''}</div>
          <div style="flex: 1 1 0; align-self: stretch; padding: 3px; overflow: hidden; flex-direction: column; justify-content: flex-start; align-items: flex-start; gap: 3px; display: inline-flex">
            <div style="color: black; font-size: 7px; font-family: Inter; font-weight: 700; word-wrap: break-word">Lorem Ipsum</div>
            <div style="align-self: stretch; color: black; font-size: 7px; font-family: Inter; font-weight: 400; word-wrap: break-word">Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.</div>
          </div>
        </div>
        <div style="align-self: stretch; padding: 3px; justify-content: flex-start; align-items: flex-start; gap: 10px; display: inline-flex">
          <div style="flex: 1 1 0; align-self: stretch; padding: 3px; overflow: hidden; flex-direction: column; justify-content: flex-start; align-items: flex-start; gap: 3px; display: inline-flex">
            <div style="color: black; font-size: 7px; font-family: Inter; font-weight: 700; word-wrap: break-word">Lorem Ipsum</div>
            <div style="align-self: stretch; color: black; font-size: 7px; font-family: Inter; font-weight: 400; word-wrap: break-word">Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.</div>
          </div>
          <div style="flex: 1 1 0; height: 70px; padding: 3px; background: #E9E9E9">${thirdImage ? `<img src="${thirdImage}" alt="Product image" style="display: block; width: 100%; height: 100%; object-fit: cover;" loading="lazy">` : ''}</div>
        </div>
      </div>
    `;

    if (enableGenerationBodyBlur) {
      const blur = document.createElement('div');
      blur.className = 'lead-modal__generation-body-blur';
      body.appendChild(blur);
    }

    return body;
  };

  const renderGeneratedHeroCard = (card, imageUrl, seed) => {
    if (!(card instanceof HTMLElement)) {
      return;
    }

    card.classList.remove('is-loading', 'is-error');
    card.classList.add('is-ready');
    card.innerHTML = '';

    const frame = document.createElement('article');
    frame.className = 'lead-modal__generation-email';

    const hero = document.createElement('div');
    hero.className = 'lead-modal__generation-hero';

    const heroImage = document.createElement('img');
    heroImage.className = 'lead-modal__generation-hero-image';
    heroImage.src = imageUrl;
    heroImage.alt = 'Generated email hero';
    heroImage.loading = 'lazy';
    hero.appendChild(heroImage);

    frame.appendChild(hero);
    frame.appendChild(buildGenerationBody(seed, getStoredLeadModalProductImages()));
    card.appendChild(frame);
  };

  const markGeneratedHeroReady = (runId) => {
    if (runId !== heroGenerationRunId) {
      return;
    }

    generatedHeroReadyCount += 1;

    if (generatedHeroReadyCount >= generationCards.length && resultsTitle instanceof HTMLElement) {
      clearResultsTitleTimers();
      resultsTitle.textContent = 'Your emails are ready!';
    }
  };

  const resetGenerationCards = () => {
    generationCards.forEach((card) => {
      if (!(card instanceof HTMLElement)) {
        return;
      }

      card.classList.remove('is-ready', 'is-error');
      card.classList.add('is-loading');
      card.innerHTML = '';
    });
  };

  const fetchGeneratedHeroImage = async (website, runId, emailIndex, maxAttempts = 18) => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (runId !== heroGenerationRunId) {
        return '';
      }

      try {
        const response = await fetch(`/api/leads/generateHero?emailIndex=${emailIndex}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: website }),
        });

        const payload = await response.json().catch(() => null);

        if (response.status === 202 || payload?.pending === true) {
          await wait(2500);
          continue;
        }

        if (response.ok) {
          const imageUrl = payload?.data?.heroSection?.data?.payload?.background?.imageUri;

          if (typeof imageUrl === 'string' && imageUrl.trim()) {
            await preloadImage(imageUrl);
            if (runId !== heroGenerationRunId) {
              return '';
            }

            return imageUrl;
          }
        }
      } catch (error) {
        console.warn('[LeadModal] generateHero attempt failed', error);
      }

      await wait(2500);
    }

    return '';
  };

  const requestGeneratedHeroes = (website, runId) => {
    generationCards.forEach((card, index) => {
      fetchGeneratedHeroImage(website, runId, index)
        .then((imageUrl) => {
          if (runId !== heroGenerationRunId || !imageUrl) {
            return;
          }

          renderGeneratedHeroCard(card, imageUrl, index + 1);
          markGeneratedHeroReady(runId);
        })
        .catch((error) => {
          console.warn('[LeadModal] generateHero request exhausted', error);
        });
    });
  };

  const refreshGeneratedCardsWithProducts = () => {
    generationCards.forEach((card, index) => {
      if (!(card instanceof HTMLElement)) {
        return;
      }

      const heroImage = card.querySelector('.lead-modal__generation-hero-image');
      if (!(heroImage instanceof HTMLImageElement) || !heroImage.src) {
        return;
      }

      renderGeneratedHeroCard(card, heroImage.src, index + 1);
    });
  };

  const setLeadModalStep = (step) => {
    if (!leadModalDialog) return;
    leadModalDialog.dataset.step = String(step);
  };

  const playResultsTitleSequence = (brandName) => {
    if (!(resultsTitle instanceof HTMLElement)) {
      return;
    }

    clearResultsTitleTimers();

    const titles = [
      'Gathering brand dna...',
      'Mapping your visual language...',
      'Assembling email ingredients...',
      brandName ? `Generating concepts for ${brandName}...` : 'Generating your email concepts...',
      'Generating your email layouts...',
      'Adding the final touches...',
      'Almost there...',
    ];

    titles.forEach((title, index) => {
      const timerId = window.setTimeout(() => {
        resultsTitle.textContent = title;
      }, index * 5500);
      resultsTitleTimers.push(timerId);
    });
  };

  const openLeadModal = () => {
    if (isLeadModalBlocked()) {
      return;
    }

    if (leadModal.classList.contains('is-open')) {
      return;
    }

    resetResults();
    setLeadModalStep(1);
    leadModal.classList.add('is-open');
    leadModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  };

  const closeLeadModal = () => {
    leadModal.classList.remove('is-open');
    leadModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    clearResultsExpandTimer();
    clearAssetRevealTimers();
    clearResultsTitleTimers();
    resetResults();
    setLeadModalStep(1);
  };

  const makeSkeletonCell = (className) => {
    const cell = document.createElement('div');
    cell.className = className;
    return cell;
  };

  const resetProducts = () => {
    if (!resultsProducts) {
      return;
    }

    resultsProducts.innerHTML = '';

    const label = document.createElement('p');
    label.className = 'lead-modal__results-label lead-modal__results-label--products';
    label.textContent = 'Products';

    const viewport = document.createElement('div');
    viewport.className = 'lead-modal__products-viewport';

    const track = document.createElement('div');
    track.className = 'lead-modal__products-track';

    for (let i = 0; i < 3; i += 1) {
      const card = document.createElement('div');
      card.className = 'lead-modal__product-card lead-modal__product-card--skeleton';

      const media = document.createElement('div');
      media.className = 'lead-modal__product-image';

      card.appendChild(media);
      track.appendChild(card);
    }

    viewport.appendChild(track);
    resultsProducts.appendChild(label);
    resultsProducts.appendChild(viewport);
  };

  const resetResults = () => {
    clearResultsExpandTimer();
    clearAssetRevealTimers();
    clearResultsTitleTimers();
    heroGenerationRunId += 1;
    generatedHeroReadyCount = 0;

    if (resultsProgressBar instanceof HTMLElement) {
      resultsProgressBar.classList.remove('is-running');
    }

    if (leadModalDialog) {
      leadModalDialog.classList.remove('lead-modal__dialog--expanded');
    }

    if (resultsTitle) {
      resultsTitle.textContent = 'Gathering brand dna...';
    }

    if (resultsStatus) {
      resultsStatus.textContent = 'Analyzing your brand assets...';
    }

    if (resultsContainer) {
      resultsContainer.classList.add('is-loading');
      resultsContainer.classList.remove('is-ready');
      resultsContainer.classList.remove('is-expanded');
      resultsContainer.classList.remove('is-assets-ready');
    }

    if (resultsLogos) {
      resultsLogos.innerHTML = '';
      for (let i = 0; i < 3; i += 1) {
        resultsLogos.appendChild(makeSkeletonCell('lead-modal__logo-item'));
      }
    }

    if (resultsColors) {
      resultsColors.innerHTML = '';
      for (let i = 0; i < 4; i += 1) {
        const colorCell = makeSkeletonCell('lead-modal__color-item');
        colorCell.appendChild(makeSkeletonCell('lead-modal__color-swatch'));
        resultsColors.appendChild(colorCell);
      }
    }

    resetProducts();
    resetGenerationCards();

  };

  const setResultError = (message) => {
    if (resultsStatus) {
      resultsStatus.textContent = message;
    }
    if (resultsContainer) {
      resultsContainer.classList.remove('is-loading');
      resultsContainer.classList.add('is-ready');
    }
    if (resultsLogos) {
      resultsLogos.innerHTML = '<p class="lead-modal__empty">No logos found.</p>';
    }
    if (resultsColors) {
      resultsColors.innerHTML = '<p class="lead-modal__empty">No colors found.</p>';
    }
    if (resultsProducts) {
      resultsProducts.innerHTML = '<p class="lead-modal__empty">No products found.</p>';
    }
  };

  const renderProducts = (products, queueReveal) => {
    if (!resultsProducts) {
      return;
    }

    resultsProducts.innerHTML = '';

    const label = document.createElement('p');
    label.className = 'lead-modal__results-label lead-modal__results-label--products';
    label.textContent = 'Products';
    resultsProducts.appendChild(label);

    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'lead-modal__empty';
      empty.textContent = 'No products found.';
      resultsProducts.appendChild(empty);
      return;
    }

    const viewport = document.createElement('div');
    viewport.className = 'lead-modal__products-viewport';

    const track = document.createElement('div');
    track.className = 'lead-modal__products-track';

    products.forEach((product) => {
      if (!product || typeof product.imageUrl !== 'string' || !product.imageUrl.trim()) return;

      const card = document.createElement('article');
      card.className = 'lead-modal__product-card';

      const image = document.createElement('img');
      image.className = 'lead-modal__product-image';
      image.src = product.imageUrl;
      image.alt = typeof product.name === 'string' && product.name.trim()
        ? product.name
        : 'Product image';
      image.loading = 'lazy';

      card.appendChild(image);
      queueReveal(track, card);
    });

    viewport.appendChild(track);
    resultsProducts.appendChild(viewport);
  };

  const renderExtractionResults = async (brandData, productData) => {
    const revealQueue = [];
    const queueReveal = (parent, element) => {
      if (!(parent instanceof HTMLElement) || !(element instanceof HTMLElement)) return;
      revealQueue.push(() => {
        element.style.animation = 'leadModalAssetIn 0.32s ease both';
        parent.appendChild(element);
      });
    };

    const logos = Array.isArray(brandData?.logos) ? brandData.logos : [];
    const colors = Array.isArray(brandData?.colors) ? brandData.colors : [];
    const products = Array.isArray(productData?.products) ? productData.products : [];
    const brandName = typeof brandData?.brandName === 'string'
      ? brandData.brandName.trim()
      : typeof brandData?.brand_name === 'string'
        ? brandData.brand_name.trim()
        : '';

    await preloadLeadModalAssets(brandData, productData);

    playResultsTitleSequence(brandName);

    if (resultsStatus) {
      resultsStatus.textContent = brandName
        ? `Here is what we found for ${brandName}.`
        : 'Here are the assets we found for your brand.';
    }

    if (resultsLogos) {
      resultsLogos.innerHTML = '';
      if (!logos.length) {
        resultsLogos.innerHTML = '<p class="lead-modal__empty">No logos found.</p>';
      } else {
        let insertedLogos = 0;
        logos.slice(0, 6).forEach((logo) => {
          if (!logo || typeof logo.url !== 'string' || !logo.url.trim()) return;
          const wrapper = document.createElement('div');
          wrapper.className = 'lead-modal__logo-item';
          const image = document.createElement('img');
          image.src = logo.url;
          image.alt = typeof logo.alt === 'string' && logo.alt.trim() ? logo.alt : 'Brand logo';
          wrapper.appendChild(image);
          queueReveal(resultsLogos, wrapper);
          insertedLogos += 1;
        });
        if (!insertedLogos) {
          resultsLogos.innerHTML = '<p class="lead-modal__empty">No logos found.</p>';
        }
      }
    }

    if (resultsColors) {
      resultsColors.innerHTML = '';
      if (!colors.length) {
        resultsColors.innerHTML = '<p class="lead-modal__empty">No colors found.</p>';
      } else {
        let insertedColors = 0;
        colors.slice(0, 8).forEach((color) => {
          if (!color || typeof color.hex !== 'string' || !color.hex.trim()) return;
          const item = document.createElement('div');
          item.className = 'lead-modal__color-item';

          const swatch = document.createElement('span');
          swatch.className = 'lead-modal__color-swatch';
          swatch.style.backgroundColor = color.hex;

          item.appendChild(swatch);
          queueReveal(resultsColors, item);
          insertedColors += 1;
        });
        if (!insertedColors) {
          resultsColors.innerHTML = '<p class="lead-modal__empty">No colors found.</p>';
        }
      }
    }

    renderProducts(products, queueReveal);
    refreshGeneratedCardsWithProducts();

    clearAssetRevealTimers();
    revealQueue.forEach((insert, index) => {
      const timerId = window.setTimeout(insert, index * 80);
      assetRevealTimers.push(timerId);
    });

    const revealDuration = revealQueue.length ? revealQueue.length * 80 + 180 : 0;
    const assetsReadyTimer = window.setTimeout(() => {
      resultsContainer?.classList.add('is-assets-ready');
    }, revealDuration);
    assetRevealTimers.push(assetsReadyTimer);

    if (resultsContainer) {
      resultsContainer.classList.remove('is-loading');
      resultsContainer.classList.remove('is-ready');
      window.requestAnimationFrame(() => {
        resultsContainer.classList.add('is-ready');
      });
    }
  };

  closeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', closeLeadModal);
  });

  if (teaserButton) {
    teaserButton.addEventListener('click', openLeadModal);
  }

  if (websiteInput instanceof HTMLInputElement) {
    websiteInput.addEventListener('input', () => {
      websiteInput.setCustomValidity('');
    });

    websiteInput.addEventListener('blur', () => {
      updateLeadWebsiteValidity();
      websiteInput.reportValidity();
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      setLeadModalStep(2);
      window.setTimeout(() => {
        if (websiteInput instanceof HTMLInputElement) {
          websiteInput.focus();
        }
      }, 220);
    });
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      setLeadModalStep(1);
    });
  }

  if (restartButton) {
    restartButton.addEventListener('click', () => {
      setLeadModalStep(2);
      window.setTimeout(() => {
        if (websiteInput instanceof HTMLInputElement) {
          websiteInput.focus();
        }
      }, 220);
    });
  }

  if (bookButton) {
    bookButton.addEventListener('click', () => {
      closeLeadModal();
      openCalendlyPopup();
    });
  }

  if (leadForm) {
    leadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!(websiteInput instanceof HTMLInputElement)) return;
      if (!updateLeadWebsiteValidity()) {
        websiteInput.reportValidity();
        return;
      }
      if (!websiteInput.reportValidity()) return;

      const submitButton = leadForm.querySelector('button[type="submit"]');
      const originalSubmitLabel = submitButton ? submitButton.textContent : '';

      const website = websiteInput.value.trim();
      sessionStorage.setItem('leadModalWebsite', website);

      resetResults();
      setLeadModalStep(3);
      if (resultsProgressBar instanceof HTMLElement) {
        resultsProgressBar.classList.remove('is-running');
        void resultsProgressBar.offsetWidth;
        resultsProgressBar.classList.add('is-running');
      }
      requestGeneratedHeroes(website, heroGenerationRunId);

      clearResultsExpandTimer();
      resultsExpandTimer = window.setTimeout(() => {
        if (leadModalDialog?.dataset.step !== '3') return;
        leadModalDialog.classList.add('lead-modal__dialog--expanded');
        resultsContainer?.classList.add('is-expanded');
      }, 150);

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = 'Analyzing...';
      }

      try {
        const [assetsResponse, productsResponse] = await Promise.all([
          fetch(`/api/leads/brandAssets?url=${encodeURIComponent(website)}`, { method: 'GET' }),
          fetch(`/api/leads/brandProducts?url=${encodeURIComponent(website)}`, { method: 'GET' }),
        ]);

        if (!assetsResponse.ok) {
          throw new Error('Could not fetch brand assets right now.');
        }

        const payload = await assetsResponse.json();
        let productsPayload = null;

        if (productsResponse.ok) {
          productsPayload = await productsResponse.json();
        }

        console.log('[BrandAssets] extraction response:', payload);
        const isSuccess = payload && typeof payload === 'object' && payload.ok === true;
        if (isSuccess && payload.data) {
          sessionStorage.setItem('leadModalBrandAssets', JSON.stringify(payload.data));
          if (productsPayload && productsPayload.ok === true) {
            sessionStorage.setItem('leadModalBrandProducts', JSON.stringify(productsPayload.data));
          }
          await renderExtractionResults(payload.data, productsPayload?.data);
        } else {
          const errorMessage = payload && typeof payload.error === 'string'
            ? payload.error
            : 'We could not find assets for that URL.';
          setResultError(errorMessage);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not fetch brand assets right now.';
        console.error('[BrandAssets] extraction error:', error);
        setResultError(message);
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = originalSubmitLabel;
        }
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && leadModal.classList.contains('is-open')) {
      closeLeadModal();
    }
  });

  if (!isLeadModalBlocked()) {
    window.setTimeout(openLeadModal, 5000);
  }
})();

(function initFaqAccordion() {
  const faqList = document.getElementById('faq-list');
  if (!faqList) return;

  faqData.forEach((faq) => {
    const faqItem = document.createElement('div');
    faqItem.className = 'faq-item';
    faqItem.innerHTML = `
      <button class="faq-question">
        <span>${faq.question}</span>
        <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="faq-answer">
        <p>${faq.answer}</p>
      </div>
    `;
    faqList.appendChild(faqItem);
  });

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

      if (isOpen) {
        item.classList.remove('is-open');
      } else {
        item.classList.add('is-open');
      }
    });
  });
})();
