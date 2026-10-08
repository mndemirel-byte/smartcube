// ===================== CUBE CORE (model + solver) =====================
// Orientation: D=white(bottom), U=yellow(top), F=green, B=blue, R=orange, L=red
const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const FACE_BASE = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
const SIDES = ['F', 'R', 'B', 'L'];
const RIGHT = { F: 'R', R: 'B', B: 'L', L: 'F' };
const LEFT = { F: 'L', L: 'B', B: 'R', R: 'F' };

function faceletGeom(index) {
  const f = FACES[Math.floor(index / 9)];
  const i = index % 9;
  const r = Math.floor(i / 3), c = i % 3;
  switch (f) {
    case 'U': return { pos: [-1 + c, 1, -1 + r], normal: [0, 1, 0] };
    case 'D': return { pos: [-1 + c, -1, 1 - r], normal: [0, -1, 0] };
    case 'F': return { pos: [-1 + c, 1 - r, 1], normal: [0, 0, 1] };
    case 'B': return { pos: [1 - c, 1 - r, -1], normal: [0, 0, -1] };
    case 'R': return { pos: [1, 1 - r, 1 - c], normal: [1, 0, 0] };
    case 'L': return { pos: [-1, 1 - r, -1 + c], normal: [-1, 0, 0] };
  }
}
function rotCW(axis, v) {
  const [x, y, z] = v;
  if (axis === 'x') return [x, z, -y];
  if (axis === 'y') return [-z, y, x];
  return [y, -x, z];
}
function rotCCW(axis, v) { return rotCW(axis, rotCW(axis, rotCW(axis, v))); }

const MOVE_DEF = {
  U: { axis: 'y', layer: ['y', 1], cw: true }, D: { axis: 'y', layer: ['y', -1], cw: false },
  R: { axis: 'x', layer: ['x', 1], cw: true }, L: { axis: 'x', layer: ['x', -1], cw: false },
  F: { axis: 'z', layer: ['z', 1], cw: true }, B: { axis: 'z', layer: ['z', -1], cw: false },
};
const geomIndex = {};
for (let i = 0; i < 54; i++) {
  const g = faceletGeom(i);
  geomIndex[g.pos.join(',') + '|' + g.normal.join(',')] = i;
}
const PERM = {};
for (const m of FACES) {
  const { axis, layer, cw } = MOVE_DEF[m];
  const axIdx = { x: 0, y: 1, z: 2 }[layer[0]];
  const perm = new Array(54);
  for (let i = 0; i < 54; i++) {
    const g = faceletGeom(i);
    if (g.pos[axIdx] !== layer[1]) { perm[i] = i; continue; }
    const rot = cw ? rotCW : rotCCW;
    const np = rot(axis, g.pos), nn = rot(axis, g.normal);
    perm[i] = geomIndex[np.join(',') + '|' + nn.join(',')];
  }
  PERM[m] = perm;
}
function solvedCube() {
  const s = new Array(54);
  for (const f of FACES) for (let i = 0; i < 9; i++) s[FACE_BASE[f] + i] = f;
  return s;
}
function applyMove(state, move) {
  const face = move[0];
  const times = move.length > 1 ? (move[1] === '2' ? 2 : 3) : 1;
  let s = state;
  for (let t = 0; t < times; t++) {
    const ns = new Array(54);
    const p = PERM[face];
    for (let i = 0; i < 54; i++) ns[p[i]] = s[i];
    s = ns;
  }
  return s;
}
function applyMoves(state, moves) { let s = state; for (const m of moves) s = applyMove(s, m); return s; }
function parseMoves(str) { return str.trim().split(/\s+/).filter(Boolean); }
function invertMoves(moves) {
  return moves.slice().reverse().map(m => m.length === 1 ? m + "'" : (m[1] === '2' ? m : m[0]));
}
function invertMove(m) { return m.length === 1 ? m + "'" : (m[1] === '2' ? m : m[0]); }
function randomScramble(n = 25) {
  const moves = []; let last = '';
  for (let i = 0; i < n; i++) {
    let f; do { f = FACES[Math.floor(Math.random() * 6)]; } while (f === last);
    last = f;
    moves.push(f + ['', "'", '2'][Math.floor(Math.random() * 3)]);
  }
  return moves;
}
function isSolved(state) {
  for (const f of FACES) {
    const b = FACE_BASE[f];
    for (let i = 0; i < 9; i++) if (state[b + i] !== state[b + 4]) return false;
  }
  return true;
}
function buildSlots() {
  const byPos = {};
  for (let i = 0; i < 54; i++) {
    const g = faceletGeom(i);
    (byPos[g.pos.join(',')] = byPos[g.pos.join(',')] || []).push(i);
  }
  const edges = [], corners = [];
  for (const key in byPos) {
    const arr = byPos[key];
    if (arr.length === 2) edges.push(arr);
    if (arr.length === 3) corners.push(arr);
  }
  return { edges, corners };
}
const SLOTS = buildSlots();
function faceOf(i) { return FACES[Math.floor(i / 9)]; }

