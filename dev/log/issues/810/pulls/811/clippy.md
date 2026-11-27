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
