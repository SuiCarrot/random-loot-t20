import {
  equipment,
  getTreasureRow,
  magic,
  magicAccessories,
  miscItems,
  potions,
  riches,
  superiors,
} from "./data";
import {
  evalCoinFormula,
  evalRichesFormula,
  rollCount,
  rollD100,
  rollDie,
} from "./dice";
import { makeStep } from "./roll-step";
import { describeOutcomeBand, findBand, formatBand, formatEntryRef } from "./tables";
import type {
  EquipmentCategory,
  MagicAccessoryTier,
  RollBand,
  RollStep,
  RollTrace,
  RichesTier,
  SplitTable,
  TableEntry,
  TreasureModifier,
  TreasureOutcome,
} from "./types";

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  weapons: "Armas",
  armor: "Armaduras e escudos",
  esoteric: "Esotéricos",
};

const BASE_STEP_LABELS: Record<EquipmentCategory, string> = {
  weapons: "Arma base",
  armor: "Armadura ou escudo base",
  esoteric: "Esotérico base",
};

function pickEquipmentCategory(): { category: EquipmentCategory; roll: number } {
  const roll = rollDie(3);
  const category: EquipmentCategory =
    roll === 1 ? "weapons" : roll === 2 ? "armor" : "esoteric";
  return { category, roll };
}

function rollOnEntries(
  label: string,
  entries: TableEntry[]
): RollStep {
  const roll = rollD100();
  const entry = findBand(entries, roll);
  const band = entry ? formatBand(entry) : "?";
  const summary = entry ? formatEntryRef(entry) : "Sem entrada na tabela";
  const detail = entry
    ? `d% ${roll} (${band}) → ${formatEntryRef(entry)}`
    : `d% ${roll} — sem entrada na tabela`;
  return makeStep(label, roll, summary, detail);
}

function rollRiches(tier: RichesTier, label: string): RollStep {
  const roll = rollD100();
  const entries = riches[tier];
  const entry = findBand(entries, roll);
  const tierLabel =
    tier === "minor" ? "menor" : tier === "medium" ? "média" : "maior";
  const band = entry ? formatBand(entry) : "?";
  let detail = `d% ${roll} (${band}) — riqueza ${tierLabel}`;
  let summary = `Riqueza ${tierLabel}`;
  if (entry?.formula) {
    const evaluated = evalRichesFormula(entry.formula);
    detail += ` · ${evaluated.detail}`;
    summary += ` — ${evaluated.total.toLocaleString("pt-BR")} T$`;
  }
  if (entry?.description) {
    const short =
      entry.description.length > 120
        ? entry.description.slice(0, 120) + "…"
        : entry.description;
    detail += ` · ${short}`;
  }
  return makeStep(label, roll, summary, detail);
}

function composeItemName(base: string, parts: string[]): string {
  return [base, ...parts].filter(Boolean).join(" ");
}

/** Resumo curto no card pai (Itens/Dinheiro) — evita listar todos os filhos */
function summarizeGroupedChildren(children: RollStep[]): string {
  if (children.length === 0) return "—";

  if (children.length === 1) {
    return children[0].summary;
  }

  const allPotions = children.every(
    (c) =>
      c.label.startsWith("Poção") ||
      c.label.startsWith("Poções") ||
      /^Poções \d+\/\d+$/.test(c.label)
  );
  if (allPotions) {
    return `${children.length} poções`;
  }

  const allAccessories = children.every((c) =>
    c.label.startsWith("Acessório")
  );
  if (allAccessories) {
    const tierMatch = children[0].summary.match(/mágico \((menor|médio|maior)\)/i);
    const tier = tierMatch?.[1] ?? "";
    return tier
      ? `${children.length} acessórios mágicos (${tier})`
      : `${children.length} acessórios mágicos`;
  }

  const allMisc = children.every((c) => c.label.startsWith("Itens diversos"));
  if (allMisc) {
    return `${children.length} itens diversos`;
  }

  const allEquipment = children.every((c) => c.label.startsWith("Equipamento"));
  if (allEquipment) {
    return `${children.length} equipamentos`;
  }

  return children.map((c) => c.summary).join(" · ");
}

