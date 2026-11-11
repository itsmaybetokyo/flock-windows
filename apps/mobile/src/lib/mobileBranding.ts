export type MobileStageLabel = "Dev" | "Nightly";

/** Fork: every mobile surface says Flock, and a release build carries no stage badge. */
export const MOBILE_BRAND_NAME = "Flock";

export function resolveMobileStageLabel(appVariant: unknown): MobileStageLabel | null {
  if (appVariant === "development") return "Dev";
  if (appVariant === "preview") return "Nightly";
  return null;
}
