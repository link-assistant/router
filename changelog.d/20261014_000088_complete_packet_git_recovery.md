Complete non-CI evidence archives can now be recovered through an immutable Git
commit/path/blob witness, with exact original container and physical-present
byte checks. A bounded streamed reader verifies every original TAR member against
the unchanged capture receipt and rejects links, traversal, duplicate targets,
corrupt indices and compression bombs. This enables lossless physical archive
migration under the fixed case allocation cap without dropping historical logs,
source variants, original containers or changing translation authority.
