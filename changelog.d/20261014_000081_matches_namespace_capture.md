Reuse initial matches namespace digests only after exact native-Map order and
string-array descriptor/value comparison against a private immutable snapshot
reconstructed by the original source-scope builder. Caller Maps remain fresh
and mutable; every subsequent parser check retains the complete original digest,
mutation, descriptor, proxy and metadata-budget validation. Changed serializers
or Map machinery and mismatched data retain the original fallback.

Bound snapshots to two entries per genuine context, eight globally, 2 MiB per
entry and 8 MiB globally in serialized bytes (not heap RSS). Global entries hold
no issuer or module references; eviction clears data immediately and private
issuer finalization releases unreachable contexts' retained snapshots.
