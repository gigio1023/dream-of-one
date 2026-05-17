import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const SAME_ORDER_ASSET_BOM_VERSION = "same-order-asset-bom-v1" as const;

export interface SameOrderAssetBomSourcePack {
  id: string;
  sourceName: string;
  sourceUrl: string;
  localPath: string;
  license: "Creative Commons Zero, CC0" | "Project-authored procedural";
  licensePath?: string;
  licensePresent: boolean;
  licenseClearForCommercialUse: boolean;
  referencedFiles: string[];
  missingFiles: string[];
  notes: string;
}

export interface SameOrderAssetBomProcedureProp {
  propId: string;
  category: "procedure-cue" | "stateful-record" | "civic-feedback";
  source: "project-authored procedural mesh";
  stateSource: "playableSummary.worldRecordProps";
  evidencePath: string;
  visible: boolean;
  labelPresent: boolean;
  bodyPresent: boolean;
  pass: boolean;
  replacementPlan: string;
}

export interface SameOrderAssetBomReport {
  version: typeof SAME_ORDER_ASSET_BOM_VERSION;
  proofType: "operation-sim-asset-bill-of-materials";
  pass: boolean;
  freshVisualRequired: true;
  sourcePacks: SameOrderAssetBomSourcePack[];
  procedureProps: SameOrderAssetBomProcedureProp[];
  uiAssets: Array<{
    id: string;
    source: "project-authored Godot UI";
    files: string[];
    license: "project-owned";
    replacementPlan: string;
    pass: boolean;
  }>;
  audioAssets: Array<{
    id: string;
    status: "not_in_m1_slice";
    sourcePlan: string;
    licenseRequirement: "CC0 or project-authored";
    pass: boolean;
  }>;
  failures: string[];
  verdict: "ASSET_BOM_PASS_FRESH_VISUAL_REQUIRED" | "ASSET_BOM_FAIL";
  remainingRequiredEvidence: string[];
}

const REQUIRED_PROPS = [
  { propId: "receipt_tray", category: "stateful-record" },
  { propId: "correction_slip", category: "stateful-record" },
  { propId: "report_tray", category: "stateful-record" },
  { propId: "station_dossier", category: "stateful-record" },
  { propId: "civic_economy_panel", category: "civic-feedback" },
] as const;

const SOURCE_PACK_SPECS = [
  {
    id: "kenney-city-kit-roads",
    sourceName: "Kenney City Kit Roads",
    sourceUrl: "https://kenney.nl/assets/city-kit-roads",
    localPath: "godot/assets/kenney/city-kit-roads",
    licensePath: "godot/assets/kenney/city-kit-roads/LICENSE.txt",
    referencedFiles: [
      "construction-barrier.glb",
      "construction-cone.glb",
      "construction-light.glb",
      "road-crossing.glb",
      "road-side.glb",
      "sign-highway.glb",
      "sign-highway-wide.glb",
    ],
    notes: "Store/Station route readability, intake barriers, signs, and queue/watcher dressing.",
  },
  {
    id: "kenney-city-kit-commercial",
    sourceName: "Kenney City Kit Commercial",
    sourceUrl: "https://kenney.nl/assets/city-kit-commercial",
    localPath: "godot/assets/kenney/city-kit-commercial",
    licensePath: "godot/assets/kenney/city-kit-commercial/LICENSE.txt",
    referencedFiles: [
      "detail-awning-wide.glb",
      "detail-awning.glb",
      "low-detail-building-a.glb",
      "low-detail-building-wide-a.glb",
    ],
    notes: "Readable Store and Station building silhouettes plus entrance affordance cues.",
  },
  {
    id: "kenney-city-kit-suburban",
    sourceName: "Kenney City Kit Suburban",
    sourceUrl: "https://kenney.nl/assets/city-kit-suburban",
    localPath: "godot/assets/kenney/city-kit-suburban",
    licensePath: "godot/assets/kenney/city-kit-suburban/LICENSE.txt",
    referencedFiles: [
      "driveway-short.glb",
      "planter.glb",
    ],
    notes: "Low-cost Store/Station threshold dressing; not gameplay authority.",
  },
] as const;

