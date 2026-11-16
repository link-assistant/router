# Shared native integer literal source draft

The lexical reader and all receiving case source is drafted and unrun. This
batch adds no verified production coverage or synchronization qualification.
Full translation, native owner closure, parity and freshness remain unfinished.

One bounded reader reuses the existing Rust integer decoder for decimal,
hexadecimal, octal and binary source. It retains original token spelling and
sign, and never defaults an unsuffixed native domain. A matching written native
width or actual suffix is required; signedness, exact magnitude and all ten
fixed widths are checked separately. Unsigned negative zero, malformed tokens,
float/custom suffixes and overlong input remain unselected. Counts use explicit
caller bounds and suffix sets; no host-dependent usize width is assumed.

The reader is shared by primitive immutable aliases and expressions, scalar
carrier constructors, both primitive Option selectors, primitive and owned
Result selectors, text repeat/replacen counts and JSON index selection. Written
annotations cannot establish facts without a matching initializer. Native scalar
and callback source remains verbatim; existing count/index APIs keep their
explicit native conversion and once-only evaluation. All actual whole-function,
CST/meta, namespace, type, ownership, effect and source-current guards remain.

Twelve complete source equations preserve immutable original implementations,
separate language/repository sequences and complete inverses. The source chain
composes with the integer-width native Rust descendant. No source/hash/owner/
verdict/result cache crosses operations. The compiler export case includes the
shared module, original source archive and rule archive. HostContracts, CI
workloads, deadlines and all eight same-SHA JS gates before fatal Rust stay intact.

Independent unrun source covers explicit width extremes, all four radices,
malformed/mixed/negative/overflow inputs, untyped/annotated/scoped aliases,
carrier/count/index reuse, fourteen ordinary/source-bound adopter APIs, seven
fixed bulk stages, fresh emitted JS/strict TS and native oracle callers. No
parser, translator, preparer, test, compiler or generator was executed locally,
and no CI feedback was inspected during this source draft.
