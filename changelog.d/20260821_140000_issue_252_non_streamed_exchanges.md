---
bump: minor
---

### Fixed
- `logs anomalies` no longer reports complete non-streamed exchanges as streams with an unknown ending. Every response is relayed through the same byte-stream machinery, so the analyser treated the presence of body records as proof of streaming — and 85% of one real log's 1248 "streamed" exchanges were ordinary `application/json` replies that had completed normally (issue #252). An operator investigating a genuine truncation had to wade through ~1000 false entries to find it, and a signal that fires on the common healthy case trains people to ignore it.
- A gzip-compressed single-shot reply is no longer mistaken for a truncated stream. Its transfer chunks were counted as SSE frames, so the absence of a dialect terminator in them was reported as a cut stream — and warned about, once per successful request, filling `docker logs … | grep -i warn` on a healthy deployment with noise that a real truncation was indistinguishable from.
- Whether an exchange streamed is now decided from evidence: the response `content-type` settles it (`text/event-stream` is a stream, anything else is not), with the request's `stream: true` as a fallback when no media type was recorded. The response outranks the request, since an upstream may answer a streaming request with a single document. An undeclared media type stays eligible for truncation detection, so the reach of the check added in #230 is unchanged.

### Added
- `logs summary` reports `non_streamed` alongside `streamed`, so the split is readable at a glance rather than inferred by subtraction — every stream statistic's denominator depends on it.
- The terminal log record carries `streamed`, and a non-streamed reply settles as `completed_not_streamed` rather than `ended_without_terminator`. A transport failure still fails it: a truncated document is a real problem whatever the framing.
