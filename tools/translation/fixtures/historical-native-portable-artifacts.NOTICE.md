# Matching historical native artifacts

`historical-native-portable-artifacts.json.gz` preserves the two complete native
coverage manifests and every one of the 312 native portable output files from
Router revision `eb2dad1c0a18394dc1aad46413e11401e74eb502`. All 52 input source
hashes match the unchanged `historical-native-source.json.gz` fixture. Router's
original license and notices remain applicable.

The capture source is `experiments/issue-784/capture-historical-native-artifacts.py`.
The compressed archive has SHA256
`a9430e19f4f6960e82b4bdf056085563c48464ae4544f1ecc51ceee41502c342`.
It is immutable historical source data for regression comparisons. Current
compiler tests still analyze, independently check and emit those original
sources afresh. The separate mandatory current-source regeneration and strict
parity checks remain unchanged; this fixture establishes no current freshness,
runtime parity or executable permission.
