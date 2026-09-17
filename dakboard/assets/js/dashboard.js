(() => {
  'use strict';

  const DEFAULT_CONFIG = {
    version: 6,
    rotationSeconds: 15,
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
  let isAuto = !forcedScene;
  let motionFrame = null;
  let motionStartedAt = performance.now();
  let lastSceneSwitchAt = performance.now();
  let lastProductionSceneId = null;

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

  function setSceneById(id, reason) {
    const index = config.scenes.findIndex(scene => scene.id === id);
    if (index < 0) return false;
    if (currentIndex === index && el.sceneRoot.querySelector('.scene.active')) return true;
    setActiveScene(index, reason);
    return true;
  }

  function advanceScene(reason = 'auto') {
    setActiveScene(currentIndex + 1, reason);
    lastSceneSwitchAt = performance.now();
  }

  function startAuto() {
    isAuto = true;
    lastSceneSwitchAt = performance.now();
    updateDebugButtons(config.scenes[currentIndex]?.id);
    setStatus(`Auto mode • frame-driven • engine v${config.version}`);
  }

  function forceScene(id) {
    const index = config.scenes.findIndex(scene => scene.id === id);
    if (index < 0) return;
    isAuto = false;
    setActiveScene(index, 'forced');
  }

  function productionSceneId(now = new Date()) {
    const hour = now.getHours();
    return (hour >= 18 || hour < 5) ? 'nighttime-bed' : 'morning-wakeup';
  }

  function updateProductionSchedule() {
    if (debug || forcedScene) return;
    const desired = productionSceneId(new Date());
    if (desired !== lastProductionSceneId) {
      lastProductionSceneId = desired;
      setSceneById(desired, 'time-of-day');
    }
  }

  function buildDebugControls() {
    if (!debug || !el.debugPanel) return;
    document.documentElement.classList.add('debug');

    const auto = document.createElement('button');
    auto.type = 'button';
    auto.dataset.mode = 'auto';
    auto.textContent = 'Auto';
    auto.addEventListener('click', startAuto);
    el.debugPanel.appendChild(auto);

    config.scenes.forEach(scene => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scene = scene.id;
      button.textContent = scene.id === 'morning-wakeup' ? 'Morning Wakeup' : 'Nighttime Bed';
      button.addEventListener('click', () => forceScene(scene.id));
      el.debugPanel.appendChild(button);
    });

    const cssProbe = document.createElement('div');
    cssProbe.className = 'diagnostic-probe css-probe';
    cssProbe.innerHTML = '<span>CSS motion</span><i></i>';
    el.livingSpace.appendChild(cssProbe);

    const jsProbe = document.createElement('div');
    jsProbe.className = 'diagnostic-probe js-probe';
    jsProbe.innerHTML = '<span>JS motion</span><i></i>';
    el.livingSpace.appendChild(jsProbe);
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

    document.documentElement.style.setProperty('--curtain-shift', `${(sway * 10).toFixed(2)}px`);
    document.documentElement.style.setProperty('--curtain-rotate', `${(sway * 1.15).toFixed(2)}deg`);
    document.documentElement.style.setProperty('--light-shift', `${(slower * 18).toFixed(2)}px`);
    document.documentElement.style.setProperty('--light-opacity', `${(0.62 + pulse * 0.24).toFixed(3)}`);
    document.documentElement.style.setProperty('--candle-scale', `${(0.93 + pulse * 0.11).toFixed(3)}`);
    document.documentElement.style.setProperty('--candle-opacity', `${(0.66 + pulse * 0.32).toFixed(3)}`);

    el.sceneRoot.querySelectorAll('.particle').forEach((node, index) => {
      const phase = Number(node.dataset.phase || 0);
      const speed = Number(node.dataset.speed || 0.5);
      const range = Number(node.dataset.range || 10);
      const x = Math.sin((t * speed) + phase) * range;
      const y = Math.cos((t * speed * 0.62) + phase + index * 0.07) * range * 0.42;
      node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });

    if (debug) {
      const jsProbeDot = document.querySelector('.js-probe i');
      if (jsProbeDot) {
        const pct = 50 + Math.sin(t * 1.15) * 44;
        jsProbeDot.style.left = `${pct.toFixed(2)}%`;
      }

      if (isAuto) {
        const seconds = Math.max(5, Number(config.rotationSeconds) || 15);
        if (now - lastSceneSwitchAt >= seconds * 1000) {
          advanceScene('auto-frame');
        }
      }
    } else {
      updateProductionSchedule();
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

    if (forcedScene) {
      isAuto = false;
      setSceneById(forcedScene, 'URL');
    } else if (debug) {
      isAuto = true;
      setActiveScene(0, 'debug-initial');
      lastSceneSwitchAt = performance.now();
    } else {
      isAuto = false;
      lastProductionSceneId = productionSceneId(new Date());
      setSceneById(lastProductionSceneId, 'time-of-day');
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
