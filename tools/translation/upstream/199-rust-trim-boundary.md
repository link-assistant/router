Rust→JavaScript trim boundary measured while implementing [Router #759](https://github.com/link-assistant/router/issues/759). This adds a reverse-direction case to the string-method scope tracked here and in #209.

At PR #201 commit `e46e196db5ec34bf13a73b8645aa38d409737e60`, the copied portable frontend gives the following result (Node 20.19.4; no local Rust build):

```js
const source = 'fn trimmed(s: &str) -> String { s.trim().to_string() }\nfn main() {}\n';
translateProgram(source, 'Rust', 'JavaScript').diagnostic;
// { kind: "unsupported", message: "method trim: outside the portable core at 33..40",
//   span: { start: 33, end: 40 } }
```

Supporting the method must retain **Rust** whitespace semantics. Directly mapping it to JavaScript `.trim()` would change these results:

| Input | Expected Rust `str::trim` result | Measured JavaScript `.trim()` result |
|---|---|---|
| `"\u0085x\u0085"` (NEL) | `"x"` | `"\u0085x\u0085"` |
| `"\ufeffx\ufeff"` (BOM) | `"\ufeffx\ufeff"` | `"x"` |

The Rust column follows the documented Unicode `White_Space` predicate; it was not obtained by compiling Rust locally. Primary references: [Rust char::is_whitespace](https://doc.rust-lang.org/std/primitive.char.html#method.is_whitespace), [ECMAScript whitespace](https://tc39.es/ecma262/2022/multipage/ecmascript-language-lexical-grammar.html#sec-white-space), and [TrimString](https://tc39.es/ecma262/2024/multipage/text-processing.html#sec-trimstring). NEL has the Unicode White_Space property; BOM is an explicitly included ECMAScript whitespace code point rather than Unicode White_Space.

Router's current workaround carries the full original Rust item, span and hash with the unsupported diagnostic, and excludes the draft from runtime parity. Its native JavaScript implementation stays separate. Nothing reports a successful executable translation for this method.

Suggested implementation: lower Rust `trim`, `trim_start` and `trim_end` to an explicit Unicode White_Space predicate in JavaScript, retaining the existing ECMAScript whitespace predicate for JavaScript→Rust trimming. Add shared NEL/BOM, ASCII, NBSP and supplementary Unicode string fixtures in both directions, and assert that no source envelope is returned for those supported cases. Other string methods and borrowed Option<string> remain covered by the existing umbrella and #204/#209; no duplicate issue is needed.
