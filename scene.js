import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Reflector } from './vendor/Reflector.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// All dimensions are metres. Outdoor props use their support surface as y = 0.
const LEVEL = Object.freeze({ road: 0.025, pavement: 0.24, interior: 0.32 });
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101c2a');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', '雨夜便利店微缩三维模型，可拖拽旋转和缩放');
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 90);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 29;
controls.minPolarAngle = 0.24;
controls.maxPolarAngle = Math.PI / 2 - 0.055;
let framingScale = Math.max(1, 1.15 / (innerWidth / innerHeight));
function frameCamera() {
  const factor = framingScale;
  controls.maxDistance = 29 * factor;
  camera.position.set(12.8 * factor, 10.4 * factor, 17.5 * factor);
  controls.update();
}
frameCamera();

let seed = 731;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const range = (a, b) => a + random() * (b - a);
const toonRamp = new THREE.DataTexture(new Uint8Array([72, 132, 195, 255]), 4, 1, THREE.RedFormat);
toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
toonRamp.needsUpdate = true;
const materialCache = new Map();
function material(color, warmth = 0) {
  const key = color + warmth;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshToonMaterial({
    color, gradientMap: toonRamp, emissive: warmth ? '#ffcf91' : '#000000', emissiveIntensity: warmth,
  }));
  return materialCache.get(key);
}
function luminous(color, intensity = 1) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.55 });
}
const edgeMaterial = new THREE.LineBasicMaterial({ color: '#152b34', transparent: true, opacity: 0.34 });
const staticObjects = [], edgeObjects = [], grounded = [];
const root = new THREE.Group();
scene.add(root);
function group(x, y, z, parent = root) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
}
function mesh(geometry, color, position, parent = root, opts = {}) {
  const m = new THREE.Mesh(geometry, typeof color === 'string' ? material(color) : color);
  m.position.set(...position); m.castShadow = opts.shadow !== false; m.receiveShadow = true; parent.add(m);
  if (opts.static !== false && !m.material.transparent) staticObjects.push(m);
  if (opts.edge) {
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), edgeMaterial);
    m.add(lines); if (opts.static !== false) edgeObjects.push(lines);
  }
  return m;
}
function box(w, h, d, x, y, z, color, parent = root, opts = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), color, [x, y, z], parent, opts);
}
function cylinder(r, h, x, y, z, color, parent = root, rTop = r, opts = {}) {
  return mesh(new THREE.CylinderGeometry(rTop, r, h, 16), color, [x, y, z], parent, opts);
}
function tube(points, radius, color, parent = root, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), radius, 6, false), color, [0, 0, 0], parent, opts);
}
function torus(r, thickness, x, y, z, color, parent = root, opts = {}) {
  return mesh(new THREE.TorusGeometry(r, thickness, 8, 36), color, [x, y, z], parent, opts);
}
function standingProp(name, x, z, surface = LEVEL.pavement) {
  const g = group(x, surface, z); g.name = name;
  grounded.push({ name, group: g, surface }); return g;
}
function textureCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}
function panel(w, h, x, y, z, draw, parent = root, opts = {}) {
  const texture = textureCanvas(Math.round(w * 180), Math.round(h * 180), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: texture, transparent: !!opts.transparent, side: opts.double ? THREE.DoubleSide : THREE.FrontSide,
    toneMapped: opts.toneMapped !== false, depthWrite: !opts.transparent,
  }));
  m.position.set(x, y, z); parent.add(m); return m;
}
function text(ctx, value, x, y, size, color = '#264f4e', weight = '600') {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px "Noto Sans CJK JP", "Yu Gothic", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y);
}
function plaque(value, w, h, x, y, z, bg, fg, parent = root) {
  return panel(w, h, x, y, z, (ctx, W, H) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); text(ctx, value, W / 2, H / 2, H * 0.55, fg);
  }, parent);
}
const glass = new THREE.MeshPhysicalMaterial({ color: '#a6d7cb', transparent: true, opacity: 0.065, roughness: 0.12, metalness: 0.06, depthWrite: false, side: THREE.DoubleSide });
const frameColor = '#37585c', cream = '#d5d0b1', iron = '#354957';
const warmWhite = material('#eed7a2', 0.16), shelfWhite = material('#c9c7ad', 0.09);
const lightWarm = luminous('#ffda94', 1.25), lightTeal = luminous('#77d4be', 1.15);

scene.add(new THREE.HemisphereLight('#9bbce0', '#293545', 0.76));
const moon = new THREE.DirectionalLight('#92bce7', 1.45);
moon.position.set(-7, 12, 6); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 10, bottom: -9, near: 0.1, far: 35 });
moon.shadow.normalBias = 0.035; moon.shadow.bias = -0.0002;
scene.add(moon);
const fill = new THREE.DirectionalLight('#a8b3dd', 0.42); fill.position.set(8, 6, -5); scene.add(fill);
function point(color, intensity, distance, x, y, z) {
  const l = new THREE.PointLight(color, intensity, distance, 2); l.position.set(x, y, z); scene.add(l); return l;
}

// A complete, solid square plinth. The asphalt and every painted marking are flush.
box(12, 0.55, 12, 0, -0.3, 0, '#223142', root, { edge: true });
box(12.04, 0.07, 12.04, 0, -0.03, 0, '#435764', root, { edge: true });
box(11.94, 0.035, 11.94, 0, 0.006, 0, '#263643');
// The raised pavement creates an L-shaped street along the left and front edges.
box(8.65, 0.215, 6.5, 0.075, 0.1325, -1.55, '#667977', root, { edge: true });
box(8.65, 0.04, 6.5, 0.075, 0.22, -1.55, '#81908a');
for (let x = -4.05; x < 4.4; x += 0.5) {
  box(0.485, 0.18, 0.19, x, 0.15, 1.64, '#a5afa0', root, { edge: true });
}
for (let z = -4.55; z < 1.5; z += 0.5) box(0.18, 0.18, 0.485, -4.18, 0.15, z, '#919e95', root, { edge: true });
// Pavement joints and understated small tiles.
for (let x = -4; x < 4.4; x += 0.55) box(0.008, 0.002, 6.3, x, 0.242, -1.55, '#6c7f7d', root, { shadow: false });
for (let z = -4.5; z < 1.7; z += 0.55) box(8.4, 0.002, 0.008, 0.05, 0.242, z, '#6c7f7d', root, { shadow: false });

