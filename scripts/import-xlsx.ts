import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import type {
  MagicAccessoriesTable,
  MetaData,
  RichesTable,
  RichesTier,
  RollBand,
  SplitTable,
  TableEntry,
  TreasureNdRow,
  TreasureOutcome,
} from "../lib/types";

const ROOT = path.resolve(__dirname, "..");
const XLSX_PATH = path.join(
  ROOT,
  "T20 - Tabela de geração de tesouros (1).xlsx"
);
const DATA_DIR = path.join(ROOT, "data");

function cellText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  if (cell.w != null && String(cell.w).trim() !== "") return String(cell.w).trim();
  if (cell.v == null) return "";
  if (cell.t === "n" && typeof cell.v === "number") {
    return Number.isInteger(cell.v) ? String(cell.v) : String(cell.v);
  }
  return String(cell.v).trim();
}

function readGrid(ws: XLSX.WorkSheet): string[][] {
  const ref = ws["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      row.push(cellText(ws[XLSX.utils.encode_cell({ r, c })]));
    }
    rows.push(row);
  }
  return rows;
}

function parsePercentRange(text: string): { min: number; max: number } | null {
  const t = text.trim();
  if (!t || t === "—" || t === "-") return null;
  const single = t.match(/^(\d{1,3})$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { min: n, max: n };
  }
  const range = t.match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/);
  if (range) {
    return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  }
  return null;
}

function parseMoneyOutcome(text: string): TreasureOutcome {
  const t = text.trim();
  if (!t || t === "—") return { kind: "none" };

  const bonusPercent = t.includes("+%") || t.includes("+ %");
  const richesMatch = t.match(/riquezas?\s*(menores?|médias?|medias?|maiores?)/i);
  if (richesMatch || /riqueza/i.test(t)) {
    const tier = parseRichesTier(t);
    const countFormula = t.match(/^(1d\d+(?:\+\d+)?)/i)?.[1];
    let count = 1;
    if (countFormula) {
      count = 0;
    } else {
      const n = t.match(/^(\d+)/);
      count = n ? parseInt(n[1], 10) : 1;
    }
    return {
      kind: "riches",
      tier,
      count,
      countFormula: countFormula?.toLowerCase(),
      bonusPercent: bonusPercent || undefined,
    };
  }

  if (/\d+d\d+/i.test(t) || /T\$|TC|TO/i.test(t)) {
    const formula = t.replace(/\s+/g, " ").trim();
    const currency = formula.match(/(T\$|TC|TO)\s*$/i)?.[1]?.toUpperCase();
    return { kind: "coins", formula, currency };
  }

  return { kind: "none" };
}

function parseRichesTier(text: string): RichesTier {
  const t = text.toLowerCase();
  if (t.includes("maior")) return "major";
  if (t.includes("média") || t.includes("media")) return "medium";
  return "minor";
}

function parseItemOutcome(text: string): TreasureOutcome {
  const t = text.trim();
  if (!t || t === "—") return { kind: "none" };

  const bonusPercent = t.includes("+%") || t.includes("+ %");
  const rollsMatch = t.match(/\s+2D$/i);
  const rolls = rollsMatch ? 2 : 1;
  const base = t.replace(/\s+2D$/i, "").trim();
  const lower = base.toLowerCase();

  if (lower.includes("item diverso")) {
    return { kind: "table", table: "misc-items", rolls, bonusPercent: bonusPercent || undefined };
  }

  if (lower.includes("equipamento")) {
    return { kind: "table", table: "equipment", rolls, bonusPercent: bonusPercent || undefined };
  }

  const potionMatch = base.match(/^(1d\d+(?:\+\d+)?|\d+)\s+poções?/i);
  if (potionMatch || lower.includes("poção")) {
    const rollCountFormula = potionMatch?.[1]?.toLowerCase();
    return {
      kind: "table",
      table: "potions",
      rolls: rollCountFormula ? undefined : rolls,
      rollCountFormula,
      bonusPercent: bonusPercent || undefined,
    };
  }

  const superiorMatch = base.match(/superior\s*\((\d+)\s+melhorias?\)/i);
  if (superiorMatch) {
    return {
      kind: "table",
      table: "superiors",
      rolls,
      improvements: parseInt(superiorMatch[1], 10),
      bonusPercent: bonusPercent || undefined,
    };
  }

  const magicMatch = base.match(/mágico\s*\((menor|médio|medio|maior)\)/i);
  if (magicMatch) {
    const tierMap: Record<string, "minor" | "medium" | "major"> = {
      menor: "minor",
      médio: "medium",
      medio: "medium",
      maior: "major",
    };
    return {
      kind: "table",
      table: "magic-accessories",
      rolls,
      magicTier: tierMap[magicMatch[1].toLowerCase()] ?? "minor",
      bonusPercent: bonusPercent || undefined,
    };
  }

  return { kind: "none" };
}