export function buildSameOrderAssetBillOfMaterialsReport(input: {
  repoRoot: string;
  playableSlicePath?: string;
}): SameOrderAssetBomReport {
  const playableSlicePath = input.playableSlicePath
    ?? "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json";
  const evidence = readJson(resolve(input.repoRoot, playableSlicePath));
  const worldRecordProps = asRecord(asRecord(evidence.playableSummary).worldRecordProps);
  const worldGeneratorPath = "godot/scripts/world/world_generator.gd";
  const worldGenerator = readTextIfExists(resolve(input.repoRoot, worldGeneratorPath));

  const sourcePacks = SOURCE_PACK_SPECS.map(spec => sourcePack(input.repoRoot, spec));
  const procedureProps = REQUIRED_PROPS.map(spec =>
    procedureProp(spec.propId, spec.category, worldRecordProps, worldGenerator),
  );
  const uiAssets = [
    {
      id: "social-stealth-hud-record-state-line",
      source: "project-authored Godot UI" as const,
      files: [
        "godot/scenes/ui/social_stealth_hud.tscn",
        "godot/scripts/ui/social_stealth_hud.gd",
      ],
      license: "project-owned" as const,
      replacementPlan: "Keep project-authored HUD until a licensed icon/font pass is intentionally added.",
      pass: existsSync(resolve(input.repoRoot, "godot/scenes/ui/social_stealth_hud.tscn"))
        && existsSync(resolve(input.repoRoot, "godot/scripts/ui/social_stealth_hud.gd")),
    },
  ];
  const audioAssets = [
    {
      id: "same-order-operation-sim-audio-cues",
      status: "not_in_m1_slice" as const,
      sourcePlan: "Add only CC0 or project-authored receipt, correction, report, and Station stamp cues after visual/player comprehension proof.",
      licenseRequirement: "CC0 or project-authored" as const,
      pass: true,
    },
  ];

  const failures: string[] = [];
  for (const pack of sourcePacks) {
    if (!pack.licensePresent) {
      failures.push(`${pack.id} missing local license`);
    }
    if (!pack.licenseClearForCommercialUse) {
      failures.push(`${pack.id} license is not confirmed CC0/commercial-clear`);
    }
    for (const missing of pack.missingFiles) {
      failures.push(`${pack.id} missing asset file: ${missing}`);
    }
  }
  for (const prop of procedureProps) {
    if (!prop.pass) {
      failures.push(`${prop.propId} missing visible labelled evidence prop`);
    }
  }
  for (const ui of uiAssets) {
    if (!ui.pass) {
      failures.push(`${ui.id} missing project-authored UI files`);
    }
  }

  const pass = failures.length === 0;

  return {
    version: SAME_ORDER_ASSET_BOM_VERSION,
    proofType: "operation-sim-asset-bill-of-materials",
    pass,
    freshVisualRequired: true,
    sourcePacks,
    procedureProps,
    uiAssets,
    audioAssets,
    failures,
    verdict: pass ? "ASSET_BOM_PASS_FRESH_VISUAL_REQUIRED" : "ASSET_BOM_FAIL",
    remainingRequiredEvidence: [
      "Re-run Godot visual capture after any asset or prop changes.",
      "Run human readability review on Store/Station props in the refreshed contact sheet.",
      "Do not add paid or marketplace assets without source URL, license note, and replacement plan.",
    ],
  };
}

function sourcePack(
  repoRoot: string,
  spec: (typeof SOURCE_PACK_SPECS)[number],
): SameOrderAssetBomSourcePack {
  const licenseText = readTextIfExists(resolve(repoRoot, spec.licensePath));
  const licensePresent = licenseText.length > 0;
  const licenseClearForCommercialUse = licenseText.includes("Creative Commons Zero")
    && licenseText.includes("CC0")
    && licenseText.includes("commercial purposes");
  const missingFiles = spec.referencedFiles.filter(file =>
    !existsSync(resolve(repoRoot, spec.localPath, file)),
  );

  return {
    id: spec.id,
    sourceName: spec.sourceName,
    sourceUrl: spec.sourceUrl,
    localPath: spec.localPath,
    license: "Creative Commons Zero, CC0",
    licensePath: spec.licensePath,
    licensePresent,
    licenseClearForCommercialUse,
    referencedFiles: [...spec.referencedFiles],
    missingFiles,
    notes: spec.notes,
  };
}

function procedureProp(
  propId: string,
  category: SameOrderAssetBomProcedureProp["category"],
  worldRecordProps: Record<string, unknown>,
  worldGenerator: string,
): SameOrderAssetBomProcedureProp {
  const prop = asRecord(worldRecordProps[propId]);
  const visible = readBoolean(prop.visible);
  const labelPresent = readString(prop.label).length > 0;
  const bodyPresent = readBoolean(prop.hasBody);
  const generatedByWorld = worldGenerator.includes(`"${propId}"`);

  return {
    propId,
    category,
    source: "project-authored procedural mesh",
    stateSource: "playableSummary.worldRecordProps",
    evidencePath: `playableSummary.worldRecordProps.${propId}`,
    visible,
    labelPresent,
    bodyPresent,
    pass: visible && labelPresent && bodyPresent && generatedByWorld,
    replacementPlan: "Replace with a licensed or project-authored low-poly prop only after preserving the same label/state/evidence fields.",
  };
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function readTextIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown): boolean {
  return value === true;
}
