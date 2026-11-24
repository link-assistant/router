# Native token-report edge oracle source

Status: SOURCE / UNRUN. The actual `token_report` unit-test module now contains
an independent exact full-row oracle for the nine actual JavaScript receiving
vectors and a separate check of all nine real private header cells/indices.
The original six native test functions remain complete and unchanged.

The nine row vectors cover four nonobject/empty inputs, wrong JSON kinds,
floating versus integer numeric kinds, zero limits and whitespace scope,
integers above JS safe precision through u64::MAX, Unicode scalar padding,
embedded newlines/braces in labels and fields longer than minimum column widths.
Raw JSON parsing retains number kinds. Expected column values are explicitly
written; the independent padding helper uses scalar counts and direct spaces,
without invoking the application's formatter or reading a rule replacement table.

These are actual native application calls, not a Rust projection counted as an
executed oracle. The original `#[cfg(test)]` module path schedules the new cases
in the existing complete library test command. No workflow command or condition
changes: Rust execution is CI-only after all eight required JavaScript stages
succeed for that immutable SHA. No Rust tool, formatter or test was run locally.

The existing mandatory actual compiled-row JS/strict-TS receiving path still
uses the complete independent JavaScript case file retained here. That file is
unchanged. The packet contains complete native before/after source plus the
complete JS vector source; hashes record source custody only. No new parser,
namespace, type or coverage authority follows. This batch adds oracle source;
T01/T02/T05, general translation, freshness and resource evidence remain OPEN.
Current source checklist stays 9/70 DRAFTED,61 OPEN.
