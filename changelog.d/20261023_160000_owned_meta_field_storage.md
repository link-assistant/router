Use a separately generated bounded UTF-8 serializer and explicitly consuming
storage planner for producer-owned translation metadata. Preserve the original
non-consuming APIs, complete field bytes, validation, and storage limits. Add
whole retained semantic/concrete field regressions and document partial
consumption on later errors. Full-corpus generation and parity remain required.