// A single planar reflection is rippled, blurred and masked into irregular wet patches.
const roadShader = {
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, time: { value: 0 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 reflected; varying vec2 ground;
  void main(){reflected=textureMatrix*vec4(position,1.);ground=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec4 reflected; varying vec2 ground;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
  void main(){
    vec2 uv=reflected.xy/reflected.w;
    float wet=smoothstep(.28,.78,noise(ground*1.3)+noise(ground*3.1)*.15);
    float wave=sin(ground.y*100.+time*3.)*sin(ground.x*15.-time)*.00065;
    uv+=vec2(wave,noise(ground*14.+time*.2)*.0013);
    vec3 reflection=texture2D(tDiffuse,uv).rgb*.36;
    reflection+=texture2D(tDiffuse,uv+vec2(.0018,.0008)).rgb*.16;
    reflection+=texture2D(tDiffuse,uv-vec2(.0018,.0008)).rgb*.16;
    reflection+=texture2D(tDiffuse,uv+vec2(.004,0)).rgb*.16;
    reflection+=texture2D(tDiffuse,uv-vec2(.004,0)).rgb*.16;
    vec3 asphalt=vec3(.034,.059,.074)+(noise(ground*200.)-.5)*.012;
    gl_FragColor=vec4(mix(asphalt,reflection,.16+wet*.45),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
};
const road = new Reflector(new THREE.PlaneGeometry(11.9, 11.9), {
  textureWidth: 1024, textureHeight: 1024, color: '#36515d', clipBias: 0.003, multisample: 0, shader: roadShader,
});
road.rotation.x = -Math.PI / 2; road.position.y = LEVEL.road; scene.add(road);
const marking = material('#c4c9b1');
for (let i = 0; i < 7; i++) box(0.44, 0.004, 1.68, -5.15 + i * 0.63, LEVEL.road + 0.004, 3.54, marking, root, { shadow: false });
for (const x of [1.72, 4.75]) box(0.045, 0.004, 2.4, x, LEVEL.road + 0.004, 4.15, marking, root, { shadow: false });
box(3.075, 0.004, 0.045, 3.235, LEVEL.road + 0.004, 5.35, marking, root, { shadow: false });
const pMark = plaque('P', 0.48, 0.65, 3.25, 0.033, 4.68, '#334852', '#a4b5aa'); pMark.rotation.x = -Math.PI / 2;
for (let x = -5.7; x < 5.7; x += 1.9) box(0.85, 0.003, 0.06, x, 0.032, 5.66, '#918e6d', root, { shadow: false });
// Continuous drainage channels, with grates embedded at the curb instead of hovering.
box(8.8, 0.005, 0.19, 0.05, 0.031, 1.82, '#162d34', root, { shadow: false });
for (let x = -4.23; x < 4.4; x += 0.13) box(0.027, 0.008, 0.17, x, 0.037, 1.82, '#526a6e', root, { shadow: false });
const manhole = cylinder(0.35, 0.008, -3.9, 0.037, 4.98, '#304952', root, 0.35, { shadow: false });
for (let i = -2; i <= 2; i++) box(0.42, 0.006, 0.016, -3.9, 0.044, 4.98 + i * 0.085, '#6b7d7c', root, { shadow: false });

// Store structure: a low roof and fully glazed front/right corner reveal the interior.
box(6.2, 0.08, 4.05, 0.05, 0.28, -1.77, '#c7c4a9', root, { edge: true });
box(6.2, 3.05, 0.16, 0.05, 1.845, -3.72, '#78938b', root, { edge: true });
box(0.16, 3.05, 4.05, -2.97, 1.845, -1.77, '#819b90', root, { edge: true });
// Floor tile pattern is visible through the windows.
for (let x = -2.75; x < 3.1; x += 0.48) for (let z = -3.48; z < 0.2; z += 0.48) {
  box(0.47, 0.006, 0.47, x, 0.326, z, material((Math.round(x * 10 + z * 10) % 2) ? '#c5ba94' : '#d1c4a1', 0.12), root, { shadow: false });
}
box(6.5, 0.22, 4.35, 0.05, 3.48, -1.74, '#365459', root, { edge: true });
box(6.58, 0.085, 4.43, 0.05, 3.62, -1.74, '#597573', root, { edge: true });
box(6.34, 0.035, 4.19, 0.05, 3.675, -1.74, '#405d62');
// Thin roof parapets, capped and weathered, frame the miniature silhouette.
for (const z of [-3.86, 0.36]) box(6.5, 0.14, 0.10, 0.05, 3.75, z, '#708681', root, { edge: true });
for (const x of [-3.16, 3.26]) box(0.10, 0.14, 4.22, x, 3.75, -1.75, '#708681', root, { edge: true });
for (let z = -3.5; z < 0.2; z += 0.65) box(6.3, 0.006, 0.012, 0.05, 3.698, z, '#2c484f', root, { shadow: false });
// Rooftop ventilation unit and piping.
const roofUnit = group(1.65, 3.7, -2.42);
box(1.18, 0.1, 0.86, 0, 0.05, 0, '#304a54', roofUnit);
box(1.05, 0.58, 0.78, 0, 0.39, 0, '#9caea0', roofUnit, { edge: true });
for (let i = 0; i < 9; i++) box(0.83, 0.022, 0.02, 0, 0.18 + i * 0.05, 0.405, '#485f61', roofUnit);
for (const x of [-0.26, 0.26]) {
  const fan = torus(0.20, 0.02, x, 0.69, 0, '#3c5559', roofUnit); fan.rotation.x = -Math.PI / 2;
  cylinder(0.17, 0.012, x, 0.69, 0, '#617d79', roofUnit);
  for (let a = 0; a < 4; a++) { const blade = box(0.3, 0.015, 0.025, x, 0.7, 0, '#334e56', roofUnit); blade.rotation.y = a * Math.PI / 4; }
}
tube([[2.15, 3.73, -2.8], [2.45, 3.86, -2.8], [2.7, 3.86, -3.4], [2.7, 3.7, -3.65]], 0.048, '#738b82');
// Main sign, with deliberate lettering hierarchy and a small umbrella symbol.
box(6.44, 0.59, 0.26, 0.05, 3.14, 0.44, '#1c5556', root, { edge: true });
const sign = panel(6.28, 0.44, 0.05, 3.17, 0.579, (ctx, W, H) => {
  ctx.fillStyle = '#f4e9c4'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e6b664'; ctx.fillRect(0, H * 0.89, W, H * 0.11);
  ctx.fillStyle = '#2c7771'; ctx.beginPath(); ctx.arc(W * 0.08, H * 0.54, H * 0.28, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#2c7771'; ctx.lineWidth = H * 0.042; ctx.beginPath();ctx.moveTo(W * 0.08, H * 0.5);ctx.lineTo(W * 0.08, H * 0.72);ctx.quadraticCurveTo(W * 0.08, H * 0.84, W * 0.07, H * 0.73);ctx.stroke();
  text(ctx, '雨 宿 り', W * 0.33, H * 0.46, H * 0.68, '#285e5b');
  text(ctx, 'AMAYADORI', W * 0.65, H * 0.43, H * 0.30, '#376b62');
  text(ctx, 'CONVENIENCE STORE', W * 0.65, H * 0.72, H * 0.13, '#517b6c');
  text(ctx, '24', W * 0.92, H * 0.48, H * 0.62, '#bb7950');
}, root, { toneMapped: false });
box(6.44, 0.055, 0.29, 0.05, 3.46, 0.455, lightTeal, root, { shadow: false });
box(6.44, 0.035, 0.29, 0.05, 2.835, 0.455, '#deab6c');
// A proper sloping rain canopy, gutter and a drainpipe reaching the paving.
const canopy = box(6.8, 0.105, 0.95, 0.05, 2.77, 0.62, '#487b73', root, { edge: true }); canopy.rotation.x = 0.08;
for (let x = -3.2; x < 3.4; x += 0.32) box(0.018, 0.022, 0.91, x, 2.832, 0.62, '#698d7c', root, { shadow: false });
box(6.84, 0.105, 0.095, 0.05, 2.71, 1.07, '#2d605d', root, { edge: true });
box(5.8, 0.027, 0.09, 0.05, 2.68, 0.85, lightWarm, root, { shadow: false });
tube([[-3.3, 2.73, 1.05], [-3.43, 2.65, 1.05], [-3.43, 0.42, 1.05], [-3.48, 0.28, 1.23]], 0.035, '#52736e');
for (const y of [0.65, 1.7, 2.45]) box(0.11, 0.05, 0.10, -3.43, y, 1.05, '#7b9584');
// Window framing sits exactly on the floor slab.
for (const x of [-2.88, -0.98, 1.25, 3.07]) box(0.065, 2.36, 0.09, x, 1.5, 0.31, frameColor, root, { edge: true });
for (const y of [0.36, 2.65]) box(6.0, 0.065, 0.095, 0.1, y, 0.31, frameColor);
box(1.84, 2.22, 0.015, -1.94, 1.5, 0.323, glass, root, { shadow: false });
box(1.77, 2.22, 0.015, 2.16, 1.5, 0.323, glass, root, { shadow: false });
// Right side glass wall gives an unobstructed second view into the warm store.
box(0.13, 0.44, 3.9, 3.08, 0.54, -1.67, '#77918a', root, { edge: true });
for (const z of [-3.57, -2.27, -0.96, 0.3]) box(0.085, 2.89, 0.065, 3.08, 1.77, z, frameColor, root, { edge: true });
box(0.085, 0.065, 3.86, 3.08, 2.68, -1.65, frameColor);
box(0.015, 1.89, 3.8, 3.088, 1.69, -1.65, glass, root, { shadow: false });
for (const z of [-2.91, -1.6, -0.3]) {
  const stripe = plaque('雨宿り  •  24H', 0.78, 0.065, 3.1, 1.03, z, '#d8d4ab', '#40716a'); stripe.rotation.y = Math.PI / 2;
}
const doorPanels = [];
for (const [x, direction] of [[-0.415, -1], [0.695, 1]]) {
  const g = group(x, 0.36, 0.35);
  box(1.085, 2.23, 0.018, 0, 1.115, 0, glass, g, { static: false, shadow: false });
  for (const dx of [-0.535, 0.535]) box(0.027, 2.23, 0.07, dx, 1.115, 0, '#597672', g, { static: false });
  for (const y of [0.018, 2.215]) box(1.085, 0.036, 0.07, 0, y, 0, '#597672', g, { static: false });
  box(1.08, 0.075, 0.021, 0, 0.69, 0.023, '#d5d7b7', g, { static: false, shadow: false });
  box(0.04, 0.26, 0.03, direction * -0.44, 1.08, 0.045, '#d7d2b1', g, { static: false });
  plaque('自動', 0.19, 0.10, direction * -0.35, 1.4, 0.032, '#d5dfc7', '#386359', g);
  doorPanels.push({ group: g, x, direction });
}
box(2.32, 0.1, 0.16, 0.14, 2.65, 0.34, '#335a5b');
box(0.15, 0.07, 0.10, 0.14, 2.6, 0.45, '#1d343e');
box(2.25, 0.015, 0.12, 0.14, 0.326, 0.36, '#6a817b', root, { shadow: false });
const mat = standingProp('entrance-mat', 0.14, 0.95);
box(1.95, 0.022, 0.83, 0, 0.011, 0, '#334c4c', mat);
for (let z = -0.33; z < 0.39; z += 0.065) box(1.8, 0.002, 0.012, 0, 0.023, z, '#627e70', mat, { shadow: false });

// Interior: rows of products with labels, tiered displays, and explicit warm lights.
const goods = ['#d59365', '#d9c777', '#90ae81', '#b97968', '#9fabc0', '#cf9a91'];
function carton(x, y, z, color, parent, scale = 1) {
  box(0.12 * scale, 0.23 * scale, 0.11 * scale, x, y + 0.115 * scale, z, material(color, 0.09), parent);
  box(0.125 * scale, 0.08 * scale, 0.004, x, y + 0.105 * scale, z + 0.058 * scale, warmWhite, parent, { shadow: false });
  box(0.08 * scale, 0.025 * scale, 0.006, x, y + 0.105 * scale, z + 0.061 * scale, '#867154', parent, { shadow: false });
}
function bottle(x, y, z, color, parent, scale = 1) {
  cylinder(0.047 * scale, 0.19 * scale, x, y + 0.095 * scale, z, material(color, 0.09), parent, 0.042 * scale);
  cylinder(0.025 * scale, 0.045 * scale, x, y + 0.21 * scale, z, '#d6cba3', parent);
  cylinder(0.05 * scale, 0.065 * scale, x, y + 0.10 * scale, z, warmWhite, parent);
}
function riceBall(x, y, z, parent) {
  const triangle = new THREE.Shape(); triangle.moveTo(-0.085, 0); triangle.lineTo(0.085, 0); triangle.quadraticCurveTo(0.105, 0.02, 0.025, 0.15); triangle.quadraticCurveTo(0, 0.19, -0.025, 0.15); triangle.closePath();
  mesh(new THREE.ExtrudeGeometry(triangle, { depth: 0.065, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.008, bevelSegments: 1, steps: 1 }), warmWhite, [x, y, z], parent);
  box(0.06, 0.09, 0.074, x, y + 0.035, z + 0.033, '#3c5545', parent);
}
function shelf(x, z, width, type) {
  const g = group(x, LEVEL.interior, z);
  box(width, 0.13, 0.66, 0, 0.065, 0, '#89988a', g, { edge: true });
  for (const sx of [-width / 2 + 0.025, width / 2 - 0.025]) box(0.038, 1.46, 0.59, sx, 0.77, 0, shelfWhite, g);
  box(width, 1.34, 0.035, 0, 0.75, -0.26, '#9fa994', g);
  for (let tier = 0; tier < 3; tier++) {
    const y = 0.21 + tier * 0.41;
    box(width, 0.038, 0.65, 0, y, 0, shelfWhite, g, { edge: true });
    box(width, 0.065, 0.025, 0, y + 0.01, 0.33, '#ccb982', g);
    for (let i = 0; i < Math.floor(width / 0.19); i++) {
      const px = -width / 2 + 0.12 + i * 0.19;
      if (type === 'rice' && tier === 1) { riceBall(px, y + 0.03, 0.09, g); riceBall(px, y + 0.03, -0.12, g); }
      else if (type === 'bento' || (type === 'rice' && tier === 0)) {
        box(0.16, 0.05, 0.23, px, y + 0.05, 0.1, '#4c534b', g);
        box(0.145, 0.013, 0.21, px, y + 0.081, 0.1, warmWhite, g);
        box(0.065, 0.02, 0.1, px + 0.027, y + 0.091, 0.11, '#b17d54', g);
      } else carton(px, y + 0.023, 0.16, goods[(i + tier * 2) % goods.length], g);
      box(0.08, 0.034, 0.004, px, y + 0.004, 0.346, warmWhite, g, { shadow: false });
    }
  }
  plaque(type === 'rice' ? 'おにぎり ・ お弁当' : 'お菓子  /  SNACKS', width, 0.15, 0, 1.49, 0.33, '#386d5d', '#f0e3b1', g);
}
shelf(-1.75, -1.0, 1.58, 'rice'); shelf(0.12, -1.53, 1.32, 'snacks');
// Refrigerators occupy the back wall, with separate glass doors and lit shelf strips.
for (let j = 0; j < 3; j++) {
  const g = group(-1.95 + j * 1.03, LEVEL.interior, -3.29);
  box(0.99, 2.16, 0.55, 0, 1.08, 0, '#456e68', g, { edge: true });
  box(0.86, 1.81, 0.025, 0, 1.09, 0.287, glass, g, { shadow: false });
  for (let tier = 0; tier < 4; tier++) {
    const y = 0.28 + tier * 0.42;
    box(0.86, 0.035, 0.40, 0, y, 0.07, shelfWhite, g);
    box(0.85, 0.025, 0.025, 0, y - 0.035, 0.27, lightWarm, g, { shadow: false });
    for (let i = 0; i < 5; i++) bottle(-0.33 + i * 0.165, y + 0.019, 0.16, goods[(i + tier + j) % 6], g, 1.0);
  }
  for (const x of [-0.46, 0.46]) box(0.035, 1.84, 0.04, x, 1.09, 0.31, '#b2baa2', g);
  box(0.025, 0.56, 0.035, 0.33, 1.12, 0.34, '#d8d1ab', g);
  plaque(['DRINKS', 'MILK & TEA', 'BEER'][j], 0.93, 0.16, 0, 2.04, 0.291, '#e8dbad', '#447267', g);
}
// Back room door, storage cupboard and small illuminated exit marker.
box(0.79, 2.15, 0.09, 2.48, 1.395, -3.59, '#5b7872', root, { edge: true });
box(0.64, 1.94, 0.02, 2.48, 1.39, -3.53, '#85988a');
box(0.045, 0.1, 0.04, 2.72, 1.3, -3.5, '#c4c6a8');
plaque('STAFF ONLY', 0.44, 0.13, 2.48, 1.92, -3.511, '#b8c3a8', '#586e60');
plaque('← EXIT', 0.58, 0.16, 2.48, 2.62, -3.61, '#70aa77', '#edebbb');
box(0.53, 1.8, 0.55, 1.52, 1.22, -3.28, '#afbaa3', root, { edge: true });
for (const y of [0.9, 1.65]) box(0.47, 0.015, 0.015, 1.52, y, -2.996, '#667f71');
// Checkout and detailed oden / coffee counter behind the right-hand window.
const counter = group(2.1, LEVEL.interior, -0.59);
box(1.52, 0.96, 0.84, 0, 0.48, 0, '#9d977a', counter, { edge: true });
for (let x = -0.68; x < 0.77; x += 0.16) box(0.025, 0.77, 0.02, x, 0.44, 0.428, '#857e63', counter);
box(1.63, 0.08, 0.96, 0, 1, 0, warmWhite, counter, { edge: true });
box(0.4, 0.06, 0.3, -0.12, 1.07, 0.14, '#3a504f', counter);
const monitor = box(0.37, 0.26, 0.065, -0.12, 1.3, 0.12, '#314b4c', counter, { edge: true }); monitor.rotation.x = -0.12;
box(0.06, 0.18, 0.06, -0.12, 1.17, 0.1, '#455b55', counter);
plaque('¥  680', 0.27, 0.12, -0.12, 1.32, 0.165, '#a8c4a1', '#3c6258', counter);
box(0.24, 0.04, 0.18, 0.23, 1.065, 0.25, '#647f6b', counter);
// Oden tray and glass sneeze guard.
box(0.45, 0.12, 0.41, -0.54, 1.09, -0.15, '#b4b79a', counter, { edge: true });
for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
  box(0.17, 0.017, 0.15, -0.65 + i * 0.21, 1.157, -0.25 + j * 0.18, '#8b7951', counter);
  cylinder(0.038, 0.027, -0.65 + i * 0.21, 1.185, -0.25 + j * 0.18, '#d8bb78', counter);
}
box(0.45, 0.28, 0.008, -0.54, 1.28, 0.075, glass, counter, { shadow: false });
box(0.45, 0.022, 0.4, -0.54, 1.43, -0.12, '#aeb395', counter);
plaque('おでん  ¥120', 0.43, 0.12, -0.54, 1.09, 0.065, '#ead49a', '#7b6440', counter);
const coffee = group(2.54, LEVEL.interior, -1.73);
box(0.68, 0.9, 0.62, 0, 0.45, 0, '#a59d80', coffee, { edge: true });
box(0.74, 0.06, 0.68, 0, 0.93, 0, warmWhite, coffee);
box(0.42, 0.53, 0.43, 0, 1.225, -0.04, '#3e5352', coffee, { edge: true });
box(0.29, 0.19, 0.04, 0, 1.12, 0.18, '#1b383e', coffee);
box(0.23, 0.045, 0.1, 0, 1.23, 0.21, '#afbea5', coffee);
for (const x of [-0.08, 0.08]) cylinder(0.05, 0.11, x, 1.07, 0.22, warmWhite, coffee, 0.06);
plaque('COFFEE', 0.35, 0.12, 0, 1.39, 0.185, '#d0cda9', '#3c5750', coffee);
cylinder(0.09, 0.16, 0, 1.56, -0.1, '#654e39', coffee, 0.09);
// Low freezer and magazine rack, seen especially from the glass side.
box(0.8, 0.66, 0.7, 1.26, 0.65, -2.55, '#a5bba6', root, { edge: true });
box(0.73, 0.035, 0.63, 1.26, 0.996, -2.55, '#89a9a0');
box(0.7, 0.015, 0.025, 1.26, 1.02, -2.55, '#d0d3b0');
plaque('ICE CREAM', 0.68, 0.13, 1.26, 0.74, -2.194, '#c0d3b0', '#598174');
const magazines = group(-2.58, LEVEL.interior, -0.18);
box(0.42, 0.79, 0.36, 0, 0.395, 0, '#657f6d', magazines, { edge: true });
for (let row = 0; row < 3; row++) for (let i = 0; i < 2; i++) {
  const poster = plaque(['旅', '暮らし', '散歩', '珈琲', '猫', '東京'][row * 2 + i], 0.16, 0.25, -0.09 + i * 0.18, 0.32 + row * 0.22, 0.21 + row * 0.015, ['#d8a38b', '#b7c5a0'][i], '#4d635b', magazines); poster.rotation.x = -0.12;
}
// Ceiling strips are real luminaires; warm emissive shelves keep the room readable.
for (const x of [-1.7, 0.05, 1.8]) box(0.13, 0.035, 2.45, x, 3.345, -1.77, lightWarm, root, { shadow: false });
point('#ffc57e', 15, 6, -1.5, 2.55, -1.5); point('#ffd08b', 14, 5.5, 1.55, 2.55, -1.2);
const entranceLight = point('#f8cd87', 10, 4.5, 0.1, 2.35, 0.9);
point('#75d2b8', 4, 3.5, -2.2, 3.15, 1.0);
// Posters make the glass storefront feel inhabited without adding people.
function foodPoster(x, y, z, w, h, parent = root) {
  return panel(w, h, x, y, z, (ctx, W, H) => {
    ctx.fillStyle = '#ece0b9'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#bb694e'; ctx.fillRect(0, 0, W, H * 0.22);
    text(ctx, '新発売', W / 2, H * 0.115, H * 0.12, '#fff0c4');
    ctx.fillStyle = '#f6edce'; ctx.beginPath(); ctx.moveTo(W * 0.2, H * 0.65); ctx.quadraticCurveTo(W * 0.5, H * 0.2, W * 0.8, H * 0.65); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#416554'; ctx.fillRect(W * 0.41, H * 0.48, W * 0.18, H * 0.2);
    text(ctx, 'おにぎり', W / 2, H * 0.80, H * 0.105, '#3e6656'); text(ctx, '¥ 150', W / 2, H * 0.93, H * 0.09, '#995c44');
  }, parent);
}
foodPoster(-2.52, 1.42, 0.342, 0.44, 0.68);
plaque('挽きたて  COFFEE', 1.2, 0.21, 1.82, 2.24, -3.617, '#b97a4f', '#f5e5b7');
foodPoster(-2.875, 2.02, -2.15, 0.59, 0.87).rotation.y = Math.PI / 2;
const floorGuide = plaque('→  レジ', 0.63, 0.22, 1.01, 0.334, -0.32, '#bdac73', '#45675b'); floorGuide.rotation.x = -Math.PI / 2;

// Vending machine: four visible feet start at the pavement, not above the road.
const vending = standingProp('vending-machine', -3.61, 0.20);
for (const x of [-0.32, 0.32]) for (const z of [-0.24, 0.24]) box(0.12, 0.08, 0.13, x, 0.04, z, '#253e46', vending);
box(0.92, 1.92, 0.71, 0, 1.04, 0, '#739b91', vending, { edge: true });
box(0.82, 1.81, 0.04, 0, 1.04, 0.375, '#cfdbbb', vending, { edge: true });
box(0.64, 1.04, 0.035, -0.047, 1.30, 0.402, luminous('#b4d5b6', 0.12), vending);
for (let j = 0; j < 3; j++) {
  box(0.61, 0.023, 0.08, -0.05, 0.90 + j * 0.32, 0.443, '#779586', vending);
  for (let i = 0; i < 4; i++) {
    bottle(-0.277 + i * 0.148, 0.92 + j * 0.32, 0.446, goods[(i + j) % 6], vending, 0.77);
    cylinder(0.027, 0.014, -0.277 + i * 0.148, 0.867 + j * 0.32, 0.453, '#cbd79c', vending).rotation.x = Math.PI / 2;
  }
}
box(0.53, 0.20, 0.025, -0.08, 0.38, 0.408, '#263f46', vending, { edge: true });
box(0.45, 0.035, 0.1, -0.08, 0.295, 0.44, '#709082', vending);
box(0.12, 0.27, 0.027, 0.33, 0.74, 0.416, '#466859', vending);
box(0.065, 0.015, 0.01, 0.33, 0.82, 0.437, '#d2d8b1', vending);
box(0.05, 0.085, 0.01, 0.33, 0.71, 0.437, '#263d40', vending);
plaque('つめた〜い', 0.7, 0.16, 0, 1.89, 0.405, '#3b7d75', '#e7e7b5', vending);
plaque('DRINKS', 0.58, 0.15, 0, 0.57, 0.426, '#d3dab7', '#3a7467', vending);
point('#8bdcca', 1.8, 3.3, -3.55, 1.5, 0.92);

// City bicycle: tire contact and kickstand are both at pavement height.
const bike = standingProp('bicycle', -1.92, 1.14);
bike.rotation.y = -0.10;
for (const x of [-0.57, 0.57]) {
  torus(0.325, 0.035, x, 0.36, 0, '#263d45', bike);
  torus(0.294, 0.012, x, 0.36, 0, '#aebdab', bike);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    tube([[x, 0.36, 0], [x + Math.cos(a) * 0.29, 0.36 + Math.sin(a) * 0.29, 0]], 0.004, '#a6b6a8', bike);
  }
  const mudguard = mesh(new THREE.TorusGeometry(0.373, 0.018, 6, 24, Math.PI * 0.88), '#b1b9a3', [x, 0.36, 0], bike); mudguard.rotation.z = Math.PI * 0.06;
}
tube([[-0.57, 0.36, 0], [-0.2, 0.79, 0], [0.02, 0.35, 0], [-0.57, 0.36, 0]], 0.025, '#b98669', bike);
tube([[-0.2, 0.79, 0], [-0.1, 0.57, 0], [0.3, 0.72, 0], [0.32, 0.87, 0]], 0.025, '#b98669', bike);
tube([[0.02, 0.35, 0], [0.32, 0.87, 0], [0.57, 0.36, 0]], 0.025, '#b98669', bike);
tube([[0.32, 0.87, 0], [0.28, 1.04, 0], [0.4, 1.07, 0]], 0.021, '#bbbfaa', bike);
tube([[0.40, 1.07, -0.16], [0.40, 1.07, 0.16]], 0.02, '#6e857a', bike);
box(0.25, 0.065, 0.16, -0.21, 0.9, 0, '#4e5b52', bike, { edge: true });
tube([[-0.21, 0.88, 0], [-0.2, 0.76, 0]], 0.018, '#aab5a3', bike);
const crank = torus(0.105, 0.016, 0.02, 0.35, 0.04, '#9fae9c', bike);
tube([[0.02, 0.35, 0.05], [0.12, 0.24, 0.09]], 0.012, '#9fae9c', bike);
box(0.11, 0.025, 0.065, 0.12, 0.24, 0.09, '#344c48', bike);
tube([[-0.13, 0.4, -0.04], [-0.26, 0, -0.2]], 0.018, '#586d62', bike);
box(0.31, 0.018, 0.25, 0.58, 0.82, 0, '#6a8174', bike);
for (const z of [-0.13, 0.13]) for (let i = 0; i < 6; i++) tube([[0.43 + i * 0.06, 0.82, z], [0.40 + i * 0.07, 1.04, z]], 0.008, '#86998a', bike);
for (const y of [0.84, 0.93, 1.04]) { tube([[0.41, y, -0.13], [0.77, y, -0.13], [0.77, y, 0.13], [0.41, y, 0.13], [0.41, y, -0.13]], 0.008, '#86998a', bike); }

const umbrellas = standingProp('umbrella-stand', 3.62, 0.79);
box(0.5, 0.07, 0.44, 0, 0.035, 0, '#536a63', umbrellas, { edge: true });
for (const x of [-0.22, 0.22]) for (const z of [-0.18, 0.18]) box(0.025, 0.56, 0.025, x, 0.28, z, '#81988a', umbrellas);
for (const z of [-0.18, 0.18]) box(0.46, 0.045, 0.025, 0, 0.53, z, '#9cafa0', umbrellas);
for (let i = 0; i < 3; i++) {
  const x = -0.14 + i * 0.14;
  tube([[x, 0.06, 0], [x, 0.96, 0], [x + 0.065, 1.035, 0], [x + 0.115, 0.98, 0]], 0.013, '#c6cbb4', umbrellas);
  cylinder(0.065, 0.62, x, 0.43, 0, ['#849aab', '#ae8d92', '#a6b9b0'][i], umbrellas, 0.019);
}
for (let i = 0; i < 2; i++) {
  const bin = standingProp(`recycling-bin-${i}`, 3.65, -0.29 - i * 0.66);
  box(0.49, 0.76, 0.48, 0, 0.38, 0, '#93a493', bin, { edge: true });
  box(0.52, 0.08, 0.51, 0, 0.8, 0, '#bfccb4', bin, { edge: true });
  box(0.24, 0.115, 0.016, 0, 0.65, 0.25, '#314d4c', bin);
  plaque(i ? 'ペットボトル' : 'かん・びん', 0.35, 0.1, 0, 0.39, 0.248, '#c9d0b1', '#557364', bin);
}
// Alley entrance, condenser, wall-mounted noticeboard, crates and a small traffic mirror.
const ac = standingProp('air-conditioner', 3.70, -2.86);
for (const x of [-0.31, 0.31]) box(0.10, 0.1, 0.45, x, 0.05, 0, '#627d73', ac);
box(0.89, 0.64, 0.43, 0, 0.42, 0, '#a4b49e', ac, { edge: true });
const acRing = torus(0.22, 0.022, -0.16, 0.43, 0.229, '#576e65', ac);
for (let a = 0; a < 7; a++) { const slat = box(0.38, 0.015, 0.02, -0.16, 0.27 + a * 0.054, 0.246, '#58766b', ac); }
for (let i = 0; i < 7; i++) box(0.15, 0.014, 0.012, 0.29, 0.24 + i * 0.058, 0.23, '#607d71', ac);
tube([[3.78, 0.76, -3], [3.91, 0.93, -3.2], [3.91, 2.2, -3.61], [3.1, 2.2, -3.61]], 0.03, '#8a9e8e');
const board = standingProp('noticeboard', 3.94, -1.87);
for (const x of [-0.36, 0.36]) box(0.055, 1.59, 0.06, x, 0.795, 0, '#6f7962', board);
box(0.94, 1.0, 0.08, 0, 1.43, 0, '#677f6b', board, { edge: true });
box(0.82, 0.87, 0.03, 0, 1.43, 0.059, '#b1b18e', board);
plaque('町内のお知らせ', 0.83, 0.15, 0, 1.77, 0.081, '#e0d4aa', '#526d5b', board);
for (let i = 0; i < 3; i++) plaque(['夏祭り', '回覧', '雨の日'][i], 0.23, 0.44, -0.27 + i * 0.27, 1.38, 0.081, ['#c2c5a4', '#d4b497', '#99b1aa'][i], '#5d6c5a', board);
box(1.03, 0.07, 0.22, 0, 1.97, 0, '#526f63', board, { edge: true });
for (let j = 0; j < 2; j++) {
  const crate = standingProp(`delivery-crate-${j}`, -3.55, -2.6 + j * 0.65);
  box(0.58, 0.37, 0.49, 0, 0.185, 0, '#657f69', crate, { edge: true });
  for (let y = 0.09; y < 0.36; y += 0.08) box(0.5, 0.025, 0.01, 0, y, 0.252, '#3f5c52', crate);
}
// Guard rail on the street corner: base plates on asphalt, alternating yellow sleeves.
const guard = standingProp('street-guardrail', -5.1, -0.63, LEVEL.road);
for (const z of [-0.91, 0.91]) { cylinder(0.055, 0.79, 0, 0.395, z, '#b5bba2', guard); box(0.17, 0.025, 0.17, 0, 0.0125, z, '#526c6b', guard); }
tube([[0, 0.74, -0.91], [0, 0.81, -0.78], [0, 0.81, 0.78], [0, 0.74, 0.91]], 0.045, '#c6c6a5', guard);
for (const z of [-0.85, 0.85]) cylinder(0.057, 0.22, 0, 0.52, z, '#bc9c5d', guard);
// Street lamp and warm pool of light.
const lamp = standingProp('street-lamp', 4.95, 1.69, LEVEL.road);
cylinder(0.14, 0.12, 0, 0.06, 0, '#445e62', lamp);
cylinder(0.074, 3.66, 0, 1.95, 0, '#506e70', lamp, 0.055, { edge: true });
tube([[0, 3.65, 0], [0, 3.97, 0], [-0.29, 4.08, 0], [-0.68, 3.97, 0]], 0.05, '#597d7b', lamp);
box(0.48, 0.13, 0.31, -0.68, 3.91, 0, '#38595c', lamp, { edge: true });
box(0.40, 0.027, 0.25, -0.68, 3.83, 0, lightWarm, lamp, { shadow: false });
point('#ffd393', 16, 6, 4.27, 3.73, 1.69);
// Utility pole and wires stay within the square's footprint.
const pole = standingProp('utility-pole', -4.92, -3.15, LEVEL.road);
cylinder(0.145, 5.75, 0, 2.875, 0, '#647677', pole, 0.108, { edge: true });
cylinder(0.152, 0.83, 0, 0.6, 0, '#52696c', pole);
box(1.41, 0.10, 0.14, 0, 5.28, 0, '#647f7e', pole, { edge: true });
for (const x of [-0.53, 0, 0.53]) {
  cylinder(0.044, 0.24, x, 5.46, 0, '#bdc7af', pole);
  for (let j = 0; j < 3; j++) cylinder(0.07, 0.025, x, 5.40 + j * 0.065, 0, '#92a798', pole);
}
box(0.33, 0.49, 0.28, 0.19, 4.55, 0, '#83998e', pole, { edge: true });
plaque('雨宿町', 0.16, 0.49, 0, 2.12, 0.149, '#527c74', '#e3dcba', pole);
for (const x of [-0.53, 0.53]) tube([[-4.92 + x, 5.49, -3.15], [-1.8, 4.94, -4.34], [1.6, 4.90, -4.79], [4.98, 5.4, -4.8]], 0.014, '#253b49');
const rearPole = standingProp('rear-pole', 4.98, -4.80, LEVEL.road); cylinder(0.073, 5.4, 0, 2.7, 0, '#546e71', rearPole);
box(0.78, 0.07, 0.11, 0, 5.23, 0, '#718d83', rearPole);
// A small stop sign and street-name plate have an actual front face.
const stop = standingProp('stop-sign', -5.28, 1.59, LEVEL.road);
cylinder(0.035, 1.98, 0, 0.99, 0, '#9bafa1', stop);
const tri = new THREE.Shape(); tri.moveTo(-0.32, 0.22); tri.lineTo(0.32, 0.22); tri.lineTo(0, -0.33); tri.closePath();
mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.03, bevelEnabled: false }), '#b56a62', [0, 1.84, 0], stop, { edge: true });
plaque('止まれ', 0.41, 0.13, 0, 1.86, 0.035, '#b56a62', '#f1dfb8', stop);
plaque('雨宿町  2丁目', 0.75, 0.19, 0, 1.36, 0.046, '#395d67', '#d6ddc0', stop);
// Distant traffic light, intentionally small and dim.
const traffic = standingProp('traffic-signal', 5.3, -3.92, LEVEL.road);
cylinder(0.046, 2.57, 0, 1.285, 0, '#536e70', traffic);
box(0.31, 0.85, 0.27, 0, 2.45, 0, '#2f4c54', traffic, { edge: true });
const signalLenses = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.MeshStandardMaterial({ color: ['#b36c64', '#b6a469', '#6cb29d'][i], emissive: ['#e48475', '#d4b76a', '#7bd3b7'][i], emissiveIntensity: 0.1, roughness: 0.5 });
  const lens = mesh(new THREE.SphereGeometry(0.084, 12, 8), m, [0, 2.69 - i * 0.23, 0.146], traffic, { static: false, shadow: false });
  lens.scale.z = 0.4; signalLenses.push(lens);
  box(0.22, 0.026, 0.17, 0, 2.79 - i * 0.23, 0.2, '#3b595c', traffic);
}

