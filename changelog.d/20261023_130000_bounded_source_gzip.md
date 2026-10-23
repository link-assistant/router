### Fixed

- Compress the complete formatting-adoption source bank below the unchanged
  4 MiB compiler-export file budget using a pinned precompiled Zopfli C/WebAssembly
  fallback, with complete byte restoration and source/CST inverse checks. Keep
  native gzip for ordinary inputs, original reader/producer APIs, all storage
  limits and explicit translation/parity refusals.
