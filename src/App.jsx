import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FACES, FACE_BASE, solvedCube, applyMoves, parseMoves, invertMoves,
  invertMove, randomScramble, isSolved, solveCube, validateCube,
} from './core/engine.js';
import {
  COLORS, COLOR_NAMES, FACE_LABELS, EMPTY_COLOR, PHASE_META, PHASE_ORDER,
  NET_GRID, NOTATION_MOVES, ALGS, LEARN_STEPS,
} from './data/content.js';
import CubeViewer from './components/CubeViewer.jsx';
import MoveChip from './components/MoveChip.jsx';

export default function App() {
  const viewerRef = useRef(null);
  const [tab, setTab] = useState('scan');
  const [paint, setPaint] = useState(() => solvedCube());
  const [selColor, setSelColor] = useState('U');
  const [error, setError] = useState(null);
  const [solution, setSolution] = useState(null); // {startState, phases, flat:[{move, phase}]}
  const [playIdx, setPlayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quiz, setQuiz] = useState(null); // {answer, options, picked, score, total}
  const [trainer, setTrainer] = useState({ alg: 0, pos: 0, reps: 0 });
  const busyRef = useRef(false);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const [viewerState, setViewerState] = useState(() => solvedCube());
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const dur = () => 300 / speedRef.current;
  const setCube = s => { setViewerState(s); };

  // keep viewer in sync with tab context
  useEffect(() => {
    playingRef.current = false; setPlaying(false);
    if (tab === 'scan') setCube(paint.slice());
    else if (tab === 'solve' && solution) setCube(applyMoves(solution.startState, solution.flat.slice(0, playIdx).map(f => f.move)));
    else if (tab === 'learn' || tab === 'drill') setCube(solvedCube());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ----- scan -----
  const paintCell = i => {
    if (i % 9 === 4) return; // merkezler sabit
    const np = paint.slice(); np[i] = selColor;
    setPaint(np); setError(null);
    setCube(np.slice());
  };
  const doScramble = () => {
    const st = applyMoves(solvedCube(), randomScramble(25));
    setPaint(st); setError(null); setCube(st.slice());
  };
  const doReset = () => { const s = solvedCube(); setPaint(s); setError(null); setCube(s.slice()); };
  const doClear = () => {
    const s = solvedCube().map((c, i) => (i % 9 === 4 ? c : null));
    setPaint(s); setError(null); setCube(s.slice());
  };
  const computeSolution = () => {
    const err = validateCube(paint);
    if (err) { setError(err); return; }
    if (isSolved(paint)) { setError('Bu küp zaten çözülmüş! Önce "Karıştır" ile deneyebilirsiniz.'); return; }
    const phases = solveCube(paint);
    const flat = [];
    phases.forEach((p, pi) => p.moves.forEach(m => flat.push({ move: m, phase: pi })));
    setSolution({ startState: paint.slice(), phases, flat });
    setPlayIdx(0);
    setTab('solve');
  };

  // ----- player -----
  const stepForward = useCallback(async () => {
    if (!solution || busyRef.current) return false;
    const i = playIdxRefGet();
    if (i >= solution.flat.length) return false;
    busyRef.current = true;
    await viewerRef.current.animateMove(solution.flat[i].move, dur());
    setPlayIdx(v => v + 1);
    busyRef.current = false;
    return true;
  }, [solution]);
  const playIdxRef = useRef(0);
  useEffect(() => { playIdxRef.current = playIdx; }, [playIdx]);
  const playIdxRefGet = () => playIdxRef.current;

  const stepBack = async () => {
    if (!solution || busyRef.current || playIdxRef.current === 0) return;
    busyRef.current = true;
    const mv = solution.flat[playIdxRef.current - 1].move;
    await viewerRef.current.animateMove(invertMove(mv), dur());
    setPlayIdx(v => v - 1);
    busyRef.current = false;
  };
  const togglePlay = async () => {
    if (playingRef.current) { playingRef.current = false; setPlaying(false); return; }
    if (!solution || playIdxRef.current >= solution.flat.length) return;
    playingRef.current = true; setPlaying(true);
    while (playingRef.current) {
      const ok = await stepForward();
      if (!ok) break;
      await new Promise(r => setTimeout(r, 90 / speedRef.current));
    }
    playingRef.current = false; setPlaying(false);
  };
  const restart = () => {
    playingRef.current = false; setPlaying(false);
    if (!solution) return;
    setPlayIdx(0);
    setCube(solution.startState.slice());
  };

  // ----- learn -----
  const playAlgDemo = async algStr => {
    if (busyRef.current) return;
    busyRef.current = true;
    const moves = parseMoves(algStr);
    const start = applyMoves(solvedCube(), invertMoves(moves));
    viewerRef.current.setCube(start);
    await new Promise(r => setTimeout(r, 350));
    for (const m of moves) await viewerRef.current.animateMove(m, 340);
    busyRef.current = false;
  };
  const notate = async mv => {
    if (busyRef.current) return;
    busyRef.current = true;
    await viewerRef.current.animateMove(mv, 320);
    busyRef.current = false;
  };

  // ----- drill: quiz -----
  const newQuestion = async () => {
    if (busyRef.current) return;
    const answer = NOTATION_MOVES[Math.floor(Math.random() * NOTATION_MOVES.length)];
    const opts = new Set([answer]);
    while (opts.size < 4) opts.add(NOTATION_MOVES[Math.floor(Math.random() * NOTATION_MOVES.length)]);
    const options = [...opts].sort(() => Math.random() - 0.5);
    setQuiz(q => ({ answer, options, picked: null, score: q ? q.score : 0, total: q ? q.total : 0 }));
    busyRef.current = true;
    viewerRef.current.setCube(solvedCube());
    await new Promise(r => setTimeout(r, 400));
    await viewerRef.current.animateMove(answer, 520);
    busyRef.current = false;
  };
  const pickAnswer = opt => {
    setQuiz(q => q && q.picked === null
      ? { ...q, picked: opt, score: q.score + (opt === q.answer ? 1 : 0), total: q.total + 1 }
      : q);
  };
  const replayQuestion = async () => {
    if (!quiz || busyRef.current) return;
    busyRef.current = true;
    viewerRef.current.setCube(solvedCube());
    await new Promise(r => setTimeout(r, 350));
    await viewerRef.current.animateMove(quiz.answer, 520);
    busyRef.current = false;
  };

  // ----- drill: trainer -----
  const trainerMoves = parseMoves(ALGS[trainer.alg].alg);
  const trainerStep = async fwd => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (fwd) {
      if (trainer.pos < trainerMoves.length) {
        await viewerRef.current.animateMove(trainerMoves[trainer.pos], 340);
        const done = trainer.pos + 1 === trainerMoves.length;
        setTrainer(t => ({ ...t, pos: t.pos + 1, reps: done ? t.reps + 1 : t.reps }));
      }
    } else if (trainer.pos > 0) {
      await viewerRef.current.animateMove(invertMove(trainerMoves[trainer.pos - 1]), 340);
      setTrainer(t => ({ ...t, pos: t.pos - 1 }));
    }
    busyRef.current = false;
  };
  const trainerReset = restartCube => {
    setTrainer(t => ({ ...t, pos: 0 }));
    if (restartCube) viewerRef.current.setCube(solvedCube());
  };
  const trainerPick = i => {
    setTrainer({ alg: i, pos: 0, reps: 0 });
    viewerRef.current.setCube(solvedCube());
  };

  // ----- derived -----
  const curPhase = solution && playIdx < solution.flat.length ? solution.flat[playIdx].phase : (solution ? solution.phases.length : 0);
  const curMove = solution && playIdx < solution.flat.length ? solution.flat[playIdx].move : null;
  const colorCounts = {};
  paint.forEach(c => { if (c) colorCounts[c] = (colorCounts[c] || 0) + 1; });

  const stageStatus = tab === 'scan'
    ? 'Küpü sürükleyerek çevirebilirsiniz'
    : tab === 'solve' && solution
      ? (playIdx >= solution.flat.length ? 'Küp çözüldü \u2713' : `Hamle ${playIdx + 1} / ${solution.flat.length} \u2014 ${PHASE_META[solution.phases[curPhase].name].t}`)
      : 'Küpü sürükleyerek çevirebilirsiniz';

  const solveState = solution
    ? applyMoves(solution.startState, solution.flat.slice(0, playIdx).map(f => f.move))
    : null;
  const renderNet = (state, onCell) => (
    <div className="net">
      {NET_GRID.map((row, ri) => (
        <div key={ri} className="net-row">
          {row.map((f, ci) => f ? (
            <div key={ci} className="net-face">
              <span className="net-label">{FACE_LABELS[f]}</span>
              <div className="net-grid">
                {Array.from({ length: 9 }, (_, i) => {
                  const idx = FACE_BASE[f] + i;
                  const c = state[idx];
                  return (
                    <button key={i}
                      className={'cell' + (i === 4 ? ' cell-center' : '')}
                      style={{ background: c ? COLORS[c] : EMPTY_COLOR, cursor: onCell ? undefined : 'default' }}
                      onClick={onCell ? () => onCell(idx) : undefined} />
                  );
                })}
              </div>
            </div>
          ) : <div key={ci} className="net-face net-empty" />)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo">
          <span className="logo-mark">
            <i style={{ background: COLORS.F }} /><i style={{ background: COLORS.U }} /><i style={{ background: COLORS.R }} />
            <i style={{ background: COLORS.B }} /><i style={{ background: COLORS.D }} /><i style={{ background: COLORS.L }} />
            <i style={{ background: COLORS.U }} /><i style={{ background: COLORS.F }} /><i style={{ background: COLORS.B }} />
          </span>
          <span className="logo-word">smartcube</span>
        </div>
        <nav className="tabs">
          {[['scan', 'Tara'], ['solve', 'Çözüm'], ['learn', 'Öğren'], ['drill', 'Egzersiz']].map(([k, label]) => (
            <button key={k} className={'tab' + (tab === k ? ' tab-on' : '')}
              disabled={k === 'solve' && !solution}
              onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
      </header>

      <main className="main">
        <section className="stage">
          <CubeViewer ref={viewerRef} state={viewerState} />
          {curMove && tab === 'solve' && (
            <div className="stage-move"><MoveChip move={curMove} big active /></div>
          )}
          <div className="stage-status">{stageStatus}</div>
        </section>

        <section className="panel">
          {tab === 'scan' && (
            <div className="pane">
              <h2>Küpünüzü girin</h2>
              <p className="lead">Elinizdeki küpü <b>beyaz yüz altta, yeşil yüz önde</b> olacak şekilde tutun ve renkleri aşağıdaki açılıma boyayın. Merkez kareler sabittir.</p>
              <div className="palette">
                {FACES.map(f => (
                  <button key={f} className={'swatch' + (selColor === f ? ' swatch-on' : '')}
                    style={{ background: COLORS[f] }} onClick={() => setSelColor(f)}
                    title={COLOR_NAMES[f]}>
                    <em>{colorCounts[f] || 0}</em>
                  </button>
                ))}
                <span className="palette-note">{COLOR_NAMES[selColor]} seçili</span>
              </div>
              {renderNet(paint, paintCell)}
              {error && <div className="error">{error}</div>}
              <div className="btn-row">
                <button className="btn" onClick={doScramble}>Karıştır</button>
                <button className="btn" onClick={doReset}>Sıfırla</button>
                <button className="btn" onClick={doClear}>Temizle</button>
                <button className="btn btn-primary" onClick={computeSolution}>Çözümü hesapla</button>
              </div>
              <div className="note">
                <b>Kamera taraması:</b> gerçek üründe bu ekran, telefon kamerasıyla her yüzü okuyup
                (getUserMedia + HSV renk analizi) açılımı otomatik doldurur. Bu prototipte renkleri elle
                boyayın ya da "Karıştır" ile örnek bir dizilim üretin.
              </div>
            </div>
          )}

          {tab === 'solve' && solution && (
            <div className="pane">
              <h2>Adım adım çözüm</h2>
              <div className="controls">
                <button className="btn" onClick={restart} title="Başa dön">{'|\u25C0'}</button>
                <button className="btn" onClick={stepBack} title="Geri">{'\u25C0'}</button>
                <button className="btn btn-primary btn-play" onClick={togglePlay}>
                  {playing ? 'Duraklat' : 'Oynat'}
                </button>
                <button className="btn" onClick={() => stepForward()} title="İleri">{'\u25B6'}</button>
                <div className="speed">
                  {[0.5, 1, 2].map(s => (
                    <button key={s} className={'btn btn-sm' + (speed === s ? ' btn-on' : '')}
                      onClick={() => setSpeed(s)}>{s}x</button>
                  ))}
                </div>
              </div>
              {renderNet(solveState)}
              <div className="progress">
                <div className="progress-bar" style={{ width: `${(playIdx / solution.flat.length) * 100}%` }} />
              </div>
              <div className="phases">
                {solution.phases.map((p, pi) => {
                  const meta = PHASE_META[p.name];
                  const stepNo = PHASE_ORDER.indexOf(p.name) + 1;
                  const active = pi === curPhase;
                  const done = pi < curPhase;
                  return (
                    <div key={pi} className={'phase' + (active ? ' phase-on' : '') + (done ? ' phase-done' : '')}>
                      <div className="phase-head">
                        <span className="phase-no">{done ? '\u2713' : stepNo}</span>
                        <span className="phase-title">{meta.t}</span>
                        <span className="phase-count">{p.moves.length} hamle</span>
                      </div>
                      {active && <p className="phase-desc">{meta.d}</p>}
                      {active && (
                        <div className="chips">
                          {p.moves.map((m, mi) => {
                            const flatIdx = solution.flat.findIndex(f => f.phase === pi) + mi;
                            return <MoveChip key={mi} move={m}
                              active={flatIdx === playIdx}
                              dim={flatIdx < playIdx} />;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {playIdx >= solution.flat.length && (
                  <div className="done-banner">Tebrikler, küp çözüldü! Yeni bir dizilim için Tara sekmesine dönün.</div>
                )}
              </div>
            </div>
          )}

          {tab === 'learn' && (
            <div className="pane">
              <h2>Hamle notasyonu</h2>
              <p className="lead">Her harf bir yüzü döndürür: <b>U</b>st, <b>D</b> alt, <b>R</b> sağ, <b>L</b> sol, <b>F</b> ön, <b>B</b> arka.
                Düz harf saat yönü, <b>{'\u2032'}</b> işareti saat yönünün tersi, <b>2</b> yarım turdur. Butonlara basıp küpte izleyin:</p>
              <div className="chips chips-btn">
                {NOTATION_MOVES.map(m => (
                  <button key={m} className="chip-wrap" onClick={() => notate(m)}>
                    <MoveChip move={m} />
                  </button>
                ))}
                <button className="btn btn-sm" onClick={() => viewerRef.current.setCube(solvedCube())}>Küpü sıfırla</button>
              </div>
              <h2 style={{ marginTop: 22 }}>Yöntem: 7 adımda çözüm</h2>
              <p className="lead">Katman katman (başlangıç) yöntemi. Her adımın algoritmasını küp üzerinde izleyin — gösterim, algoritmanın çözdüğü durumdan başlar ve çözülmüş hâlde biter.</p>
              <div className="learn-list">
                {LEARN_STEPS.map((s, i) => {
                  const meta = PHASE_META[s.key];
                  return (
                    <div key={s.key} className="learn-card">
                      <div className="phase-head">
                        <span className="phase-no">{i + 1}</span>
                        <span className="phase-title">{meta.t}</span>
                        {s.alg && (
                          <button className="btn btn-sm" onClick={() => playAlgDemo(s.alg)}>İzle</button>
                        )}
                      </div>
                      <p className="phase-desc">{s.tip}</p>
                      {s.alg && (
                        <div className="chips">
                          {parseMoves(s.alg).map((m, mi) => <MoveChip key={mi} move={m} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'drill' && (
            <div className="pane">
              <h2>Notasyon testi</h2>
              <p className="lead">Küpte bir hamle oynatılır; hangi hamle olduğunu bulun.</p>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={newQuestion}>
                  {quiz ? 'Yeni soru' : 'Testi başlat'}
                </button>
                {quiz && <button className="btn" onClick={replayQuestion}>Tekrar izle</button>}
                {quiz && <span className="score">Skor: {quiz.score} / {quiz.total}</span>}
              </div>
              {quiz && (
                <div className="quiz-opts">
                  {quiz.options.map(o => {
                    let cls = 'btn quiz-opt';
                    if (quiz.picked) {
                      if (o === quiz.answer) cls += ' quiz-right';
                      else if (o === quiz.picked) cls += ' quiz-wrong';
                    }
                    return (
                      <button key={o} className={cls} disabled={!!quiz.picked} onClick={() => pickAnswer(o)}>
                        {o.replace("'", '\u2032')}
                      </button>
                    );
                  })}
                </div>
              )}
              {quiz && quiz.picked && (
                <p className="quiz-fb">{quiz.picked === quiz.answer
                  ? 'Doğru! Bir sonraki soruya geçebilirsiniz.'
                  : `Doğru cevap ${quiz.answer.replace("'", '\u2032')} idi. "Tekrar izle" ile hamleyi yeniden inceleyin.`}</p>
              )}

              <h2 style={{ marginTop: 26 }}>Algoritma antrenmanı</h2>
              <p className="lead">Bir algoritma seçin, ok tuşlarıyla hamle hamle ilerleyin. Parmak hafızası tekrarla oluşur.</p>
              <div className="alg-picker">
                {ALGS.map((a, i) => (
                  <button key={a.name} className={'btn btn-sm' + (trainer.alg === i ? ' btn-on' : '')}
                    onClick={() => trainerPick(i)}>{a.name}</button>
                ))}
              </div>
              <p className="phase-desc">{ALGS[trainer.alg].use}</p>
              <div className="chips">
                {trainerMoves.map((m, mi) => (
                  <MoveChip key={mi} move={m} active={mi === trainer.pos} dim={mi < trainer.pos} />
                ))}
              </div>
              <div className="btn-row">
                <button className="btn" onClick={() => trainerStep(false)}>{'\u25C0 Geri'}</button>
                <button className="btn btn-primary" onClick={() => trainerStep(true)}
                  disabled={trainer.pos >= trainerMoves.length}>{'İleri \u25B6'}</button>
                <button className="btn" onClick={() => trainerReset(false)}>Baştan</button>
                <span className="score">Tur: {trainer.reps}</span>
              </div>
              {trainer.pos >= trainerMoves.length && (
                <p className="quiz-fb">Tur tamamlandı. "Baştan" ile aynı algoritmayı tekrar edin — küp kaldığı yerden devam eder, tıpkı gerçek antrenman gibi.</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
