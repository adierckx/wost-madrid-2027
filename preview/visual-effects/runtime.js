import * as THREE from './vendor/three.module.js';
import { createBackground } from './background/background.js';
import { createBlackHole } from './black-hole/black-hole.js';
import { createCompositor } from './shared/compositor.js';
import { clamp, smooth } from './shared/math.js';

// -----------------------------------------------------------------------------
// Journey timing
// -----------------------------------------------------------------------------
// The user controls only the classical -> quantum journey.
// Once the quantum endpoint is reached, the page holds briefly, then blurs
// automatically. A future tetrahedron/navigation module can listen for the
// `wostvisualstatechange` event or the body classes set below.
const QUANTUM_END_THRESHOLD = 0.985;
const QUANTUM_RESET_THRESHOLD = 0.94;
const QUANTUM_HOLD_MS = 800;
const BLUR_DURATION_MS = 1000;
const UNBLUR_DURATION_MS = 350;

// A single directional gesture moves between the two stable journey positions.
// The user never has to accumulate wheel ticks to traverse the animation.
const JOURNEY_TRAVEL_MS = 1550;
const JOURNEY_MIN_REVERSE_MS = 420;
const POSITION_EPSILON_PX = 2;

const canvas = document.querySelector('#universe');
const stage = document.querySelector('.stage');
const journey = document.querySelector('.journey');

if (!canvas || !stage || !journey) {
  throw new Error('WOST visual effects require #universe, .stage and .journey.');
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let paused = reduced.matches;
let hidden = false;
let panel = false;
let progress = 0;
let time = 0;
let previous = 0;
let spin = 0;
let drag = 0;
let dragging = false;
let lastX = 0;
let raf = 0;

let quantumReachedAt = null;
let focus = 0;
let visualState = 'journey';

let journeyAnimationRaf = 0;
let journeyAnimationTarget = null;
let touchStartY = null;

function setVisualState(nextState) {
  if (nextState === visualState) return;

  visualState = nextState;
  document.body.dataset.visualState = nextState;
  document.body.classList.toggle('quantum-hold', nextState === 'quantum-hold');
  document.body.classList.toggle('quantum-blurring', nextState === 'blurring');
  document.body.classList.toggle('navigation-ready', nextState === 'navigation-ready');

  window.dispatchEvent(new CustomEvent('wostvisualstatechange', {
    detail: {
      state: nextState,
      progress,
      focus,
    },
  }));
}

document.body.dataset.visualState = visualState;

reduced.addEventListener('change', event => {
  paused = event.matches;
});

function journeyGeometry() {
  const journeyTop = window.scrollY + journey.getBoundingClientRect().top;
  const travel = Math.max(1, journey.offsetHeight - stage.offsetHeight);

  return {
    top: journeyTop,
    bottom: journeyTop + travel,
    travel,
  };
}

function updateScrollProgress() {
  const { top, travel } = journeyGeometry();
  progress = clamp((window.scrollY - top) / travel);
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });

// Loading the site always starts in the classical state. Browser scroll
// restoration would otherwise occasionally reopen the intro halfway through.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
updateScrollProgress();

