import type { RollStep } from "./types";

export function makeStep(
  label: string,
  roll: number,
  summary: string,
  detail: string,
  children?: RollStep[]
): RollStep {
  return { label, roll, summary, detail, children };
}
