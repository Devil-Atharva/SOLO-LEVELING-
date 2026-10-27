"use client";
// Teaching visuals for the Phase 1 diagnostic questions (docs/07 §2):
// each draws the real quantities, replays the consequence of the student's own answer, and steps
// through the worked solution. Under reduced motion every change is instant and nothing autoplays.
import { useEffect, useRef, useState } from "react";
import type { Interval } from "@/src/questions/check";
import { fmt } from "@/src/questions/templates";
import type { Cue, VisualSpec } from "@/src/questions/types";

const has = (cue: Cue, tag: string) => cue.type === "student" && cue.tags.includes(tag);
const step = (cue: Cue) => (cue.type === "solution" ? cue.step : -1);

/** Flips to true one frame after `dep` changes, so CSS transitions can run from their start state. */
function useReveal(dep: unknown, reduced: boolean) {
  const [on, setOn] = useState(reduced);
  useEffect(() => {
    if (reduced) return setOn(true);
    setOn(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, [dep, reduced]);
  return on;
}

export function Visual({ spec, cue, reduced }: { spec: VisualSpec; cue: Cue; reduced: boolean }) {
  switch (spec.kind) {
    case "vt-graph": return <VtGraph {...spec} cue={cue} reduced={reduced} />;
    case "braking": return <Braking {...spec} cue={cue} reduced={reduced} />;
    case "circuit": return <Circuit {...spec} cue={cue} reduced={reduced} />;
    case "venn": return <Venn {...spec} cue={cue} reduced={reduced} />;
    case "number-line": return <NumberLine {...spec} cue={cue} reduced={reduced} />;
    case "vector-grid": return <VectorGrid {...spec} cue={cue} reduced={reduced} />;
    case "box-diagonal": return <BoxDiagonal {...spec} cue={cue} reduced={reduced} />;
  }
}

/** Plain-language description of what the visual currently shows (live region + static equivalent). */
export function visualCaption(spec: VisualSpec, cue: Cue): string {
  const s = step(cue);
  switch (spec.kind) {
    case "vt-graph":
      if (has(cue, "area-uses-final-velocity")) return "Your answer is the whole rectangle up to the final speed. The coral triangle above the line was counted but never travelled.";
      if (has(cue, "area-ignores-acceleration")) return "Your answer covers only the rectangle under the starting speed. The dashed triangle above it is missing.";
      if (has(cue, "area-misses-rectangle")) return "Your answer covers only the triangle. The dashed rectangle underneath is missing.";
      if (has(cue, "slope-instead-of-area")) return "Rise over run is the slope of the line, which is the acceleration. Distance is the area underneath.";
      if (s === 0) return "The shaded area under the line is the distance travelled.";
      if (s === 1) return "Rectangle under the starting speed.";
      if (s === 2) return "Triangle for the speed gained.";
      if (s >= 3) return "Rectangle plus triangle gives the total distance.";
      return `Velocity rises steadily from ${spec.u} m/s to ${spec.v} m/s over ${spec.t} s.`;
    case "braking":
      if (has(cue, "missing-half")) return "The dashed car keeps the starting speed and goes twice as far. The real car slows down, so it stops at half that distance.";
      if (cue.type === "student") return "The coral flag marks your answer; the car shows where it really stops.";
      return "Dots mark the car's position at equal time intervals. They bunch up as it slows down.";
    case "circuit":
      if (has(cue, "ignores-internal-resistance")) return "The internal resistance inside the cell is highlighted. It is in series with the resistor.";
      if (has(cue, "terminal-equals-emf")) return "Part of the emf is lost across the internal resistance before reaching the terminals.";
      if (has(cue, "drop-across-internal")) return "Ir is the drop inside the cell. The voltmeter reads the remaining part, IR.";
      return spec.showVoltmeter ? "The potential ladder shows the emf rising in the cell, then falling across r and across R." : "Current flows through the internal resistance and the external resistor in series.";
    case "venn":
      if (cue.type === "student") return "Orange elements in your answer are right; coral ones shouldn't be there; dashed rings are missing.";
      return "Each element sits in its region of the Venn diagram.";
    case "number-line":
      if (cue.type === "student") return "Your interval is drawn in coral above the correct one. A filled dot is included; a hollow dot is not.";
      if (s >= 1) return "Filled dot: endpoint included. Hollow dot: endpoint not included.";
      return "Number line with the endpoints from the condition.";
    case "vector-grid":
      if (has(cue, "cross-multiplied-components")) return "Coral lines show the pairing you used, x with y. The scalar product pairs x with x and y with y.";
      if (has(cue, "ignored-angle")) return "The angle between the vectors isn't zero, so the scalar product is less than the product of their lengths.";
      if (s >= 2) return "The dashed line drops from a onto b. The scalar product is |b| times this projection.";
      return "Vectors a and b on a grid, with their components.";
    case "box-diagonal":
      if (has(cue, "added-components")) return "Adding the components walks along the edges of the box, which is longer than the straight diagonal.";
      if (has(cue, "missed-k-component")) return "Your answer stops at the corner of the floor. The vector also rises by its k component.";
      if (s >= 1) return "Pythagoras across the floor, then up to the far corner.";
      return "The vector is the diagonal of a box with these side lengths.";
  }
}

// ---------------- v–t graph ----------------
function VtGraph({ u, v, t, cue, reduced }: { u: number; v: number; t: number; cue: Cue; reduced: boolean }) {
  const X0 = 64, Y0 = 268, W = 400, H = 216;
  const vmax = v * 1.15;
  const X = (tt: number) => X0 + (tt / t) * W, Y = (vel: number) => Y0 - (vel / vmax) * H;
  const s = step(cue);
  const on = useReveal(JSON.stringify(cue), reduced);
  const rect = `${X0},${Y0} ${X(t)},${Y0} ${X(t)},${Y(u)} ${X0},${Y(u)}`;
  const whole = `${X0},${Y0} ${X(t)},${Y0} ${X(t)},${Y(v)} ${X0},${Y(u)}`;
  const tri = `${X0},${Y(u)} ${X(t)},${Y(u)} ${X(t)},${Y(v)}`;
  const sweepW = on ? W : 0;
  const student = cue.type === "student";
  const showWhole = s === 0 || s >= 3 || (student && !cue.tags.length);
  return (
    <svg viewBox="0 0 520 320" role="img" aria-label="Velocity–time graph">
      <defs>
        <clipPath id="vt-sweep"><rect className="v-anim" x={X0} y={0} width={sweepW} height={320} style={{ transition: reduced ? "none" : "width 900ms cubic-bezier(.3,0,0,1)" }} /></clipPath>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} className="v-grid" x1={X0} x2={X0 + W} y1={Y0 - f * H} y2={Y0 - f * H} />)}
      {showWhole && <polygon className="v-fill" points={whole} clipPath="url(#vt-sweep)" />}
      {(s === 1 || s === 2) && <polygon className="v-fill-amber" points={rect} />}
      {s === 2 && <polygon className="v-fill" points={tri} />}
      {has(cue, "area-uses-final-velocity") && (
        <>
          <polygon className="v-fill" points={whole} opacity={0.6} />
          <rect className="v-bad" x={X0} y={Y(v)} width={W} height={Y0 - Y(v)} fill="none" />
          <polygon className="v-bad" points={`${X0},${Y(u)} ${X0},${Y(v)} ${X(t)},${Y(v)}`} style={{ opacity: on ? 1 : 0 }} />
          <text className="v-label-bad" x={X0 + 10} y={Y(v) + 22}>counted, never travelled</text>
        </>
      )}
      {has(cue, "area-ignores-acceleration") && (
        <>
          <polygon className="v-fill-amber" points={rect} />
          <polygon className="v-bad" points={tri} style={{ opacity: on ? 1 : 0 }} />
          <text className="v-label-bad" x={X(t) - 120} y={Y(v) + 40}>missing</text>
        </>
      )}
      {has(cue, "area-misses-rectangle") && (
        <>
          <polygon className="v-fill" points={tri} />
          <polygon className="v-bad" points={rect} style={{ opacity: on ? 1 : 0 }} />
          <text className="v-label-bad" x={X0 + 12} y={Y0 - 12}>missing</text>
        </>
      )}
      {has(cue, "slope-instead-of-area") && (
        <>
          <path className="v-bad-line" d={`M ${X0} ${Y(u)} H ${X(t)} V ${Y(v)}`} />
          <text className="v-label-bad" x={(X0 + X(t)) / 2 - 30} y={Y(u) + 18}>run = {t} s</text>
          <text className="v-label-bad" x={X(t) + 6} y={(Y(u) + Y(v)) / 2}>rise</text>
        </>
      )}
      <line className="v-axis" x1={X0} y1={Y0} x2={X0 + W + 12} y2={Y0} />
      <line className="v-axis" x1={X0} y1={Y0} x2={X0} y2={Y0 - H - 12} />
      <line className="v-line" x1={X0} y1={Y(u)} x2={X(t)} y2={Y(v)} />
      <text className="v-text" x={X0 + W + 14} y={Y0 + 4}>t (s)</text>
      <text className="v-text" x={X0 - 4} y={Y0 - H - 18} textAnchor="middle">v (m/s)</text>
      <text className="v-text" x={X0 - 8} y={Y(u) + 4} textAnchor="end">{u}</text>
      <text className="v-text" x={X0 - 8} y={Y(v) + 4} textAnchor="end">{v}</text>
      <text className="v-text" x={X(t)} y={Y0 + 18} textAnchor="middle">{t}</text>
      <text className="v-text" x={X0} y={Y0 + 18} textAnchor="middle">0</text>
      {s === 1 && <text className="v-label-good" x={X0 + 12} y={Y0 - 12}>u × t = {fmt(u * t)} m</text>}
      {s === 2 && <text className="v-label-good" x={X(t) - 150} y={Y(u) - 12}>½(v − u)t = {fmt(((v - u) * t) / 2)} m</text>}
      {s >= 3 && <text className="v-label-good" x={X0 + 12} y={Y0 - 12}>area = {fmt(((u + v) / 2) * t)} m</text>}
      {cue.type === "student" && typeof cue.value === "number" && <text className="v-label-bad" x={X0 + W} y={30} textAnchor="end">your answer: {fmt(cue.value)} m</text>}
    </svg>
  );
}

