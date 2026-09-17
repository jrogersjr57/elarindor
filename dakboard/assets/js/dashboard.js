(() => {
  'use strict';

  const DEFAULT_CONFIG = {
    version: 3,
    rotationSeconds: 30,
    fadeMilliseconds: 2200,
    scenes: [
      { id: 'woodland', name: 'Woodland Road — Day', eyebrow: 'Living Elarindor', quest: 'Build the Living Window', theme: 'woodland', characters: false, particles: 'leaves' },
      { id: 'campfire', name: 'Forest Camp', eyebrow: 'Evening Camp', quest: 'Build the Living Window', theme: 'campfire', characters: true, particles: 'embers' },
      { id: 'interior', name: 'Quiet Evening', eyebrow: 'After the Road', quest: 'Build the Living Window', theme: 'interior', characters: true, particles: 'dust' }
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
    safeZone: document.getElementById('safe-zone'),
    status: document.getElementById('status')
  };

  let config = DEFAULT_CONFIG;
  let currentIndex = 0;
  let rotationTimer = null;
  let isAuto = !forcedScene;

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

  function characterMarkup(scene) {
    if (!scene.characters) return '';
    return `
      <div class="character-pair" aria-hidden="true">
        <div class="character a"></div>
        <div class="character b"></div>
      </div>`;
  }

  function sceneMarkup(scene) {
    const characters = characterMarkup(scene);
    let layers = '';

    if (scene.theme === 'woodland') {
      layers = `
        <div class="layer woodland-sky"></div>
        <div class="layer woodland-canopy-back"></div>
        <div class="layer woodland-trunks-back"></div>
        <div class="layer woodland-ground"></div>
        <div class="layer woodland-road"></div>
        <div class="layer woodland-road-light"></div>
        <div class="layer woodland-mist mist-a"></div>
        <div class="layer woodland-mist mist-b"></div>
        <div class="layer woodland-sunbeam beam-a"></div>
        <div class="layer woodland-sunbeam beam-b"></div>
        ${characters}
        <div class="layer woodland-foreground foreground-left"></div>
        <div class="layer woodland-foreground foreground-right"></div>
        <div class="layer woodland-vignette"></div>`;
    } else if (scene.theme === 'campfire') {
      layers = `
        <div class="layer trees"></div>
        <div class="layer ground"></div>
        <div class="layer firelight"></div>
        ${characters}
        <div class="fire" aria-hidden="true"></div>
        <div class="layer foreground"></div>`;
    } else if (scene.theme === 'interior') {
      layers = `
        <div class="layer wall"></div>
        <div class="window" aria-hidden="true"></div>
        <div class="layer moonlight"></div>
        <div class="layer candle-glow"></div>
        ${characters}
        <div class="layer furnishings"></div>`;
    }

    return `
      <section class="scene ${scene.theme}" data-scene-id="${scene.id}" aria-label="${scene.name}">
        ${layers}
        <div class="particle-field" data-particles="${scene.particles || ''}" aria-hidden="true"></div>
      </section>`;
  }

  function renderScenes() {
    el.sceneRoot.innerHTML = config.scenes.map(sceneMarkup).join('');
    config.scenes.forEach((scene, index) => seedParticles(scene, index));
  }

  function seedParticles(scene) {
    const field = el.sceneRoot.querySelector(`[data-scene-id="${scene.id}"] .particle-field`);
    if (!field) return;

    const type = scene.particles;
    const count = type === 'leaves' ? 18 : type === 'embers' ? 24 : type === 'dust' ? 20 : 0;

    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('i');
      p.className = `particle ${type === 'leaves' ? 'leaf' : type === 'embers' ? 'ember' : 'dust'}`;
      const left = Math.random() * 100;
      const top = type === 'embers' ? 68 + Math.random() * 8 : Math.random() * 100;
      p.style.left = `${left}%`;
      p.style.top = `${top}%`;
      p.style.animationDelay = `${-(Math.random() * 14)}s`;
      p.style.animationDuration = `${type === 'embers' ? 3.6 + Math.random() * 3.2 : type === 'leaves' ? 11 + Math.random() * 11 : 8 + Math.random() * 13}s`;
      if (type === 'embers') p.style.setProperty('--drift', `${-35 + Math.random() * 70}px`);
      if (type === 'leaves') {
        p.style.opacity = `${0.28 + Math.random() * 0.45}`;
        p.style.transform = `scale(${0.65 + Math.random() * 0.8})`;
      }
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

    if (el.eyebrow) el.eyebrow.textContent = scene.eyebrow || 'Current Quest';
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
      button.textContent = scene.id === 'woodland' ? 'Woodland' : scene.id === 'campfire' ? 'Campfire' : 'Interior';
      button.addEventListener('click', () => forceScene(scene.id));
      el.debugPanel.appendChild(button);
    });
  }

  function updateDebugButtons(sceneId) {
    if (!el.debugPanel) return;
    el.debugPanel.querySelectorAll('button').forEach(button => {
      const active = button.dataset.mode === 'auto' ? isAuto : button.dataset.scene === sceneId && !isAuto;
      button.classList.toggle('active', active);
    });
  }

  async function loadConfig() {
    try {
      const response = await fetch(`./data/scenes.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loaded = await response.json();
      if (!loaded || !Array.isArray(loaded.scenes) || !loaded.scenes.length) throw new Error('No scenes found');
      config = loaded;
      document.documentElement.style.setProperty('--fade-time', `${Math.max(0, Number(config.fadeMilliseconds) || 2200)}ms`);
      setStatus(`Scene config loaded • engine v${config.version || '?'}`);
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
  }

  window.addEventListener('error', event => {
    setStatus(`Error: ${event.message || 'unknown error'}`);
  });

  init();
})();
