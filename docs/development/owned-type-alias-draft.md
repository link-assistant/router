# Owned type alias source draft

`translateOwnedAliasedTypeScript` expands local unexported aliases before the
existing complete owned frontend. Native symbols select alias declarations and
generic parameter references. Actual type arguments, defaults and finite closed
constraints drive source substitutions. Alias references and supplied arguments
retain parentheses, preserving union/array grouping. The separate private
checker then checks every actual body, ownership path, runtime binding and
written ABI through the existing serialized/reparsed checked meta boundary.

Constraints accept exact native type structure, closed union membership,
primitive literal domains and `unknown`; other relationships refuse. Defaults
must follow required parameters. Constraints/defaults may use earlier generic
parameters. All alias declarations receive structural and dependency-cycle
checks, including unused declarations. Missing arguments, excess arguments,
unresolved names, recursive aliases, public aliases, generic runtime functions,
records, conditional types and unsupported constructs remain explicit refusals.

Complete original, intermediate and expanded sources, both substitution
sequences, native selections and lossless CST inverses remain in source history.
The new frontend replaces only its derived receiving input. It retains the
actual authoritative original separately and rechecks current contexts before
returning. Bounded native traversals, expansion and retained history prevent an
alias family from growing without limit. There is no cross-invocation cache.

Independent JSON/list behavior, generic defaults/constraints, grouping,
bigint-versus-number boundaries, source conflicts, unsupported bodies and full
source-history regressions are drafted and unrun. This additive API is not yet
integrated with public type packaging or project units. Cross-module aliases,
general TypeScript inference/generics/records, full reverse preservation,
production adoption and every other remaining issue obligation stay open.
