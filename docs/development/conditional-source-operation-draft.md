# Synchronous conditional native-source operation draft

Repeated generated conditional callers now share their complete native input
families only within one synchronous source operation. Every family is actually
loaded and checked before its first selection; all selected families are freshly
reissued on exit, including callback errors. Every lookup checks the original
host operations. Combined selected native raw inputs retain the original eight
MiB bound, source selections remain bounded and nested operations remain
independent. The callback receives no private frame and returns its original
ordinary result; async, proxy and own thenable/accessor results are refused.

The private frame clears and restores on every exit, including final native
failures. No source, hash, owner, verdict or encoded-result cache survives across
operations. Public returned plans remain descriptive DATA and grant no semantic
or namespace authority. Original standalone source operations still freshly load
their actual native inputs. The selected generated macro frame uses this scope;
actual source/profile joins, original native render and independent surviving
header checks remain unchanged.

Five complete source equations and independent unrun input-identity, nesting,
error/final-guard closure, async/thenable/proxy, multiple generated-call and
original API case source are drafted. No performance or runtime qualification
is claimed. No tests, experiments, compiler/preparer/translator, generator, Rust,
push or CI ran. Every unfinished bulk-draft requirement stays open.
