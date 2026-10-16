---
kind: added
---

Extend the owned JSON language rule to bounded literal arrays through the same
registered canonical JSON runtime used for objects. Preserve original parser
budgets, source joins, typed pure operands, independent JSON copies and outer
question-mark flow; custom serializers, floats, owned text and effects remain
refused. Update the old array refusal to a nested unsupported-float refusal and
require the formerly refused boolean array as a positive behavioral case.
Document and exercise the unchanged aggregate 4,096-node/depth-32 runtime
boundary, including repeated individually valid JSON inputs that exceed it.

Add complete Node/strict TypeScript behavioral and boundary tests, including the
complete physical ActivityPub module under an explicit fixture root, and native
Rust oracle source for CI only. Draft checks do not establish full crate parity.
