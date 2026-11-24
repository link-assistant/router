# Preserve metadata behavior before optimizing

Source metadata copying validates every descriptor before child traversal and
retains cell, UTF-8 byte and depth bounds, array shape checks, signed
Copy-certificate property order and mutable-source rechecks.

An experiment assigning validated fields to fresh null-prototype results
observed a 2.86% lower median in five unchanged Bun response-affinity trials,
with identical complete meta, JavaScript and TypeScript bytes. Observed RSS
increased. It passed ordinary post-import mutation and data refusal controls.
A fresh import after Object.defineProperty was wrapped exposed a changed
callback count: the original invoked the wrapper three times; the experiment
skipped it. The experiment was rejected and the production copier restored.

Capturing a binding does not establish that it was unchanged before import.
Performance changes must preserve pre-bound and subsequently rebound intrinsic
behavior, complete descriptor validation, refusals and caller callbacks.
The focused controls retain the previous copier as an independent byte/error
oracle and test fresh Node and Bun imports. These checks establish no complete
translation, runtime parity or Rust verification.