/** Item superior: equipamento base + melhoria(s) na mesma categoria */
function rollSuperiorItem(tableLabel: string, improvementCount: number): RollStep {
  const { category, roll: categoryRoll } = pickEquipmentCategory();
  const categoryLabel = CATEGORY_LABELS[category];

  const baseRoll = rollD100();
  const baseEntry = findBand(equipment[category], baseRoll);
  const baseBand = baseEntry ? formatBand(baseEntry) : "?";
  const baseLabel = baseEntry?.label ?? "Item";

  const children: RollStep[] = [
    makeStep(
      BASE_STEP_LABELS[category],
      baseRoll,
      baseLabel,
      `Categoria: ${categoryLabel} · d% ${baseRoll} (${baseBand}) → ${
        baseEntry ? formatEntryRef(baseEntry) : "—"
      }`
    ),
  ];

  const improvementLabels: string[] = [];

  for (let i = 0; i < improvementCount; i++) {
    const roll = rollD100();
    const entry = findBand(superiors[category], roll);
    const band = entry ? formatBand(entry) : "?";
    const label = entry?.label ?? "—";
    if (entry) improvementLabels.push(label);
    children.push(
      makeStep(
        `Melhoria ${i + 1}`,
        roll,
        label,
        `d% ${roll} (${band}) → ${entry ? formatEntryRef(entry) : "—"}`
      )
    );
  }

  const summary = composeItemName(baseLabel, improvementLabels);
  const detail = `Categoria: ${categoryLabel} (1d3 = ${categoryRoll}) · ${improvementCount} melhoria(s) no mesmo item`;

  return makeStep(
    improvementCount > 1
      ? `${tableLabel} (${improvementCount} melhorias)`
      : tableLabel,
    0,
    summary,
    detail,
    children
  );
}

function rollSplitTable(
  table: SplitTable,
  tableLabel: string
): RollStep {
  const { category, roll: categoryRoll } = pickEquipmentCategory();
  const categoryLabel = CATEGORY_LABELS[category];
  const roll = rollD100();
  const entry = findBand(table[category], roll);
  const band = entry ? formatBand(entry) : "?";
  const detail = `Categoria: ${categoryLabel} (1d3 = ${categoryRoll}) · d% ${roll} (${band})${
    entry ? ` → ${formatEntryRef(entry)}` : ""
  }`;
  const summary = entry ? formatEntryRef(entry) : "—";

  return makeStep(tableLabel, roll, summary, detail);
}

function rollPotionsGroup(
  outcome: Extract<TreasureOutcome, { kind: "table" }>,
  suffix: string
): RollStep {
  const { count, detail: countDetail } = outcome.rollCountFormula
    ? rollCount(outcome.rollCountFormula, 1)
    : { count: outcome.rolls ?? 1, detail: String(outcome.rolls ?? 1) };

  if (count === 1) {
    return rollOnEntries(`Poção${suffix}`, potions);
  }

  const children: RollStep[] = [];
  for (let i = 0; i < count; i++) {
    children.push(rollOnEntries(`Poção ${i + 1}`, potions));
  }

  const summary = `${count} poções`;
  const detail = `Quantidade: ${countDetail}`;

  return makeStep(
    `Poções (${count})${suffix}`,
    0,
    summary,
    detail,
    children
  );
}

function rollMagicAccessories(
  tier: MagicAccessoryTier,
  label?: string
): RollStep {
  const tierLabel =
    tier === "minor" ? "menor" : tier === "medium" ? "médio" : "maior";
  const entries = magicAccessories[tier];
  const roll = rollD100();
  const entry = findBand(entries, roll);
  const band = entry ? formatBand(entry) : "?";
  const detail = entry
    ? `d% ${roll} (${band}) → ${formatEntryRef(entry)}`
    : `d% ${roll} — sem entrada`;
  const summary = entry ? formatEntryRef(entry) : "Sem entrada";
  return makeStep(label ?? `Acessório mágico (${tierLabel})`, roll, summary, detail);
}

function rollMagicAccessoriesGroup(
  outcome: Extract<TreasureOutcome, { kind: "table" }>,
  suffix: string
): RollStep {
  const tier = outcome.magicTier ?? "minor";
  const tierLabel =
    tier === "minor" ? "menor" : tier === "medium" ? "médio" : "maior";
  const count = outcome.rolls ?? 1;

  if (count === 1) {
    return rollMagicAccessories(tier, `Acessório mágico (${tierLabel})${suffix}`);
  }

  const children: RollStep[] = [];
  for (let i = 0; i < count; i++) {
    children.push(
      rollMagicAccessories(tier, `Acessório ${i + 1}`)
    );
  }

  return makeStep(
    `Acessórios mágicos (${tierLabel})${suffix}`,
    0,
    `${count} acessórios mágicos (${tierLabel})`,
    `${count} rolagens na tabela de acessórios ${tierLabel}`,
    children
  );
}

function resolveTableOutcome(
  outcome: Extract<TreasureOutcome, { kind: "table" }>
): RollStep[] {
  if (outcome.table === "potions") {
    return [rollPotionsGroup(outcome, "")];
  }

  if (outcome.table === "magic-accessories") {
    return [rollMagicAccessoriesGroup(outcome, "")];
  }

  const times = outcome.rolls ?? 1;
  const steps: RollStep[] = [];
  for (let i = 0; i < times; i++) {
    const suffix = times > 1 ? ` ${i + 1}/${times}` : "";
    switch (outcome.table) {
      case "misc-items":
        steps.push(rollOnEntries(`Itens diversos${suffix}`, miscItems));
        break;
      case "equipment":
        steps.push(rollSplitTable(equipment, `Equipamento${suffix}`));
        break;
      case "superiors":
        steps.push(
          rollSuperiorItem(
            `Item superior${suffix}`,
            outcome.improvements ?? 1
          )
        );
        break;
      case "magic":
        steps.push(rollSplitTable(magic, `Item mágico${suffix}`));
        break;
      default:
        break;
    }
  }

  if (outcome.bonusPercent) {
    steps.push(rollRiches("minor", "Bônus (+%) — riqueza menor"));
  }

  return steps;
}

