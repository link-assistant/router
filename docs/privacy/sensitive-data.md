# Sensitive data protection for inference

Router can scan provider-bound JSON before sending it upstream. It replaces
detected personal information with session-specific tokens such as
`[[Router_<namespace>_Person_1]]` and `[[Router_<namespace>_Company_1]]`.
Provider responses to that authenticated session can be restored as they are
relayed back to the client. The built-in policy fully redacts detected
credentials and leaves them out of the restore map.

The scanner is a separate local process. Enable protection by starting the
scanner and setting `ROUTER_SENSITIVE_DATA_SCANNER_URL` on Router. An unset
variable keeps the feature disabled. A configured scanner that cannot answer
causes Router to refuse the affected request before provider forwarding.

## Start a local scanner

Run the adapter with Node.js 22.13 or newer. The Router process can continue to
use its existing runtime. From a checkout of this repository, install the
pinned detector into a separate directory:

```bash
scanner_dir="$(mktemp -d)"
chmod 700 "$scanner_dir"
cp examples/sensitive-data-scanner.mjs "$scanner_dir/"
npm install --prefix "$scanner_dir" --save-exact --ignore-scripts @link-foundation/sensitive-data-sanitizer@0.23.0

export ROUTER_SENSITIVE_DATA_SCANNER_TOKEN="$(openssl rand -hex 32)"
node "$scanner_dir/sensitive-data-scanner.mjs" &
export ROUTER_SENSITIVE_DATA_SCANNER_URL=http://127.0.0.1:18082/scan
# Start Router with its normal command in this environment.
```

Use a distinct scanner token and supply it to both processes. The scanner
endpoint requires a literal loopback address and explicit port. The default
listener uses `127.0.0.1:18082`. To use IPv6, set
`ROUTER_SENSITIVE_DATA_SCANNER_HOST=::1` and configure Router with
`http://[::1]:18082/scan`. Use `ROUTER_SENSITIVE_DATA_SCANNER_PORT` to select a
different port. Deploy the scanner in the same network namespace as Router.

`ROUTER_SENSITIVE_DATA_SCOPE=full` covers JSON plus eligible header and query
values. This is the default. `body` only sends the JSON to the detector.
Protocol fields that Router controls, including request authentication and
WebSocket negotiation, have their own forwarding policy. The detector policy
can be supplied as a private JSON file via
`ROUTER_SENSITIVE_DATA_SCANNER_POLICY`. For example, add known private names or
configure per-type thresholds using the [pinned sanitizer API options](https://github.com/link-foundation/sensitive-data-sanitizer/blob/v0.23.0/docs/API.md).
The file can contain sensitive originals and belongs outside the checkout with
restricted filesystem permissions.

## Session and response behavior

Supply a unique `x-router-privacy-session` header on every request in an AI
session. The value can contain 1–128 letters, digits, periods, underscores,
colons or hyphens. Router consumes it. Router can also recognize
`x-claude-code-session-id`, `x-codex-session-id`, `x-session-id` and
`session-id` where the client already sends them. The session key includes the
caller credential and an instance salt. Omitting the identifier scopes
restoration to a single HTTP exchange or WebSocket connection.

The scanner keeps maps in memory for 30 minutes of inactivity. A restart or
credential change loses prior restoration state. Configure client sessions and
routing accordingly when running multiple Router instances. A map can hold up
to 256 entries and 128 KiB. A scanner allows up to 128 active session maps and
four simultaneous scans. Over-limit scans fail closed. Two overlapping scans
for the same session can require an application retry.

Complete, exact placeholders are restored in identity-encoded JSON, SSE
records and supported JSON WebSocket response events. A placeholder can span
network packets within a record. Modified tokens and tokens split between
logical events can remain pseudonymized. This is reversible pseudonymization
for a trusted recipient. Treat restored outputs and any client logs of those
outputs as sensitive.

## Coverage

Router scans supported JSON inference and native vendor HTTP routes, including
nested text and tool arguments. It can scan supported Responses and Realtime
WebSocket text events. It refuses recognized opaque attachments, binary client
frames, direct WebRTC call creation and unsupported request encodings. Gzip is
accepted. Zstandard is accepted in Rust and in JavaScript runtimes with a
bounded zstd decoder. Both the request envelope and the scanner reply have a
4 MiB cap, subject to Router's lower request limit.

Detector coverage depends on the input, language, format and policy. Public
data suppression, PII inference from context, files referenced indirectly,
path identifiers, operator-supplied provider settings, TLS/network metadata
and provider-generated secrets need separate controls. The scanner receives
the original JSON on loopback and belongs inside the same trusted boundary as
Router. The [case study](../case-studies/issue-781/README.md) records the
comparison and validation status.
