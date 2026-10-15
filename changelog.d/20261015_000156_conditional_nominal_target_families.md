Added a private source-only proof for conditional local nominal implementation
target families. It joins the complete original declaration/import census to
private resolver and source-view origins, preserving all cfg alternatives and
their exact source spans. Aliases, unresolved transforms and module-level macro
outputs remain refused.

This first stage does not change Copy consumers, choose an available type or
layout, or close nested/global implementation and macro obligations. The actual
Owned destructor retains its cfg and format output barriers. The new complete
behavioral file is unverified pending the coordinator's JavaScript engine lease;
no Rust checks, runtime gains or full-library admission are claimed.
