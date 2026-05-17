import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildSameOrderVisualEvidenceProxyReport,
} from "../../src/runtime/same-order-visual-evidence-proxy.js";

const repoRoot = new URL("../../../..", import.meta.url).pathname;

test("Same Order visual evidence proxy verifies fresh Store capture artifacts", () => {
  const report = buildSameOrderVisualEvidenceProxyReport({ repoRoot });

  assert.equal(report.pass, true, JSON.stringify(report, null, 2));
  assert.equal(report.verdict, "FRESH_CAPTURE_VERIFIED_HUMAN_REVIEW_REQUIRED");
  assert.equal(report.freshCapture, true);
  assert.equal(report.humanReadabilityRequired, true);
  assert.equal(report.ledgerAffordanceVisibility.implementedInScripts, true);
  assert.equal(report.ledgerAffordanceVisibility.currentArtifactHasAffordance, true);
  assert.equal(report.ledgerAffordanceVisibility.freshGodotEvidence, true);
  assert.equal(report.typedInputEvidence.implementedInScripts, true);
  assert.equal(report.typedInputEvidence.currentArtifactUsesTypedInput, true);
  assert.equal(report.typedInputEvidence.currentArtifactUsesInternalFallback, false);
  assert.equal(report.typedInputEvidence.freshGodotEvidence, true);
  assert.equal(report.recordPropVisibility.currentManifestHasRequiredProps, true);
  assert.equal(report.recordPropVisibility.missing.length, 0);
  assert.equal(report.blockedChecks.length, 0);
  assert.deepEqual(
    report.captureChecks.map(check => check.role),
    [
      "opening-store-framing",
      "store-rule-guide-readable",
      "active-conversation-hud",
      "conversation-why-line",
      "store-record-props-closeup",
      "inquest-session-end",
      "station-record-props-closeup",
      "repair-correction-slip-closeup",
    ],
  );
  assert.equal(report.captureChecks.every(check => check.actualWidth === 1280 && check.actualHeight === 720), true);
  assert.equal(report.contactSheet.actualWidth, 1280);
  assert.equal(report.contactSheet.actualHeight, 1440);
});

test("Same Order playable slice evidence carries the visual evidence proxy report", () => {
  const artifact = JSON.parse(readFileSync(
    join(repoRoot, "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"),
    "utf8",
  )) as {
    playability?: {
      visualEvidenceProxy?: unknown;
    };
  };
  const report = buildSameOrderVisualEvidenceProxyReport({ repoRoot });

  assert.deepEqual(artifact.playability?.visualEvidenceProxy, report);
});

test("Same Order visual evidence proxy fails when a required screenshot is missing", () => {
  const tempRoot = join(tmpdir(), `dream-of-one-visual-proxy-${Date.now()}`);
  mkdirSync(join(tempRoot, "data/evidence/godot/visual-capture"), { recursive: true });
  writeFileSync(join(tempRoot, "data/evidence/godot/visual-capture/manifest.json"), JSON.stringify({
    blockedChecks: [],
    captures: [
      {
        role: "opening-store-framing",
        artifactPath: "data/evidence/godot/screenshots/missing.png",
        width: 1280,
        height: 720,
        requiresHumanReadabilityReview: true,
        expectedContent: ["non-empty 1280x720 viewport"],
      },
    ],
    contactSheet: {
      artifactPath: "data/evidence/godot/visual-capture/missing-contact-sheet.png",
      width: 1280,
      height: 1080,
    },
  }, null, 2));

  const report = buildSameOrderVisualEvidenceProxyReport({ repoRoot: tempRoot });

  assert.equal(report.pass, false);
  assert.equal(report.verdict, "VISUAL_PROXY_FAIL");
  assert.equal(report.captureChecks[0].missing.includes("file"), true);
  assert.equal(report.contactSheet.missing.includes("file"), true);
});
