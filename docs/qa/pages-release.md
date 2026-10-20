# Certified Pages publication

Current production remains https://jankendo.github.io/JIZURA_KAMEN/ at
`2e7ed477f88028dbb63aa609e8a11b4052ea8c00`. Do not change Pages settings: Actions
source, main-only environment and HTTPS are healthy. PR #13 upload/deploy SKIPs
were intentional. Its successful run 39257690138 took 121m45s (browser 33m43s),
so retain the existing 360m job / 145m browser limits without reducing tests.

`build.yml` validates push/PR/manual runs without publishing. `publish-pages.yml`
is a separate, main-only manual production action. Dispatching it is the explicit
approval to publish the supplied SHA, after reviewing the actual evidence. A merge
or green unit suite alone never publishes. It reuses a completed successful full
`build.yml` run at exactly that SHA; it only rebuilds the deterministic static
site and decodes the single selected final MP4. It does not rerun the long full
CI or generate replacement movies. Older media can be reused only through the
existing evaluator's exact Git/source correspondence, preserving original labels.

## Evidence intake contract

The approved SHA needs a successful, independent Actions evidence-producer run
in this repository at that same SHA, containing exactly one unexpired artifact
named `kamen-release-evidence`. Its extracted root contains `manifest.json` and
all referenced JSON/gzip/MP4 files. Use Actions `upload-artifact` to retain the
assembled bundle. The producer is an evidence assembly step, not a certification
by itself. No producer or real canonical bundle is supplied by this patch:
existing `kamen-validation` is a different artifact, and cannot be renamed to
manufacture missing observations. The producer run ID and reviewed manifest
SHA-256 are explicit publication inputs; its repository/SHA/success and artifact
ID/digest are checked through GitHub API. Artifact retention must cover review.

The existing `dev/release_gates.cjs` manifest contract applies unchanged, with:

- `releaseSourceCommit`: exact approved/current main SHA.
- `evidence.ci`: successful completed full `build.yml` run, exact repository/SHA.
- `evidence.tests.build.outputSHA256`: SHA-256 of that source's `dist/index.html`.
- `evidence.operators.proofSchema`: 3, finalized frozen population and complete
  typed semantic, phase and attribution proof. Legacy scalar proofs cannot release.
- `latestCandidate`: hash-bound JSON reference (same `{path,sha256}` convention).

The latest-candidate JSON must contain `sourceCommit` (release target),
`selectionFinalized:true`, `artifactId` (one ID in `evidence.artifacts.movies`),
`movieSourceCommit` (preserved original observation SHA), and `media:{path,sha256}`.
It also contains `selectedCandidateId`, `videoSHA256`, `inputHash`, `planHash`,
`rendererVersion`, and `outputProfile`. Those six fields must match both the
finished movie row and its raw observation exactly. The raw observation also
retains its original `sourceCommit`, codecs H.264/AAC and complete successful decode
result. Do not invent fields from status strings: retain actual input, plan,
selection and decoding records. The selected actual MP4 is hashed, probed and
fully decoded again at the final publication boundary; this is one final integrity
check, not a bulk film regeneration. All evidence references must stay inside the
bundle with matching hashes and no symlinks. The trusted checkout's evaluator is
used; downloaded code/repositories are never executed. Source-correspondence
Git commands use only checkout history. The two new release adapter files are
explicit QA-only paths; correspondence tree proofs must be regenerated with the
updated exact exclusions (no expansion to arbitrary `dev/` files).

All TECHNICAL_GO / QUALITY_GO / RELEASE_GO values must be PASS. Missing evidence,
stale source, mismatched files, failed or unmeasured quality block publication.
`pages_release_test.cjs` uses synthetic fixtures, including synthetic media headers;
its PASS is not real CI/browser/MP4 or release certification.

## Approved publication procedure

1. Complete/review quality evidence. Keep PR #13 Draft until quality is certified.
2. After separately approved merge, let the normal full CI finish at the final
   main SHA. Rebind evidence using exact verified correspondence where applicable;
   never relabel older movie source SHAs or extrapolate sparse frames to full proof.
3. Assemble/upload the complete bundle from the same SHA with a successful
   evidence-producer run, then review `sha256sum manifest.json` and candidate.
4. With explicit user release approval, dispatch (replace every placeholder):

   ```sh
   gh workflow run publish-pages.yml --repo jankendo/JIZURA_KAMEN --ref main \
     -f approved_sha=EXACT_MAIN_SHA \
     -f evidence_run_id=SUCCESSFUL_PRODUCER_RUN_ID \
     -f manifest_sha256=REVIEWED_MANIFEST_SHA256
   ```

5. Inspect `kamen-release-decision`, deployment and automatic HTTPS/source check;
   independently confirm embedded `KAMEN_BUILD_INFO.sourceCommit` equals approved SHA and
   `sourceDirty:false`. Verify image/audio/TXT/LRC input, export/save and complete
   MP4 decode in a real browser. Until checked, these post-publication items remain
   UNVERIFIED. This patch does not assert a production deployment occurred.

The workflow serializes production releases and rechecks current main immediately
before deploy. If main has advanced, stop and prepare evidence for current main.
It does not silently roll production back to a delayed older build. Rollback is
an explicitly approved revert commit on main, followed by source correspondence,
CI/quality review and the same approved dispatch. No force push or branch policy
change is required. The existing successful production stays online on rejection.

## Remaining real quality evidence

On 2026-10-20, `/workspace/kamen-evidence/` was absent. CI #39257690138 succeeded
for PR head `0a5c896fcf1a734b4f18d3f2467c285ba7c6a1fc`; its artifact
12197471775 (`kamen-validation`, 438707885 bytes) existed, but the storage download
endpoint returned HTTP 403 from this environment. No canonical release manifest,
Intent population or candidate media was recovered. Therefore current evaluator
TECHNICAL_GO / QUALITY_GO / RELEASE_GO are UNVERIFIED here. Prior technical PASS
and the conservative 1129-important/1250-total counts are historical claims, not
new certifications. Native recovery run 39337531341 is a different workflow/SHA;
reuse it only after verifying full source/input/profile/frame correspondence.

Minimum remaining work, without mass re-encoding:

- Recover the original canonical manifest, frozen execution ledger/contracts,
  candidate selection/plan, raw browser/SKIP alternatives and MP4/hash records.
  `kamen-tests.json` alone lacks the evaluator's exit-code/build/SKIP contracts.
- Reconcile every conservatively important Intent by ID and finalized importance;
  require original/control/repeat movie bindings and decoded target measurements
  over declared intervals. Static proofs require full glyph rasters and sensitivity
  control; dynamic/composite proofs require semantic samples and attribution.
- Resolve significant-regression judgments and the old six comparison gaps using
  exact source/input/seed/profile correspondence and complete decoded comparisons.
  Reobserve missing intervals of existing media with
  `dev/cinema_v5_reobserve_final.cjs` when applicable. Only generate new isolated
  controls/repeats when the required original evidence genuinely does not exist.
- Do not transfer the old cinema-v3 NO_GO or sparse-sheet positives to this SHA:
  that report was source-bound to an older revision and also recorded unmeasured
  contrast/independent conditions. Current pass/fail needs actual matched proof.

No public preview is added: local build/serve and existing validation artifacts do
not overwrite the main Pages site. Formal quality cannot be completed from absent
raw evidence by modifying an evaluator or writing PASS flags.
