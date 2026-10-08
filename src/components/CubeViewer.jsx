import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { faceletGeom, applyMove } from '../core/engine.js';
import { COLORS, EMPTY_COLOR } from '../data/content.js';

const MOVE3D = {
  U: { axis: 'y', layer: 1, dir: -1 }, D: { axis: 'y', layer: -1, dir: 1 },
  R: { axis: 'x', layer: 1, dir: -1 }, L: { axis: 'x', layer: -1, dir: 1 },
  F: { axis: 'z', layer: 1, dir: -1 }, B: { axis: 'z', layer: -1, dir: 1 },
};


function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);


const CubeViewer = forwardRef(function CubeViewer({ state }, ref) {
  const mountRef = useRef(null);
  const threeRef = useRef(null);
  const stateRef = useRef(state);
  const dragRef = useRef(null);

  const rebuild = useCallback(() => {
    const T = threeRef.current;
    if (!T) return;
    const { holder, matCache, bodyGeo, stickerGeo } = T;
    while (holder.children.length) {
      const c = holder.children[0];
      holder.remove(c);
    }
    const SP = 1.03;
    const getMat = (hex, rough) => {
      const key = hex + rough;
      if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.06 });
      return matCache[key];
    };
    // Çıkartmalar ışıksız çizilir: ekranda görünen renk, açılımdaki hex ile birebir aynı olur.
    const getFlat = hex => {
      const key = 'flat' + hex;
      if (!matCache[key]) {
        const c = new THREE.Color(hex);
        if (THREE.sRGBEncoding !== undefined && c.convertSRGBToLinear) c.convertSRGBToLinear();
        matCache[key] = new THREE.MeshBasicMaterial({ color: c });
      }
      return matCache[key];
    };
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const body = new THREE.Mesh(bodyGeo, getMat('#15171c', 0.5));
      body.position.set(x * SP, y * SP, z * SP);
      holder.add(body);
    }
    const st = stateRef.current;
    for (let i = 0; i < 54; i++) {
      const g = faceletGeom(i);
      const hex = st[i] ? COLORS[st[i]] : EMPTY_COLOR;
      const m = new THREE.Mesh(stickerGeo, getFlat(hex));
      const p = new THREE.Vector3(g.pos[0] * SP, g.pos[1] * SP, g.pos[2] * SP);
      const n = new THREE.Vector3(...g.normal);
      m.position.copy(p).add(n.clone().multiplyScalar(0.497));
      m.lookAt(m.position.clone().add(n));
      holder.add(m);
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(9.2, 7.0, 12.2);
    camera.lookAt(0, -1.3, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2c3038, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(5, 8, 6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-6, 3, -5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xbcd2ff, 0.25); rim.position.set(0, -5, 4); scene.add(rim);

    const group = new THREE.Group();     // orbit
    const holder = new THREE.Group();    // cubies
    group.add(holder);
    scene.add(group);
    group.rotation.set(0.02, -0.35, 0);

    threeRef.current = {
      scene, camera, renderer, group, holder,
      matCache: {}, bodyGeo: new THREE.BoxGeometry(0.985, 0.985, 0.985),
      stickerGeo: new THREE.ShapeGeometry(roundedRectShape(0.9, 0.9, 0.16)),
      raf: 0,
    };
    rebuild();

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const loop = () => {
      threeRef.current.raf = requestAnimationFrame(loop);
      renderer.render(scene, camera);
    };
    loop();

    const down = e => {
      dragRef.current = { x: e.clientX, y: e.clientY };
      mount.setPointerCapture && e.pointerId !== undefined && mount.setPointerCapture(e.pointerId);
    };
    const move = e => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      group.rotation.y += dx * 0.0085;
      group.rotation.x = Math.max(-1.1, Math.min(1.1, group.rotation.x + dy * 0.0075));
    };
    const up = () => { dragRef.current = null; };
    mount.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    return () => {
      cancelAnimationFrame(threeRef.current.raf);
      ro.disconnect();
      mount.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      Object.values(threeRef.current.matCache).forEach(m => m.dispose());
      threeRef.current.bodyGeo.dispose();
      threeRef.current.stickerGeo.dispose();
      renderer.dispose();
      mount.contains(renderer.domElement) && mount.removeChild(renderer.domElement);
      threeRef.current = null;
    };
  }, [rebuild]);

  useEffect(() => { stateRef.current = state; rebuild(); }, [state, rebuild]);

  useImperativeHandle(ref, () => ({
    setCube(s) { stateRef.current = s; rebuild(); },
    getState() { return stateRef.current; },
    animateMove(mv, dur = 300) {
      return new Promise(resolve => {
        const T = threeRef.current;
        if (!T) { resolve(); return; }
        const conf = MOVE3D[mv[0]];
        const quarter = mv.length > 1 ? (mv[1] === '2' ? 2 : -1) : 1;
        const angle = conf.dir * (Math.PI / 2) * quarter;
        const pivot = new THREE.Group();
        T.holder.add(pivot);
        const moving = T.holder.children.filter(c => c !== pivot && c.position[conf.axis] * conf.layer > 0.5);
        moving.forEach(c => pivot.attach(c));
        const total = dur * (quarter === 2 ? 1.45 : 1);
        const t0 = performance.now();
        const step = now => {
          const t = Math.min(1, (now - t0) / total);
          pivot.rotation[conf.axis] = angle * easeInOut(t);
          if (t < 1) requestAnimationFrame(step);
          else {
            stateRef.current = applyMove(stateRef.current, mv);
            rebuild();
            resolve();
          }
        };
        total <= 0 ? step(t0 + 1) : requestAnimationFrame(step);
      });
    },
  }), [rebuild]);

  return (
    <div className="stage-wrap">
      <div ref={mountRef} className="stage-canvas" />
      <div className="stage-shadow" />
    </div>
  );
});

export default CubeViewer;
