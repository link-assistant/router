# Build stage
FROM rust:1.98.0-slim-trixie@sha256:17d1ba895198f9934c6314ec5346a0d5115372f3243390c3d731e242f35c2f27 AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        pkg-config \
        libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create a dummy src to build dependencies
RUN mkdir -p src/bin && \
    echo "pub const VERSION: &str = \"0.0.0\";" > src/lib.rs && \
    echo "fn main() {}" > src/main.rs && \
    echo "fn main() {}" > src/bin/with-router.rs && \
    cargo build --release --locked && \
    rm -rf src

# Copy the committed admin UI before the Rust source. RustEmbed needs this
# directory at compile time, and keeping it in a separate layer preserves the
# cache when only Rust source changes.
COPY ui/dist/ ui/dist/

# Copy real source code
COPY src/ src/

# Touch files to invalidate cache for source changes
RUN touch src/lib.rs src/main.rs && \
    cargo build --release --locked

# Runtime base
#
FROM oven/bun:1@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS bun-runtime

# Deliberately contains no vendor CLI. Native OAuth creates and refreshes the
# credential; bun is only a small runner for a disposable compatibility flow.
FROM debian:trixie-slim@sha256:3a39a0592364683e6bab97937b72cad5a8fa6dcbbee90edb3bb48c7f8e94f258 AS runtime-base

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun

COPY --from=builder /app/target/release/link-assistant-router /usr/local/bin/link-assistant-router
COPY --from=builder /app/target/release/with-router /usr/local/bin/with-router

# `router` is the canonical command name every document uses, and the one
# `cargo install` puts on a workstation's PATH. Without it here, a runbook step
# copied from the docs fails inside the container with "executable file not
# found" (issue #243). A symlink rather than a second copy: the two Cargo bin
# targets build the same `src/main.rs`, so shipping both would add ~15 MB of
# identical bytes to the image.
RUN ln -s link-assistant-router /usr/local/bin/router

# Default environment
ENV ROUTER_PORT=8080
ENV CLAUDE_CODE_HOME=/data/claude

# The login flow writes the credential it obtains here, so this must be
# writable — a read-only mount makes `POST /api/login` fail immediately.
RUN mkdir -p /data/claude

EXPOSE 8080

ENTRYPOINT ["link-assistant-router"]

# Single published runtime stage.
FROM runtime-base AS runtime
