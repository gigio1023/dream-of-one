import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildSameOrderAgenticRouteProofs } from "../runtime/same-order-agentic-routes.js";
import { buildSameOrderAssetBillOfMaterialsReport } from "../runtime/same-order-asset-bill-of-materials.js";
import { buildSameOrderComprehensionProxyReport } from "../runtime/same-order-comprehension-proxy.js";
import { buildSameOrderPlayerComprehensionPlaytestPacket } from "../runtime/same-order-player-comprehension-playtest.js";
import { buildSameOrderProviderActionComparison } from "../runtime/same-order-provider-action-comparison.js";
import { buildSameOrderProviderDispatchContractReport } from "../runtime/same-order-provider-dispatch-contract.js";
import { buildSameOrderProviderSchedulingReport } from "../runtime/same-order-provider-scheduling.js";
import { buildSameOrderStoryletRuntimeMapReport } from "../runtime/same-order-storylet-runtime-map.js";
import { buildSameOrderVisualEvidenceProxyReport } from "../runtime/same-order-visual-evidence-proxy.js";

const repoRoot = resolve(new URL("../../../../", import.meta.url).pathname);
const artifactPath = resolve(repoRoot, "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json");

const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as Record<string, unknown>;
const playability = readRecord(artifact.playability);

playability.agenticRouteProofs = buildSameOrderAgenticRouteProofs();
playability.providerActionComparison = buildSameOrderProviderActionComparison();
playability.providerSchedulingPlan = buildSameOrderProviderSchedulingReport();
playability.providerDispatchContract = buildSameOrderProviderDispatchContractReport();
playability.storyletRuntimeMap = buildSameOrderStoryletRuntimeMapReport();
playability.assetBillOfMaterials = buildSameOrderAssetBillOfMaterialsReport({ repoRoot });
playability.visualEvidenceProxy = buildSameOrderVisualEvidenceProxyReport({ repoRoot });
playability.comprehensionProxy = buildSameOrderComprehensionProxyReport(artifact);
playability.playerComprehensionPlaytestPacket = buildSameOrderPlayerComprehensionPlaytestPacket(artifact);
artifact.playability = playability;

writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  artifactPath: "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json",
  attached: [
    "agenticRouteProofs",
    "providerActionComparison",
    "providerSchedulingPlan",
    "providerDispatchContract",
    "storyletRuntimeMap",
    "assetBillOfMaterials",
    "visualEvidenceProxy",
    "comprehensionProxy",
    "playerComprehensionPlaytestPacket",
  ],
}, null, 2));

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
