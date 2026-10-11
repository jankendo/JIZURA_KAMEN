# Cinema V5 release review

Source `9bc1a210146de15bc6c278aeca3baf2469bd516b` is pushed and frozen. Exact-head CI succeeds: 192 PASS, 0 FAIL, 2 environment SKIP out of 194; both skipped contracts pass with fresh real-browser evidence. npm ci, production build, layout/license verification, formal browser UI and H.264/AAC full decode succeed. CI deploy is correctly skipped for this draft PR.

TECHNICAL_GO: PASS. QUALITY_GO: UNVERIFIED. RELEASE_GO: false. Production remains unchanged. Speed and human aesthetic evaluation pending are not the release blockers. Important selected-artifact lyric safety and natural intent evidence is incomplete. See final-gates.json for causes, impacts and required follow-up. Unknown values and raw contrast scores are retained. No safety or quality thresholds were lowered.

The current runtime has 10 accepted full-decode MP4s within the documented scope (3 baseline + 7 new V5). Prior V5 and historical V4 results remain separately labeled. Current paired contrast scores are 100→100, 47→47, 0→0; none is presented as a score improvement. Inspection at actual 0.5 seconds shows the generic compound boundary improvement from 手動固 / 定した to 手動 / 固定した. The preserved exit wipe at 0.8 seconds is not evidence of permanent clipping. No independent human review is claimed.

Source recovery uses the immutable Git bundle and normal branch history; evidence archives have SHA-256 manifests. Main has not been merged or deployed, so rollback is not needed.
