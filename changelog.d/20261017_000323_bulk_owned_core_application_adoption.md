Apply the actual combined CST producer to the complete 560-file physical Rust
`src` tree. Fifty application files now use the owned compatibility core through
265 substitutions: 85 qualified formatting calls, two owned-text aliases and
178 borrowed-text aliases. The formatting pass selected 34 functions in 15 files;
the following primitive pass changed 44 files. Both passes retain unsupported
and ambiguous source with explicit diagnostics.

Before installation, all 4,582 output packets (338,538,667 bytes), every physical
original source, both complete before/after CST representations, all mapping
segments and full inverse reconstructions were independently checked. Only the
actual producer's raw after-source bytes were installed. Existing library
implementations behind the owned aliases and format wrapper remain untranslated.

The complete new producer suite passed all eight cases in Node and all eight in
Bun, including strict TypeScript 5.9.3 and failure-publication controls. The actual
corpus proposal took 312.89 seconds with observed peak aggregate RSS 1,025,359,872
bytes, below its 3 GiB cap. Original sources remained unchanged during proposal
and review. Application source adoption does not establish executable coverage:
fresh canonical/matrix generation, complete JavaScript gates and CI-only Rust
verification remain required. No Rust tools ran locally.