function slotBetween(faces) {
  const set = new Set(faces);
  const pool = faces.length === 2 ? SLOTS.edges : SLOTS.corners;
  for (const slot of pool) {
    const fs = new Set(slot.map(faceOf));
    if (fs.size === set.size && [...set].every(f => fs.has(f))) return slot;
  }
  throw new Error('no slot');
}
function findPiece(state, colors) {
  const set = new Set(colors);
  const pool = colors.length === 2 ? SLOTS.edges : SLOTS.corners;
  for (const slot of pool) {
    const cs = new Set(slot.map(i => state[i]));
    if (cs.size === set.size && [...set].every(c => cs.has(c))) return slot;
  }
  throw new Error('piece not found');
}
function stickerIdx(slot, color, state) {
  for (const i of slot) if (state[i] === color) return i;
  throw new Error('sticker missing');
}

class Solver {
  constructor(state) { this.s = state.slice(); this.phases = []; this.cur = null; }
  phase(name) { this.cur = { name, moves: [] }; this.phases.push(this.cur); }
  do(moves) {
    if (typeof moves === 'string') moves = parseMoves(moves);
    for (const m of moves) { this.s = applyMove(this.s, m); this.cur.moves.push(m); }
  }
  crossEdgeSolved(f) {
    const slot = slotBetween(['D', f]);
    const iD = slot.find(i => faceOf(i) === 'D'), iF = slot.find(i => faceOf(i) === f);
    return this.s[iD] === 'D' && this.s[iF] === f;
  }
  solveCross() {
    this.phase('cross');
    for (const f of SIDES) {
      let guard = 0;
      while (!this.crossEdgeSolved(f)) {
        if (++guard > 12) throw new Error('cross stuck');
        const slot = findPiece(this.s, ['D', f]);
        const facesHere = slot.map(faceOf);
        const iWhite = stickerIdx(slot, 'D', this.s);
        const whiteFace = faceOf(iWhite);
        if (facesHere.includes('D')) {
          const g = facesHere.find(x => x !== 'D');
          if (whiteFace === 'D') this.do([g, g]); else this.do([g]);
          continue;
        }
        if (facesHere.includes('U')) {
          const g = facesHere.find(x => x !== 'U');
          if (whiteFace === 'U') {
            let k = 0, st = this.s;
            while (k < 4) {
              const sl = findPiece(st, ['D', f]);
              if (sl.map(faceOf).includes(f)) break;
              st = applyMove(st, 'U'); k++;
            }
            this.do(Array(k).fill('U')); this.do([f, f]);
          } else {
            const h = RIGHT[g];
            for (const hm of [h, h + "'"]) {
              const test = applyMoves(this.s, [g, hm]);
              const sl = findPiece(test, ['D', f]);
              const iw = stickerIdx(sl, 'D', test);
              if (sl.map(faceOf).includes('U') && faceOf(iw) === 'U') {
                this.do([g, hm, 'U', hm.endsWith("'") ? h : h + "'", g + "'"]);
                break;
              }
            }
          }
          continue;
        }
        const fo = facesHere.find(x => x !== whiteFace);
        for (const t of [fo, fo + "'"]) {
          const test = applyMove(this.s, t);
          const sl = findPiece(test, ['D', f]);
          if (sl.map(faceOf).includes('U')) {
            this.do([t, 'U', t.endsWith("'") ? fo : fo + "'"]);
            break;
          }
        }
      }
    }
  }
  cornerSolved(colors) {
    const slot = slotBetween(colors);
    return slot.every(i => this.s[i] === faceOf(i));
  }
  crossIntact() { return SIDES.every(f => this.crossEdgeSolved(f)); }
  solveCorners() {
    this.phase('corners');
    for (const x of SIDES) {
      const y = RIGHT[x];
      const colors = ['D', x, y];
      let guard = 0;
      while (!this.cornerSolved(colors)) {
        if (++guard > 40) throw new Error('corner stuck');
        const slot = findPiece(this.s, colors);
        const facesHere = slot.map(faceOf);
        if (facesHere.includes('D')) {
          const sides = facesHere.filter(a => a !== 'D');
          let done = false;
          for (const h of sides) {
            for (const seq of [[h, 'U', h + "'"], [h + "'", "U'", h]]) {
              const test = applyMoves(this.s, seq);
              const sl = findPiece(test, colors);
              const tmp = new Solver(test);
              if (sl.map(faceOf).includes('U') && tmp.crossIntact()) { this.do(seq); done = true; break; }
            }
            if (done) break;
          }
          if (!done) throw new Error('corner pop failed');
          continue;
        }
        let k = 0, st = this.s;
        while (k < 4) {
          const sl = findPiece(st, colors);
          const fs = sl.map(faceOf);
          if (fs.includes(x) && fs.includes(y)) break;
          st = applyMove(st, 'U'); k++;
        }
        this.do(Array(k).fill('U'));
        let tries = 0;
        while (!this.cornerSolved(colors)) {
          if (++tries > 6) throw new Error('sexy stuck');
          this.do([y, 'U', y + "'", "U'"]);
        }
      }
    }
  }
  edgeSolved(x, y) {
    const slot = slotBetween([x, y]);
    return slot.every(i => this.s[i] === faceOf(i));
  }
  rightInsert(x) { const y = RIGHT[x]; this.do(['U', y, "U'", y + "'", "U'", x + "'", 'U', x]); }
  leftInsert(x) { const z = LEFT[x]; this.do(["U'", z + "'", 'U', z, 'U', x, "U'", x + "'"]); }
  solveMiddle() {
    this.phase('middle');
    for (const x of SIDES) {
      const y = RIGHT[x];
      let guard = 0;
      while (!this.edgeSolved(x, y)) {
        if (++guard > 12) throw new Error('middle stuck');
        const slot = findPiece(this.s, [x, y]);
        const facesHere = slot.map(faceOf);
        if (!facesHere.includes('U')) {
          const a = facesHere[0], b = facesHere[1];
          this.rightInsert(RIGHT[a] === b ? a : b);
          continue;
        }
        const iS = slot.find(i => faceOf(i) !== 'U');
        const sideColor = this.s[iS];
        let k = 0, st = this.s;
        while (k < 4) {
          const sl = findPiece(st, [x, y]);
          const is2 = sl.find(i => faceOf(i) !== 'U');
          if (faceOf(is2) === sideColor) break;
          st = applyMove(st, 'U'); k++;
        }
        this.do(Array(k).fill('U'));
        const slot2 = findPiece(this.s, [x, y]);
        const topColor = this.s[slot2.find(i => faceOf(i) === 'U')];
        if (RIGHT[sideColor] === topColor) this.rightInsert(sideColor);
        else this.leftInsert(sideColor);
      }
    }
  }
  uEdgeUp(f, state) {
    const st = state || this.s;
    const slot = slotBetween(['U', f]);
    return st[slot.find(i => faceOf(i) === 'U')] === 'U';
  }
  solveYellowCross() {
    this.phase('yellowCross');
    const A = "F R U R' U' F'";
    let guard = 0;
    while (!SIDES.every(f => this.uEdgeUp(f))) {
      if (++guard > 10) throw new Error('ycross stuck');
      const up = SIDES.filter(f => this.uEdgeUp(f));
      if (up.length === 0) { this.do(A); continue; }
      if (up.length === 2) {
        const [a, b] = up;
        const opposite = RIGHT[RIGHT[a]] === b;
        let k = 0, st = this.s;
        const goalOK = (state) => {
          const upNow = SIDES.filter(f => this.uEdgeUp(f, state));
          return opposite ? (upNow.includes('L') && upNow.includes('R'))
            : (upNow.includes('B') && upNow.includes('L'));
        };
        while (k < 4 && !goalOK(st)) { st = applyMove(st, 'U'); k++; }
        this.do(Array(k).fill('U'));
        this.do(A);
      }
    }
  }
  uEdgesPositioned(state) {
    return SIDES.every(f => {
      const slot = slotBetween(['U', f]);
      return slot.every(i => state[i] === faceOf(i));
    });
  }
  solveYellowEdges() {
    this.phase('yellowEdges');
    const E = parseMoves("R U R' U R U2 R'");
    const seen = new Set();
    let frontier = [{ state: this.s, path: [] }];
    for (let depth = 0; depth <= 5; depth++) {
      for (const node of frontier) {
        for (let k = 0; k < 4; k++) {
          const st = applyMoves(node.state, Array(k).fill('U'));
          if (this.uEdgesPositioned(st)) { this.do(node.path.concat(Array(k).fill('U'))); return; }
        }
      }
      const next = [];
      for (const node of frontier) {
        for (let k = 0; k < 4; k++) {
          const pre = Array(k).fill('U');
          const st = applyMoves(node.state, pre.concat(E));
          const key = st.join('');
          if (!seen.has(key)) { seen.add(key); next.push({ state: st, path: node.path.concat(pre, E) }); }
        }
      }
      frontier = next;
    }
    throw new Error('yedges stuck');
  }
  uCornersPositioned(state) {
    for (const x of SIDES) {
      const slot = slotBetween(['U', x, RIGHT[x]]);
      const colors = new Set(slot.map(i => state[i]));
      if (!['U', x, RIGHT[x]].every(c => colors.has(c))) return false;
    }
    return true;
  }
  solveYellowCornerPos() {
    this.phase('yellowCornerPos');
    const N = parseMoves("U R U' L' U R' U' L");
    const seen = new Set();
    let frontier = [{ state: this.s, path: [] }];
    for (let depth = 0; depth <= 4; depth++) {
      for (const node of frontier) {
        if (this.uCornersPositioned(node.state)) { this.do(node.path); return; }
      }
      const next = [];
      for (const node of frontier) {
        for (let k = 0; k < 4; k++) {
          const pre = Array(k).fill('U');
          const post = Array((4 - k) % 4).fill('U');
          const seq = pre.concat(N, post);
          const st = applyMoves(node.state, seq);
          const key = st.join('');
          if (!seen.has(key)) { seen.add(key); next.push({ state: st, path: node.path.concat(seq) }); }
        }
      }
      frontier = next;
    }
    throw new Error('ycorner pos stuck');
  }
  solveYellowCornerOrient() {
    this.phase('yellowCornerOrient');
    const ufr = slotBetween(['U', 'F', 'R']);
    const iTop = ufr.find(i => faceOf(i) === 'U');
    let guard = 0;
    const needsWork = () => {
      for (const x of SIDES) {
        const slot = slotBetween(['U', x, RIGHT[x]]);
        if (this.s[slot.find(i => faceOf(i) === 'U')] !== 'U') return true;
      }
      return false;
    };
    while (needsWork()) {
      if (++guard > 40) throw new Error('orient stuck');
      let inner = 0;
      while (this.s[iTop] !== 'U') {
        if (++inner > 8) throw new Error('twist stuck');
        this.do("R' D' R D");
      }
      if (needsWork()) this.do(['U']);
    }
    for (let k = 0; k < 4; k++) { if (isSolved(this.s)) break; this.do(['U']); }
    if (!isSolved(this.s)) throw new Error('align failed');
  }
  solve() {
    this.solveCross(); this.solveCorners(); this.solveMiddle();
    this.solveYellowCross(); this.solveYellowEdges();
    this.solveYellowCornerPos(); this.solveYellowCornerOrient();
    return this.phases;
  }
}
function simplifyMoves(moves) {
  const out = [];
  const val = m => (m.length === 1 ? 1 : m[1] === '2' ? 2 : 3);
  for (const m of moves) {
    if (out.length && out[out.length - 1][0] === m[0]) {
      const total = (val(out.pop()) + val(m)) % 4;
      if (total === 1) out.push(m[0]);
      else if (total === 2) out.push(m[0] + '2');
      else if (total === 3) out.push(m[0] + "'");
    } else out.push(m);
  }
  return out;
}
function solveCube(state) {
  const solver = new Solver(state);
  const phases = solver.solve();
  return phases.map(p => ({ name: p.name, moves: simplifyMoves(p.moves) })).filter(p => p.moves.length > 0);
}
// Validation for manually painted cubes. Returns null if ok, Turkish error string otherwise.
function validateCube(state) {
  if (state.some(c => !c)) return 'Tüm kareler boyanmalı. Gri kalan kare bırakmayın.';
  const counts = {};
  for (const c of state) counts[c] = (counts[c] || 0) + 1;
  for (const f of FACES) {
    if ((counts[f] || 0) !== 9) return 'Her renkten tam 9 kare olmalı. Renk sayılarını kontrol edin.';
  }
  const solved = solvedCube();
  const legalKey = slot => slot.map(i => solved[i]).sort().join('');
  const legalEdges = new Set(SLOTS.edges.map(legalKey));
  const legalCorners = new Set(SLOTS.corners.map(legalKey));
  const seenE = new Set(), seenC = new Set();
  for (const slot of SLOTS.edges) {
    const key = slot.map(i => state[i]).sort().join('');
    if (!legalEdges.has(key) || seenE.has(key)) return 'Geçersiz ya da tekrarlanan kenar parçası var. (Örn. beyaz-sarı kenar olamaz.)';
    seenE.add(key);
  }
  for (const slot of SLOTS.corners) {
    const key = slot.map(i => state[i]).sort().join('');
    if (!legalCorners.has(key) || seenC.has(key)) return 'Geçersiz ya da tekrarlanan köşe parçası var. Köşe renklerini kontrol edin.';
    seenC.add(key);
  }
  try { solveCube(state); } catch (e) {
    return 'Bu dizilim fiziksel olarak çözülemez. Bir parça yanlış yöne boyanmış olabilir.';
  }
  return null;
}
// ===================== END CUBE CORE =====================

export {
  FACES, FACE_BASE, SIDES, RIGHT, LEFT, faceletGeom, solvedCube,
  applyMove, applyMoves, parseMoves, invertMoves, invertMove,
  randomScramble, isSolved, SLOTS, faceOf,
  solveCube, validateCube, simplifyMoves,
};
