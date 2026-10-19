---
kind: fixed
---

Retain accessor-bearing freezer test results through a complete descriptor and
identity graph. Assertions and JSON evidence no longer execute the reentrant
getter after its native-operation restoration block. The original freezer
workload and observer tapes stay in place; new checks require one intended
getter call and exact native descriptor restoration after assertion/retention.

The full diagnostic identified both leaked wrappers as the case-5 getter's
functions: Object.freeze and Array.prototype.forEach. All six cold child
comparisons had completed successfully; the later checked translation exposed
the parent-process contamination. Production guards and initialization remain
unchanged. All eight cases and child deadlines are preserved. This source-only
repair is locally UNRUN; complete receiving belongs to the coordinator.
