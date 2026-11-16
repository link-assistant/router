# Copied import closure source draft

Source review found duplicate imported bindings in copied textual adapters.
This draft removes the 22 repeated declarations while retaining the first exact
imports, every function body and all original source bytes in inverse history.
Import edits now may select an exact full native declaration span when multiple
imports use the same module. The installed native AST still selects that owner;
a caller span or spelling alone supplies no source or semantic authority.

Both original native binding APIs retain their complete unbound/initialization
checks and also reject duplicate declaration diagnostics. Four complete source
equations, independent regression source and the next history link are drafted.
No preparer, compiler, test, translator, Rust tool, regeneration, push or CI ran.
All validation and every unfinished bulk-draft ledger requirement remain open.