function parseBand(
  percentText: string,
  valueText: string,
  column: "money" | "items"
): RollBand | null {
  const range = parsePercentRange(percentText);
  if (!range) return null;
  const outcome =
    column === "money"
      ? parseMoneyOutcome(valueText)
      : parseItemOutcome(valueText);
  return { ...range, outcome };
}

function parseNdCell(cell: string): number | null {
  const t = cell.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = parseInt(t, 10);
  return n >= 1 && n <= 20 ? n : null;
}

function parseTreasureByNd(ws: XLSX.WorkSheet): TreasureNdRow[] {
  const grid = readGrid(ws);
  const rows: TreasureNdRow[] = [];
  let current: TreasureNdRow | null = null;

  for (const row of grid) {
    const ndNum = parseNdCell(row[0] ?? "");

    if (ndNum != null) {
      if (current) rows.push(current);
      current = { nd: ndNum, money: [], items: [] };
    }

    if (!current) continue;

    const moneyBand = parseBand(row[1] ?? "", row[2] ?? "", "money");
    if (moneyBand) current.money.push(moneyBand);

    const itemBand = parseBand(row[4] ?? "", row[5] ?? "", "items");
    if (itemBand) current.items.push(itemBand);
  }

  if (current) rows.push(current);
  return rows;
}

function parseSimpleTable(
  grid: string[][],
  startRow: number,
  cols: { percent: number; label: number; book?: number; page?: number; price?: number; formula?: number; description?: number }
): TableEntry[] {
  const entries: TableEntry[] = [];
  for (let i = startRow; i < grid.length; i++) {
    const row = grid[i];
    const range = parsePercentRange(row[cols.percent] ?? "");
    const label = (row[cols.label] ?? "").trim();
    if (!range || !label) continue;
    if (label.toLowerCase() === "item" || label.toLowerCase() === "poção") continue;

    const entry: TableEntry = { ...range, label };
    if (cols.book != null) {
      const book = (row[cols.book] ?? "").trim();
      if (book) entry.book = book;
    }
    if (cols.page != null) {
      const page = parseInt(row[cols.page] ?? "", 10);
      if (!Number.isNaN(page)) entry.page = page;
    }
    if (cols.price != null) {
      const price = parseInt(String(row[cols.price] ?? "").replace(/\./g, ""), 10);
      if (!Number.isNaN(price)) entry.price = price;
    }
    if (cols.formula != null) {
      const formula = (row[cols.formula] ?? "").trim();
      if (formula) entry.formula = formula;
    }
    if (cols.description != null) {
      const description = (row[cols.description] ?? "").trim();
      if (description) entry.description = description;
    }
    entries.push(entry);
  }
  return entries;
}

function parseSplitTable(
  grid: string[][],
  blocks: { percent: number; label: number; book: number; page: number }[]
): SplitTable {
  const result: SplitTable = { weapons: [], armor: [], esoteric: [] };
  const keys: (keyof SplitTable)[] = ["weapons", "armor", "esoteric"];

  for (let i = 2; i < grid.length; i++) {
    const row = grid[i];
    blocks.forEach((block, idx) => {
      const range = parsePercentRange(row[block.percent] ?? "");
      const label = (row[block.label] ?? "").trim();
      if (!range || !label) return;
      const entry: TableEntry = { ...range, label };
      const book = (row[block.book] ?? "").trim();
      const page = parseInt(row[block.page] ?? "", 10);
      if (book) entry.book = book;
      if (!Number.isNaN(page)) entry.page = page;
      result[keys[idx]].push(entry);
    });
  }
  return result;
}

function parseRiches(ws: XLSX.WorkSheet): RichesTable {
  const grid = readGrid(ws);
  const table: RichesTable = { minor: [], medium: [], major: [] };

  for (let i = 2; i < grid.length; i++) {
    const row = grid[i];
    const formula = (row[3] ?? "").trim();
    const description = (row[4] ?? "").trim();

    (["minor", "medium", "major"] as const).forEach((tier, colIdx) => {
      const range = parsePercentRange(row[colIdx] ?? "");
      if (!range) return;
      const entry: TableEntry = {
        ...range,
        label: `Riqueza ${tier === "minor" ? "menor" : tier === "medium" ? "média" : "maior"}`,
        formula: formula || undefined,
        description: description || undefined,
      };
      table[tier].push(entry);
    });
  }
  return table;
}

