---
kind: added
---

Add 24 independently authored tool-choice edge cases for the original native
Router function and the generated JavaScript/strict TypeScript regression.
Cover nested/flat priority, missing and wrongly typed fields, Unicode, empty
names and fallback values, with input immutability assertions. Rust oracle
execution remains CI-only after every same-commit JavaScript stage passes.

Draft source and fixture only; no local Rust tools ran. The matching translator
rule must still pass complete receiving before these cases establish evidence.
