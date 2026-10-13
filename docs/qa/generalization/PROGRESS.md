# KAMEN generalization validation

Current source: `044f8e1a11e38507f31bdb2b66f8b4909b8aec89` (PR #13, Draft). Main remains `2e7ed477f88028dbb63aa609e8a11b4052ea8c00`.

The frozen 357a273 experiment contains all 60 attempts, 56 completed H.264/AAC movies independently fully decoded, 28 paired inputs, and the original four SNS rejections. All six artifact archive digests were checked. Full raw results, input PCM, selected plans, video hashes, per-unit decoded timestamps and comparison metrics are preserved under `formal-357a273/` and content-addressed media/inputs.

Formal lyric safety: baseline 19 MEASURED / 9 FAILED / 2 unexecuted cases; 357a273 24 MEASURED / 4 FAILED / 2 unexecuted. These counts are not revised with later browser environments. Individual typography, temporal and contrast indicators include declines; their artistic calibration is unknown.

c984cd8 exact-source CI succeeded: 199 PASS, 0 FAIL, 2 environment SKIP; real browser UI/export, corrupt-MP4 refusal, save/restore and cancel/retry PASS. Three c984cd8 targeted local movies now have MEASURED final lyric safety. These are repair checks rather than blind generalization proof.

044f8e1 adds SNS fragment origins, explicit instrumental-gap N/A evidence, missing-entire-line rejection, and protection of source units for manually controlled lines across the legacy SNS director stack. Small counterexample tests passed. Its exact-source CI and targeted real movie comparison are running. Native catalogue audit is running again for the changed source.

The first supplemental SNS harness omitted the UI portrait project/replan path; its preserved outputs are **NONSHIPPING** counterexamples, excluded from release proof. The updated harness mirrors UI portrait replanning and final export settings. Original input failures remain unchanged. New test inputs are registered separately before their results.

TECHNICAL_GO / QUALITY_GO / RELEASE_GO remain UNVERIFIED for current source. No main merge or production change. Human aesthetics remain HUMAN_UNVERIFIED; artistic 100 is not certified.