// Soft light halos are world-space sprites; no screen overlays or controls.
const haloTexture = textureCanvas(128, 128, (ctx, W, H) => {
  const g = ctx.createRadialGradient(W / 2, H / 2, 1, W / 2, H / 2, W / 2);
  g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(0.16, 'rgba(255,255,255,.20)'); g.addColorStop(0.48, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
});
function halo(x, y, z, color, sx, sy, opacity) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(x, y, z); m.scale.set(sx, sy, 1); root.add(m); return m;
}
halo(4.27, 3.84, 1.69, '#f5ce8c', 1.7, 1.1, 0.28);
halo(-3.6, 1.6, 0.7, '#80d8c1', 1.2, 2.5, 0.13);
halo(0.1, 3.3, 0.62, '#b3dfbb', 6.4, 0.75, 0.10);

// Local rain streaks are clipped against the roof/canopy, and do not fall indoors.
const rainCount = 1050;
const rainPositions = new Float32Array(rainCount * 6);
const rainData = [];
function supportHeight(x, z) {
  if (x > -3.24 && x < 3.36 && z > -3.98 && z < 0.5) return 3.83;
  if (x > -3.38 && x < 3.49 && z > 0.15 && z < 1.14) return 2.85;
  if (x > -4.25 && x < 4.4 && z > -4.8 && z < 1.7) return LEVEL.pavement;
  return LEVEL.road;
}
for (let i = 0; i < rainCount; i++) rainData.push({ x: range(-5.85, 5.85), z: range(-5.85, 5.85), y: range(0, 7.2), speed: range(4.4, 6.7), length: range(0.075, 0.16) });
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#9db8c1', transparent: true, opacity: 0.20, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);
// Rain rings expand and fade rather than remaining as fixed circles.
const ripples = [];
const ringGeometry = new THREE.RingGeometry(0.94, 1.0, 32);
for (let i = 0; i < 48; i++) {
  let x = range(-5.65, 5.65), z = range(1.98, 5.65);
  if (i < 10) { x = range(-5.7, -4.45); z = range(-4.8, 1.0); }
  const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#a2c1bd', transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.044, z); scene.add(ring);
  ripples.push({ mesh: ring, phase: random(), speed: range(0.5, 0.85), size: range(0.1, 0.23) });
}
const drips = [];
for (let i = 0; i < 19; i++) {
  const drip = mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.075, 4), new THREE.MeshBasicMaterial({ color: '#c0d6ca', transparent: true, opacity: 0.45 }), [-3.22 + i * 0.35, range(0.4, 2.7), 1.10], root, { static: false, shadow: false });
  drips.push(drip);
}
// Glass trails belong to fixed window panes, not to empty space beside the door.
const trails = [];
for (let i = 0; i < 29; i++) {
  const side = i % 2, x = side ? range(1.32, 3.02) : range(-2.81, -1.04);
  const trail = mesh(new THREE.PlaneGeometry(0.006, range(0.06, 0.19)), new THREE.MeshBasicMaterial({ color: '#e0e2b7', transparent: true, opacity: range(0.12, 0.26), depthWrite: false }), [x, range(0.55, 2.59), 0.347], root, { static: false, shadow: false });
  trails.push(trail);
}

