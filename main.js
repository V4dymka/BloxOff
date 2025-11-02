const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);
renderer.domElement.style.touchAction = "none";
renderer.domElement.style.cursor = "grab";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 3, 8);

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x333333 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00c853 })
);
player.position.set(0, 0.5, 0);
scene.add(player);

const platforms = [];
function addPlatform(x, y, z, color = 0xffa500) {
  const p = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.5, 2),
    new THREE.MeshStandardMaterial({ color })
  );
  p.position.set(x, y, z);
  scene.add(p);
  platforms.push(p);
}
addPlatform(0, 1, -3);
addPlatform(2, 2, -6);
addPlatform(-0, 3, -9);
addPlatform(3, 4, -12);
addPlatform(0, 5, -15);
addPlatform(-3, 6, -18);
addPlatform(-1, 7, -21);
addPlatform(0, 8, -24);
addPlatform(0, 9, -27);
addPlatform(0, 10, -30, 0x00ff00);

const state = { vy: 0, onGround: true };
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "Space") jump();
});
window.addEventListener("keyup", e => keys[e.code] = false);

const joyStick = document.getElementById("joyStick");
const joyBase = document.getElementById("joyBase");
const jumpBtn = document.getElementById("jumpBtn");
const fsBtn = document.getElementById("fullscreenBtn");

const input = { joystick: { dx: 0, dy: 0, force: 0, active: false } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const resetStick = () => {
  if (joyStick) joyStick.style.transform = "translate(0,0)";
  input.joystick.dx = 0; input.joystick.dy = 0; input.joystick.force = 0; input.joystick.active = false;
};

if (joyStick && joyBase) {
  joyStick.addEventListener("pointerdown", (e) => { e.stopPropagation(); });

  joyStick.addEventListener("touchstart", e => {
    input.joystick.active = true;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  }, { passive: false });

  joyStick.addEventListener("touchmove", e => {
    if (!input.joystick.active) return;
    const t = e.touches[0];
    const rect = joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = t.clientX - cx;
    const dy = t.clientY - cy;
    const r = Math.min(rect.width, rect.height) * 0.4;
    const mag = Math.hypot(dx, dy);
    const scale = mag > r ? r / mag : 1;
    const sx = dx * scale, sy = dy * scale;
    joyStick.style.transform = `translate(${sx}px,${sy}px)`;
    input.joystick.dx = clamp(dx / r, -1, 1);
    input.joystick.dy = clamp(dy / r, -1, 1);
    input.joystick.force = Math.min(1, mag / r);
    e.stopPropagation();
  }, { passive: false });

  joyStick.addEventListener("touchend", e => { resetStick(); e.stopPropagation(); });
  joyStick.addEventListener("touchcancel", e => { resetStick(); e.stopPropagation(); });

  let mouseDown = false;
  joyStick.addEventListener("mousedown", e => {
    mouseDown = true;
    input.joystick.active = true;
    e.preventDefault();
    e.stopPropagation();
  });
  window.addEventListener("mousemove", e => {
    if (!mouseDown || !input.joystick.active) return;
    const rect = joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const r = Math.min(rect.width, rect.height) * 0.4;
    const mag = Math.hypot(dx, dy);
    const scale = mag > r ? r / mag : 1;
    const sx = dx * scale, sy = dy * scale;
    joyStick.style.transform = `translate(${sx}px,${sy}px)`;
    input.joystick.dx = clamp(dx / r, -1, 1);
    input.joystick.dy = clamp(dy / r, -1, 1);
    input.joystick.force = Math.min(1, mag / r);
  });
  window.addEventListener("mouseup", () => { mouseDown = false; resetStick(); });
}

function jump() {
  if (state.onGround) {
    state.vy = 7;
    state.onGround = false;
  }
}
if (jumpBtn) {
  jumpBtn.addEventListener("click", e => { e.preventDefault(); jump(); });
  jumpBtn.addEventListener("touchstart", e => { if (e.cancelable) e.preventDefault(); jump(); }, { passive: false });
  jumpBtn.addEventListener("pointerdown", e => e.stopPropagation());
}

const camOffset = new THREE.Vector3(0, 3, 8);
const camControls = {
  distance: camOffset.length(),
  minDistance: 3,
  maxDistance: 20,
  azimuth: 0,
  polar: 0.45,
  minPolar: 0.15,
  maxPolar: 1.3,
  zoomSpeed: 0.002,
  panSpeed: 0.002,
  velPan: new THREE.Vector3(0,0,0)
};
(function(){
  const v = camOffset.clone();
  camControls.distance = v.length();
  camControls.polar = Math.acos( v.y / camControls.distance );
  camControls.azimuth = Math.atan2(v.x, v.z);
})();

const RB_ROTATE_SENS = 0.0026;
const RB_SMOOTH = 0;

const targetEl = renderer.domElement;
function isEventOverUI(e) {
  try {
    const path = (e.composedPath && e.composedPath()) || (e.path) || null;
    if (path && path.length) {
      for (let el of path) {
        if (!el || !el.tagName) continue;
        if (el.id === 'joyStick' || el.id === 'joyBase' || el.id === 'jumpBtn' || el.id === 'fullscreenBtn') return true;
        if (el.classList && (el.classList.contains('joystick') || el.classList.contains('ui') || el.classList.contains('joy-base') || el.classList.contains('joy-stick'))) return true;
      }
    } else {
      const x = (e.touches && e.touches[0] && e.touches[0].clientX) || e.clientX;
      const y = (e.touches && e.touches[0] && e.touches[0].clientY) || e.clientY;
      const el = document.elementFromPoint(x, y);
      if (el && (el.closest('#joyStick') || el.closest('.joystick') || el.closest('#jumpBtn') || el.closest('.ui'))) return true;
    }
  } catch (err) {}
  return false;
}

let rbIsDragging = false;
let rbPointerId = null;
let rbLastX = 0, rbLastY = 0;
function stopRbDrag() {
  rbIsDragging = false;
  if (rbPointerId != null) {
    try { targetEl.releasePointerCapture && targetEl.releasePointerCapture(rbPointerId); } catch {}
  }
  rbPointerId = null;
  renderer.domElement.style.cursor = "grab";
}

targetEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (isEventOverUI(e)) return;
  rbIsDragging = true;
  rbPointerId = e.pointerId;
  rbLastX = e.clientX;
  rbLastY = e.clientY;
  try { targetEl.setPointerCapture && targetEl.setPointerCapture(e.pointerId); } catch {}
  renderer.domElement.style.cursor = "grabbing";
}, { passive: false });

