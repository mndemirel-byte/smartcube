import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACES, SLOTS, solvedCube, applyMove, applyMoves, invertMoves,
  randomScramble, isSolved, solveCube, validateCube, parseMoves,
} from '../src/core/engine.js';

const faceOf = i => FACES[Math.floor(i / 9)];

test('hamle motoru: her yüz 4 kez dönünce kimlik', () => {
  const s = solvedCube();
  for (const f of FACES) {
    let t = s;
    for (let i = 0; i < 4; i++) t = applyMove(t, f);
    assert.deepEqual(t, s, `${f}4 kimlik olmalı`);
  }
});

test("hamle motoru: sexy move (R U R' U') 6 tekrarda kimlik", () => {
  const s = solvedCube();
  let t = s;
  for (let i = 0; i < 6; i++) t = applyMoves(t, parseMoves("R U R' U'"));
  assert.deepEqual(t, s);
});

test('hamle motoru: karıştır + tersi = çözülmüş', () => {
  for (let i = 0; i < 20; i++) {
    const scr = randomScramble(30);
    const t = applyMoves(applyMoves(solvedCube(), scr), invertMoves(scr));
    assert.ok(isSolved(t));
  }
});

test('çözücü: 200 rastgele karıştırmanın tamamı çözülür', () => {
  for (let i = 0; i < 200; i++) {
    const state = applyMoves(solvedCube(), randomScramble(30));
    const phases = solveCube(state);
    const end = applyMoves(state, phases.flatMap(p => p.moves));
    assert.ok(isSolved(end), `karıştırma ${i} çözülemedi`);
  }
});

test('çözücü: çözülmüş küp için boş çözüm', () => {
  assert.equal(solveCube(solvedCube()).length, 0);
});

test('doğrulama: geçerli küp null döner', () => {
  const state = applyMoves(solvedCube(), randomScramble(25));
  assert.equal(validateCube(state), null);
});

test('doğrulama: boş kare yakalanır', () => {
  const s = solvedCube(); s[3] = null;
  assert.match(validateCube(s), /boyanmalı/);
});

test('doğrulama: ters çevrilmiş kenar (parite) yakalanır', () => {
  const state = applyMoves(solvedCube(), randomScramble(20));
  const slot = SLOTS.edges.find(sl => sl.every(i => ['U', 'F'].includes(faceOf(i))));
  const [a, b] = slot;
  [state[a], state[b]] = [state[b], state[a]];
  assert.ok(validateCube(state) !== null);
});

test('doğrulama: burulmuş köşe (parite) yakalanır', () => {
  const state = applyMoves(solvedCube(), randomScramble(20));
  const slot = SLOTS.corners.find(sl => {
    const fs = sl.map(faceOf);
    return fs.includes('U') && fs.includes('F') && fs.includes('R');
  });
  const [a, b, c] = slot;
  const t = state[a]; state[a] = state[b]; state[b] = state[c]; state[c] = t;
  assert.ok(validateCube(state) !== null);
});

test('doğrulama: geçersiz parça (beyaz-sarı kenar) yakalanır', () => {
  const s = solvedCube();
  s[0] = 'D'; s[27] = 'U'; // U yüzüne beyaz, D yüzüne sarı boya
  assert.ok(validateCube(s) !== null);
});
