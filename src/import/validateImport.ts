import { z } from "zod";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  source: "pathbuilder" | "unknown";
}

// Minimal Pathbuilder shape we need to be able to work with
const PathbuilderBuildSchema = z.object({
  name: z.string().optional(),
  level: z.number().optional(),
  ancestry: z.string().optional(),
  heritage: z.string().optional(),
  background: z.string().optional(),
  class: z.string().optional(),
  subclass: z.string().optional(),
  keyability: z.string().optional(),
  abilities: z.record(z.string(), z.unknown()).optional(),
  feats: z.array(z.unknown()).optional(),
  spellCasters: z.array(z.unknown()).optional(),
  equipment: z.array(z.unknown()).optional(),
  weapons: z.array(z.unknown()).optional(),
  armor: z.array(z.unknown()).optional(),
});

const PathbuilderRootSchema = z.object({
  build: PathbuilderBuildSchema,
});

export function validateImport(json: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof json !== "object" || json === null) {
    return { valid: false, errors: ["JSON is not an object."], warnings: [], source: "unknown" };
  }

  // Pathbuilder detection
  if ("build" in (json as Record<string, unknown>)) {
    const result = PathbuilderRootSchema.safeParse(json);
    if (!result.success) {
      errors.push("JSON looks like Pathbuilder but has an unexpected shape.");
      result.error.issues.forEach((i) => warnings.push(`Schema issue: ${i.path.join(".")} — ${i.message}`));
    }

    const build = (json as Record<string, unknown>).build as Record<string, unknown>;
    if (!build.name) errors.push("Character name is missing.");
    if (!build.level) errors.push("Character level is missing.");
    if (!build.class) warnings.push("Character class is missing; class feats may not be categorised.");
    if (!build.feats || (build.feats as unknown[]).length === 0) warnings.push("No feats found.");
    if (!build.spellCasters || (build.spellCasters as unknown[]).length === 0)
      warnings.push("No spellcasting data found; spell cards will not be generated.");
    if (!build.equipment || (build.equipment as unknown[]).length === 0)
      warnings.push("No equipment found.");

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      source: "pathbuilder",
    };
  }

  errors.push("Unsupported format: could not detect a known character export (expected a Pathbuilder JSON with a 'build' key).");
  return { valid: false, errors, warnings, source: "unknown" };
}