targetEl.addEventListener('pointermove', (e) => {
  if (!rbIsDragging) return;
  if (e.pointerId !== rbPointerId) return;
  if (isEventOverUI(e)) { rbLastX = e.clientX; rbLastY = e.clientY; return; }
  const dx = e.clientX - rbLastX;
  const dy = e.clientY - rbLastY;
  rbLastX = e.clientX; rbLastY = e.clientY;
  camControls.azimuth -= dx * RB_ROTATE_SENS;
  camControls.polar += dy * RB_ROTATE_SENS;
  camControls.polar = Math.max(camControls.minPolar, Math.min(camControls.maxPolar, camControls.polar));
}, { passive: false });

targetEl.addEventListener('pointerup', (e) => { if (e.pointerId === rbPointerId) stopRbDrag(); }, { passive: false });
targetEl.addEventListener('pointercancel', (e) => { if (e.pointerId === rbPointerId) stopRbDrag(); }, { passive: false });
targetEl.addEventListener('lostpointercapture', (e) => { if (e.pointerId === rbPointerId) stopRbDrag(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopRbDrag(); });

let rbTouchState = { prevDist: null, prevMid: null };
let rbSingleTouch = { id: null, lastX: 0, lastY: 0, active: false };

targetEl.addEventListener('touchstart', (e) => {
  if (isEventOverUI(e)) return;
  if (e.touches.length === 2) {
    const a = e.touches[0], b = e.touches[1];
    rbTouchState.prevDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    rbTouchState.prevMid = { x: (a.clientX + b.clientX)/2, y: (a.clientY + b.clientY)/2 };
    rbSingleTouch.active = false;
    rbSingleTouch.id = null;
  } else if (e.touches.length === 1) {
    const t = e.touches[0];
    rbSingleTouch.id = t.identifier;
    rbSingleTouch.lastX = t.clientX;
    rbSingleTouch.lastY = t.clientY;
    rbSingleTouch.active = true;
  }
}, { passive: true });

targetEl.addEventListener('touchmove', (e) => {
  if (isEventOverUI(e)) {
    if (e.touches.length === 2) {
      const a = e.touches[0], b = e.touches[1];
      rbTouchState.prevDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      rbTouchState.prevMid = { x: (a.clientX + b.clientX)/2, y: (a.clientY + b.clientY)/2 };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      rbSingleTouch.lastX = t.clientX; rbSingleTouch.lastY = t.clientY;
    }
    return;
  }

  if (e.touches.length === 2) {
    const a = e.touches[0], b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const mid = { x: (a.clientX + b.clientX)/2, y: (a.clientY + b.clientY)/2 };
    if (rbTouchState.prevDist != null && rbTouchState.prevMid != null) {
      const dd = dist - rbTouchState.prevDist;
      camControls.distance -= dd * camControls.zoomSpeed * camControls.distance;
      camControls.distance = clamp(camControls.distance, camControls.minDistance, camControls.maxDistance);

      const mdx = mid.x - rbTouchState.prevMid.x;
      const mdy = mid.y - rbTouchState.prevMid.y;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();
      const up = new THREE.Vector3(0,1,0);
      const panFactor = camControls.panSpeed * camControls.distance * 0.02;
      const panOffset = new THREE.Vector3();
      panOffset.addScaledVector(right, -mdx * panFactor);
      panOffset.addScaledVector(up, mdy * panFactor * 0.6);
      camControls.velPan.add(panOffset);
      if (camControls.velPan.length() > camControls.distance * 2) camControls.velPan.setLength(camControls.distance * 2);
    }
    rbTouchState.prevDist = dist;
    rbTouchState.prevMid = mid;
    e.preventDefault();
    return;
  }

  if (e.touches.length === 1 && rbSingleTouch.active) {
    const t = e.touches[0];
    if (t.identifier !== rbSingleTouch.id) return;
    const dx = t.clientX - rbSingleTouch.lastX;
    const dy = t.clientY - rbSingleTouch.lastY;
    rbSingleTouch.lastX = t.clientX;
    rbSingleTouch.lastY = t.clientY;
    camControls.azimuth -= dx * RB_ROTATE_SENS;
    camControls.polar   += dy * RB_ROTATE_SENS;
    camControls.polar = Math.max(camControls.minPolar, Math.min(camControls.maxPolar, camControls.polar));
    e.preventDefault();
  }
}, { passive: false });

targetEl.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) { rbTouchState.prevDist = null; rbTouchState.prevMid = null; }
  if (!rbSingleTouch.active) return;
  let stillHas = false;
  for (let i = 0; i < e.touches.length; i++) {
    if (e.touches[i].identifier === rbSingleTouch.id) { stillHas = true; break; }
  }
  if (!stillHas) {
    rbSingleTouch.active = false;
    rbSingleTouch.id = null;
  }
}, { passive: true });

