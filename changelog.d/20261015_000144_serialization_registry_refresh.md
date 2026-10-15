### Refresh source-discovered serialization metadata

Regenerate the complete serialization registry against the integrated compiler
and original dependency inputs. Both schema producers, both freshness checks
and both independent strict TypeScript descriptor checks pass.

The native affinity descriptor is byte-identical. Every previous registry entry
has the same runtime value before and after regeneration in JavaScript and in
executed TypeScript 5.9.3 output. Complete runtime parity remains unproved.
