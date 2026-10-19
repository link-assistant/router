# Language layout and bounded metadata evidence

`metadata-containers.json` records three historical capture receipts moved to
lossless `.json.gz` containers. Every decoded byte was compared with the complete
original and its committed Git blob before the plain duplicate was retired.
The original logical paths and source commit remain in the record.

The existing [packet reader](../../../../../tools/evidence/README.md) accepts
compressed member receipts through `--members-receipt path.json.gz`. Historical
source records keep their original logical names; the containers preserve their
complete contents. This storage change establishes no translation or parity
result.