function journeyEase(t) {
  // Cosine ease: smooth endpoints without changing the underlying camera path.
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function cancelJourneyAnimation() {
  if (journeyAnimationRaf) cancelAnimationFrame(journeyAnimationRaf);
  journeyAnimationRaf = 0;
  journeyAnimationTarget = null;
}

function animateJourneyTo(target) {
  const { top, bottom, travel } = journeyGeometry();
  const targetY = target === 'bottom' ? bottom : top;
  const startY = window.scrollY;
  const distance = targetY - startY;

  if (reduced.matches) {
    cancelJourneyAnimation();
    window.scrollTo(0, targetY);
    updateScrollProgress();
    return;
  }

  if (Math.abs(distance) <= POSITION_EPSILON_PX) {
    window.scrollTo(0, targetY);
    updateScrollProgress();
    journeyAnimationTarget = null;
    return;
  }

  if (journeyAnimationRaf) cancelAnimationFrame(journeyAnimationRaf);
  journeyAnimationTarget = target;

  const fraction = Math.min(1, Math.abs(distance) / travel);
  const duration = Math.max(
    JOURNEY_MIN_REVERSE_MS,
    JOURNEY_TRAVEL_MS * fraction,
  );
  const startedAt = performance.now();

  function step(now) {
    const t = clamp((now - startedAt) / duration);
    const eased = journeyEase(t);
    window.scrollTo(0, startY + distance * eased);

    if (t < 1) {
      journeyAnimationRaf = requestAnimationFrame(step);
      return;
    }

    journeyAnimationRaf = 0;
    journeyAnimationTarget = null;
    window.scrollTo(0, targetY);
    updateScrollProgress();
  }

  journeyAnimationRaf = requestAnimationFrame(step);
}

function requestJourneyDirection(direction) {
  const target = direction > 0 ? 'bottom' : 'top';

  // Repeating the same gesture while the animation is already running does
  // nothing. Reversing direction immediately turns the journey around.
  if (journeyAnimationTarget === target) return;
  animateJourneyTo(target);
}

function wheelJourney(event) {
  if (document.body.classList.contains('panel-open')) return;
  if (event.deltaY === 0) return;
  event.preventDefault();
  requestJourneyDirection(Math.sign(event.deltaY));
}

window.addEventListener('wheel', wheelJourney, { passive: false });

function keyJourney(event) {
  if (document.body.classList.contains('panel-open')) return;
  const target = event.target;
  if (target instanceof HTMLElement && (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
  )) return;

  const down = ['ArrowDown', 'PageDown', 'End'].includes(event.key) ||
    (event.key === ' ' && !event.shiftKey);
  const up = ['ArrowUp', 'PageUp', 'Home'].includes(event.key) ||
    (event.key === ' ' && event.shiftKey);

  if (!down && !up) return;
  event.preventDefault();
  requestJourneyDirection(down ? 1 : -1);
}

window.addEventListener('keydown', keyJourney);

window.addEventListener('touchstart', event => {
  if (event.touches.length !== 1) return;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchmove', event => {
  if (document.body.classList.contains('panel-open')) return;
  if (touchStartY === null || event.touches.length !== 1) return;

  const dy = touchStartY - event.touches[0].clientY;
  if (Math.abs(dy) < 6) return;

  event.preventDefault();
  touchStartY = null;
  requestJourneyDirection(Math.sign(dy));
}, { passive: false });

window.addEventListener('touchend', () => {
  touchStartY = null;
}, { passive: true });

window.addEventListener('touchcancel', () => {
  touchStartY = null;
}, { passive: true });

window.addEventListener('load', () => {
  window.scrollTo(0, journeyGeometry().top);
  updateScrollProgress();
}, { once: true });

function updateAutomaticTransition(now, elapsedSeconds) {
  const atQuantumEnd = progress >= QUANTUM_END_THRESHOLD;
  const clearlyLeavingEnd = progress < QUANTUM_RESET_THRESHOLD;

  if (atQuantumEnd) {
    if (quantumReachedAt === null) {
      quantumReachedAt = now;
      setVisualState('quantum-hold');
    }

    if (reduced.matches) {
      focus = 1;
      setVisualState('navigation-ready');
      return;
    }

    const sinceEnd = now - quantumReachedAt;

    if (sinceEnd < QUANTUM_HOLD_MS) {
      focus = 0;
      setVisualState('quantum-hold');
      return;
    }

    const blurProgress = smooth(
      QUANTUM_HOLD_MS,
      QUANTUM_HOLD_MS + BLUR_DURATION_MS,
      sinceEnd,
    );

    focus = blurProgress;

    if (blurProgress >= 0.999) {
      focus = 1;
      setVisualState('navigation-ready');
    } else {
      setVisualState('blurring');
    }

    return;
  }

  // A little hysteresis prevents trackpad/inertial bounce around the endpoint
  // from repeatedly restarting the timer.
  if (clearlyLeavingEnd) {
    quantumReachedAt = null;

    if (focus > 0) {
      focus = Math.max(0, focus - elapsedSeconds / (UNBLUR_DURATION_MS / 1000));
    }

    setVisualState('journey');
  }
}

let renderer;

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.autoClear = false;
} catch (error) {
  canvas.dataset.webglUnavailable = 'true';
  console.error('The WOST visual effects require WebGL.', error);
}

