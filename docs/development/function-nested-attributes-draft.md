# Genuine function nested attribute source draft

All new implementation and independent cases are UNRUN. Only source construction
and review occurred. No parser, captor, selector, translator, preparer, test,
experiment, generation, local Rust tool or CI-triggering push executed.

The complete original function parser already retains attributes on ordinary
parameters, method receivers and lifetime/type/const generic parameters. A new
source-only enumerator reads those actual private AST owners after rejoining the
whole original function. Metadata selectors identify an owner and attribute by
index; they do not provide permission from a caller-supplied span or copied AST.

The existing complete header issuer and reader are copied into a separate
private receipt family. The new input constructor requires a genuine complete
function frame, selects its actual Attribute node and original token tree, and
parses the exact source path and empty/delimited/equality argument body. Original
function/member/view/profile identity, owner/attribute identity, full function
AST validation, current native parser sources, combined original node/token/byte
bounds and serialized/reparsed whole physical CST remain required on every read.
The existing operation-local checked-CST reuse applies without caching owner or
semantic verdicts across operations.

The positive result is source grammar only. Qualified/raw/unknown names remain
parsed source and do not gain builtin lookup or caller ownership. Macro-valued
arguments retain opaque private expression nodes and all owner, value, visitor,
global export, type, namespace and runtime authority fields remain false. The
old root/member header, function, equality-expression and invocation receipt
families stay distinct. Field/variant attributes, native builtin consumers for
these nested sites and complete owner/effect closure remain separate work.

Three complete compiler source equations preserve original issuer/reader bodies,
native owner spans, ordered language/repository substitutions, CST/meta transport
and whole inverses. Independent unrun cases cover ordinary parameters, method
receivers, required trait methods, all three generic parameter kinds, qualified/
raw/unknown/macro-valued attributes, copied/foreign receipts, span-only requests,
getters, changed sources and genuine parent identity. No executable coverage,
native attribute legality, full production/reverse/synchronization/CI/receiving
qualification or requirement completion is claimed.
