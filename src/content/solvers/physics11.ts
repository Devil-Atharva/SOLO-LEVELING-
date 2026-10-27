// Solvers for Class 11 Physics templates (Motion in a Straight Line, Motion in a Plane, Laws of Motion).
import { rng } from "../rng";
import { G, num, rad, reject, type Solver } from "./types";

export const kin: Record<string, Solver> = {
  "kin.vtArea": {
    solve: (p) => {
      const u = num(p, "u"), t = num(p, "t"), v = u + 2 * num(p, "k");
      const s = ((u + v) / 2) * t;
      return { answer: { value: s }, derived: { v, s, rect: u * t, tri: ((v - u) * t) / 2, vmax: Math.ceil(v * 1.2), acc: (v - u) / t } };
    },
    buggy: {
      areaUsesFinalVelocity: (p) => (num(p, "u") + 2 * num(p, "k")) * num(p, "t"),
      areaIgnoresAcceleration: (p) => num(p, "u") * num(p, "t"),
      areaMissesRectangle: (p) => num(p, "k") * num(p, "t"),
      slopeInsteadOfArea: (p) => (2 * num(p, "k")) / num(p, "t"),
    },
  },
  "kin.brakingDistance": {
    solve: (p) => {
      const u = 2 * num(p, "k"), a = num(p, "a");
      const s = (u * u) / (2 * a), T = u / a;
      return { answer: { value: s }, derived: { u, s, T, half: u / 2, ghost: u * T, xmax: Math.ceil((u * T * 1.05) / 10) * 10 } };
    },
    buggy: {
      missingHalf: (p) => (4 * num(p, "k") ** 2) / num(p, "a"),
      droppedSquare: (p) => (2 * num(p, "k")) / (2 * num(p, "a")),
      timeInsteadOfDistance: (p) => (2 * num(p, "k")) / num(p, "a"),
    },
  },
};

export const mip: Record<string, Solver> = {
  "mip.projectileRange": {
    solve: (p) => {
      const v = num(p, "v"), th = rad(num(p, "ang"));
      const R = (v * v * Math.sin(2 * th)) / G;
      return { answer: { value: R }, derived: { R, tf: (2 * v * Math.sin(th)) / G, vx: v * Math.cos(th), vy: v * Math.sin(th), H: (v * v * Math.sin(th) ** 2) / (2 * G) } };
    },
    buggy: {
      forgotDoubleAngle: (p) => (num(p, "v") ** 2 * Math.sin(rad(num(p, "ang")))) / G,
      usedTimeToApex: (p) => (num(p, "v") ** 2 * Math.sin(rad(num(p, "ang"))) * Math.cos(rad(num(p, "ang")))) / G,
      ignoredHorizontalComponent: (p) => (2 * num(p, "v") ** 2 * Math.sin(rad(num(p, "ang")))) / G,
    },
  },
};

