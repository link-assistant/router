Reject same-key-count array holes before looking up numeric descriptors through
Object.prototype in source metadata, tokenizer captures, method associations,
shared enum source collection and live Matches namespace targets. A private
null-prototype membership table reuses each existing own-key enumeration; it
adds no reflection or mutable-method calls for valid arrays.

The source-only draft preserves existing metadata limits, valid-input callback
ordering and inherited toJSON behavior. Tests retain the original copier as a
valid-domain oracle and demonstrate its inherited-descriptor failure. No runtime
array ownership, macro or source authority is added. Verification is pending the
coordinator's JavaScript engine lease; no local Rust checks were run.
