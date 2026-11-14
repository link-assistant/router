### Fixed

- Copy the complete later source-equation producer, history adapter and pinned
  original archive into private parser receiving fixtures before inspecting
  the current executor. Retain all original behavior cases and deadlines.
- Preserve the history API's refusal diagnostic when the complete equation
  producer refuses an unissued physical source. Identify that specific error
  privately and propagate unrelated callback exceptions unchanged.