if (renderer) {
  document.body.classList.add('webgl-ready');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const world = new THREE.Group();
  scene.add(world);

  const {
    backgroundTarget,
    focusScene,
    focusCamera,
    focusMaterial,
  } = createCompositor();

  const {
    bgScene,
    bgCamera,
    bgMaterial,
  } = createBackground();

  const {
    upperMaterial,
    geometry,
  } = createBlackHole(world);

  let width = 0;
  let height = 0;
  let mobile = false;

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    mobile = width < 600;

    renderer.setSize(width, height, false);

    const ratio = renderer.getPixelRatio();
    backgroundTarget.setSize(
      Math.round(width * ratio),
      Math.round(height * ratio),
    );

    focusMaterial.uniforms.texel.value.set(1 / width, 1 / height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    bgMaterial.uniforms.uAspect.value = width / height;
    updateScrollProgress();
  }

  window.addEventListener('resize', resize);
  resize();

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    drag += (event.clientX - lastX) * 0.005;
    lastX = event.clientX;
  });

  canvas.addEventListener('pointerup', () => {
    dragging = false;
  });

  canvas.addEventListener('pointercancel', () => {
    dragging = false;
  });

  window.addEventListener('panelchange', event => {
    panel = event.detail;
  });

  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
  });

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    canvas.dataset.webglUnavailable = 'true';
    console.error('WebGL context lost. Reload to resume the WOST effects.');
  });

  let lastRender = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);

    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;

    if (hidden || journey.getBoundingClientRect().bottom < 0) return;
    if (now - lastRender < (mobile ? 33 : 22)) return;

    const elapsed = lastRender ? (now - lastRender) / 1000 : 0;
    lastRender = now;

    if (!paused && !panel) {
      const motionStep = Math.min(elapsed, 0.08);
      time += motionStep;
      spin += motionStep * 0.035;
    }

    updateAutomaticTransition(now, elapsed);

    const q = smooth(0, 1, progress);

    bgMaterial.uniforms.uTime.value = time;
    bgMaterial.uniforms.uPhase.value = progress;

    world.rotation.y = spin + drag;
    world.rotation.z = -0.075;
    world.position.set(mobile ? 1.55 : 2.8, mobile ? -0.65 : 0, 0);

    // The entire classical -> quantum camera journey is now controlled by the
    // single normalized scroll interval 0..1.
    camera.position.set(
      0,
      6.7 - 11.4 * q,
      (mobile ? 17 : 14) - 3 * Math.sin(q * Math.PI),
    );
    camera.lookAt(0, 2.6 - 6.7 * q, 0);
    camera.updateMatrixWorld();

    upperMaterial.uniforms.flowTime.value = time;
    geometry(time);

    // Blur is no longer coupled to scroll. It is driven by the automatic
    // post-quantum transition above.
    focusMaterial.uniforms.focus.value = focus;

    // Small integration hooks for the future tetrahedron navigation.
    document.documentElement.style.setProperty('--wost-focus', focus.toFixed(4));
    document.documentElement.style.setProperty(
      '--wost-navigation-reveal',
      smooth(0.25, 1, focus).toFixed(4),
    );

    renderer.setRenderTarget(backgroundTarget);
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(focusScene, focusCamera);
  }

  raf = requestAnimationFrame(frame);
}
