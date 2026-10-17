Supply the current checked Option/Result field types before recursively checking
nested constructor arguments. A private synchronous application frame must match
the exact arguments, environment, path, and range before a temporary field view
is passed to the unchanged constructor checker. The actual registry stays intact,
and the frame is restored on every return or throw.

Keep the existing static-origin, canonical layout, payload identity, ownership,
private-frame, and tuple fallback checks. Add nested Result/Option and context
cleanup/mismatch regressions without changing existing case or child deadlines.
Runtime receiving remains unrun in the authoring worktree.
