### Added

- Add persisted per-token actual token-spend caps and one-minute request rate
  limits, enforced independently across every supported upstream.
- Document household and small-team subscription sharing, the precise
  isolation boundary, diagnostic request-log content, and ordinary token
  expiry and rotation.

### Changed

- Rotate ordinary tokens as well as admin tokens while preserving their
  account binding and containment controls.
