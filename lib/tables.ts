import type { RollBand, TableEntry } from "./types";

export function findBand<T extends { min: number; max: number }>(
  entries: T[],
  roll: number
): T | undefined {
  return entries.find((e) => roll >= e.min && roll <= e.max);
}

export function formatBand(band: { min: number; max: number }): string {
  return band.min === band.max ? `${band.min}` : `${band.min}-${band.max}`;
}

export function formatEntryRef(entry: TableEntry): string {
  const parts = [entry.label];
  if (entry.book) {
    parts.push(
      entry.page != null ? `${entry.book} p. ${entry.page}` : entry.book
    );
  }
  if (entry.price != null) {
    parts.push(`${entry.price.toLocaleString("pt-BR")} T$`);
  }
  return parts.join(" · ");
}

export function describeOutcomeBand(band: RollBand): string {
  const range = formatBand(band);
  const { outcome } = band;
  switch (outcome.kind) {
    case "none":
      return `${range} → nenhum`;
    case "coins":
      return `${range} → ${outcome.formula}`;
    case "riches": {
      const tier =
        outcome.tier === "minor"
          ? "menor"
          : outcome.tier === "medium"
            ? "média"
            : "maior";
      const count = outcome.countFormula ?? String(outcome.count);
      return `${range} → ${count} riqueza(s) ${tier}`;
    }
    case "table": {
      const tableNames: Record<string, string> = {
        "misc-items": "item diverso",
        equipment: "equipamento",
        potions: "poções",
        superiors: "item superior",
        magic: "item mágico",
        "magic-accessories": "acessório mágico",
      };
      const name = tableNames[outcome.table] ?? outcome.table;
      const qty = outcome.rollCountFormula
        ? ` (${outcome.rollCountFormula})`
        : outcome.rolls && outcome.rolls > 1
          ? ` (${outcome.rolls}×)`
          : outcome.improvements && outcome.improvements > 1
            ? ` (${outcome.improvements} melhorias)`
            : "";
      return `${range} → ${name}${qty}`;
    }
    default:
      return range;
  }
}
