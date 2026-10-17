Draft reusable source-qualified str/String encode_utf16 into the existing lazy
u16 iterator/count pipeline, rejecting unpaired-surrogate host strings before
iteration. Draft integer as f64 for actual checked fixed primitive identities
uses bounded BigInt significands and explicit nearest/ties-to-even rounding.
f32, unknown/custom/reference casts and floating CTFE remain refused.

The original model_name_length_permits needs a written &String temporary passed
to an ordinary &str function parameter. A separate checked call-only coercion
retains the ampersand, resolved source callee, standard String owner and local
origin, evaluates the temporary once, and permits only scalar-returning source
functions. Static/unknown parameters and escaping borrows remain refused.

Official Rust 1.89 sources and versioned cast rules are archived with exact
checksums/licenses. Original complete attributed utf16_length and
model_name_length_permits declarations are pinned; no Rust body is rewritten.
All authored tests are UNRUN; source-only work follows d4883e8b9/7dcbe2e36 and
requires Root's separate literal/tool-attribute dependencies before coherent
Node/Bun plus JS/strict TypeScript verification. No corpus/parity gain is claimed.
