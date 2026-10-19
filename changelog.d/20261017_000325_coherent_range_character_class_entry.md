Regenerate the compiler class-entry manifest with the actual source producer for
the integrated range and character rules. All thirteen generated class modules
remain byte-identical; only the manifest entry pin changes to the complete
112,483-byte Host source. All twenty-four complete class selections, forward
edits and full inverse transformations were reviewed before installing the
producer output. Source-only production passed under TypeScript 5.9.3 with a
60-second and 1 GiB bound; receiving tests and the complete JavaScript gate remain
required. No Rust tools ran locally.
