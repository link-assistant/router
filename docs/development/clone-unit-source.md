# Original unit enum Clone source

`tools/translation/clone-unit-source.mjs` selects the original compiler's
`has_derive_copy=true` branch for a nonempty unit enum with genuine original
Clone and Copy invocations. It joins the private derive certificate, complete
positive Clone AST, original method descriptor and empty type assertion list.
All variant names and original spans remain in the serialized source proof.

The source proof supplies no runtime, Copy, no-Drop, namespace or const
authority. Executable lowering still needs the existing privately checked
nominal Copy layout and closed no-Drop evidence, exact shared receiver and
checked computation. A serialized, copied, foreign or proxy proof cannot
replace the original issuer.

The complete unchanged `src/model_contract.rs` enum is checked with its actual
documentation and Default helper owner. Bare Clone/Copy inputs without a
registered derive footprint remain unproved; the fixtures use a real additional
Serialize invocation. Payloads, generics, explicit discriminants, empty enums
and duplicate invocations retain source refusals.

The generated-method path consumes this proof and the existing privately
checked Copy/no-Drop layout. It checks the actual shared receiver and every
unit constructor, then lowers the original dereference to an owned enum value
in the checked meta program. Both JavaScript and strict TypeScript emit that
checked computation. Generated Clone rows stay separate from original Router
methods; Clone calls retain their non-const trait status.
