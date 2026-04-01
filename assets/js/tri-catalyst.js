(function initTriCatalystAnimation() {
  const container = document.getElementById('animation-container');
  const canvas = document.getElementById('line-canvas');
  if (!container || !canvas) return;

  const MAIN_THEME_COLOR = '#FFFFFF';
  const ctx = canvas.getContext('2d');
  const boxes = Array.from(container.querySelectorAll('.component-box'));
  if (!boxes.length) return;

  const stageDetails = [
    {
      id: 'box-1',
      title: 'Capture Demand',
      subtitle: 'Stage 01 · Capture',
      body: 'Landing pages, quizzes, and unique popup systems convert cold traffic visitors into contactable information.',
      cover: 'linear-gradient(135deg, #04261c, #12f39c)',
    },
    {
      id: 'box-2',
      title: 'Convert with AI',
      subtitle: 'Stage 02 · Catalyst AI',
      body: 'Our AI system pulls live Shopify and Klaviyo data to activate campaigns, personalized flows, and channels in real time.',
      cover: 'linear-gradient(135deg, #110f2b, #6d5bff)',
    },
    {
      id: 'box-3',
      title: 'Increase Customer LTV',
      subtitle: 'Stage 03 · Revenue',
      body: 'Revenue rooms surface cohort lift while automated win-back, VIP, and replenishment programs turn every touch into margin.',
      cover: 'linear-gradient(135deg, #271014, #ff6a3d)',
    },
  ];

  let activeDetailId = stageDetails[0]?.id || null;
  const detailList = document.getElementById('flow-detail-list');
  const detailCardEls = new Map();

  (function setupTheme() {
    function hexToRgba(hex, alpha) {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const expanded = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
      const r = result ? parseInt(result[1], 16) : 255;
      const g = result ? parseInt(result[2], 16) : 255;
      const b = result ? parseInt(result[3], 16) : 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const root = document.documentElement;
    root.style.setProperty('--theme-color', MAIN_THEME_COLOR);
    root.style.setProperty('--theme-shadow-strong', hexToRgba(MAIN_THEME_COLOR, 0.2));
    root.style.setProperty('--theme-shadow-weak', hexToRgba(MAIN_THEME_COLOR, 0.1));
    root.style.setProperty('--theme-text-glow', hexToRgba(MAIN_THEME_COLOR, 0.6));
  })();

  const config = {
    trailLength: 500,
    lineWidth: 2,
    colors: {
      line: '#FFFFFF',
      glow: MAIN_THEME_COLOR,
    },
    boxBorderRadius: 20,
    easing: 0.15,
  };

  let width = 0;
  let height = 0;
  let boltY = -config.trailLength;
  let targetBoltY = boltY;
  let boxPositions = [];
  let sectionTop = 0;
  let sectionHeight = 1;
  let rafId = null;
  let streamCenterX = 0;
  let virtualScrollY = window.scrollY || 0;
  let pathSegments = [];

  function getBoxPositions() {
    const containerRect = container.getBoundingClientRect();
    const positions = boxes.map((box) => {
      const rect = box.getBoundingClientRect();
      return {
        top: rect.top - containerRect.top,
        bottom: rect.bottom - containerRect.top,
        height: rect.height,
        width: rect.width,
        offsetX: rect.width / 2,
        centerX: rect.left - containerRect.left + rect.width / 2,
      };
    });
    if (positions.length) {
      streamCenterX =
        positions.reduce((sum, pos) => sum + pos.centerX, 0) / positions.length;
    } else {
      streamCenterX = width / 2;
    }
    return positions;
  }

  function measureSection() {
    const rect = container.getBoundingClientRect();
    sectionTop = rect.top + virtualScrollY;
    sectionHeight = Math.max(rect.height, 1);
  }

  function resize() {
    width = container.offsetWidth;
    height = container.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    boxPositions = getBoxPositions();
    buildPathSegments();
    measureSection();
    requestDraw();
  }

  window.addEventListener('resize', resize);
  resize();

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateScrollProgress() {
    const triggerLine = virtualScrollY + window.innerHeight * 0.5;
    const triggerStart = sectionTop;
    const totalTravel = Math.max(height + config.trailLength, 1);
    const rawProgress = (triggerLine - triggerStart) / totalTravel;
    const progress = clamp(rawProgress, 0, 1);
    targetBoltY = progress * (height + config.trailLength);
    requestDraw();
  }

  function handleScrollInput(scrollValue) {
    if (typeof scrollValue === 'number') {
      virtualScrollY = scrollValue;
    } else {
      virtualScrollY = window.scrollY || 0;
    }
    updateScrollProgress();
  }

  window.addEventListener('scroll', () => handleScrollInput(), { passive: true });
  window.addEventListener('loco-scroll', (event) => {
    if (event.detail && event.detail.scroll) {
      handleScrollInput(event.detail.scroll.y);
    }
  });
  handleScrollInput(virtualScrollY);

  function renderDetailCards() {
    if (!detailList) return;
    detailList.innerHTML = '';
    detailCardEls.clear();
    stageDetails.forEach((item) => {
      const card = document.createElement('article');
      const extraClass = item.id === 'box-1' ? ' flow-detail-card--capture' : '';
      card.className = `flow-detail-card${extraClass}`;
      const coverHtml =
        item.id === 'box-2'
          ? `<div class="flow-detail-card__cover flow-detail-card__cover--ai-video">
              <video class="ai-video" src="assets/videos/vercel_loop.mp4" autoplay muted loop playsinline poster="" aria-label="Catalyst AI orchestration video"></video>
              <div class="ai-video__overlay"></div>
            </div>`
          : item.id === 'box-3'
            ? `<div class="flow-detail-card__cover flow-detail-card__cover--results">
              <img src="assets/images/klaviyo-results.png" alt="Klaviyo results dashboard" class="flow-detail-card__image" />
            </div>`
            : `<div class="flow-detail-card__cover" style="background-image:${item.cover};">
              ${item.id === 'box-1' ? '<img src="assets/images/pop-ups-cut.png" alt="Pop ups" class="flow-detail-card__graphic" />' : ''}
            </div>`;
      card.innerHTML = `
        ${coverHtml}
        <div class="flow-detail-card__meta">
          <p class="flow-detail-card__subtitle">${item.subtitle}</p>
          <h3 class="flow-detail-card__title">${item.title}</h3>
          <p class="flow-detail-card__body">${item.body}</p>
        </div>
      `;
      detailList.appendChild(card);
      detailCardEls.set(item.id, card);
    });
    if (window.__locoScroll && typeof window.__locoScroll.update === 'function') {
      window.__locoScroll.update();
    }
  }

  renderDetailCards();

  function setDetailContent(id) {
    const detail = stageDetails.find((item) => item.id === id);
    if (!detail) return;
    activeDetailId = detail.id;
    detailCardEls.forEach((card, key) => {
      if (key === id) card.classList.add('is-active');
      else card.classList.remove('is-active');
    });
  }

  setDetailContent(activeDetailId);

  function requestDraw() {
    if (rafId) return;
    rafId = requestAnimationFrame(draw);
  }

  function draw() {
    rafId = null;
    const diff = targetBoltY - boltY;
    if (Math.abs(diff) > 0.5) {
      boltY += diff * config.easing;
      requestDraw();
    } else {
      boltY = targetBoltY;
    }
    render();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    if (boltY <= 0) return;

    const startY = Math.max(0, boltY - config.trailLength);
    const endY = Math.min(height, boltY);
    drawStreams(startY, endY);
    updateBoxStates();
  }

  function drawStreams(startY, endY) {
    if (endY <= startY || !pathSegments.length) return;
    const gradient = ctx.createLinearGradient(0, startY, 0, endY);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(0.8, config.colors.line);
    gradient.addColorStop(1, '#FFFFFF');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = config.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = config.colors.glow;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY, width, endY - startY);
    ctx.clip();

    ctx.beginPath();
    pathSegments.forEach((segment) => {
      if (segment.type === 'move') {
        ctx.moveTo(segment.x, segment.y);
      } else if (segment.type === 'line') {
        ctx.lineTo(segment.x, segment.y);
      } else if (segment.type === 'arc') {
        ctx.arcTo(segment.cpx, segment.cpy, segment.x, segment.y, segment.radius);
      }
    });

    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function buildPathSegments() {
    const centerX = streamCenterX || width / 2;
    pathSegments = [];
    pathSegments.push({ type: 'move', x: centerX, y: 0 });

    boxPositions.forEach((box) => {
      const top = box.top;
      const bottom = box.bottom;
      const radius = Math.min(config.boxBorderRadius, box.offsetX, box.height / 2);
      const leftInner = centerX - box.offsetX + radius;
      const leftEdge = centerX - box.offsetX;
      const rightInner = centerX + box.offsetX - radius;
      const rightEdge = centerX + box.offsetX;

      pathSegments.push({ type: 'line', x: centerX, y: top });
      pathSegments.push({ type: 'line', x: leftInner, y: top });
      pathSegments.push({
        type: 'arc',
        cpx: leftEdge,
        cpy: top,
        x: leftEdge,
        y: top + radius,
        radius,
      });
      pathSegments.push({ type: 'line', x: leftEdge, y: bottom - radius });
      pathSegments.push({
        type: 'arc',
        cpx: leftEdge,
        cpy: bottom,
        x: leftInner,
        y: bottom,
        radius,
      });
      pathSegments.push({ type: 'line', x: centerX, y: bottom });

      pathSegments.push({ type: 'move', x: centerX, y: top });
      pathSegments.push({ type: 'line', x: rightInner, y: top });
      pathSegments.push({
        type: 'arc',
        cpx: rightEdge,
        cpy: top,
        x: rightEdge,
        y: top + radius,
        radius,
      });
      pathSegments.push({ type: 'line', x: rightEdge, y: bottom - radius });
      pathSegments.push({
        type: 'arc',
        cpx: rightEdge,
        cpy: bottom,
        x: rightInner,
        y: bottom,
        radius,
      });
      pathSegments.push({ type: 'line', x: centerX, y: bottom });
    });

    pathSegments.push({ type: 'line', x: centerX, y: height });
  }

  function updateBoxStates() {
    let currentDetail = activeDetailId || stageDetails[0]?.id;
    const tolerance = 10;
    boxPositions.forEach((pos, index) => {
      if (boltY > pos.bottom) boxes[index].classList.add('active');
      else boxes[index].classList.remove('active');

      if (boltY >= pos.top - tolerance) {
        currentDetail = boxes[index].id;
      }
    });
    if (currentDetail && currentDetail !== activeDetailId) {
      setDetailContent(currentDetail);
    }
  }
})();
