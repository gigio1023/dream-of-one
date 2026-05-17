import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildSameOrderAssetBillOfMaterialsReport,
  type SameOrderAssetBomReport,
} from "../../src/runtime/same-order-asset-bill-of-materials.js";

const repoRoot = new URL("../../../..", import.meta.url).pathname;

test("Same Order asset bill of materials verifies current Store and Station asset sources", () => {
  const report = buildSameOrderAssetBillOfMaterialsReport({ repoRoot });

  assert.equal(report.pass, true, JSON.stringify(report.failures, null, 2));
  assert.equal(report.verdict, "ASSET_BOM_PASS_FRESH_VISUAL_REQUIRED");
  assert.equal(report.freshVisualRequired, true);
  assert.deepEqual(report.sourcePacks.map(pack => pack.id), [
    "kenney-city-kit-roads",
    "kenney-city-kit-commercial",
    "kenney-city-kit-suburban",
  ]);
  assert.equal(report.sourcePacks.every(pack => pack.licensePresent && pack.licenseClearForCommercialUse), true);
  assert.equal(report.sourcePacks.every(pack => pack.missingFiles.length === 0), true);
  assert.deepEqual(report.procedureProps.map(prop => prop.propId), [
    "receipt_tray",
    "correction_slip",
    "report_tray",
    "station_dossier",
    "civic_economy_panel",
  ]);
  assert.equal(report.procedureProps.every(prop => prop.pass), true);
  assert.equal(report.uiAssets.every(asset => asset.pass), true);
  assert.equal(report.audioAssets.every(asset => asset.status === "not_in_m1_slice" && asset.pass), true);
});

test("playable slice evidence carries Same Order asset bill of materials", () => {
  const artifact = JSON.parse(readText(
    join(repoRoot, "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"),
  )) as {
    playability?: {
      assetBillOfMaterials?: SameOrderAssetBomReport;
    };
  };
  const expected = buildSameOrderAssetBillOfMaterialsReport({ repoRoot });

  assert.deepEqual(artifact.playability?.assetBillOfMaterials, JSON.parse(JSON.stringify(expected)));
  assert.equal(artifact.playability?.assetBillOfMaterials?.pass, true);
});

test("Same Order asset bill of materials fails without local license proof", () => {
  const tempRoot = join(tmpdir(), `dream-of-one-asset-bom-${Date.now()}`);
  mkdirSync(join(tempRoot, "data/evidence/godot/playable-slice"), { recursive: true });
  mkdirSync(join(tempRoot, "godot/scripts/world"), { recursive: true });
  mkdirSync(join(tempRoot, "godot/scenes/ui"), { recursive: true });
  mkdirSync(join(tempRoot, "godot/scripts/ui"), { recursive: true });
  for (const folder of [
    "city-kit-roads",
    "city-kit-commercial",
    "city-kit-suburban",
  ]) {
    mkdirSync(join(tempRoot, "godot/assets/kenney", folder), { recursive: true });
  }
  writeFileSync(
    join(tempRoot, "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"),
    JSON.stringify({
      playableSummary: {
        worldRecordProps: Object.fromEntries([
          "receipt_tray",
          "correction_slip",
          "report_tray",
          "station_dossier",
          "civic_economy_panel",
        ].map(propId => [propId, { visible: true, label: propId, hasBody: true }])),
      },
    }),
  );
  writeFileSync(
    join(tempRoot, "godot/scripts/world/world_generator.gd"),
    "\"receipt_tray\" \"correction_slip\" \"report_tray\" \"station_dossier\" \"civic_economy_panel\"",
  );
  writeFileSync(join(tempRoot, "godot/scenes/ui/social_stealth_hud.tscn"), "[node]");
  writeFileSync(join(tempRoot, "godot/scripts/ui/social_stealth_hud.gd"), "extends CanvasLayer");

  const report = buildSameOrderAssetBillOfMaterialsReport({ repoRoot: tempRoot });

  assert.equal(report.pass, false);
  assert.equal(report.verdict, "ASSET_BOM_FAIL");
  assert.equal(report.failures.some(failure => failure.includes("missing local license")), true);
});

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
