Constant source links require a private original tokenizer identity and exact
source bytes. Declaration-local project tokens bind only their original full-file
slice and offset. Copied tokens, changed literals, comments or raw-string bytes,
and token changes before or after parser construction cannot mint source proofs.
The frontend's exact positioned `&&` type-token split remains admissible.
Actual declaration names, const/async flags, and source data layouts and
attributes are captured before linking. A linked semantic declaration must be
the exact coordinate relocation of that captured source syntax.
Checked-IR normalization has separate bounded cell and byte limits from
evaluated values. The unchanged verification constant's full metadata is
retained in its digests without spending its evaluated-value cell allowance.
Its measured checked entry is 26,349 cells and 327,158 serialized bytes.
Normalization remains limited to 65,536 cells and 1 MiB per payload, including
the complete resolved-body collection. Evaluated values retain the 16,000-cell
limit, and serialized values and proofs retain their 256 KiB limit.
