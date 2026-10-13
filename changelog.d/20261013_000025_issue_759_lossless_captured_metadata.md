### Changed

- Losslessly compress 255 complete captured API metadata responses, migration vectors and path lists, with three archive-link updates. All decoded original Git bytes and all 29,032 original raw inputs are verified; every other input, all 804 Rust files and both Cargo inputs retain their exact bytes. Complete CI measurements remain equal after archive-path normalization. The compaction recovers 2,723,840 allocated bytes within the unchanged 500 MB evidence budget; repository file and published proposal snapshots remain available in their original locations.
