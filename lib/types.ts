export type TableId =
  | "riches"
  | "misc-items"
  | "equipment"
  | "potions"
  | "superiors"
  | "magic"
  | "magic-accessories";

export type RichesTier = "minor" | "medium" | "major";

export type EquipmentCategory = "weapons" | "armor" | "esoteric";

export type MagicAccessoryTier = "minor" | "medium" | "major";

export type TreasureModifier = "padrao" | "metade" | "dobro";

export type RollBand = {
  min: number;
  max: number;
  outcome: TreasureOutcome;
};

export type TreasureOutcome =
  | { kind: "none" }
  | { kind: "coins"; formula: string; currency?: string }
  | {
      kind: "riches";
      tier: RichesTier;
      count: number;
      countFormula?: string;
      bonusPercent?: boolean;
    }
  | {
      kind: "table";
      table: TableId;
      rolls?: number;
      rollCountFormula?: string;
      improvements?: number;
      magicTier?: MagicAccessoryTier;
      bonusPercent?: boolean;
    };

export type TreasureNdRow = {
  nd: number;
  money: RollBand[];
  items: RollBand[];
};

export type TableEntry = {
  min: number;
  max: number;
  label: string;
  book?: string;
  page?: number;
  price?: number;
  formula?: string;
  description?: string;
};

export type SplitTable = {
  weapons: TableEntry[];
  armor: TableEntry[];
  esoteric: TableEntry[];
};

export type RichesTable = {
  minor: TableEntry[];
  medium: TableEntry[];
  major: TableEntry[];
};

export type MagicAccessoriesTable = {
  minor: TableEntry[];
  medium: TableEntry[];
  major: TableEntry[];
};

export type MetaData = {
  title: string;
  paragraphs: string[];
  credits: string[];
};

export type RollStep = {
  label: string;
  roll: number;
  /** Texto curto exibido por padrão */
  summary: string;
  /** Rolagens, fórmulas e referências completas */
  detail: string;
  children?: RollStep[];
};

export type RollTrace = {
  nd: number;
  modifier: TreasureModifier;
  steps: RollStep[];
};
