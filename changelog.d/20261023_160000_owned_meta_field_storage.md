Use a separately generated bounded UTF-8 serializer and explicitly consuming
storage planner for producer-owned translation metadata. Preserve the original
non-consuming APIs, complete field bytes, validation, and storage limits. Add
whole retained semantic/concrete field regressions and document partial
consumption on later errors. Full-corpus generation and parity remain required.

Encode selected components before ordinary fields, restore original output key
order, and retain root fields as UTF-8 bytes to avoid duplicate root strings.
Primitive BigInt conversion cannot invoke prototype callbacks. Require pressure
verification of the complete decoded CST and original logical metadata digest.
