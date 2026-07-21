import logoRecords from "@/research/business-logos.json";

export type BusinessLogoSurface = "light" | "dark";

interface BusinessLogoRecord {
  id: string;
  assetPath: string;
  displaySurface?: BusinessLogoSurface;
}

export const businessLogoById = new Map(
  (logoRecords as BusinessLogoRecord[]).map((record) => [record.id, record]),
);
