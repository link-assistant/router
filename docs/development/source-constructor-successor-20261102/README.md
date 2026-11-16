# Required rule-constructor argument: source successor

Source reading found that both new receiving source producers called
`exactLiteralSubstitutionRule` with three arguments. The actual shared constructor
requires `(id, before, after, message)`, preserving the original unique-anchor
and required-message guards. Those calls would refuse before source generation.
No failed test/CI run was observed; this is a source-inferred drafting defect.

Both current producers now supply an explicit unique-anchor error message in
every language/repository rule. The original constructor, before pins, source
anchors, receiving implementations, cases, deadlines and output equations are
unchanged. The existing whole positive source-copy cases exercise the actual
corrected constructors and complete actual receiving outputs when later run.
No mirror-only test or weakened guard was added. All execution remains UNRUN.

The full two producer before/after evolutions, original shared constructors and
both complete existing case sources are retained in
[complete-source-correction.json.gz](complete-source-correction.json.gz), SHA256
`4c9db0ebbaa0df963a8828c26c744fd041fbc20094037bb8ccb8549544e35542`, 21159 decoded/4085 packed bytes. Earlier source packets
004243ab475dec3292c972ff7d27ea076eed4a0a2b0bc51b091255c77319e1e8 and
c0ad5550613a644e8c9ec4fb1404dbf162f4a1bc0e3b2aba0871de732fcc2f83 retain their full
initial images unchanged. Current source has this explicit successor; the old
images are history, not current freshness receipts. The
[copy contract](../source-copy-import-closure.md) records the argument lesson.
No semantic/source/compiler authority or source-row closure is inferred.
