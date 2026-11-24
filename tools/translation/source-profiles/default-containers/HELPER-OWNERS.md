# Original helper-bearing Default owners

The existing `deriveFootprintHelperAttributeAt` joins each complete private
original derive invocation with its exact nested attribute span, registered
proc-macro helper declaration and active ancestor scope. A helper spelling or
copied public certificate cannot replace this join. The generated Default route
consumes that proof through its complete caller-bound `sourceBangProof`; no new
helper whitelist or namespace/runtime flag is necessary.

`original-default-helper-owners.test.mjs` executes the complete unchanged
`src/admin_api.rs` and `src/oauth.rs` files as standalone translation inputs.
The actual generated methods `TtlRequest.default`, `ClaudeCredentials.default`
and `OAuthBlock.default` execute independently specified None-valued goldens in
JavaScript and separately strict-compiled TypeScript. Their serde aliases and
original field docs remain intact. These observations extend the coverage of
the existing container producer; this successor changes tests and documentation
only, and adds zero original Rust function or method declarations.

The tests also retain genuine aliased Deserialize registration, exact field
spans, private registration identity, copied/proxied/changed proof denial, and
unknown helper, imported alias, missing derive and expression-macro refusals.

The complete `src/auth.rs` standalone input still refuses
`DeviceErrorResponse.default`: its original `pub mod import;` has no tracked
crate-root `src/import.rs`. Merely supplying Router's actual `src/auth/import.rs`
does not make that standalone input the Router crate. Router's original auth
module belongs under `src/lib.rs`; full-crate behavior requires the coordinator's
independent complete measurement. This test preserves the missing-child refusal
and does not fabricate a parent crate or rewrite source paths.

The complete `src/deploy/registry.rs` input retains its actual `Entry` PathBuf
layout refusal and consequently the `Document` return layout remains unavailable.
Helper ownership cannot erase those independent type obligations. Allocation
internals, whole trait translation and complete runtime parity remain unproved.