function parseMagicAccessories(ws: XLSX.WorkSheet): MagicAccessoriesTable {
  const grid = readGrid(ws);
  const blocks = [
    { key: "minor" as const, percent: 0, label: 1, price: 2, book: 3, page: 4 },
    { key: "medium" as const, percent: 6, label: 7, price: 8, book: 9, page: 10 },
    { key: "major" as const, percent: 12, label: 13, price: 14, book: 15, page: 16 },
  ];
  const table: MagicAccessoriesTable = { minor: [], medium: [], major: [] };

  for (let i = 2; i < grid.length; i++) {
    const row = grid[i];
    for (const block of blocks) {
      const range = parsePercentRange(row[block.percent] ?? "");
      const label = (row[block.label] ?? "").trim();
      if (!range || !label) continue;
      const entry: TableEntry = { ...range, label };
      const price = parseInt(String(row[block.price] ?? "").replace(/\./g, ""), 10);
      if (!Number.isNaN(price)) entry.price = price;
      const book = (row[block.book] ?? "").trim();
      const page = parseInt(row[block.page] ?? "", 10);
      if (book) entry.book = book;
      if (!Number.isNaN(page)) entry.page = page;
      table[block.key].push(entry);
    }
  }
  return table;
}

function parseMeta(ws: XLSX.WorkSheet): MetaData {
  const grid = readGrid(ws);
  const paragraphs: string[] = [];
  const credits: string[] = [];
  let title = "Geração de Tesouros em Tormenta20";

  for (const row of grid) {
    const text = (row[0] ?? "").trim();
    if (!text) continue;
    if (text.startsWith("Geração de Tesouros")) title = text;
    else if (text.startsWith("Criação da planilha") || text.startsWith("Tormenta é"))
      credits.push(text);
    else if (text.length > 40) paragraphs.push(text);
  }

  return { title, paragraphs, credits };
}

function validateCoverage(name: string, entries: { min: number; max: number }[]) {
  const covered = new Set<number>();
  for (const e of entries) {
    for (let i = e.min; i <= e.max; i++) covered.add(i);
  }
  const missing: number[] = [];
  for (let i = 1; i <= 100; i++) {
    if (!covered.has(i)) missing.push(i);
  }
  if (missing.length > 0 && missing.length < 100) {
    console.warn(`[${name}] faixas d% não cobertas (${missing.length}):`, missing.slice(0, 15).join(", "), missing.length > 15 ? "…" : "");
  }
}

function writeJson(filename: string, data: unknown) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Wrote ${filePath}`);
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`Arquivo não encontrado: ${XLSX_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const wb = XLSX.readFile(XLSX_PATH, { cellText: true, cellDates: true });

  const treasureByNd = parseTreasureByNd(wb.Sheets["Tesouro por ND"]);
  writeJson("treasure-by-nd.json", { rows: treasureByNd });

  const riches = parseRiches(wb.Sheets["Riquezas"]);
  writeJson("riches.json", riches);
  validateCoverage("riches.minor", riches.minor);
  validateCoverage("riches.medium", riches.medium);
  validateCoverage("riches.major", riches.major);

  const miscItems = parseSimpleTable(readGrid(wb.Sheets["Itens Diversos"]), 1, {
    percent: 0,
    label: 1,
    book: 2,
    page: 3,
  });
  writeJson("misc-items.json", { entries: miscItems });
  validateCoverage("misc-items", miscItems);

  const equipment = parseSplitTable(readGrid(wb.Sheets["Equipamentos"]), [
    { percent: 0, label: 1, book: 2, page: 3 },
    { percent: 5, label: 6, book: 7, page: 8 },
    { percent: 10, label: 11, book: 12, page: 13 },
  ]);
  writeJson("equipment.json", equipment);
  validateCoverage("equipment.weapons", equipment.weapons);

  const potions = parseSimpleTable(readGrid(wb.Sheets["Poções"]), 1, {
    percent: 0,
    label: 1,
    price: 2,
    book: 3,
    page: 4,
  });
  writeJson("potions.json", { entries: potions });
  validateCoverage("potions", potions);

  const superiors = parseSplitTable(readGrid(wb.Sheets["Superiores"]), [
    { percent: 0, label: 1, book: 2, page: 3 },
    { percent: 5, label: 6, book: 7, page: 8 },
    { percent: 10, label: 11, book: 12, page: 13 },
  ]);
  writeJson("superiors.json", superiors);

  const magic = parseSplitTable(readGrid(wb.Sheets["Mágicos"]), [
    { percent: 0, label: 1, book: 2, page: 3 },
    { percent: 5, label: 6, book: 7, page: 8 },
    { percent: 10, label: 11, book: 12, page: 13 },
  ]);
  writeJson("magic.json", magic);

  const magicAccessories = parseMagicAccessories(wb.Sheets["Mágicos (Acessórios)"]);
  writeJson("magic-accessories.json", magicAccessories);

  writeJson("meta.json", parseMeta(wb.Sheets["Introdução"]));

  console.log(`Importação concluída: ${treasureByNd.length} NDs.`);
}

main();
