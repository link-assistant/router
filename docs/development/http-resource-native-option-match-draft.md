# Original native Option extraction match draft

The explicit native source path now recognizes two actual Option match arms:
Some with one ordinary binder returned unchanged, and None with one immediate
None return. Either arm order and an otherwise empty value/return block are
supported. Exact original match/input spans retain the initializer while source
substitutions replace the arms with existing checked propagation. Initializer
references resolve before the enclosing new let binding; the match binder is
confined to its original successful arm.

Some and None must remain unshadowed. Changed values, extra effects, mutable or
nested patterns, wildcard/duplicate arms, incorrect written local types and
unknown original source remain refusals. All pattern/input records come from
the complete original parser operation. Public source data gives no semantic
permission: the whole resulting program still requires fresh source/meta/native
reproduction and all original ownership, root, numeric and cleanup checks.

Written native local types also join the successful payload after an actual
checked Option/Result guard, while the complete carrier stays in semantic meta.
This retains exact local type obligations through checked propagation.

Four complete original sources, both ordered rule phases and full original
comment/CST inverses are retained. Independent JS/strict TS/native, absent,
Boolean/signed/owned text, binding/type/source/refusal and native oracle cases
are drafted and unrun. No tests, experiments, compilers, translators, preparers,
generation, local Rust tools, pushes or CI ran. Wider matches, namespace and
producer closure, production adoption/parity and every unfinished requirement
remain open.
