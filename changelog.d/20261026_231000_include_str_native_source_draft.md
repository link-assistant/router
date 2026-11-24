Draft a fresh include-str native source reader retaining sixteen complete inputs
and sixteen whole handler/parser/path/loader/output callbacks. Preserve original
CSTs, current-input guards, bounds and private request identities. Add independent
unrun source/refusal cases; actual Span, file loader, owner and global closure
remain unqualified.
