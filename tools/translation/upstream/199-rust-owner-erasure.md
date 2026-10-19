Draft comment for [meta-language #199](https://github.com/link-foundation/meta-language/issues/199), prepared during [Router #759](https://github.com/link-assistant/router/issues/759). This file has not been posted to GitHub.

Suggested subject: Rust prelude constructor rewrites ignore the resolved owner and silently change output.

At pinned PR #201 commit `e46e196db5ec34bf13a73b8645aa38d409737e60`, the unmodified upstream `translateProgram` accepts these complete Rust programs as `semantic-translation`, with `diagnostic: null`. Executing its exact emitted JavaScript with Node v20.19.4 prints `x` for both:

```rust
mod String {pub fn from(value:&str)->&'static str{"CUSTOM"}}
fn caller()->&'static str{String::from("x")}
fn main(){println!("{}",caller());}
```

```rust
mod Box {pub fn new(value:&str)->&'static str{"CUSTOM"}}
fn caller()->&'static str{Box::new("x")}
fn main(){println!("{}",caller());}
```

The expected Rust output is **source-derived `CUSTOM`**, not Rust-observed. Local modules supply these functions, rather than the standard prelude types. The [Rust Reference on preludes](https://doc.rust-lang.org/reference/names/preludes.html) explains that prelude entries participate in name resolution; they are not members of the current module. No Rust compiler or executable was run for this report.

The emitted output even retains each custom function returning `CUSTOM`, but lowers `caller` to `return "x"`. This silently changes the observation that `translateProgram` promises to preserve.

Reproduce from Router's repository root:

```sh
node tools/translation/upstream/owner-erasure-repro.mjs
```

The script imports `../vendor/meta-language/program-translation.js` directly, without Router's parser or checker extensions. It validates all 27 hashes in `vendor/upstream-lock.json`, translates complete programs and executes unchanged emitted code in bounded Node subprocesses. [The recorded results](owner-erasure-observed.json) include complete source, exact source and emitted-code SHA-256 hashes, diagnostics, exit status, stdout/stderr and the relevant original vendor hashes. The vendor lock SHA-256 is `ee126e234437d23b62fefa4f4c6b59baa09f89918613412570d32bfd652a50c1`.

The same minimal reproduction from the pinned upstream repository uses its own public API:

```js
import {translateProgram} from './js/src/program-translation.js';
import {spawnSync} from 'node:child_process';
const source = 'mod String {pub fn from(value:&str)->&\'static str{"CUSTOM"}} fn caller()->&\'static str{String::from("x")} fn main(){println!("{}",caller());}';
const result = translateProgram(source, 'Rust', 'JavaScript');
console.log(result.contract.support, result.diagnostic); // semantic-translation null
console.log(spawnSync(process.execPath, ['--input-type=module'], {
  input: result.code, encoding: 'utf8', timeout: 5000
}).stdout); // x followed by a newline
```

| Call spelling | Upstream support | Diagnostic | Measured Node stdout | Rust expectation, source-derived |
|---|---|---|---|---|
| `String::from("x")` | semantic-translation | null | `x` | `CUSTOM` |
| `Box::new("x")` | semantic-translation | null | `x` | `CUSTOM` |
| `crate::String::from("x")` | semantic-translation | null | `CUSTOM` | `CUSTOM` |
| `crate::Box::new("x")` | semantic-translation | null | `CUSTOM` | `CUSTOM` |

The first failing source SHA-256 is `7c40d3297d35e095489c483d7933f9ca741c6126f6234e0c7dfec33e55288310`; the second is `562b97b5574357a67f1c245b2782d942a5a55897e907b57c572a43afdbc556f7`. These pins cover the exact one-line sources emitted by the script, without a final newline.

The root cause is visible in [the pinned Rust frontend](https://github.com/link-foundation/meta-language/blob/e46e196db5ec34bf13a73b8645aa38d409737e60/js/src/translation/rust.js#L690): `primary` recognizes textual `Box::new` and `String::from` before it resolves the path. It returns the argument or a string-conversion node, discarding the selected owner before ordinary call checking.

The measured workaround for these local modules is to qualify calls as `crate::String::from` or `crate::Box::new`. Consumers should otherwise refuse an unresolved intrinsic owner and preserve original source with the diagnostic; they should not count an unverified semantic result as runtime parity. This workaround does not establish general alias, import, nested-module or trait-dispatch correctness.

Suggested fix: resolve the complete callee first. Apply intrinsic lowering only when the resolved owner is the registered standard type, honoring local declarations, imports and aliases. Ordinary user functions must remain calls to their checked definitions; ambiguity must produce a source-bearing refusal. Add executable whole-program regressions for these two shadowed owners, the measured qualified-path controls, aliases, declaration order and nested scopes, alongside unchanged unshadowed standard-constructor behavior.

Scope is limited to the pinned upstream whole-program frontend. A control program containing an original `macro_rules!` definition is correctly refused into `portable-encoding`, with a syntax diagnostic at `0..12`. Router's separate per-item macro-context erasure is a downstream assembly defect and is not attributed to this upstream reproduction. These are fixture programs, not newly checked Router production bodies, and no complete translation/parity claim is made.

Duplicate check on 2026-10-11 UTC: the read-only open-issue API returned 23 entries (21 issues and two pull requests). Searches for `shadow` and `Box::new` matched no open issue; `String::from` matched #204, #205, #209 and #217, whose scopes cover other constructs or formatting. #199 already requires project-wide binding and full-language semantics, so this is prepared as a concrete comment on that existing umbrella rather than a duplicate issue. [Search evidence](owner-erasure-issue-search.json) records the queries and result numbers. This is an observation about that bounded open-issue search, not a claim that no historical duplicate exists.
