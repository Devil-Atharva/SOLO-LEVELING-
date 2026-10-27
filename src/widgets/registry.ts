// Widget models by type (pure; safe to import from Node scripts and tests).
import type { WidgetModel } from "./types";
import { vectorBoard } from "./vector-board/model";
import { motionTrack } from "./motion-track/model";
import { graphPlot } from "./graph-plot/model";
import { numberLine } from "./number-line/model";
import { figure } from "./figures/model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyModel = WidgetModel<any, any, any>;
export const WIDGETS: Record<string, AnyModel> = {
  "vector-board": vectorBoard,
  "motion-track": motionTrack,
  "graph-plot": graphPlot,
  "number-line": numberLine,
  figure,
};
