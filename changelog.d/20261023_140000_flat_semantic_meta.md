### Changed

- Add source-derived semantic storage siblings to the explicit flat bulk
  translator, preserving exact JSON and every original parser validation while
  reducing temporary whole-document string copies. Keep original semantic APIs,
  storage limits, refusals and the same-SHA JavaScript-before-Rust CI gate.
