---
bump: patch
---

### Fixed
- On macOS, backup, reset, restore and `clients update` no longer treat a running client as absent when `ps` cannot inspect it. A failed `ps`, or one that printed nothing yet claimed success, used to read as "not running". It now blocks the operation and names the process and the reason. Only a process `ps` no longer lists, or a zombie, counts as gone. When macOS withholds a process's environment (another user's process, or a restricted or Apple platform binary under System Integrity Protection), the message now says so (#619).
- The macOS active-client safety test can no longer pass or fail by accident. Its fixture used to exit after 30 seconds, so a loaded full run could see a real "nothing is running" answer, which then looked like the maintenance plan reporting `unsupported` instead of `blocked`. The fixture now runs until the test ends, and the test checks it is alive after every Router call. The fixture is re-signed ad hoc so that SIP does not hide its environment, and every assertion reports what `ps -E` saw. CI repeats these tests on macOS (#619).
