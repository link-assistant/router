# Keep independently captured method scopes consistent

Owned-definition CI failed at `ClientKind::from_str_opt`: the project used
enclosing namespace resolution while its independently captured method owner
used the ordinary resolver. The complete scope metadata differed, so the
existing source-link equality guard correctly refused the association.

`prepare-matches-enclosing-context.mjs` copies the complete original constructor
through native JavaScript selections and language/repository CST rules. Its new
constructor independently captures the original modules, dependencies and
profile, then uses the same genuine enclosing namespace and binding issuers as
the project. It accepts no caller-supplied scopes. The original constructor and
method-scope equality guard remain unchanged.

The project selects this constructor only for its explicit enclosing paths.
A separate `translateProjectWithFlatEnclosingSemanticMeta` entry keeps private
issuers in `project.mjs` and reuses the existing genuine Default/Clone enclosing
composition. The flat canonical producer selects that named export through the
existing adapter. Ordinary and existing flat library entries retain their
original namespace selection. No new source, owner or result cache is added.

All 21 cases across the five complete enclosing/method files pass in Node and
Bun under the original deadlines. They include the original `ClientKind`
declaration and parser method, strict TypeScript execution, copied-certificate
refusals, unknown producers and source/profile changes. This receiving result
does not qualify full canonical/profile generation, output freshness, receiving
export freshness or runtime parity for the changed compiler.
