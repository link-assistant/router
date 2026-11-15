# Original Lefine shared receiver regression

`lefine-shared-receiver-original.rs.txt` retains the complete 7,222-byte Router
source from commit `62c47c18a52ce9af2768690a92d0ed3655bc6c8b`, path
`src/lefine.rs`, under the repository license. SHA256:
`bb07ea2db551cc85bc19403bfd2c160f439d6c48fe7ffc49a1e0cad249dc2093`.

The original shared-receiver test keeps its complete source, declaration pins,
assertions and implicit deadline. Its paired current-source case independently
reads the whole physical `rust/src/lefine.rs`, checks its current source and
declaration pins, and repeats every getter/certificate/forgery assertion.
Historical fixture data grants no current-source or executable authority.
