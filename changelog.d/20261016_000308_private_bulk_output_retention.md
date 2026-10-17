Add explicit `--retain-output-text` source-generation storage mode. The default
bulk/matrix APIs keep their original raw output strings and observer contract.
The opt-in mechanically derived planners use captured private collections and
lossless immutable UTF-16 chunk backing, reconstructing each complete output at
its original byte-count/hash/write site. Lone surrogates and all CST/semantic
components remain exact; every profile is still planned and validated before
writes. This mode does not preserve public Map/WeakMap observer access to private
output values. It grants no semantic/source authority and caches no current
verdict. `prepare-retained-bulk.mjs --check` verifies the two generated planners;
`--emit` produces a full reviewed-update proposal through language then repository
substitution rules with complete undo. Existing output/resource limits remain.
Memory reduction and complete Router generation remain unqualified until measured.
