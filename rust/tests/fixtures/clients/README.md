# Recorded client request fixtures

One captured request per supported client: the method, path, headers and body
shape that the real binary demonstrably sends. `tests/client_fixture_test.rs`
replays each one against the router and asserts it authenticates, dispatches to
the expected surface, and is answered in the expected dialect.

The directory also contains authorization and refresh contract snapshots.
Those do not declare `credential_carrier` and are intentionally excluded from
request replay.

The point is to make the fast tests assert against something a real client
actually sent, rather than against a shape written by hand. Issue #206 is the
worked example: every unit test passed while the documented Gemini CLI setup
returned `401` on its first request, because no test sent what Gemini CLI
actually sends — `x-goog-api-key` rather than `Authorization: Bearer`.

## Format

```json
{
  "client":  "gemini-cli",
  "version": "0.51.0",
  "source":  "how this was captured",
  "method":  "POST",
  "path":    "/api/services/gemini/v1beta/models/{model}:streamGenerateContent?alt=sse",
  "credential_carrier": "x-goog-api-key",
  "headers": { "...": "vendor headers, credentials redacted" },
  "body":    { }
}
```

`credential_carrier` names the header the token must be placed in when the
fixture is replayed; `{model}` in a path is substituted by the test. Credential
values are never stored — the test injects a freshly minted token.

## Refreshing a fixture

A fixture that silently ages is the original problem one release later, so
regenerate them when a client is upgraded:

1. Run the router with request logging on (it is on by default) and drive the
   real client through it — `link-assistant-router with <client> "hi"` is
   enough for a single turn. Record the complete canonical Router path after
   the configured `/api/services/<service>` base has been applied.
2. Read the `client_request` record from
   `$DATA_DIR/requests/<token>/requests.jsonl`. Headers there are already
   redacted by `redacted_headers`.
3. Update the matching file: `method`, `path`, `headers`, `body`, and the
   `version` the client reported in its `user-agent`.
4. Run `cargo test --test client_fixture_test`. A failure here means the router
   no longer serves what that client now sends, which is the signal this tier
   exists to give.

Recording requires a vendor subscription; replaying does not. That asymmetry is
the point — the credentialed step happens once, by hand, and every CI run
afterwards gets the benefit for free.