function resolveMoneyOutcome(
  outcome: TreasureOutcome,
  modifier: TreasureModifier
): RollStep {
  if (outcome.kind === "none") {
    return makeStep("Dinheiro", 0, "Nenhum", "Nenhum tesouro em moedas");
  }

  if (outcome.kind === "coins") {
    const evaluated = evalCoinFormula(outcome.formula);
    let total = evaluated.total;
    if (modifier === "metade") {
      total = Math.floor(total / 2);
    }
    const currency =
      evaluated.formula.match(/(T\$|TC|TO)/i)?.[1]?.toUpperCase() ?? "T$";
    const modNote = modifier === "metade" ? " (metade do tesouro)" : "";
    const summary = `${total.toLocaleString("pt-BR")} ${currency}${modifier === "metade" ? " (metade)" : ""}`;
    const detail =
      `${evaluated.formula} → ${evaluated.detail}${modNote} · Total: ${total.toLocaleString("pt-BR")} ${currency}`.trim();
    return makeStep("Dinheiro", 0, summary, detail);
  }

  if (outcome.kind === "riches") {
    const { count } = outcome.countFormula
      ? rollCount(outcome.countFormula, outcome.count)
      : { count: outcome.count };
    const tierLabel =
      outcome.tier === "minor"
        ? "menor(es)"
        : outcome.tier === "medium"
          ? "média(s)"
          : "maior(es)";
    const children: RollStep[] = [];
    for (let i = 0; i < count; i++) {
      children.push(
        rollRiches(
          outcome.tier,
          count > 1 ? `Riqueza ${i + 1}/${count}` : "Riqueza"
        )
      );
    }
    if (outcome.bonusPercent) {
      children.push(rollRiches("minor", "Bônus (+%) — riqueza menor"));
    }
    const tierWord =
      outcome.tier === "minor"
        ? "menores"
        : outcome.tier === "medium"
          ? "médias"
          : "maiores";
    const summary =
      count > 1
        ? `${count} riquezas ${tierWord}`
        : children[0].summary;
    const detail = `${count} riqueza(s) ${tierLabel}`;
    return makeStep("Dinheiro", 0, summary, detail, children);
  }

  return makeStep("Dinheiro", 0, "—", "—");
}

function rollColumn(
  label: string,
  bands: RollBand[],
  modifier: TreasureModifier,
  column: "money" | "items"
): RollStep {
  const roll = rollD100();
  const band = findBand(bands, roll);
  if (!band) {
    return makeStep(
      label,
      roll,
      "Faixa não encontrada",
      `d% ${roll} — faixa não encontrada`
    );
  }

  const detail = `d% ${roll} · ${describeOutcomeBand(band)}`;

  if (column === "money") {
    const moneyStep = resolveMoneyOutcome(band.outcome, modifier);
    return makeStep(label, roll, moneyStep.summary, detail, [moneyStep]);
  }

  if (band.outcome.kind === "none") {
    return makeStep(
      label,
      roll,
      "Nenhum item",
      `d% ${roll} · ${formatBand(band)} → nenhum item`
    );
  }

  if (band.outcome.kind === "table") {
    const children = resolveTableOutcome(band.outcome);
    return makeStep(
      label,
      roll,
      summarizeGroupedChildren(children),
      detail,
      children
    );
  }

  return makeStep(label, roll, describeOutcomeBand(band), detail);
}

function rollColumnWithDouble(
  label: string,
  bands: RollBand[],
  modifier: TreasureModifier,
  column: "money" | "items"
): RollStep[] {
  if (modifier === "dobro") {
    return [
      rollColumn(`${label} (1ª rolagem)`, bands, modifier, column),
      rollColumn(`${label} (2ª rolagem)`, bands, modifier, column),
    ];
  }
  return [rollColumn(label, bands, modifier, column)];
}

export function rollTreasure(nd: number, modifier: TreasureModifier): RollTrace {
  const row = getTreasureRow(nd);
  if (!row) {
    return {
      nd,
      modifier,
      steps: [
        makeStep(
          "Erro",
          0,
          `ND ${nd} não encontrado`,
          `ND ${nd} não encontrado nas tabelas.`
        ),
      ],
    };
  }

  const steps: RollStep[] = [
    ...rollColumnWithDouble(`Dinheiro (ND ${nd})`, row.money, modifier, "money"),
    ...rollColumnWithDouble(`Itens (ND ${nd})`, row.items, modifier, "items"),
  ];

  return { nd, modifier, steps };
}
