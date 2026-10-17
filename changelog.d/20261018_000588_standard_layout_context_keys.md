Bind all three original Option-body context keys to their complete privately
captured layouts. Actual Node and Bun regressions reproduced distinct genuine
source layouts sharing a key and overwriting the held program context. Including
those already captured layouts prevents that collision without granting body or
ownership authority.

The three existing hash calls keep their order; their input now includes the
complete layout data for scalar and borrowed-str owners as it already did for
shared owners. Existing source, layout, body, ownership and emission checks and
all regression callbacks remain unchanged. This successor is source-only and
unrun by the worker; Root qualification is still required.
