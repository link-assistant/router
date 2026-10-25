# Original type-template substitution draft

Actual TypeScript alias declarations now support bounded unconstrained type
parameters with exact argument arity. Each substitution slot retains the actual
original argument node and its lexical environment. Alias bodies receive only
their own parameter bindings, so a caller cannot capture a free name in another
declaration. Repeated nested identity instantiations remain distinct uses.

Every declaration receives a complete native syntax, dependency and acyclic
graph check, including unused templates. Supported bodies compose existing
operation types, identity wrappers, settled futures and successful Result/Option
selection. Actual instantiated inputs, callbacks, returns, recursion and
ownership then re-enter the complete original domain/body checks. Expanded JS
docs substitute actual type arguments before alias erasure. TypeScript keeps
its complete original declarations, including source-unit retention on edits.

Constraints, defaults, variance, arbitrary constructors, parameter-dependent
callable utilities and indexed types retain explicit refusals. No generic slot,
source spelling or public metadata grants native authority. This extends the
earlier nongeneric alias draft; it does not add generic executable functions.

Complete original source copies, two ordered substitution sequences and CST
inverses are retained. Independent unrun source covers lexical capture, repeated
instantiations, body/callback/recursive obligations, settled values, ownership,
wrong arity, unsupported unused declarations and forged meta. All tests,
translator/preparer execution, strict diagnostics and CI remain deferred until
the entire bulk requirement draft is complete. Wider generics/methods,
namespace/bootstrap, production parity and all other unfinished work stay open.
