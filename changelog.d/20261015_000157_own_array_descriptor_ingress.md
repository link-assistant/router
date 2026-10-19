Reject same-key-count array holes before looking up numeric descriptors through
Object.prototype in source metadata, tokenizer captures, method associations,
shared enum source collection and live Matches namespace targets. A private
null-prototype membership table reuses each existing own-key enumeration; it
adds no reflection or mutable-method calls for valid arrays.

The draft preserves existing metadata limits, valid-input callback
ordering and inherited toJSON behavior. Tests retain the original copier as a
valid-domain oracle and demonstrate its inherited-descriptor failure. No runtime
array ownership, macro or source authority is added. The coordinator ran both
complete focused files: 15/15 cases passed in Node and Bun, and all five retained
full ingress vectors were byte-identical. Source inputs, original case caps and
the TypeScript 5.9.3 dependency pin were unchanged; no local Rust checks ran.

This is focused qualification only. Broader receiving checks, full-gate checks
and generation with this fix remain unrun. Arbitrary rebound String remapping
to other inherited keys is outside this narrow numeric-hole repair.
