---
bump: minor
---

### Fixed
- A gzip-compressed SSE stream is no longer reported as ending without its terminator. The router relays a compressed body byte for byte — it never decodes one — so scanning those frames for `message_stop` searched gzip and could only fail. Every healthy compressed stream was therefore declared truncated, warning once per request: 19 warnings in 25 minutes of ordinary vendor-CLI use, every one of them a turn that succeeded (issue #255). `docker logs … | grep -i warn` was again almost entirely this, leaving a genuine truncation indistinguishable from routine traffic — the outcome the diagnostics exist to prevent (#234).
- `unterminated_streams` no longer counts streams the log cannot read: 315 of 400 on the reported log, where the sampled exchanges had all completed. An operator reading that figure concluded most streamed turns were failing.

### Added
- A stream whose frames were encoded settles as `encoded_not_verifiable` and is reported under its own `stream_not_verifiable` anomaly and a `not verifiable` count in `logs summary`. Reporting "how this ended is not knowable" is honest; reporting "truncated" is not — and only the honest version leaves the truncation signal usable.
- The terminal log record carries `inspectable`, so the analyser reads the relay's own verdict about whether the frames could be examined rather than re-deriving one from headers. Headers remain the fallback, so logs written before this keep their meaning.
- A real truncation still warns and is still named: an uncompressed stream that stops early, and any transport failure whatever the encoding, are unchanged. The signal from #230 is narrowed to the cases it can actually attest to, not silenced.
