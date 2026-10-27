// Registry of reference solvers. Templates name a solver; the validator checks it exists.
import { cur, maths, set, vec } from "./others";
import { kin, lom, mip } from "./physics11";
import type { Solver } from "./types";

export const SOLVERS: Record<string, Solver> = { ...kin, ...mip, ...lom, ...cur, ...set, ...vec, ...maths };
export type { Solver } from "./types";