targetEl.addEventListener('touchcancel', (e) => {
  rbTouchState.prevDist = null; rbTouchState.prevMid = null;
  rbSingleTouch.active = false; rbSingleTouch.id = null;
}, { passive: true });

targetEl.addEventListener("wheel", (e) => {
  if (isEventOverUI(e)) return;
  const delta = e.deltaY || e.wheelDelta;
  camControls.distance += delta * camControls.zoomSpeed * camControls.distance;
  camControls.distance = clamp(camControls.distance, camControls.minDistance, camControls.maxDistance);
  e.preventDefault();
}, { passive: false });

const WALK_SPEED = 16;
const GRAVITY = -25;
function updateMovement(dt) {
  const speed = 5;
  if (!player) return;

  let dx = 0, dz = 0;
  if (input.joystick.active && input.joystick.force > 0.05) {
  dx = input.joystick.dx;
  dz = -input.joystick.dy;
} else {
  if (keys["ArrowLeft"] || keys["KeyA"]) dx -= 1;
  if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;
  if (keys["ArrowUp"] || keys["KeyW"]) dz += 1;
  if (keys["ArrowDown"] || keys["KeyS"]) dz -= 1;
}

  const len = Math.hypot(dx, dz);
  if (len > 0.001) {
    const nx = dx / len, nz = dz / len;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, nz);
    moveDir.addScaledVector(right, nx);
    moveDir.normalize();
    const moveVec = moveDir.multiplyScalar(speed * dt * (input.joystick.force || 1));
    player.position.add(moveVec);

    const targetYaw = Math.atan2(moveDir.x, moveDir.z);
    player.rotation.y = lerpAngle(player.rotation.y, targetYaw, 0.16);
  }

  state.vy += -18 * dt;
  player.position.y += state.vy * dt;

  const halfHeight = 0.5;
const halfW = 0.5;
const halfD = 0.5;
let landed = false;
const tolerance = 0.06;

