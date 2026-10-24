### Added

- Drafted text, Option callback and primitive/owned Result compatibility cores,
  translator integration, automatic adoption packets and complete source inverses.
- Drafted shared cancellation, deadline and bounded pull-channel interfaces.
- Drafted cancellation-scoped HTTP implementation plumbing with listener cleanup.
- Drafted pure HTTP header, request/response, status and body value interfaces,
  both caller translation directions, interpreter and receiving integration.
- Drafted guarded HTTP/1 clients, bounded pull streams, buffered sends,
  explicit cleanup, matching network policy and receiving runtime closure.

These sources and independent regression cases remain unverified during the
required bulk-drafting phase. Complete translation, production parity, async
integration and the remaining requirement ledger are still open.
