# Original attribute header path and argument source draft

The implementation and every new case are UNRUN. Source construction and review
only occurred. No parser, issuer, source executor, translator, preparer,
generation, compiler, experiment, test, local Rust tool or CI-triggering push ran.

The existing attribute parser preserved an original token tree; that alone did
not supply a parsed attribute path. This additive family copies the complete
original root/member/inner input and private capture pattern and parses the
actual attribute interior directly. It creates a genuine private path AST plus
explicit empty, delimited or equality arguments. Equality uses the complete
positive expression parser; delimiters retain the genuine original token tree.
The entire selected header must reach EOF. No synthetic function is constructed.

Root items include macro definitions. Inner headers require a complete original
module inner-attribute item. Impl/trait members keep their actual enclosing item
and member index. Every capture retains the whole physical source CST roundtrip,
original item/header/path/body spans, source view, explicit profile, current
native parser source plan and both private parser states. Combined source/token/
node/tree/depth bounds remain the original bounds.

Qualified, absolute and raw paths retain their parsed source but cannot become
ordinary bare-name candidates in this source family. The plain-name flag also
requires the exact original path spelling to equal its one parsed segment.
Unsafe wrappers, unsupported generics, missing paths/expressions, trailing tokens
and malformed source remain refused. Argument tokens and nested macro effects
remain separate from caller ownership or value semantics.

Header frames have a distinct private identity map. They cannot impersonate
function or equality-expression frames, and copied ASTs/receipts do not acquire
authority. Each read rejoins the genuine original source item/member/profile,
path/body association, positive private AST and complete source CST/native plan.
There is no across-operation source/hash/owner/verdict/result cache. All caller,
macro, global, type/namespace and runtime qualification fields remain false.

Three complete compiler equations retain whole original implementations and
native owner spans through language/repository substitutions and full CST
inverses. Independent unrun source cases cover the three argument kinds, root/
inner/member/macro headers, path classifications, source changes, private-family
separation and refusals. A fresh native builtin parser/catalogue consumer still
needs to join this actual path family; owner/global/export/type-prefix closure,
wider attributes/language/production parity, reverse/synchronization/freshness/CI
and receiving qualification remain unfinished.
