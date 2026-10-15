Added independent integration-test source for the public retry_backoff API,
covering floored and negative failure counts, maximum early stopping, signed
zero bits, NaN, terminating infinity inputs and subnormal boundaries. Cargo's
default tests/ discovery includes the new target; CI executes Rust only after
the JavaScript gate. The tests remain unrun locally, divergent inputs remain
unexecuted, and generated policy sources and the seven shared JS cases are
unchanged. This source draft does not claim runtime qualification or parity.
