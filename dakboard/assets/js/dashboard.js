(() => {
  'use strict';

  const DEFAULT_CONFIG = {
    version: 4,
    rotationSeconds: 30,
    fadeMilliseconds: 2200,
    scenes: [
      { id: 'morning-wakeup', name: 'Morning Wakeup', eyebrow: 'Living Elarindor', quest: 'Begin the Day', theme: 'bedroom-morning', particles: 'morning-dust' },
      { id: 'nighttime-bed', name: 'Nighttime Bed', eyebrow: 'Living Elarindor', quest: "Rest at Day's End", theme: 'bedroom-night', particles: 'night-dust' }
    ]
  };

  const params = new URLSearchParams(window.location.search);
  const debug = params.get('debug') === '1';
  const forcedScene = params.get('scene');

  const el = {
    livingSpace: document.getElementById('living-space'),
    sceneRoot: document.getElementById('scene-root'),
    time: document.getElementById('time'),
    date: document.getElementById('date'),
    eyebrow: document.getElementById('quest-eyebrow'),
    quest: document.getElementById('quest-title'),
    location: document.getElementById('location'),
    debugPanel: document.getElementById('debug-panel'),
    status: document.getElementById('status')
  };

  let config = DEFAULT_CONFIG;
  let currentIndex = 0;
  let rotationTimer = null;
  let isAuto = !forcedScene;
  let motionFrame = null;
  let motionStartedAt = performance.now();

  function setStatus(message) {
    if (el.status) el.status.textContent = message;
  }

  function updateClock() {
    const now = new Date();
    if (el.time) {
      el.time.textContent = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      }).format(now);
    }
    if (el.date) {
      el.date.textContent = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }).format(now);
    }
  }

  function sceneMarkup(scene) {
    let layers = '';

    if (scene.theme === 'bedroom-morning') {
      layers = `
        <div class="layer room-wall"></div>
        <div class="window morning-window" aria-hidden="true">
          <div class="window-sky"></div>
          <div class="curtain curtain-left"></div>
          <div class="curtain curtain-right"></div>
        </div>
        <div class="layer dawn-light"></div>
        <div class="bed" aria-hidden="true">
          <div class="headboard"></div>
          <div class="pillows"></div>
          <div class="quilt"></div>
        </div>
        <div class="layer bedside-furniture"></div>
        <div class="layer morning-glow"></div>`;
    } else if (scene.theme === 'bedroom-night') {
      layers = `
        <div class="layer room-wall"></div>
        <div class="window night-window" aria-hidden="true">
          <div class="window-sky"></div>
          <div class="moon"></div>
          <div class="curtain curtain-left"></div>
          <div class="curtain curtain-right"></div>
        </div>
        <div class="layer moonlight"></div>
        <div class="bed" aria-hidden="true">
          <div class="headboard"></div>
          <div class="pillows"></div>
          <div class="quilt"></div>
        </div>
        <div class="candle candle-a" aria-hidden="true"></div>
        <div class="candle candle-b" aria-hidden="true"></div>
        <div class="layer bedside-furniture"></div>
        <div class="layer night-glow"></div>`;
    }

    return `
      <section class="scene ${scene.theme}" data-scene-id="${scene.id}" aria-label="${scene.name}">
        ${layers}
        <div class="particle-field" data-particles="${scene.particles || ''}" aria-hidden="true"></div>
      </section>`;
  }

  function renderScenes() {
    el.sceneRoot.innerHTML = config.scenes.map(sceneMarkup).join('');
    config.scenes.forEach(seedParticles);
  }

  function seedParticles(scene) {
    const field = el.sceneRoot.querySelector(`[data-scene-id="${scene.id}"] .particle-field`);
    if (!field) return;

    const count = scene.particles === 'morning-dust' ? 28 : 20;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('i');
      p.className = `particle ${scene.particles}`;
      p.style.left = `${8 + Math.random() * 84}%`;
      p.style.top = `${8 + Math.random() * 78}%`;
      p.style.opacity = `${0.22 + Math.random() * 0.48}`;
      p.dataset.phase = `${Math.random() * Math.PI * 2}`;
      p.dataset.speed = `${0.35 + Math.random() * 0.8}`;
      p.dataset.range = `${5 + Math.random() * 18}`;
      field.appendChild(p);
    }
  }

  function setActiveScene(index, reason = 'manual') {
    if (!config.scenes.length) return;
    currentIndex = (index + config.scenes.length) % config.scenes.length;
    const scene = config.scenes[currentIndex];

    el.sceneRoot.querySelectorAll('.scene').forEach(node => {
      node.classList.toggle('active', node.dataset.sceneId === scene.id);
    });

    if (el.eyebrow) el.eyebrow.textContent = scene.eyebrow || 'Living Elarindor';
    if (el.quest) el.quest.textContent = scene.quest || '';
    if (el.location) el.location.textContent = scene.name || scene.id;

    updateDebugButtons(scene.id);
    setStatus(`Scene: ${scene.id} • ${reason} • engine v${config.version}`);
  }

  function advanceScene() {
    if (!isAuto) return;
    setActiveScene(currentIndex + 1, 'auto');
  }

  function stopRotation() {
    if (rotationTimer) window.clearInterval(rotationTimer);
    rotationTimer = null;
  }

  function startRotation() {
    stopRotation();
    isAuto = true;
    const seconds = Math.max(5, Number(config.rotationSeconds) || 30);
    rotationTimer = window.setInterval(advanceScene, seconds * 1000);
    updateDebugButtons(config.scenes[currentIndex]?.id);
  }

  function forceScene(id) {
    const index = config.scenes.findIndex(scene => scene.id === id);
    if (index < 0) return;
    isAuto = false;
    stopRotation();
    setActiveScene(index, 'forced');
  }

  function buildDebugControls() {
    if (!debug || !el.debugPanel) return;
    document.documentElement.classList.add('debug');

    const auto = document.createElement('button');
    auto.type = 'button';
    auto.dataset.mode = 'auto';
    auto.textContent = 'Auto';
    auto.addEventListener('click', () => {
      startRotation();
      setStatus(`Auto rotation: ${config.rotationSeconds}s • engine v${config.version}`);
    });
    el.debugPanel.appendChild(auto);

    config.scenes.forEach(scene => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scene = scene.id;
      button.textContent = scene.id === 'morning-wakeup' ? 'Morning Wakeup' : 'Nighttime Bed';
      button.addEventListener('click', () => forceScene(scene.id));
      el.debugPanel.appendChild(button);
    });

    const probe = document.createElement('div');
    probe.className = 'motion-probe';
    probe.innerHTML = '<span>motion</span><i></i>';
    el.livingSpace.appendChild(probe);
  }

  function updateDebugButtons(sceneId) {
    if (!el.debugPanel) return;
    el.debugPanel.querySelectorAll('button').forEach(button => {
      const active = button.dataset.mode === 'auto' ? isAuto : button.dataset.scene === sceneId && !isAuto;
      button.classList.toggle('active', active);
    });
  }

  function runMotion(now) {
    const t = (now - motionStartedAt) / 1000;
    const sway = Math.sin(t * 0.72);
    const slower = Math.sin(t * 0.31);
    const pulse = (Math.sin(t * 1.7) + 1) / 2;

    document.documentElement.style.setProperty('--motion-x', sway.toFixed(4));
    document.documentElement.style.setProperty('--motion-y', slower.toFixed(4));
    document.documentElement.style.setProperty('--motion-pulse', pulse.toFixed(4));

    el.sceneRoot.querySelectorAll('.particle').forEach((node, index) => {
      const phase = Number(node.dataset.phase || 0);
      const speed = Number(node.dataset.speed || 0.5);
      const range = Number(node.dataset.range || 10);
      const x = Math.sin((t * speed) + phase) * range;
      const y = Math.cos((t * speed * 0.62) + phase + index * 0.07) * range * 0.42;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    if (debug) {
      const probeDot = document.querySelector('.motion-probe i');
      if (probeDot) {
        const pct = 50 + Math.sin(t * 1.15) * 46;
        probeDot.style.left = `${pct}%`;
      }
    }

    motionFrame = window.requestAnimationFrame(runMotion);
  }

  async function loadConfig() {
    try {
      const response = await fetch(`./data/scenes.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loaded = await response.json();
      if (!loaded || !Array.isArray(loaded.scenes) || !loaded.scenes.length) throw new Error('No scenes found');
      config = loaded;
      document.documentElement.style.setProperty('--fade-time', `${Math.max(0, Number(config.fadeMilliseconds) || 2200)}ms`);
    } catch (error) {
      config = DEFAULT_CONFIG;
      setStatus(`Using built-in scene config • ${error.message}`);
    }
  }

  async function init() {
    updateClock();
    window.setInterval(updateClock, 1000);

    await loadConfig();
    renderScenes();
    buildDebugControls();

    let initialIndex = 0;
    if (forcedScene) {
      const requested = config.scenes.findIndex(scene => scene.id === forcedScene);
      if (requested >= 0) initialIndex = requested;
    }

    setActiveScene(initialIndex, forcedScene ? 'URL' : 'initial');

    if (forcedScene) {
      isAuto = false;
      updateDebugButtons(config.scenes[initialIndex].id);
    } else {
      startRotation();
    }

    if (motionFrame) window.cancelAnimationFrame(motionFrame);
    motionStartedAt = performance.now();
    motionFrame = window.requestAnimationFrame(runMotion);
  }

  window.addEventListener('error', event => {
    setStatus(`Error: ${event.message || 'unknown error'}`);
  });

  init();
})();
