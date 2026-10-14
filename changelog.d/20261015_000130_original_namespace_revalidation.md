### Changed

- Revalidate complete mutable parser namespace maps against a live, privately issued snapshot without repeatedly serializing that same snapshot. Every binding, insertion order and target data descriptor remains checked.
- Preserve the original full digest path when the existing bounded snapshot is evicted, metadata differs or the original JSON, Map or iterator machinery changes. The snapshot limits, metadata budgets and source authority checks remain unchanged.
- Add regression cases for later namespace mutations, hostile descriptors, serializer changes, eviction, metadata budgets and compatible descriptor changes. This optimization does not implement additional Rust behavior or establish runtime parity.
