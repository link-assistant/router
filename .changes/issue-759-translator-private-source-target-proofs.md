Expose each loaded module to the shared JavaScript and strict TypeScript test
callback so original private functions can receive the same behavior checks
through explicit test exports without changing their Rust source bodies.
