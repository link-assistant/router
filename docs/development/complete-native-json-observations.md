# Complete native JSON observations

`complete-json-projection-hook-wire.mjs` is a separate test transport for the
existing complete native JSON observer equation. Native `JSON.stringify` still
visits the entire original result and callback tape, preserving its class,
`toJSON`, getter, omission, Buffer and primitive projection behavior. A private
replacer indexes primitive string values. Every occurrence remains in the full
projection, and every distinct string remains in complete UTF16 chunks. Dense
native Uint8Array values retain all bytes in canonical base64 and restore fresh
views with the identical native JSON projection. Additional own fields,
subclasses and shared byte storage refuse. Decode restores the complete data
and byte substrates; comparison checks every encoded frame
byte. A changed nested digest is fully re-encoded and must fail comparison.

The protocol requires ordinary observation-helper intrinsics. It explicitly
refuses boxed String values, which native JSON unboxes after invoking a
replacer, and retains a depth-512 bound. The original complete frame transport
still independently enforces 1 MiB leaves, 64 MiB child output and 384 MiB
decoded representation. The indexed representation avoids a single expanded
trace string; it does not trim fields, events or successful results. Existing
case and child deadlines remain unchanged.

The stricter plain-DATA indexed transport and the original Core observer remain
available with their original domains. Neither observation format issues a
source, owner, type or executable proof. Dictionaries are local to one encoding
and do not cache compiler verdicts or encoded output across operations.
