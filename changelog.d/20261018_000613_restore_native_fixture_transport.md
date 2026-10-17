Restore the native static-source reader's malformed-input fixtures to their
original raw JSON and gzip transport. Drop copied compact-storage metadata
before writing each fixture, and avoid repeatedly encoding these legacy-format
mutations into the compact format. All eight original test callbacks, source
mutations, assertions and deadlines are unchanged. Dedicated codec tests retain
the compact-format controls, while installed-bank and producer tests still use
the actual compact archive. Whole-file Node and Bun timing and resource checks
remain required; this source change alone establishes no performance gain.
