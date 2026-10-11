Source-only, untested draft of the ordinary Rust 1.89 bool.then_some method.
Its complete licensed bool.rs source is pinned independently of lazy bool.then.
The shared standard planner requires a by-value primitive bool, actual canonical
Option result and checked payload identity. Emission evaluates the receiver
then its argument once, even when false; borrowed origins come from the actual
argument and owned String results retain their checked ownership. Nonlocal
argument control, erased identities, owned aggregate moves/destruction, custom
owners and constant calls remain refused.

Seven pending cases include eager overflow/panic, observable effect order,
canonical owner aliases, borrow escapes and helper-name collisions, plus the
complete unchanged output_limit.rs data_payload declaration at UTF16
15207..15550 (SHA 04bfbe451d693d4d59236c58510214e7a13b0ff5d9dd3ae18a4e0f8aa42a08cd).
All original Rust bytes and attributes are retained. No compiler, test, graph,
producer or Rust execution ran on this draft; no executable gain is claimed.
