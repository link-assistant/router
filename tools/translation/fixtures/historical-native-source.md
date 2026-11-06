# Original native compiler test inputs

`historical-native-source.json.gz` contains complete source data from commit
`83cb0d789e9f875a9e38353ce1a18ebb00a814a3`: all 59 original native TypeScript
modules and their package, declaration and asset inputs (134 files in total).
Its 52 native `.mjs` parents independently match every existing byte/hash pin
from `32cbf93df679f03c8e344383d3fc38485a6edddc` in
`sequence-patterns/native-program-baseline.json`. Existing copyright and license
notices remain in the original bytes; this is Router's own historical source.

Regenerate deliberately, with those original Git objects present:

```sh
node tools/translation/prepare-historical-native-fixture.mjs --emit
node tools/translation/prepare-historical-native-fixture.mjs --check
```

The fixed historical regressions use these exact inputs with today's compiler,
retaining every original body, census, refusal, serialized/reparsed semantic
program, strict TypeScript check and deadline. Source storage grants no CST,
semantic, ownership or executable authority; ordinary compiler entrypoints
freshly reconstruct and check both representations. The authenticated gzip
reader is bounded and works in shallow CI checkouts without fetching history.

These fixtures establish historical regression behavior only. They do not
count new modules as translated, establish current source parity, or substitute
for current-source generation and runtime tests. The existing native TypeScript
tests still discover and compile the whole actual current tree and execute its
complete shared Node/Bun behavior suite.
