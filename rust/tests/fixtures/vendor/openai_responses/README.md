# Quota and disconnect fixtures

`terminal-quota.sse` and `disconnected-output.sse` are synthetic, credential-free SSE recordings adapted from CLIProxyAPI's quota and disconnect regression scenarios, at commit `67465884ca179a8f9098328d03a361b50003fdd7`:

- [codex_quota_failover_test.go](https://github.com/router-for-me/CLIProxyAPI/blob/67465884ca179a8f9098328d03a361b50003fdd7/test/codex_quota_failover_test.go)
- [codex_stream_disconnect_failover_test.go](https://github.com/router-for-me/CLIProxyAPI/blob/67465884ca179a8f9098328d03a361b50003fdd7/test/codex_stream_disconnect_failover_test.go)

CLIProxyAPI is [MIT licensed](https://github.com/router-for-me/CLIProxyAPI/blob/67465884ca179a8f9098328d03a361b50003fdd7/LICENSE). These fixtures exercise HTTP/SSE and WebSocket quota events, clean EOF before output, exhausted empty streams, truncated partial output, and abnormal connection loss before output. They do not require live vendor credentials or support re-recording from a live endpoint. `responses-stream-cached.json` remains the existing replayable vendor cassette.

The quota classification follows Router's issue #724 contract: ordinary rate limits block the requested model, while terminal quota codes and authentication errors block the credential. Vendor family windows and account-wide pauses retain their previous scope.
