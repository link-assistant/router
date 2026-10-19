### Changed

- Reuse namespace setup templates only for the original, deeply frozen resolver scope array. Every parser retains independent mutable namespace maps, target arrays, visibility checks and source evidence; caller-created or serialized scope arrays use ordinary fresh setup. The original 391-module resolver and complete root, clients and verification parser configurations agree with the previous implementation. Focused Node/Bun mutation and forgery regressions pass; the isolated setup timings do not establish whole-corpus or CI savings.
