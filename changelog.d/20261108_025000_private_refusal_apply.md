### Fixed

- Capture the original apply function when classifying private equation-source
  mismatches, so a later replacement cannot make a copied exception qualify.
  Add a regression while preserving all original producer checks and diagnostics.
