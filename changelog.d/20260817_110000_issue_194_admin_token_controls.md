### Added
- The web, Telegram and VK admin surfaces now manage every token constraint the CLI and HTTP APIs support. The Chakra issue form gained token-spend and requests-per-minute fields, and the token table shows spend, reserved budget, rate limit, account pin and expiry alongside a per-token Rotate action.
- Chat commands accept every control through `key=value` options (`label`, `ttl_hours`, `max_requests`, `max_tokens`, `rate_limit_per_minute`, `account`) while keeping the documented positional short form, and gained `/show <id>` for a token's full constraint and usage detail plus `/rotate-token <id>` to reissue a token while preserving its limits.
- `POST /api/tokens/rotate-client` reissues one client token by id, preserving every constraint that is not explicitly overridden and revoking the previous value. `tokens rotate` gained matching `--max-requests`, `--max-tokens`, `--rate-limit-per-minute` and `--account` flags.

### Fixed
- Token constraint bounds are validated once and shared by the CLI, HTTP and chat surfaces, so the same input is no longer accepted on one surface and rejected on another. Zero-valued caps and non-positive TTLs are refused everywhere rather than minting a credential that can never serve a request.
