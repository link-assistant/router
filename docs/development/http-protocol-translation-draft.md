# HTTP value caller translation draft

The twelve pure HTTP value interfaces now have source-drafted forward and
reverse caller integration. Headers, requests, responses, status predicates,
base64 bodies, UTF8 bodies and exact JSON body parsing use the matching native
and JavaScript core. This implements no network transport.

Actual imports require complete current native, runtime and declaration sources,
the unique native module edge and the actual locked reqwest/base64 inputs.
The source checker independently checks every caller operand and return.
Borrowed base64 output retains its original JSON input loan; a temporary owned
response cannot supply an escaping reference. Existing owned Result boundaries
provide the exact scalar/String ABI, independently of the HTTP catalog.

The Rust emitter is a complete copy of the original owned carrier emitter.
Ordered language substitutions change operation lookup and result handling;
repository substitutions select HTTP names and modules. It preserves operand
evaluation order and the shared JSON domain checks. Both interpreters,
canonical Rust projection, forward source/loan checking, reverse native type
queries and receiving runtime assets include the new interfaces. Complete
originals, lossless CST preparation and whole inverses remain inspectable.

Independent JavaScript, strict TypeScript, interpreter, native forward caller,
Rust inverse, source/dependency alteration, dangling borrow and forgery cases
are drafted. Nothing has run. Network clients, guarded resolution, streaming,
cancellation, async caller integration, production adoption and all other open
requirements remain unfinished.
