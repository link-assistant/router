### Changed

- Serialize complete native body censuses as compact JSON, preserving all source scopes, spans, captures, refusals and artifact hashes while keeping generated metadata within file-length conventions and reducing disk allocation. Every native module still receives all six explicit target files, including empty refused programs.
