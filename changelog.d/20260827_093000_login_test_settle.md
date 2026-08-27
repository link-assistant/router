---
bump: patch
---

### Fixed
- A login test no longer fails on a busy machine. `a_rejected_code_fails_the_session_without_writing_a_credential` set `idle_settle` to 50 ms — fifteen times tighter than the 750 ms the router actually ships — so under parallel load the PTY settled before the fake CLI had printed its rejection and the test reported a failed rejection path that works. Reproduced at roughly one run in six under contention, and not at all when run alone, which is the shape of failure that gets dismissed as noise and trains everyone to re-run a red build. The settle is now 250 ms, still far inside the 3-second `code_timeout` the test's timing assertion is actually about.
