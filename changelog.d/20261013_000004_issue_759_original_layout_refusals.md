Original-source declaration refusal collection now retains the full parsed
declaration range and privately associates generated Option, Result and tuple
layouts with their original parent. Independent layout and signature failures
can be removed together before all surviving declarations and callers are
checked again. Public generated flags, copied hashes and unlinked layouts do
not grant this association; failed phases return no checked program.

Trait member and conditional import candidate names now come from their actual
declaration headers. Keywords inside macro payloads cannot establish a member
or nontrait declaration, and raw member identifiers retain their actual name.
Conditional availability remains unproved. Bulk negative controls retain one
independent function through JavaScript and separately compiled TypeScript.

The preceding complete Node and Bun pairs each passed 682 checks. The following
bounded corpus attempt ended at 1200 seconds after 41 checking attempts, with
unchanged original inputs and no Rust execution. Complete diagnostics are
retained under the case study. Successor tests and corpus generation are
pending; this change does not establish complete Router runtime parity.
