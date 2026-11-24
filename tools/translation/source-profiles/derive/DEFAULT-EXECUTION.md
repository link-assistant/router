# Bounded original Default execution

The source pipeline can admit a nongeneric, static `Default::default() -> Self`
implementation for an original local record with one to five primitive fields.
The standard trait comes from the complete pinned core `default.rs`; its exact
signature and the original core/std prelude and reexport routes are inspected.
Original ancestor type and attribute namespaces, implementation headers, member
sets, conditions, and source views remain separate admission requirements.

Manual implementation bodies retain their original token transformation and
pass the ordinary parser and semantic checker. Other trait obligations are not
removed. Duplicate implementations and simultaneous manual/derived Default are
refused. Static calls use the existing checked nominal method dispatcher.

For derived records, the private original compiler AST plan selects the named
field branch with no field default expressions. Its real record, field and
zero-argument Default call slots are lowered to ordinary record IR. The standard
root retains the compiler's `kw::DollarCrate` def-site origin. Each field's value
comes from the actual original `default_impl!` expansion and privately parsed
primitive body, using the original Host parser identity. No source function or
JavaScript body template is printed. Copied, changed, or rebound proof/surface
objects cannot authorize this join.

The unchanged `ManagementConfig::default` and `EmergencyAuthConfig::default`
bodies execute with their original custom values. The unchanged derived
`EmergencyArgs::default` instead produces `false, false, 0`: the Clap parser's
duration default of sixty belongs to a different source route. Tests execute
emitted JavaScript and independently strict-compiled TypeScript on Node and Bun.

Generated methods use `term: generated-method`, `origin: derive-invocation`,
`originalDeclarationTerm: struct`, and a separate `checkedGeneratedMethods` /
`checkedGeneratedMethodDeclarations` API. Their source span is the original
struct/derive declaration. They are excluded from the existing original-method
facades, fn-token review audit, and original Rust declaration denominator.

This is not whole compiler or whole trait translation. Existing derive
namespace certificates keep `generatedImplBehavior: false`; generated method
IR has to pass its own complete ordinary body checking. Compiler errors,
generic fields, owned containers, custom field defaults, arbitrary helper
effects, ambiguous owners, disabled/shadowed preludes, unsupported macros,
Clone/Debug execution, and runtime bang behavior retain their own refusals.
Unresolved standalone imported config types still block the two Args `config`
methods. No original Router Rust/Cargo inputs are changed.