// ---------------- braking car (scrubbable simulation) ----------------
function Braking({ u, a, cue, reduced }: { u: number; a: number; cue: Cue; reduced: boolean }) {
  const T = u / a, S = (u * u) / (2 * a);
  const studentS = cue.type === "student" && typeof cue.value === "number" && cue.value > 0 && cue.value < 5 * S ? cue.value : null;
  const ghost = has(cue, "missing-half");
  const Smax = Math.max(S * 1.12, ghost ? u * T * 1.05 : 0, studentS ? studentS * 1.08 : 0);
  const X = (d: number) => 40 + (d / Smax) * 440;
  const [tau, setTau] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const pos = (tt: number) => u * tt - 0.5 * a * tt * tt;
  const play = () => {
    if (reduced) { setTau(T); return; }
    setPlaying(true);
    const start = performance.now() - (tau >= T ? 0 : (tau / T) * 3000);
    if (tau >= T) setTau(0);
    const tick = (now: number) => {
      const f = Math.min(1, (now - start) / 3000);
      setTau(f * T);
      if (f < 1) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const pause = () => { if (raf.current) cancelAnimationFrame(raf.current); setPlaying(false); };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  // replay automatically when a new consequence or solution step arrives (not under reduced motion)
  useEffect(() => {
    if (cue.type === "idle") return;
    pause();
    setTau(0);
    if (!reduced) { const id = window.setTimeout(play, 60); return () => window.clearTimeout(id); }
    setTau(T);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cue)]);
  const dots = Array.from({ length: 7 }, (_, k) => (k * T) / 6).filter((tk) => tk <= tau + 1e-9);
  const s = step(cue);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <svg viewBox="0 0 520 220" role="img" aria-label="Car braking along a road">
        <line className="v-axis" x1={30} y1={150} x2={496} y2={150} />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line className="v-grid" x1={X(f * Smax)} x2={X(f * Smax)} y1={146} y2={156} />
            <text className="v-text" x={X(f * Smax)} y={174} textAnchor="middle">{fmt(f * Smax, 2)}</text>
          </g>
        ))}
        <text className="v-text" x={496} y={196} textAnchor="end">distance (m)</text>
        {dots.map((tk, i) => <circle key={i} cx={X(pos(tk))} cy={138} r={4} fill="var(--accent-amber)" />)}
        {ghost && <rect x={X(Math.min(u * tau, Smax)) - 18} y={98} width={36} height={22} rx={6} fill="none" stroke="var(--accent-coral)" strokeDasharray="5 4" strokeWidth={2} />}
        {ghost && <text className="v-label-bad" x={X(Math.min(u * tau, Smax))} y={90} textAnchor="middle">at {u} m/s throughout</text>}
        <g transform={`translate(${X(pos(Math.min(tau, T)))} 0)`}>
          <rect x={-20} y={104} width={40} height={20} rx={6} fill="var(--accent-orange)" />
          <circle cx={-11} cy={126} r={5} fill="#222" stroke="var(--border-strong)" />
          <circle cx={11} cy={126} r={5} fill="#222" stroke="var(--border-strong)" />
        </g>
        {(tau >= T - 1e-9 || s >= 2) && (
          <g>
            <line x1={X(S)} x2={X(S)} y1={60} y2={150} stroke="var(--accent-amber)" strokeWidth={2} />
            <text className="v-label-good" x={X(S)} y={52} textAnchor="middle">stops at {fmt(S)} m</text>
          </g>
        )}
        {studentS !== null && (
          <g>
            <line x1={X(studentS)} x2={X(studentS)} y1={34} y2={150} stroke="var(--accent-coral)" strokeWidth={2} strokeDasharray="5 4" />
            <text className="v-label-bad" x={X(studentS)} y={26} textAnchor="middle">your answer {fmt(studentS)} m</text>
          </g>
        )}
        <text className="v-text" x={36} y={30}>t = {tau.toFixed(2)} s of {fmt(T)} s · speed {fmt(Math.max(0, u - a * tau))} m/s</text>
      </svg>
      <div className="transport" role="group" aria-label="Braking simulation controls">
        {playing ? <button className="btn" onClick={pause}>Pause</button> : <button className="btn" onClick={play}>{tau >= T ? "Replay" : "Play"}</button>}
        <button className="btn btn--quiet" onClick={() => { pause(); setTau(0); }}>Reset</button>
        <button className="btn btn--quiet" onClick={() => { pause(); setTau((x) => Math.min(T, x + T / 6)); }}>Step</button>
        <label className="sr-only" htmlFor="brake-scrub">Time since braking began</label>
        <input id="brake-scrub" type="range" min={0} max={T} step={T / 120} value={tau} onChange={(e) => { pause(); setTau(Number(e.target.value)); }} aria-valuetext={`${tau.toFixed(2)} seconds, ${fmt(pos(tau))} metres`} />
      </div>
    </div>
  );
}

