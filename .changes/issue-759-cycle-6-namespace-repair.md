Resolve the checked standard `FromStr` import in Rust's type namespace when admitting integer `from_str` calls. A same-named value function can coexist with that trait; missing, custom, duplicate and shadowed standard imports remain refused.

Correct two consuming/nested Copy fixtures to execute the valid bang-macro/derive coexistence case, and replace an invalid imported-constant parameter-shadow formatting fixture with an actual function-alias shadow. The imported-constant case remains an explicit source-bearing refusal.

Validation: all 21 focused Copy, formatting and primitive-host cases passed under Node and Bun, exercising emitted JavaScript and separately strict-compiled TypeScript. This repairs the four forward failures recorded for the cycle-six preflight; it does not establish whole-project translation or runtime parity.
