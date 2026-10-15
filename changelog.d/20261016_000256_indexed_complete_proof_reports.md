### Changed

- Draft a bounded, file-indexed parent reader for complete reference proof reports. Every string, node, field, descriptor, scalar, reference and array constraint is validated before the existing assertions; full original wire/envelope files and byte comparisons remain. Proof children, engines, full source/hash/repack work, codec APIs and all existing deadlines and limits are unchanged.
- The private file transport explicitly refuses malformed UTF8, duplicate JSON object names, unsupported outer/check shapes, numeric tokens longer than 4096 bytes, reentry and use after scope closure. Generic in-memory codec behavior is unchanged. A reused UTF16 arena and numeric file indexes replace the parent envelope DOM; memory and performance qualification remain unrun.