export const lom: Record<string, Solver> = {
  "lom.afterPush": {
    solve: (p) => {
      const m = num(p, "m"), v0 = num(p, "v0"), mu = num(p, "mu");
      const W = m * G, f = mu * m * G, T = Math.min(1.5, v0 / (mu * G));
      return { answer: { correct: "a" }, derived: { W, f, T, push: Math.round(f * 1.5) } };
    },
  },
  "lom.thirdLaw": {
    solve: (p) => ({ answer: { correct: ["a", "b"] }, derived: { W: num(p, "m") * G } }),
  },
  "lom.frictionIncline": {
    solve: (p) => {
      const m = num(p, "m"), th = rad(num(p, "theta")), mu = num(p, "muS");
      const W = m * G, N = W * Math.cos(th), f = W * Math.sin(th), fmax = mu * N;
      return { answer: { value: f }, derived: { W, N, f, fmax, angN: 90 + num(p, "theta"), angDown: num(p, "theta") + 180 } };
    },
    buggy: {
      muTimesNormal: (p) => num(p, "muS") * num(p, "m") * G * Math.cos(rad(num(p, "theta"))),
      muTimesWeight: (p) => num(p, "muS") * num(p, "m") * G,
      weightCosTheta: (p) => num(p, "m") * G * Math.cos(rad(num(p, "theta"))),
    },
  },
  "lom.connectedAgents": {
    solve: (p) => {
      const mA = num(p, "mA"), mB = num(p, "mB"), F = num(p, "F");
      const a = F / (mA + mB), T = mA * a;
      return { answer: {}, derived: { a, T, WA: mA * G } };
    },
  },
  "lom.rankAccelerations": {
    solve: (p) => {
      const r = rng(num(p, "k"));
      const ids = ["P", "Q", "R", "S"];
      for (let tries = 0; tries < 400; tries++) {
        const m = ids.map(() => r.int(1, 5));
        const F = ids.map(() => 2 * r.int(1, 6));
        const a = ids.map((_, i) => F[i]! / m[i]!);
        if (new Set(a.map((x) => x.toFixed(6))).size < 4 || new Set(F).size < 4) continue;
        const byA = [...ids].sort((x, y) => a[ids.indexOf(y)]! - a[ids.indexOf(x)]!);
        const byF = [...ids].sort((x, y) => F[ids.indexOf(y)]! - F[ids.indexOf(x)]!);
        if (byA.join() === byF.join()) continue;
        const derived: Record<string, unknown> = { order: byA.join(" > ") };
        ids.forEach((id, i) => { derived[`F${id}`] = F[i]; derived[`m${id}`] = m[i]; derived[`a${id}`] = a[i]; });
        return { answer: { correct: byA }, derived };
      }
      return reject();
    },
    buggy: {
      byForce: (p) => {
        const s = lom["lom.rankAccelerations"]!.solve(p).derived!;
        return ["P", "Q", "R", "S"].sort((x, y) => Number(s[`F${y}`]) - Number(s[`F${x}`]));
      },
      byLightest: (p) => {
        const s = lom["lom.rankAccelerations"]!.solve(p).derived!;
        const order = ["P", "Q", "R", "S"].sort((x, y) => Number(s[`m${x}`]) - Number(s[`m${y}`]));
        return new Set(order.map((id) => s[`m${id}`])).size === 4 ? order : null;
      },
    },
  },
  "lom.fbdRope": {
    solve: (p) => {
      const m = num(p, "m"), T = num(p, "T"), ang = num(p, "ang");
      const W = m * G, f = T * Math.cos(rad(ang)), N = W - T * Math.sin(rad(ang));
      if (N <= 1) return reject();
      const required = [
        { kind: "weight", agent: "Earth", angleDeg: -90, magnitude: W, magnitudeTol: 0.08, missingTags: ["missing-weight"], wrongMagnitudeTags: ["weight-magnitude"] },
        { kind: "normal", agent: "floor", angleDeg: 90, magnitude: N, magnitudeTol: 0.1, missingTags: ["missing-normal"], wrongDirectionTags: ["normal-direction"], wrongMagnitudeTags: ["normal-equals-weight"] },
        { kind: "tension", agent: "rope", angleDeg: ang, magnitude: T, magnitudeTol: 0.08, missingTags: ["missing-tension"], wrongDirectionTags: ["tension-direction"] },
        { kind: "friction", agent: "floor", angleDeg: 180, magnitude: f, magnitudeTol: 0.1, missingTags: ["missing-friction"], wrongDirectionTags: ["friction-direction"], wrongMagnitudeTags: ["constant-velocity-unbalanced"] },
      ];
      const correctVectors = required.map((r) => ({ kind: r.kind, label: r.kind, agent: r.agent, magnitude: r.magnitude, angleDeg: r.angleDeg }));
      return {
        answer: {
          rules: {
            required,
            forbidden: [{ kind: "motion", tags: ["extra-force-of-motion"] }, { kind: "applied", tags: ["extra-force-of-motion"] }],
            noAgentTags: ["extra-force-of-motion"],
            duplicateTags: ["double-counted-force"],
          },
        },
        derived: { W, f, N, correctVectors, maxF: Math.ceil(Math.max(W, T) * 1.3) },
      };
    },
  },
};
