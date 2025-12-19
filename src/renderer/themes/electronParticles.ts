// src/renderer/themes/electronParticles.ts

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animationId: number | null = null;
let resizeListener: (() => void) | null = null;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const numParticles = 100;
const maxDistance = 150;

function getCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    throw new Error('Canvas context is not initialized');
  }
  return ctx;
}

function getCanvas(): HTMLCanvasElement {
  if (!canvas) {
    throw new Error('Canvas element is not initialized');
  }
  return canvas;
}

function initCanvas() {
  stopElectronParticles();

  canvas = document.createElement('canvas');
  canvas.id = 'electron-particles-canvas';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '-1';
  document.body.appendChild(canvas);

  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Không hỗ trợ Canvas 2D context');
    return;
  }

  resizeListener = () => resizeCanvas();
  window.addEventListener('resize', resizeListener);

  resizeCanvas();
  createParticles();
  animate();
}

function resizeCanvas() {
  const c = getCanvas();
  c.width = window.innerWidth;
  c.height = window.innerHeight;
}

function createParticles() {
  const c = getCanvas();
  particles = [];

  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
    });
  }
}

function updateParticles() {
  const c = getCanvas();

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > c.width) p.vx *= -1;
    if (p.y < 0 || p.y > c.height) p.vy *= -1;
  });
}

function drawParticles() {
  const context = getCtx();

  particles.forEach(p => {
    context.beginPath();
    context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(80, 80, 80, 0.8)';
    context.fill();
  });
}

function connectParticles() {
  const context = getCtx();

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < maxDistance) {
        context.beginPath();
        context.moveTo(particles[i].x, particles[i].y);
        context.lineTo(particles[j].x, particles[j].y);
        context.strokeStyle = `rgba(0, 255, 255, ${0.2 * (1 - dist / maxDistance)})`;
        context.lineWidth = 1;
        context.stroke();
      }
    }
  }
}

function animate() {
  const context = getCtx();
  const c = getCanvas();

  context.clearRect(0, 0, c.width, c.height);

  updateParticles();
  drawParticles();
  connectParticles();

  animationId = requestAnimationFrame(animate);
}

export function startElectronParticles() {
  initCanvas();
}

export function stopElectronParticles() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (canvas) {
    canvas.remove();
    canvas = null;
  }

  ctx = null;
  particles = [];

  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
    resizeListener = null;
  }
}