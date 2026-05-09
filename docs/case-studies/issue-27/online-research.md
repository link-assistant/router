# Online Research

## Sources

| Source | Relevant Finding |
|---|---|
| Docker Docs, [Build best practices](https://docs.docker.com/build/building/best-practices/) | Docker recommends combining `apt-get update` with `apt-get install -y --no-install-recommends` in one `RUN` instruction, and cleaning `/var/lib/apt/lists/*` to keep apt metadata out of image layers. |
| docs.rs, [`openssl-sys` build documentation](https://docs.rs/crate/openssl-sys/0.9.23) | The crate requires OpenSSL libraries and headers to be present before compilation; Linux guidance calls out `pkg-config` and packages such as `libssl-dev`. |
| Debian Packages, [`libssl-dev` in bookworm](https://packages.debian.org/bookworm/libssl-dev) | `libssl-dev` is the Debian bookworm OpenSSL development package and contains development libraries and header files for `libssl` and `libcrypto`. |
| Debian Packages, [`pkg-config` in bookworm](https://packages.debian.org/bookworm/pkg-config) | `pkg-config` is available in bookworm as the compatibility package for `pkgconf`, which provides compiler and linker flag discovery for development frameworks. |

## Conclusion

The online sources support the log-derived fix:

- The Dockerfile should install native build packages with one `apt-get update && apt-get install` layer.
- The builder should use `--no-install-recommends` and remove apt lists after install.
- `openssl-sys` needs both `pkg-config` and OpenSSL development headers/libraries when building against the system OpenSSL package.
- `pkg-config` and `libssl-dev` are available in Debian bookworm, matching the existing `rust:1-slim-bookworm` builder base.
