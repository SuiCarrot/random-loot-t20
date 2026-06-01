export type DiceRollBreakdown = {
  formula: string;
  rolls: number[];
  multiplier: number;
  total: number;
  detail: string;
};

export function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Parses and rolls expressions like "3d8", "1d4+1", "2d6+1". */
export function rollDiceExpression(expr: string): DiceRollBreakdown {
  const normalized = expr.replace(/\s/g, "").toLowerCase();
  const match = normalized.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) {
    return {
      formula: expr,
      rolls: [],
      multiplier: 1,
      total: 0,
      detail: expr,
    };
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3], 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides));
  const sum = rolls.reduce((a, b) => a + b, 0) + bonus;
  const detail =
    bonus > 0
      ? `${match[1]}d${sides}+${bonus} → [${rolls.join(", ")}]+${bonus} = ${sum}`
      : `${match[1]}d${sides} → [${rolls.join(", ")}] = ${sum}`;

  return { formula: expr, rolls, multiplier: 1, total: sum, detail };
}

/** Parses multiplier suffix: "10", "100", "1.000", "10.000" */
function parseMultiplier(multStr: string): number {
  if (multStr.includes(".")) {
    return parseInt(multStr.replace(/\./g, ""), 10);
  }
  return parseInt(multStr, 10);
}

/**
 * Evaluates dice formulas with optional multiplier: "3d8x10", "2d10x1.000", "4d4"
 */
export function evalDiceWithMultiplier(diceFormula: string): DiceRollBreakdown {
  const cleaned = diceFormula.trim();
  const multMatch = cleaned.match(/^(.+?)x([\d.]+)$/i);

  let dicePart = cleaned;
  let multiplier = 1;

  if (multMatch) {
    dicePart = multMatch[1].trim();
    multiplier = parseMultiplier(multMatch[2]);
  }

  const inner = rollDiceExpression(dicePart);
  const total = inner.total * multiplier;
  const multStr =
    multiplier > 1 ? ` × ${multiplier.toLocaleString("pt-BR")}` : "";

  return {
    formula: diceFormula,
    rolls: inner.rolls,
    multiplier,
    total,
    detail: `${inner.detail}${multStr} = ${total.toLocaleString("pt-BR")}`,
  };
}

/**
 * Evaluates coin formulas: "3d8x10 T$", "2d4x100 TC", "1d12x1.000 TO"
 */
export function evalCoinFormula(formula: string): DiceRollBreakdown {
  const cleaned = formula.replace(/\s*(T\$|TC|TO)\s*$/i, "").trim();
  const result = evalDiceWithMultiplier(cleaned);
  const currency = formula.match(/(T\$|TC|TO)/i)?.[1]?.toUpperCase() ?? "";
  return {
    ...result,
    formula,
    detail: `${result.detail} ${currency}`.trim(),
  };
}

/**
 * Evaluates riches value formulas: "4d4 (10)", "1d4x10 (25)", "2d10x1.000 (11.000)"
 */
export function evalRichesFormula(formula: string): DiceRollBreakdown {
  const dicePart = formula.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const result = evalDiceWithMultiplier(dicePart);
  const avgMatch = formula.match(/\(([^)]+)\)\s*$/);
  const avgNote = avgMatch ? ` · média ${avgMatch[1]} T$` : "";
  return {
    ...result,
    formula,
    detail: `${result.detail} T$${avgNote}`,
  };
}

export function resolveCountFormula(formula: string | undefined, fallback: number): number {
  if (!formula) return fallback;
  return rollCount(formula, fallback).count;
}

export function rollCount(
  formula: string | undefined,
  fallback: number
): { count: number; detail: string } {
  if (!formula) {
    return { count: fallback, detail: String(fallback) };
  }
  const result = rollDiceExpression(formula);
  const count = Math.max(1, result.total);
  return {
    count,
    detail: `${formula} → ${result.detail}`,
  };
}