// Record support checks before batching; objects remain logically named for inspection.
scene.updateMatrixWorld(true);
const supportReport = grounded.map(({ name, group: g, surface }) => {
  const bounds = new THREE.Box3().setFromObject(g);
  return { name, surface, bottom: +bounds.min.y.toFixed(4), grounded: Math.abs(bounds.min.y - surface) < 0.015 };
});
// Merge static geometry by material/shadow state, keeping animation and glazing separate.
function batchStaticGeometry() {
  const buckets = new Map();
  for (const m of staticObjects) {
    m.updateWorldMatrix(true, false);
    const key = m.material.uuid + ':' + m.castShadow;
    if (!buckets.has(key)) buckets.set(key, { material: m.material, shadow: m.castShadow, geometries: [] });
    let geometry = m.geometry.clone().applyMatrix4(m.matrixWorld);
    if (geometry.index) geometry = geometry.toNonIndexed();
    for (const attr of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(attr)) geometry.deleteAttribute(attr);
    buckets.get(key).geometries.push(geometry);
  }
  const edgeGeometries = edgeObjects.map(e => { e.updateWorldMatrix(true, false); return e.geometry.clone().applyMatrix4(e.matrixWorld); });
  if (edgeGeometries.length) { const lines = new THREE.LineSegments(mergeGeometries(edgeGeometries), edgeMaterial); scene.add(lines); }
  edgeObjects.forEach(e => e.removeFromParent());
  staticObjects.forEach(m => m.removeFromParent());
  for (const bucket of buckets.values()) {
    const geometry = mergeGeometries(bucket.geometries);
    if (!geometry) throw new Error('Static geometry merge failed');
    const merged = new THREE.Mesh(geometry, bucket.material); merged.castShadow = bucket.shadow; merged.receiveShadow = true; scene.add(merged);
    bucket.geometries.forEach(g => g.dispose());
  }
  edgeGeometries.forEach(g => g.dispose());
}
batchStaticGeometry();