for (let i = 0; i < platforms.length; i++) {
  const p = platforms[i];
  const pBox = new THREE.Box3().setFromObject(p);

  const gxMin = player.position.x - halfW;
  const gxMax = player.position.x + halfW;
  const gzMin = player.position.z - halfD;
  const gzMax = player.position.z + halfD;

  const pxMin = pBox.min.x - tolerance;
  const pxMax = pBox.max.x + tolerance;
  const pzMin = pBox.min.z - tolerance;
  const pzMax = pBox.max.z + tolerance;

  const overlapX = Math.min(gxMax, pxMax) - Math.max(gxMin, pxMin);
  const overlapZ = Math.min(gzMax, pzMax) - Math.max(gzMin, pzMin);
  const hasOverlap = overlapX > 0 && overlapZ > 0;

  if (hasOverlap) {
    const topY = pBox.max.y;
    const bottomY = pBox.min.y;

    const footY = player.position.y - halfHeight;
    if (footY >= bottomY - 0.05 &&
        footY <= topY + 0.05 &&
        state.vy <= 0) {
      player.position.y = topY + halfHeight;
      state.vy = 0;
      state.onGround = true;
      landed = true;
      break;
    }
  }
}

if (!landed) {
  if (player.position.y <= halfHeight) {
    player.position.y = halfHeight;
    state.vy = 0;
    state.onGround = true;
  } else {
    state.onGround = false;
  }
}
}

function lerpAngle(a, b, t) {
  let delta = b - a;
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
  return a + delta * t;
}

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}
async function enterFullscreen(elem = document.body) {
  try {
    if (elem.requestFullscreen) await elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
    if (screen.orientation && screen.orientation.lock) {
      try { await screen.orientation.lock("landscape"); } catch {}
    }
    enableGestureBlock();
  } catch (err) {}
}
async function exitFullscreen() {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    else if (document.msExitFullscreen) await document.msExitFullscreen();
  } catch (err) {}
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch {}
  disableGestureBlock();
}
if (fsBtn) {
  fsBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      if (!isFullscreen()) {
        await enterFullscreen(document.documentElement);
      } else {
        await exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen toggle error:", err);
    }
    fsBtn.style.display = "none";
  });

  const restoreBtn = () => {
    fsBtn.style.display = "block";
    if (isFullscreen()) {
      fsBtn.textContent = "Вийти з повного екрану";
    } else {
      fsBtn.textContent = "⛶ Повний екран";
    }
  };

  document.addEventListener("fullscreenchange", restoreBtn);
  document.addEventListener("webkitfullscreenchange", restoreBtn);
  document.addEventListener("msfullscreenchange", restoreBtn);
}

  const syncBtnText = () => {
    if (isFullscreen()) {
      fsBtn.textContent = "Вийти з повного екрану";
    } else {
      fsBtn.textContent = "⛶ Повний екран";
    }
  };

function preventDefaultNonPassive(e) { if (e.cancelable) e.preventDefault(); }
function preventDefaultIfGameActive(e) {
  const gameActive = !!document.fullscreenElement || window.isGameActive;
  if (gameActive && e.cancelable) e.preventDefault();
}
function enableGestureBlock() {
  window.addEventListener("wheel", preventDefaultNonPassive, { passive: false });
  window.addEventListener("touchstart", preventDefaultIfGameActive, { passive: false });
  window.addEventListener("touchmove", preventDefaultIfGameActive, { passive: false });
  try { window.addEventListener("gesturestart", preventDefaultNonPassive); } catch {}
}
function disableGestureBlock() {
  window.removeEventListener("wheel", preventDefaultNonPassive, { passive: false });
  window.removeEventListener("touchstart", preventDefaultIfGameActive, { passive: false });
  window.removeEventListener("touchmove", preventDefaultIfGameActive, { passive: false });
  try { window.removeEventListener("gesturestart", preventDefaultNonPassive); } catch {}
}

