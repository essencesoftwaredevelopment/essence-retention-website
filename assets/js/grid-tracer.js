(function initGridTracerAnimation() {
  const canvas = document.getElementById('tracerCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const GRID_WIDTH = 20;
  const GRID_HEIGHT = 400;
  const TRACER_COUNT = 10;
  const TRAIL_LENGTH = 12;
  const TRACER_COLOR = 'rgba(255, 255, 255, 0.9)';
  const GLOW_COLOR = 'rgba(255, 255, 255, 0.4)';
  const TURN_COOLDOWN_MAX = 9;

  let width;
  let height;
  let cellSizeX;
  let cellSizeY;
  let tracers = [];

  class Tracer {
    constructor() {
      this.reset(true);
    }

    reset(anywhere = false) {
      if (anywhere) {
        this.gridX = Math.floor(Math.random() * (GRID_WIDTH + 1));
        this.gridY = Math.floor(Math.random() * (GRID_HEIGHT + 1));
        const rand = Math.random();
        if (rand < 0.5) {
          this.dir = 3;
        } else if (rand < 0.7) {
          this.dir = 0;
        } else if (rand < 0.9) {
          this.dir = 2;
        } else {
          this.dir = 1;
        }
      } else {
        const rand = Math.random();
        if (rand < 0.5) {
          this.gridX = Math.floor(Math.random() * (GRID_WIDTH + 1));
          this.gridY = GRID_HEIGHT + 2;
          this.dir = 3;
        } else if (rand < 0.7) {
          this.gridX = -2;
          this.gridY = Math.floor(Math.random() * (GRID_HEIGHT + 1));
          this.dir = 0;
        } else if (rand < 0.9) {
          this.gridX = GRID_WIDTH + 2;
          this.gridY = Math.floor(Math.random() * (GRID_HEIGHT + 1));
          this.dir = 2;
        } else {
          this.gridX = Math.floor(Math.random() * (GRID_WIDTH + 1));
          this.gridY = -2;
          this.dir = 1;
        }
      }

      this.x = this.gridX * cellSizeX;
      this.y = this.gridY * cellSizeY;

      this.speed = 0.15 + Math.random() * 0.15;
      this.progress = 0;
      this.turnCooldown = 0;
      this.history = [];

      for (let i = 0; i < TRAIL_LENGTH; i++) {
        this.history.push({ x: this.x, y: this.y });
      }
    }

    update() {
      this.progress += this.speed;

      if (this.progress >= 1) {
        let arrivedX = this.gridX;
        let arrivedY = this.gridY;
        if (this.dir === 0) arrivedX++;
        else if (this.dir === 1) arrivedY++;
        else if (this.dir === 2) arrivedX--;
        else if (this.dir === 3) arrivedY--;

        this.history.unshift({ x: arrivedX * cellSizeX, y: arrivedY * cellSizeY });
        if (this.history.length > TRAIL_LENGTH) this.history.pop();

        this.gridX = arrivedX;
        this.gridY = arrivedY;
        this.progress -= 1;

        if (
          this.gridX < -15 || this.gridX > GRID_WIDTH + 15 ||
          this.gridY < -15 || this.gridY > GRID_HEIGHT + 15
        ) {
          this.reset();
          return;
        }

        if (this.turnCooldown > 0) {
          this.turnCooldown--;
        } else {
          const turnChance = 0.08;
          if (Math.random() < turnChance) {
            if (this.dir !== 3 && Math.random() < 0.6) {
              if (this.dir === 0 || this.dir === 2) {
                this.dir = Math.random() < 0.7 ? 3 : 1;
              } else if (this.dir === 1) {
                this.dir = Math.random() < 0.5 ? 0 : 2;
              }
            } else {
              const turn = Math.random() < 0.5 ? 1 : -1;
              this.dir = (this.dir + turn + 4) % 4;
            }
            this.turnCooldown = TURN_COOLDOWN_MAX;
          }
        }
      }

      const originX = this.gridX * cellSizeX;
      const originY = this.gridY * cellSizeY;

      let dx = 0;
      let dy = 0;
      if (this.dir === 0) dx = cellSizeX;
      else if (this.dir === 1) dy = cellSizeY;
      else if (this.dir === 2) dx = -cellSizeX;
      else if (this.dir === 3) dy = -cellSizeY;

      this.x = originX + (dx * this.progress);
      this.y = originY + (dy * this.progress);
    }

    draw() {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.shadowBlur = 4;
      ctx.shadowColor = GLOW_COLOR;

      ctx.moveTo(this.x, this.y);
      for (let i = 0; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }

      const lastPoint = this.history[this.history.length - 1];
      const grad = ctx.createLinearGradient(this.x, this.y, lastPoint.x, lastPoint.y);
      grad.addColorStop(0, TRACER_COLOR);
      grad.addColorStop(1, 'transparent');

      ctx.strokeStyle = grad;
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.arc(this.x, this.y, 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }

  function init() {
    resize();
    tracers = [];
    for (let i = 0; i < TRACER_COUNT; i++) {
      tracers.push(new Tracer());
    }
    animate();
  }

  function resize() {
    width = window.innerWidth;
    height = Math.max(window.innerHeight, document.body.scrollHeight);
    canvas.width = width;
    canvas.height = height;
    cellSizeX = width / GRID_WIDTH;
    cellSizeY = height / GRID_HEIGHT;

    tracers.forEach((tracer) => tracer.reset(true));
  }

  function drawGrid() {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID_WIDTH; i++) {
      ctx.moveTo(i * cellSizeX, 0);
      ctx.lineTo(i * cellSizeX, height);
    }

    for (let j = 0; j <= GRID_HEIGHT; j++) {
      ctx.moveTo(0, j * cellSizeY);
      ctx.lineTo(width, j * cellSizeY);
    }
    ctx.stroke();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    drawGrid();

    tracers.forEach((tracer) => {
      tracer.update();
      tracer.draw();
    });

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('load', init);

  const resizeObserver = new ResizeObserver(() => {
    const newHeight = Math.max(window.innerHeight, document.body.scrollHeight);
    if (Math.abs(newHeight - height) > 10) {
      resize();
    }
  });
  resizeObserver.observe(document.body);
})();
