# Historical implementation records

The current product is the modern browser-only KAMEN 2.4 described in the README, STORAGE and VALIDATION documents.

The following snapshots remain as historical reference, not current specifications or fresh test results:

- [2.3 credits/layout](CREDITS_2_3_0.md) and its [recorded checks](qa/credits-2.3.0.json).
- [2.2 workspaces](WORKSPACES_2_2_0.md) and [2.3 storage checks](qa/workspaces-2.3.0.json).
- [JIZURA 0.10.1 adoption](UPSTREAM_0_10_1.md) and [2.3 output checks](qa/upstream-2.3.0.json).

Retired Cinema/Song-Grammar/v3–v16 design notes, generated QA catalogs, old test harnesses and AE/CEP source/build files were removed from the current tree. They remain available in Git at commit `0fed687c1250275585da0a9964a4e365ac2df6f4` (the 2.3.0 release). Do not restore those engines to handle a source import; use the current conversion flow. Third-party licenses and pinned native JIZURA sources are retained.
