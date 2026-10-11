### Fixed

- Bound deterministic translation checks at ten minutes after eight embedded
  six-minute checks timed out while all ten same-head standalone checks passed
  in 300–498 seconds. Keep the exact artifact comparison and strict assertions.
- Allow fourteen minutes for the complete acceptance checker, with its native
  evidence budget retained at three minutes. Bound the parity workflow at fifty
  minutes using the observed 1,133-second acceptance workload, the three checker
  calls' added allowance, the canonical checker, and setup.

The complete failed CI batch is retained in the case study. This budget repair
does not establish parity: 442 native and carried-translation gaps remain.