// ---------------- circuit with internal resistance ----------------
function Circuit({ E, r, R, showVoltmeter, cue, reduced }: { E: number; r: number; R: number; showVoltmeter: boolean; cue: Cue; reduced: boolean }) {
  const I = E / (R + r);
  const s = step(cue);
  const on = useReveal(JSON.stringify(cue), reduced);
  const hotR_int = has(cue, "ignores-internal-resistance") || has(cue, "terminal-equals-emf") || s === 0 || (showVoltmeter && s === 1);
  const hotR_ext = has(cue, "only-internal-resistance") || has(cue, "drop-across-internal") || s === 0 || (showVoltmeter && s === 2);
  const done = cue.type === "solution" || cue.type === "student";
  const reading = cue.type === "student" && typeof cue.value === "number" ? cue.value : null;
  const ox = showVoltmeter ? 0 : 70;
  const loop = `M ${ox + 70} 70 H ${ox + 300} V 250 H ${ox + 70} Z`;
  const zig = (x: number, y: number, w: number) => `M ${x} ${y} l ${w * 0.1} -9 l ${w * 0.2} 18 l ${w * 0.2} -18 l ${w * 0.2} 18 l ${w * 0.2} -18 l ${w * 0.1} 9`;
  // potential ladder (voltmeter variant): 0 → +E (cell) → −Ir (inside) → −IR (resistor) → 0
  const L = { x: 360, y: 270, h: 200, w: 140 };
  const VY = (pot: number) => L.y - (pot / E) * L.h;
  return (
    <svg viewBox="0 0 520 320" role="img" aria-label="Circuit with a cell, its internal resistance and an external resistor">
      <path d={loop} fill="none" stroke="var(--border-strong)" strokeWidth={2.5} />
      <path d={loop} fill="none" stroke="var(--accent-amber)" strokeWidth={5} strokeLinecap="round" strokeDasharray="0 22" className="current-dots"
        style={{ animation: reduced ? "none" : `dots-flow ${Math.max(0.5, 1.6 / I)}s linear infinite` }} />
      {/* external resistor on top */}
      <rect x={ox + 140} y={56} width={90} height={28} fill="var(--background)" />
      <path d={zig(ox + 140, 70, 90)} fill="none" stroke={hotR_ext ? "var(--accent-orange)" : "var(--text-primary)"} strokeWidth={hotR_ext ? 3.5 : 2.5} />
      <text className="v-strong" x={ox + 185} y={44} textAnchor="middle">R = {R} Ω</text>
      {/* cell box on the left side */}
      <rect x={ox + 30} y={110} width={80} height={110} rx={10} fill="var(--background)" stroke="var(--highlight-peach)" strokeDasharray="5 4" />
      <text className="v-text" x={ox + 70} y={104} textAnchor="middle">cell</text>
      <line x1={ox + 50} x2={ox + 90} y1={135} y2={135} stroke="var(--text-primary)" strokeWidth={3} />
      <line x1={ox + 58} x2={ox + 82} y1={145} y2={145} stroke="var(--text-primary)" strokeWidth={5} />
      <text className="v-strong" x={ox + 120} y={146}>E = {E} V</text>
      <g transform={`translate(${ox + 70} 168) rotate(90)`}>
        <path d={zig(0, 0, 40)} fill="none" stroke={hotR_int ? "var(--accent-coral)" : "var(--text-primary)"} strokeWidth={hotR_int ? 3.5 : 2.5}
          style={{ opacity: hotR_int && !on ? 0.3 : 1, transition: reduced ? "none" : "opacity 500ms" }} />
      </g>
      <text className={hotR_int ? "v-label-bad" : "v-text"} x={ox + 120} y={196}>r = {fmt(r)} Ω{hotR_int && cue.type === "student" ? "  ← in the loop too" : ""}</text>
      {/* ammeter on the right */}
      <circle cx={ox + 300} cy={160} r={22} fill="var(--surface)" stroke="var(--text-primary)" strokeWidth={2} />
      <text className="v-strong" x={ox + 300} y={165} textAnchor="middle">A</text>
      <text className="v-text" x={ox + 330} y={156}>{done && !showVoltmeter && cue.type === "solution" ? `I = ${fmt(I)} A` : "I = ?"}</text>
      {reading !== null && !showVoltmeter && <text className="v-label-bad" x={ox + 330} y={176}>yours: {fmt(reading)} A</text>}
      {s === 0 && <text className="v-label-good" x={ox + 185} y={290} textAnchor="middle">r and R in series</text>}
      {showVoltmeter && (
        <>
          {/* voltmeter across the cell terminals */}
          <path d={`M ${ox + 70} 110 V 92 H 10 V 236 H ${ox + 70} V 220`} fill="none" stroke="var(--border-strong)" strokeDasharray="4 4" />
          <g transform="translate(10 164)">
            <circle r={16} fill="var(--surface)" stroke="var(--text-primary)" strokeWidth={2} />
            <text className="v-strong" y={5} textAnchor="middle">V</text>
          </g>
          <line x1={L.x} x2={L.x + L.w} y1={L.y} y2={L.y} className="v-axis" />
          <text className="v-text" x={L.x} y={L.y + 18}>potential around the loop</text>
          <path d={`M ${L.x} ${VY(0)} V ${VY(E)} H ${L.x + 35} L ${L.x + 60} ${VY(E - I * r)} H ${L.x + 80} L ${L.x + 120} ${VY(0)} H ${L.x + L.w}`} fill="none" stroke="var(--accent-orange)" strokeWidth={2.5} />
          <text className="v-text" x={L.x + 4} y={VY(E) - 8}>E</text>
          <path d={`M ${L.x + 48} ${VY(E)} V ${VY(E - I * r)}`} stroke={has(cue, "terminal-equals-emf") || s === 1 ? "var(--accent-coral)" : "transparent"} strokeWidth={4} />
          {(has(cue, "terminal-equals-emf") || s >= 1) && <text className="v-label-bad" x={L.x + 30} y={VY(E) - 26}>Ir lost inside</text>}
          <path d={`M ${L.x + 132} ${VY(E - I * r)} V ${VY(0)}`} stroke={has(cue, "drop-across-internal") || s >= 2 ? "var(--accent-amber)" : "transparent"} strokeWidth={4} />
          {(has(cue, "drop-across-internal") || s >= 2) && <text className="v-label-good" x={L.x + L.w} y={VY(E - I * r) - 8} textAnchor="end">V = {fmt(E - I * r)} V</text>}
          {reading !== null && <text className="v-label-bad" x={L.x + L.w} y={40} textAnchor="end">yours: {fmt(reading)} V</text>}
        </>
      )}
    </svg>
  );
}

