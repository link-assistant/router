Add explicit gzip packet storage for fixed compatibility-core proposal sequences.
The default writer, logical index, full source/CST evidence and all source/Cargo
checks remain unchanged. Successful compressed proposals retain complete raw and
stored lengths/digests and require fresh packet reads plus final inventory
verification. The CLI remains proposal-only.

Keep the existing 64 MiB packet and 1 GiB logical bounds; apply a separate 384 MiB
stored-output bound including pending publication and the failure reserve.
Incomplete runs retain partial files and their original bounded failure receipt,
without a recovery protocol or semantic authority. New complete whole-file
transport, default-observer, failure and JS/strict-TypeScript tests are authored;
receiving and full-corpus resource qualification remain UNRUN.