const raycaster = new THREE.Raycaster();
const cameraCollisionOffset = 0.3;
let camCurrentPos = new THREE.Vector3();
function updateCameraRobloxStyle(dt) {
  const d = clamp(camControls.distance, camControls.minDistance, camControls.maxDistance);
  const phi = clamp(camControls.polar, camControls.minPolar, camControls.maxPolar);
  const theta = camControls.azimuth;
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
  const x = d * sinPhi * Math.sin(theta);
  const y = d * cosPhi;
  const z = d * sinPhi * Math.cos(theta);
  const desiredPos = new THREE.Vector3(x, y, z).add(player.position);
  const headOffset = new THREE.Vector3(0, 1.6, 0);
  const origin = player.position.clone().add(headOffset);
  const dir = desiredPos.clone().sub(origin);
  const dist = dir.length();
  if (dist > 0.0001) dir.normalize();
  raycaster.set(origin, dir);
  raycaster.far = dist;

  const occluders = [];
  for (let i = 0; i < scene.children.length; i++) {
    const obj = scene.children[i];
    if (!obj) continue;
    if (obj === player) continue;
    if (obj === ground || platforms.indexOf(obj) !== -1 || obj.isMesh) occluders.push(obj);
  }

  const intersects = raycaster.intersectObjects(occluders, true);
  let finalPos = desiredPos.clone();
  if (intersects.length > 0) {
    let hit = null;
    for (let i = 0; i < intersects.length; i++) {
      const it = intersects[i];
      if (!it.object) continue;
      if (it.object === player) continue;
      hit = it;
      break;
    }
    if (hit) {
      const back = origin.clone().sub(hit.point).normalize();
      finalPos.copy(hit.point).add(back.multiplyScalar(cameraCollisionOffset));
    }
  }
  
const rotateOverlay = document.getElementById('rotateOverlay');

const isMobileDevice = (() => {
  try {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const uaMobile = /Mobi|Android|iPhone|iPad|iPod|Mobile|IEMobile|BlackBerry/i.test(ua);
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const narrow = window.innerWidth <= 900;
    return uaMobile && hasTouch && narrow;
  } catch (e) {
    return false;
  }
})();

let pausedByRotate = false;

function needsRotatePrompt() {
  return window.innerWidth < window.innerHeight;
}

function showRotatePrompt() {
  if (!rotateOverlay) return;
  rotateOverlay.style.display = 'flex';
  rotateOverlay.setAttribute('aria-hidden', 'false');
  pausedByRotate = true;
  try { resetStick && resetStick(); } catch {}
  try { stopRbDrag && stopRbDrag(); } catch {}
  try {
    rbTouchState.prevDist = null;
    rbTouchState.prevMid = null;
    rbSingleTouch.active = false;
    rbSingleTouch.id = null;
  } catch (e) {}
}

function hideRotatePrompt() {
  if (!rotateOverlay) return;
  rotateOverlay.style.display = 'none';
  rotateOverlay.setAttribute('aria-hidden', 'true');
  pausedByRotate = false;
  try {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  } catch (e) {}
}

function checkOrientationAndPrompt() {
  if (!isMobileDevice) { hideRotatePrompt(); return; }
  if (needsRotatePrompt()) showRotatePrompt();
  else hideRotatePrompt();
}

if (isMobileDevice) {
  window.addEventListener('orientationchange', () => { setTimeout(checkOrientationAndPrompt, 200); });
  window.addEventListener('resize', () => { setTimeout(checkOrientationAndPrompt, 120); });
  checkOrientationAndPrompt();
} else {
  if (rotateOverlay) { rotateOverlay.style.display = 'none'; rotateOverlay.setAttribute('aria-hidden', 'true'); }
}

  if (RB_SMOOTH <= 0) {
    camCurrentPos.copy(finalPos);
  } else {
    let alpha = 1 - Math.exp(-RB_SMOOTH * 60 * dt);
    alpha = Math.min(1, Math.max(0, alpha));
    camCurrentPos.lerp(finalPos, alpha);
  }

  camera.position.copy(camCurrentPos);
  const lookTarget = player.position.clone().add(camControls.velPan);
  camera.lookAt(lookTarget);
  camControls.velPan.multiplyScalar(Math.max(0, 1 - (5 * dt)));
  if (camControls.velPan.length() < 0.0001) camControls.velPan.set(0,0,0);
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, clock.getDelta());
  updateMovement(dt);
  updateCameraRobloxStyle(dt);
  renderer.render(scene, camera);
}
animate();

function resetUIOnOrientationChange() {
  try { resetStick(); } catch (e) {}

  try { stopRbDrag(); } catch (e) {}

  try {
    rbTouchState.prevDist = null;
    rbTouchState.prevMid = null;
    rbSingleTouch.active = false;
    rbSingleTouch.id = null;
  } catch (e) {}

  try { mouseDown = false; } catch (e) {}

  try {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  } catch (e) {}
}

window.addEventListener('orientationchange', () => {
  setTimeout(resetUIOnOrientationChange, 50);
});
window.addEventListener('resize', () => {
  try {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  } catch (e) {}
  setTimeout(resetUIOnOrientationChange, 30);
});