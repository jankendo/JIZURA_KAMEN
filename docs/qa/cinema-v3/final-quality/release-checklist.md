# Cinema V3 aggregate release checklist

Current decision: **NO-GO**. main remains `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`; production is unchanged. No release PR/tag has been created.

- [x] Preserve #1–#6 bases, HEADs, histories, licenses, notices and dependency/source manifest.
- [x] Build and full unit suite; record 184 PASS / 0 FAIL / 2 environment-dependent SKIP.
- [x] Real UI/image/audio/LRC/TXT/analysis/preview/save/restore/Draft MP4, H.264/AAC, complete decode, hashes and errors.
- [x] Real encoder cancellation, resource disposal, retry and best-plan/QA/Hash restoration; controlled black rejection and failed Blob retention.
- [x] Original/additional/held-out sets, repeated same-condition trials and same-Blob observer variation.
- [x] Keep missing metrics and historical failure; do not invent human scores.
- [ ] Resolve remaining interval evidence and major performance regression with actual final MP4s.
- [ ] Confirm the final PR #7 HEAD CI succeeds; the 60-minute cancelled run is preserved.
- [ ] Establish preliminary technical GO. HUMAN_EVALUATION_PENDING alone does not block a TECHNICAL_RELEASE under the latest user instruction; it does not establish artistic superiority.
- [ ] Fetch current main and verify ancestry/includes every #1–#7 commit. The dependency order is #1→#2→#3→#4→#5→#6→#7; do not merge these individually to publishing main.
- [ ] Create one `release/cinema-v3-verified` candidate containing the final #7 HEAD and current main, safely resolve any conflict and retest that exact HEAD.
- [ ] Create an aggregate main PR; confirm exact-HEAD regression/build/real browser/MP4 CI and PR deploy SKIPPED. Respect actual reviews/protection.
- [ ] Record pre-merge main SHA and verified production HTML hash; push a new unique recovery tag without overwriting any tag.
- [ ] Re-evaluate all twelve user release gates; only GO allows formal merge-commit integration.
- [ ] Monitor main Actions/Pages deploy; compare served HTML hash/commit with approved artifacts.
- [ ] Actual HTTPS production E2E: source import, analysis/generation/preview, old/current project save/restore, MP4/QA hashes, ffprobe/full FFmpeg decode, zero JS and major resource failures. HTTP 200 alone is insufficient.
- [ ] Confirm stacked PRs' ancestry and automatic merge/close states; do not recreate/delete/force-push them.

Rollback after an eventual critical production failure: preserve diagnostics, create a normal-history revert of the aggregate merge (`git revert -m 1 <merge-SHA>`), verify that the resulting application/build matches the recorded prior production state, run CI, merge/deploy the revert through the formal protected flow and repeat production E2E. This procedure is not executed under the current NO-GO. If permissions/protection prevent rollback, report ROLLBACK_REQUIRED and the exact blocked action; never force-push/reset.
