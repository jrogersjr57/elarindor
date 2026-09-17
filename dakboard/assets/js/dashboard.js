(() => {
  'use strict';

  const DEFAULT_CONFIG = {
    version: 7,
    fadeMilliseconds: 1400,
    scenes: [
      { id: 'morning-wakeup', name: 'Morning Wakeup', eyebrow: 'Living Elarindor', quest: 'Begin the Day', theme: 'bedroom-morning', particles: 'morning-dust' },
      { id: 'nighttime-bed', name: 'Nighttime Bed', eyebrow: 'Living Elarindor', quest: "Rest at Day's End", theme: 'bedroom-night', particles: 'night-dust' }
    ]
  };

  const params = new URLSearchParams(window.location.search);
  const debug = params.get('debug') === '1';
  const requestedScene = params.get('scene') || 'morning-wakeup';

  const el = {
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
  let activeSceneId = null;

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

  function seedParticles(scene) {
    const field = el.sceneRoot.querySelector(`[data-scene-id="${scene.id}"] .particle-field`);
    if (!field) return;

    const count = scene.particles === 'morning-dust' ? 26 : 18;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('i');
      p.className = `particle ${scene.particles}`;
      p.style.left = `${8 + Math.random() * 84}%`;
      p.style.top = `${8 + Math.random() * 78}%`;
      p.style.setProperty('--dust-x', `${(-16 + Math.random() * 32).toFixed(1)}px`);
      p.style.setProperty('--dust-y', `${(-14 + Math.random() * 24).toFixed(1)}px`);
      p.style.setProperty('--dust-opacity-low', `${(0.12 + Math.random() * 0.16).toFixed(2)}`);
      p.style.setProperty('--dust-opacity-high', `${(0.38 + Math.random() * 0.32).toFixed(2)}`);
      p.style.animationDuration = `${(7 + Math.random() * 9).toFixed(2)}s`;
      p.style.animationDelay = `${(-Math.random() * 12).toFixed(2)}s`;
      field.appendChild(p);
    }
  }

  function renderScenes() {
    el.sceneRoot.innerHTML = config.scenes.map(sceneMarkup).join('');
    config.scenes.forEach(seedParticles);
  }

  function setSceneById(id, reason = 'URL') {
    const scene = config.scenes.find(item => item.id === id) || config.scenes[0];
    if (!scene) return;

    activeSceneId = scene.id;
    el.sceneRoot.querySelectorAll('.scene').forEach(node => {
      node.classList.toggle('active', node.dataset.sceneId === scene.id);
    });

    if (el.eyebrow) el.eyebrow.textContent = scene.eyebrow || 'Living Elarindor';
    if (el.quest) el.quest.textContent = scene.quest || '';
    if (el.location) el.location.textContent = scene.name || scene.id;

    updateDebugButtons();
    setStatus(`Scene: ${scene.id} • ${reason} • CSS motion • engine v${config.version}`);
  }

  function buildDebugControls() {
    if (!debug || !el.debugPanel) return;
    document.documentElement.classList.add('debug');

    config.scenes.forEach(scene => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scene = scene.id;
      button.textContent = scene.id === 'morning-wakeup' ? 'Morning Wakeup' : 'Nighttime Bed';
      button.addEventListener('click', () => setSceneById(scene.id, 'debug-button'));
      el.debugPanel.appendChild(button);
    });
  }

  function updateDebugButtons() {
    if (!el.debugPanel) return;
    el.debugPanel.querySelectorAll('button').forEach(button => {
      button.classList.toggle('active', button.dataset.scene === activeSceneId);
    });
  }

  async function loadConfig() {
    try {
      const response = await fetch(`./data/scenes.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loaded = await response.json();
      if (!loaded || !Array.isArray(loaded.scenes) || !loaded.scenes.length) throw new Error('No scenes found');
      config = loaded;
      document.documentElement.style.setProperty('--fade-time', `${Math.max(0, Number(config.fadeMilliseconds) || 1400)}ms`);
    } catch (error) {
      config = DEFAULT_CONFIG;
      setStatus(`Using built-in scene config • ${error.message}`);
    }
  }

  async function init() {
    updateClock();
    window.setInterval(updateClock, 30000);

    await loadConfig();
    renderScenes();
    buildDebugControls();
    setSceneById(requestedScene, params.get('scene') ? 'URL' : 'default');
  }

  window.addEventListener('error', event => {
    setStatus(`Error: ${event.message || 'unknown error'}`);
  });

  init();
})();