// ---------------- Venn diagram ----------------
function Venn({ A, B, U, op, cue, reduced }: { A: number[]; B: number[]; U: number[]; op: "difference" | "intersection" | "union"; cue: Cue; reduced: boolean }) {
  const s = step(cue);
  const on = useReveal(JSON.stringify(cue), reduced);
  const answer = op === "difference" ? A.filter((x) => !B.includes(x)) : op === "intersection" ? A.filter((x) => B.includes(x)) : [...new Set([...A, ...B])];
  const student = cue.type === "student" && Array.isArray(cue.value) ? (cue.value as number[]) : null;
  const ca = { x: 205, y: 165 }, cb = { x: 315, y: 165 }, R = 108;
  const groups = {
    aOnly: A.filter((x) => !B.includes(x)),
    both: A.filter((x) => B.includes(x)),
    bOnly: B.filter((x) => !A.includes(x)),
    out: U.filter((x) => !A.includes(x) && !B.includes(x)),
  };
  const placeIn = (xs: number[], cx: number, cy: number, cols: number) =>
    xs.map((x, i) => ({ x, px: cx + ((i % cols) - (cols - 1) / 2) * 34, py: cy + (Math.floor(i / cols) - (Math.ceil(xs.length / cols) - 1) / 2) * 34 }));
  const pts = [
    ...placeIn(groups.aOnly, 150, 165, 2),
    ...placeIn(groups.both, 260, 165, 1),
    ...placeIn(groups.bOnly, 370, 165, 2),
    ...groups.out.map((x, i) => ({ x, px: i % 2 === 0 ? 40 + (i / 2) * 34 : 480 - ((i - 1) / 2) * 34, py: i % 2 === 0 ? 290 : 40 })),
  ];
  const showAnswerRegion = s >= 1;
  return (
    <svg viewBox="0 0 520 320" role="img" aria-label="Venn diagram of sets A and B">
      <defs>
        <clipPath id="venn-a"><circle cx={ca.x} cy={ca.y} r={R} /></clipPath>
        <mask id="venn-a-minus-b"><rect width="520" height="320" fill="black" /><circle cx={ca.x} cy={ca.y} r={R} fill="white" /><circle cx={cb.x} cy={cb.y} r={R} fill="black" /></mask>
      </defs>
      <rect x={14} y={14} width={492} height={292} rx={14} fill="none" stroke="var(--border-strong)" />
      <text className="v-text" x={24} y={34}>U</text>
      {(s === 0 || (showAnswerRegion && op === "intersection")) && <circle cx={cb.x} cy={cb.y} r={R} clipPath="url(#venn-a)" className={s === 0 && op === "difference" ? "v-fill-amber" : "v-fill"} style={{ opacity: on ? 1 : 0, transition: reduced ? "none" : "opacity 500ms" }} />}
      {showAnswerRegion && op === "difference" && <rect width="520" height="320" mask="url(#venn-a-minus-b)" className="v-fill" style={{ opacity: on ? 1 : 0, transition: reduced ? "none" : "opacity 500ms" }} />}
      <circle cx={ca.x} cy={ca.y} r={R} fill="none" stroke="var(--accent-orange)" strokeWidth={2} />
      <circle cx={cb.x} cy={cb.y} r={R} fill="none" stroke="var(--accent-amber)" strokeWidth={2} />
      <text className="v-strong" x={ca.x - 70} y={ca.y - 80}>A</text>
      <text className="v-strong" x={cb.x + 62} y={cb.y - 80}>B</text>
      {pts.map(({ x, px, py }) => {
        const inStudent = student?.includes(x) ?? false;
        const correct = answer.includes(x);
        const fill = student ? (inStudent ? (correct ? "var(--accent-orange)" : "var(--accent-coral)") : "var(--surface)") : "var(--surface)";
        const missing = student && correct && !inStudent;
        return (
          <g key={x} transform={`translate(${px} ${py})`}>
            <circle r={14} fill={fill} stroke={missing ? "var(--accent-amber)" : "var(--border-strong)"} strokeDasharray={missing ? "4 3" : undefined} strokeWidth={missing ? 2 : 1} />
            <text className="v-strong" y={5} textAnchor="middle" style={{ fill: student && inStudent ? "var(--text-on-accent)" : undefined }}>{x}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------- number line ----------------
function NumberLine({ target, cue, reduced }: { target: Interval; cue: Cue; reduced: boolean }) {
  const s = step(cue);
  const on = useReveal(JSON.stringify(cue), reduced);
  const finite = [target.lo, target.hi].filter(Number.isFinite);
  const lo = Math.min(...finite) - 3, hi = Math.max(...finite) + 3;
  const X = (x: number) => 40 + ((Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo)) * 440;
  const student = cue.type === "student" && cue.value && typeof cue.value === "object" ? (cue.value as Interval) : null;
  const ticks: number[] = [];
  for (let k = Math.ceil(lo); k <= hi; k++) ticks.push(k);
  const showTarget = s >= 0 || cue.type === "student";
  const seg = (iv: Interval, y: number, color: string, label: string) => (
    <g style={{ opacity: on ? 1 : 0, transition: reduced ? "none" : "opacity 400ms" }}>
      <line x1={X(iv.lo)} x2={X(iv.hi)} y1={y} y2={y} stroke={color} strokeWidth={5} strokeLinecap="round" />
      {Number.isFinite(iv.lo) ? <circle cx={X(iv.lo)} cy={y} r={7} fill={iv.loClosed ? color : "var(--background)"} stroke={color} strokeWidth={3} /> : <path d={`M ${X(lo) + 2} ${y} l 12 -8 v 16 z`} fill={color} />}
      {Number.isFinite(iv.hi) ? <circle cx={X(iv.hi)} cy={y} r={7} fill={iv.hiClosed ? color : "var(--background)"} stroke={color} strokeWidth={3} /> : <path d={`M ${X(hi) - 2} ${y} l -12 -8 v 16 z`} fill={color} />}
      <text className={color === "var(--accent-coral)" ? "v-label-bad" : "v-label-good"} x={44} y={y - 14}>{label}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 520 240" role="img" aria-label="Number line">
      <line className="v-axis" x1={30} x2={490} y1={190} y2={190} />
      {ticks.map((k) => (
        <g key={k}>
          <line className="v-axis" x1={X(k)} x2={X(k)} y1={184} y2={196} />
          <text className={finite.includes(k) ? "v-strong" : "v-text"} x={X(k)} y={216} textAnchor="middle">{String(k).replace("-", "−")}</text>
        </g>
      ))}
      {student && seg(student, 90, "var(--accent-coral)", "your interval")}
      {showTarget && seg(target, 150, "var(--accent-orange)", "the set")}
    </svg>
  );
}

// ---------------- 2-D vectors ----------------
function VectorGrid({ a, b, cue, reduced }: { a: [number, number]; b: [number, number]; cue: Cue; reduced: boolean }) {
  const s = step(cue);
  const on = useReveal(JSON.stringify(cue), reduced);
  const c = { x: 260, y: 160 }, k = 18;
  const P = (v: [number, number]) => ({ x: c.x + v[0] * k, y: c.y - v[1] * k });
  const A = P(a), Bp = P(b);
  const dot = a[0] * b[0] + a[1] * b[1];
  const bb = b[0] * b[0] + b[1] * b[1];
  const foot = P([(dot / bb) * b[0], (dot / bb) * b[1]]);
  const arrow = (to: { x: number; y: number }, color: string, label: string) => {
    const ang = Math.atan2(to.y - c.y, to.x - c.x);
    const h = (d: number) => `${to.x - 11 * Math.cos(ang + d)},${to.y - 11 * Math.sin(ang + d)}`;
    return (
      <g>
        <line x1={c.x} y1={c.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={3} />
        <polygon points={`${to.x},${to.y} ${h(0.4)} ${h(-0.4)}`} fill={color} />
        <text className="v-strong" x={to.x + 8 * Math.cos(ang)} y={to.y + 14 * Math.sin(ang) + 5} style={{ fill: color }}>{label}</text>
      </g>
    );
  };
  const fade = { opacity: on ? 1 : 0, transition: reduced ? "none" : "opacity 450ms" };
  return (
    <svg viewBox="0 0 520 320" role="img" aria-label="Vectors a and b on a grid">
      {Array.from({ length: 29 }, (_, i) => i - 14).map((i) => (
        <g key={i}>
          <line className="v-grid" x1={c.x + i * k} x2={c.x + i * k} y1={10} y2={310} />
          <line className="v-grid" y1={c.y + i * k} y2={c.y + i * k} x1={10} x2={510} />
        </g>
      ))}
      <line className="v-axis" x1={10} x2={510} y1={c.y} y2={c.y} />
      <line className="v-axis" y1={10} y2={310} x1={c.x} x2={c.x} />
      {(s >= 0 || has(cue, "cross-multiplied-components") || has(cue, "dropped-j-term")) && (
        <g style={fade}>
          <path d={`M ${c.x} ${c.y} H ${A.x} V ${A.y}`} fill="none" stroke="var(--accent-orange)" strokeDasharray="5 4" strokeWidth={1.6} />
          <path d={`M ${c.x} ${c.y} H ${Bp.x} V ${Bp.y}`} fill="none" stroke="var(--accent-amber)" strokeDasharray="5 4" strokeWidth={1.6} />
          <path d={`M ${A.x} ${c.y} V ${A.y}`} stroke={has(cue, "dropped-j-term") ? "var(--accent-coral)" : "transparent"} strokeWidth={4} />
        </g>
      )}
      {(s === 1 || has(cue, "cross-multiplied-components")) && (
        <g style={fade}>
          <text className={has(cue, "cross-multiplied-components") ? "v-label-bad" : "v-label-good"} x={20} y={292}>
            {has(cue, "cross-multiplied-components") ? `you paired x with y: (${a[0]})(${b[1]}) + (${a[1]})(${b[0]})` : `x·x: (${a[0]})(${b[0]}) = ${a[0] * b[0]}   y·y: (${a[1]})(${b[1]}) = ${a[1] * b[1]}`}
          </text>
          {has(cue, "cross-multiplied-components") && <text className="v-label-good" x={20} y={310}>pair x with x and y with y: ({a[0]})({b[0]}) + ({a[1]})({b[1]})</text>}
        </g>
      )}
      {(s >= 2 || has(cue, "ignored-angle")) && (
        <g style={fade}>
          <line x1={c.x - b[0] * k * 2} y1={c.y + b[1] * k * 2} x2={c.x + b[0] * k * 2} y2={c.y - b[1] * k * 2} stroke="var(--accent-amber)" strokeOpacity={0.35} />
          {s >= 2 && <line x1={A.x} y1={A.y} x2={foot.x} y2={foot.y} stroke="var(--highlight-peach)" strokeDasharray="5 4" strokeWidth={1.8} />}
          {s >= 2 && <line x1={c.x} y1={c.y} x2={foot.x} y2={foot.y} stroke="var(--accent-orange)" strokeWidth={6} strokeOpacity={0.55} />}
          {has(cue, "ignored-angle") && <text className="v-label-bad" x={20} y={300}>θ between a and b isn't 0, so a·b = |a||b|cos θ</text>}
        </g>
      )}
      {arrow(A, "var(--accent-orange)", "a")}
      {arrow(Bp, "var(--accent-amber)", "b")}
      {s >= 2 && <text className="v-label-good" x={20} y={300}>a·b = {dot}</text>}
    </svg>
  );
}

// ---------------- box diagonal (3-D magnitude) ----------------
function BoxDiagonal({ p, q, r, cue, reduced }: { p: number; q: number; r: number; cue: Cue; reduced: boolean }) {
  const s = step(cue);
  const on = useReveal(JSON.stringify(cue), reduced);
  const [P, Q, Rz] = [Math.abs(p), Math.abs(q), Math.abs(r)];
  // cabinet projection: x to the right, y receding at 30° (scaled 0.6), z up; never degenerate when sides are equal
  const u = Math.min(34, 220 / (P + 0.6 * Q * 0.87 + 1), 200 / (Rz + 0.6 * Q * 0.5 + 1));
  const pr = (x: number, y: number, z: number) => ({ x: 150 + x * u + y * u * 0.6 * 0.87, y: 270 - y * u * 0.6 * 0.5 - z * u });
  const o = pr(0, 0, 0), X = pr(P, 0, 0), Y = pr(0, Q, 0), XY = pr(P, Q, 0), Z = pr(0, 0, Rz), XZ = pr(P, 0, Rz), YZ = pr(0, Q, Rz), XYZ = pr(P, Q, Rz);
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }, stroke: string, w = 1.5, dash?: string) => <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={w} strokeDasharray={dash} />;
  const fade = { opacity: on ? 1 : 0, transition: reduced ? "none" : "opacity 500ms" };
  return (
    <svg viewBox="0 0 520 320" role="img" aria-label="Box with the vector as its diagonal">
      {[[X, XY], [Y, XY], [Z, XZ], [Z, YZ], [XZ, XYZ], [YZ, XYZ], [X, XZ], [Y, YZ], [XY, XYZ]].map(([a, b], i) => <g key={i}>{seg(a!, b!, "var(--border-subtle)")}</g>)}
      {seg(o, X, "var(--text-primary)", 2)}
      {seg(o, Y, "var(--text-primary)", 2)}
      {seg(o, Z, "var(--text-primary)", 2)}
      <text className="v-strong" x={(o.x + X.x) / 2 + 8} y={(o.y + X.y) / 2 + 18}>{P}</text>
      <text className="v-strong" x={(o.x + Y.x) / 2 - 18} y={(o.y + Y.y) / 2 + 18}>{Q}</text>
      <text className="v-strong" x={o.x - 18} y={(o.y + Z.y) / 2}>{Rz}</text>
      {(s >= 0 || has(cue, "missed-k-component")) && (
        <g style={fade}>
          {seg(o, XY, has(cue, "missed-k-component") ? "var(--accent-coral)" : "var(--accent-amber)", 3, has(cue, "missed-k-component") ? "6 5" : undefined)}
          <text className={has(cue, "missed-k-component") ? "v-label-bad" : "v-label-good"} x={XY.x + 8} y={XY.y + 18}>√{P * P + Q * Q} across the floor</text>
        </g>
      )}
      {(s >= 1) && <g style={fade}>{seg(o, XYZ, "var(--accent-orange)", 3.5)}<text className="v-label-good" x={XYZ.x + 8} y={XYZ.y - 6}>|a| = √{P * P + Q * Q + Rz * Rz}</text></g>}
      {s >= 1 && seg(XY, XYZ, "var(--accent-amber)", 2.5)}
      {has(cue, "added-components") && (
        <g style={fade}>
          <path d={`M ${o.x} ${o.y} L ${X.x} ${X.y} L ${XY.x} ${XY.y} L ${XYZ.x} ${XYZ.y}`} fill="none" stroke="var(--accent-coral)" strokeWidth={3} strokeDasharray="6 5" />
          <text className="v-label-bad" x={20} y={300}>{P} + {Q} + {Rz} walks along the edges</text>
          {seg(o, XYZ, "var(--accent-orange)", 3)}
        </g>
      )}
      {has(cue, "forgot-square-root") && <text className="v-label-bad" x={20} y={300}>{P * P + Q * Q + Rz * Rz} is |a|², the square of the length</text>}
    </svg>
  );
}
