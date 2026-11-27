# Rust 1.100 lint qualification

The `23e65c27fb308c109bcc59b1c19873c67b58587a` release pipeline passed the same-SHA JavaScript gate, formatting and dependency audit. Its hosted Clippy pass reported 197 distinct diagnostics across the library and test target. The first diagnostic is at line 1358 of the job log, and the summary with exit code 101 appears at lines 4432–4433. [Lint job](https://github.com/link-assistant/router/actions/runs/46011019197/job/140572880325), [dependency audit](https://github.com/link-assistant/router/actions/runs/46011019197/job/140572880276).

| Lint | Distinct locations | Source change |
| --- | ---: | --- |
| `assert_is_empty` | 106 | Compare observed lengths or strings with the expected value. Length assertions avoid emitting credential data on failure. |
| `map_unwrap_or` | 51 | Use `Option::map_or_default` and `Result::map_or_default`. |
| `double_must_use` | 17 | Remove the function attribute where the return type already carries it. |
| `duration_suboptimal_units` | 16 | Use the equivalent hours or minutes constructors. All durations keep their original values. |
| `single_element_loop` | 4 | Bind the single tuple or value directly, keeping the operation in the original branch. |
| `needless_bool` | 1 | Return the deployment compatibility predicate while preserving its original evaluation order and error propagation. |
| `nonstandard_macro_braces` | 1 | Use brackets in the native compatibility wrapper for `vec!`. |
| `redundant_clone` | 1 | Move the test value at its final use. |

The edits were matched against the archived source for each diagnostic and reviewed against the current files. The Clippy flags and full test cases stay in place. These source edits await exact-commit hosted formatting, lint and tests.

The `f1de77c3` run passed `cargo fmt` and reached the complete `--all-targets --all-features` lint step. The hosted log records 87 additional diagnostic locations at lines 1371–2669. These include 65 empty-collection assertions, 11 explicit-guard expressions, eight map-and-default calls, two equivalent duration constructors, and one redundant clone. The test assertions retain their original conditions. Four translation-oracle files retain intentional callback returns and original map-and-default forms with narrow lint attributes because those expressions are part of the test subject. The full Clippy command and warnings-as-errors stay in effect. [All-targets lint job](https://github.com/link-assistant/router/actions/runs/46029317166/job/140614971209).

The `f1093db4` run stopped at formatting after all four JavaScript stages passed. Archived log lines 747–783 describe three assertion wraps. Commit `eff7e35cd` applies the exact hunks. The revised tree still needs the complete hosted lint job. [Formatting output](https://github.com/link-assistant/router/actions/runs/46033084675/job/140638254473).
