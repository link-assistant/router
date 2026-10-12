# Provider draft source review and focused gate prerequisites

Reviewed the excluded queue through `92d4baf3e` without an engine window. Two
concrete source corrections were made: invalid Responses create/selectors render
`invalid_request_error` rather than `ProtocolError`'s internal
`unsupported_translation` code as the error type; `model_required` remains its
original distinct type. Conversation ID extraction now uses the same checked
UTF-8/scalar/nonfinite-value domain as resource capture, so invalid unused JSON
metadata cannot create an identity that the original serde_json parse rejects.
Existing cases were strengthened; counts remain 16 Responses, 16 Conversations,
10 capture, total 42 **UNRUN**.

Packaging/dependencies, verified by source inspection:

- `packages/javascript/package.json` requires Node >=20, is ESM, and includes the
  entire `native` and `portable` directories in package files. The new internal
  `native/response-contracts.mjs` requires no new dependency or package export.
- Imports are native module → response contracts → existing protocol module.
  No import from the new contracts back to native-service/core/server was added.
- The source-only sparse worker omits tracked portable and producer content.
  Run from the integrated gate, or set `ROUTER_ACCEPTANCE_ROOT` to that gate when
  invoking these worker-owned test files. This is an integration prerequisite,
  not a reason to install another dependency tree.
- The integrated gate's existing AJV/TOML dependency tree is needed by native
  imports. Persistent text affinity/token fixtures invoke the existing Python 3
  advisory-lock adapter from `native/file-lock.mjs`; `ROUTER_LOCK_PYTHON` can
  select that existing interpreter. No Rust helper is needed by these fixtures.
- Actual loopback listeners, test-owned server cleanup and writable bounded
  temporary state are required. The largest capture buffer is slightly over
  1 MiB. None of the fixtures fetches an external service or uses real user
  credential homes; the Codex case uses an explicit temporary `auth.json`.

Exact focused gate command after its separate engine authorization:

```sh
node --test experiments/issue-759/acceptance/provider-responses.test.mjs experiments/issue-759/acceptance/provider-conversations.test.mjs experiments/issue-759/acceptance/provider-resource-capture.test.mjs
```

Then run existing native-service/core suites and regenerate checked native meta
and TypeScript with the gate's producer workflow before broader verification.
The default package `native:test` glob alone does not select these `experiments`
files. Source-only commits must not be treated as executed evidence.

Additional source-level boundary for a separate store audit:
`src/response_affinity.rs::load` deserializes a typed Rust `AffinityFile` with enum
destinations/namespaces and i64 lifetimes, while native `AffinityStore.transaction`
currently validates only version and the records array before expiry comparison.
Malformed typed rows and wide i64 lifetimes are not universally proved equivalent
by this queue. No broad store-format or numeric-width claim is made, and no parity
flag was changed to conceal that gap. Original serde_json recursion/precision
boundaries and subscription reactive refresh also remain outside these focused
resource-contract cases.

Validation performed: source inspection, Python source hash/declaration-count
audit and `git diff --check` only. No Node/Bun/TypeScript/parser/helper/probe,
producer, Rust build or push occurred during this review.
