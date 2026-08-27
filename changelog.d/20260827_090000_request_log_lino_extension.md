---
bump: patch
---

### Changed
- The per-token request log is named `requests.lino`. It has held links notation since v0.122.0 while still being called `requests.jsonl`, so the extension named a format the file no longer used — the same class of mismatch as the documentation corrected in #346, in the one place an operator is most likely to trust it (issue #346).
- An existing log is renamed on its token's next write, and a token that has not been written since keeps its history under the old name and is still read. Nothing is rewritten and nothing is discarded: verified against a real 39 MB, 1049-record production log, where the original records remain a byte-identical prefix by SHA-256 after the rename and new records append to the end. The whole-store size bound counts either name, so a log that has not been renamed yet still occupies the budget it always did.
- Operators tailing these files by name should point collectors at `requests.lino`. The one-record-per-line framing is unchanged, so `grep` and log collectors are otherwise unaffected.