let previous = 0, started = null, elapsed = 0, frameCount = 0;
function animate(ms) {
  requestAnimationFrame(animate);
  const dt = Math.min((ms - previous) / 1000 || 0, 0.05); previous = ms; started ??= ms; elapsed = (ms - started) / 1000;
  const t = elapsed;
  rainData.forEach((drop, i) => {
    drop.y -= dt * drop.speed;
    const floor = supportHeight(drop.x, drop.z);
    if (drop.y < floor) drop.y = 7.1 + random() * 0.35;
    const o = i * 6;
    rainPositions.set([drop.x, drop.y, drop.z, drop.x - 0.025, drop.y + drop.length, drop.z - 0.01], o);
  });
  rainGeo.attributes.position.needsUpdate = true;
  ripples.forEach(({ mesh: m, phase, speed, size }) => {
    const p = (t * speed + phase) % 1; m.scale.setScalar(0.015 + p * size); m.material.opacity = Math.sin(p * Math.PI) * (1 - p) * 0.20;
  });
  drips.forEach((m, i) => { m.position.y -= dt * (1.7 + i % 4 * 0.28); if (m.position.y < 0.30) m.position.y = 2.69; });
  trails.forEach((m, i) => { m.position.y -= dt * (0.025 + i % 5 * 0.013); if (m.position.y < 0.51) m.position.y = 2.56; });
  // A short automatic-door cycle every 22 seconds, with a pause at full opening.
  const cycle = t % 22;
  let opening = 0;
  if (cycle > 9 && cycle < 10.6) opening = THREE.MathUtils.smoothstep(cycle, 9, 10.6);
  else if (cycle >= 10.6 && cycle < 13.4) opening = 1;
  else if (cycle >= 13.4 && cycle < 15.1) opening = 1 - THREE.MathUtils.smoothstep(cycle, 13.4, 15.1);
  doorPanels.forEach(({ group: g, x, direction }) => { g.position.x = x + direction * opening * 0.99; });
  const flicker = Math.sin(t * 1.7) * 0.009 + (t % 17 > 16.83 ? Math.sin(t * 85) * 0.045 : 0);
  sign.material.color.setScalar(1 + flicker); entranceLight.intensity = 10 + flicker * 9;
  const signal = Math.floor(t / 9) % 3;
  signalLenses.forEach((m, i) => { m.material.emissiveIntensity = i === signal ? 0.9 : 0.025; });
  road.material.uniforms.time.value = t;
  controls.update(); renderer.render(scene, camera); frameCount++;
}
requestAnimationFrame(animate);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const nextScale = Math.max(1, 1.15 / camera.aspect);
  camera.position.sub(controls.target).multiplyScalar(nextScale / framingScale).add(controls.target);
  framingScale = nextScale; controls.maxDistance = 29 * framingScale; controls.update();
  renderer.setSize(innerWidth, innerHeight);
});
// Read-only diagnostics let the browser smoke test verify the actual live scene.
window.__rainyCorner = {
  supportReport,
  get state() { return { frames: frameCount, time: elapsed, doorGap: doorPanels[1].group.position.x - doorPanels[0].group.position.x, camera: camera.position.toArray(), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
};
