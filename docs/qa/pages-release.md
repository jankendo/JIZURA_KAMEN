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
by itself. No producer or self-contained publication bundle is supplied by this patch:
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

## Recovered real evidence and remaining quality work

On 2026-10-20, `/workspace/kamen-evidence/` was absent. Direct storage download
of CI artifact 12197471775 returned HTTP 403, but this was not a complete evidence
access block. The existing GitHub connector recovered a small Native artifact,
and GitHub API recovered the actual canonical manifest and ledgers from immutable
ref `bd38de83ecff998c3a45821a6e01da233f106ad3` under
`docs/qa/generalization/composition-recovery/`:

- `release-current-head/release-gate-manifest.json` (raw SHA-256
  `bf38578e35d6c7cc4f62ad4406efdcaec0e8821516aca9963a966bf78b71352c`).
- `release-recovery-20261019/clock-complete-ledger.json.gz` (SHA-256
  `044eac6ca1dba8b14cb08c4777264476079d9896809ffbc04acf6be6c2f8938d`).
- `release-recovery-20261019/current31-partial-population.json.gz` (SHA-256
  `6e71cb3387c3fa0d4aa405c829a56aeeaec3d3314bc7b4f238072bb9f4659e60`).

The canonical manifest, hash-bound direct evidence, two SKIP alternatives and three
finished-artifact observations were recovered. Its original CI merge checkout
`5a38c44766a7a9cb6289d61374bb6257ce2a76e1` was fetched, and its actual full tree
matches PR HEAD `0a5c896fcf1a734b4f18d3f2467c285ba7c6a1fc` through the recorded
Git correspondence. Re-running the existing evaluator on the original evidence
(replacing only `gitRepository` with the local checkout path) reproduced
**TECHNICAL_GO PASS / QUALITY_GO UNVERIFIED / RELEASE_GO UNVERIFIED** for that PR
HEAD. No CI or production MP4 was regenerated. Raw manifest bytes and the
normalized evaluator `manifestSHA256` are different hashes; do not interchange
those with the reviewed publication input. This does not certify the new adapter
commit or satisfy the stronger latest-candidate/publication contract.

Both ledgers contain 1,250 rows: 772 dynamic, 280 composite, 77 static, 27 manual
and 94 identity rows. The conservative important population is exactly 1,129
(772+280+77); its rows are encoded-UNMEASURED, have no actual decoded timestamp,
no counterfactual, and no finalized target contract. The partial ledger is
source-bound to `5eb02e6`, the clock-complete ledger to `d04c734`; neither can
silently certify current source. Current `0a5c896` operators correctly retain
`importanceClassificationFinalized:false`, zero finalized expected IDs and zero
observations. Full important-population proof is still required, not a sampling
extrapolation.

Minimum remaining work, without mass re-encoding:

- Restore/review the retained movies, input/PCM/profile/plan and candidate
  selection records; assemble a self-contained producer artifact. The recovered
  canonical manifest itself lacks the new latest-candidate binding. Preserve
  original sources and JSON observations; relocate bundle paths with updated
  hashes rather than accepting escaping paths. Existing test summaries alone
  cannot replace exit-code/build/SKIP/browser observations.
- Finalize each important Intent's target, interval and intended phase. For 1,052
  dynamic/composite rows, register semantic/phase models and independent component
  attribution, then reuse original/control/repeat media where they exist. For 77
  static rows, distinguish local HOLD identity from world-space static proof;
  require all-glyph rasters over the full interval and a coded moving sensitivity
  control. Generate controls only where actually missing.
- A minimum measurement-pipeline check uses one static, one dynamic and one
  composite case; it does not certify all 1,129. A concrete static row is
  `0328a74e22265c06f8d4084f1a939fb039e6fa3f55d404392a1dcede39be92ea`
  in `development-01`, lyric 窓辺に, interval [0.3, 1.2013513513513514).
  Freeze its full glyph/clock contract before observing the retained movie.
- Complete the 31 source/input/seed/profile-matched comparison judgments. Every
  `significantRegression` remains null in the recovered blockers; a proxy score
  alone cannot decide music/phrase-level major regression. Reobserve missing
  intervals of existing media with `dev/cinema_v5_reobserve_final.cjs` where
  applicable. Do not invent a new acceptance threshold.
- Resolve the historical decoded-original reproduction cases `development-01`,
  `development-07`, `holdout-01`, `holdout-07`, `supplemental-development-13`,
  `supplemental-holdout-13`. The latest retained remaining-conditions document
  still lists them. Their old d04 movie hashes differ from all corresponding
  recovered 5eb movies. Their strict original decoded identity remains false;
  pixel conversion versus historical encoder causes are not established.
  Native continuity run 39337531341 verifies the 5eb movies' Native frames against
  current rendering, not the old d04 encoded-original identity. Neither current
  movie decode failure nor resolution of the old six follows from Native32.

The old cinema-v3 five contrast/independent-brief gaps are separate historical
records, not the six cases above. Never transfer old NO_GO or sparse-sheet
positives to current source without matched evidence. The production workflow
continues to reject incomplete quality and safety/source correspondence.

No public preview is added: local build/serve and existing validation artifacts do
not overwrite main Pages. The existing successful production remains online.
Formal quality cannot be completed by modifying an evaluator or writing PASS flags.
