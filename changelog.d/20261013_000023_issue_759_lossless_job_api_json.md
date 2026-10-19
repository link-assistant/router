### Changed

- Store 259 captured CI job API responses as deterministic gzip archives. Every decoded response is byte-identical to its original Git blob, all 28,586 CI input files retain their complete contents, and the complete before/after measurement reports agree after archive path normalization. This recovers 897,024 allocated bytes within the existing 500 MB evidence budget; original logs, sources and recorded CI outcomes remain available.
