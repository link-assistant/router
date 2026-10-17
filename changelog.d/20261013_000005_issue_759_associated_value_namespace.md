Primitive From<bool> scope checks refuse both functions and associated constants
whose actual member name is `from`, including raw identifiers and unknown cfg
alternatives. Associated types remain in their separate type namespace. Actual
function headers require a parameter or generic list after the name; keywords
inside a malformed producer cannot establish a harmless member declaration.

The namespace rule follows the Rust Reference:
https://doc.rust-lang.org/reference/names/namespaces.html

The preceding complete Node and Bun pairs each passed 682 checks, with no skip,
timeout, changed source input or Rust execution. Those complete results and the
source-only associated-constant review are retained in the case study. The
successor complete pair and bounded bulk corpus generation are pending; full
native Router and reverse-generation parity remain unfinished.
