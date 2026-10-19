# Original unit enum Default translation

The translator selects the original compiler's exact Default invocation and its single checked `#[default]` unit variant. The retained MethodDef and positive AST output determine the zero-argument signature and `Self::Variant` path. The translator maps that path into the existing meta-language unit constructor, which the ordinary nominal checker validates before JavaScript and TypeScript emission.

The generated method remains separate from written Rust methods. The source selection supplies no runtime, Copy, no-Drop or const authority. Missing or duplicate defaults, payloads, explicit discriminants, unknown attributes, generic layouts, overlapping implementations and const trait calls remain refused. Independent review must reconstruct the original invocation, output and checked constructor rather than accept serialized source flags.
