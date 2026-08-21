---
bump: minor
---

### Fixed
- `no_terminal_record` no longer fires on streams whose terminator is present in the recorded body. The verdict came solely from the `stream_end` record, so an exchange without one was declared to have ended in an unknown state although the marker was sitting in the body the log had already captured. 239 of 251 uncompressed streams carried a valid terminator, making the class ~95% healthy traffic — and burying the 12 that deserved attention (issue #258).
- The OpenAI and Gemini relays now settle their streams, as the Anthropic relay already did. Only one of the four streaming paths wrote a terminal record, which is *why* those exchanges reached the log without one; deriving the ending from the body keeps the report honest either way, but the missing record was a defect of its own.
- Gemini's terminator is recognised. That dialect names no terminating event — the final chunk of a finished turn carries `finishReason` instead — so its streams could never satisfy the check.

### Changed
- A recorded `stream_end` still outranks the body scan: the relay watched the frames go past, while the analyser reads what was captured afterwards. A stream with no terminator in a readable body remains a genuine anomaly, which is the case worth alerting on.
