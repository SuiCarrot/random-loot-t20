import type {
  MagicAccessoriesTable,
  MetaData,
  RichesTable,
  SplitTable,
  TableEntry,
  TreasureNdRow,
} from "./types";

import treasureByNdJson from "@/data/treasure-by-nd.json";
import richesJson from "@/data/riches.json";
import miscItemsJson from "@/data/misc-items.json";
import equipmentJson from "@/data/equipment.json";
import potionsJson from "@/data/potions.json";
import superiorsJson from "@/data/superiors.json";
import magicJson from "@/data/magic.json";
import magicAccessoriesJson from "@/data/magic-accessories.json";
import metaJson from "@/data/meta.json";

export const treasureByNd: TreasureNdRow[] = (
  treasureByNdJson as { rows: TreasureNdRow[] }
).rows;

export const riches: RichesTable = richesJson as RichesTable;
export const miscItems: TableEntry[] = (miscItemsJson as { entries: TableEntry[] })
  .entries;
export const equipment: SplitTable = equipmentJson as SplitTable;
export const potions: TableEntry[] = (potionsJson as { entries: TableEntry[] })
  .entries;
export const superiors: SplitTable = superiorsJson as SplitTable;
export const magic: SplitTable = magicJson as SplitTable;
export const magicAccessories: MagicAccessoriesTable =
  magicAccessoriesJson as MagicAccessoriesTable;
export const meta: MetaData = metaJson as MetaData;

export function getTreasureRow(nd: number): TreasureNdRow | undefined {
  return treasureByNd.find((r) => r.nd === nd);
}
