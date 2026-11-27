# Build stage
FROM rust:1.100.0-slim-trixie@sha256:3b199fd6db7d709274df56565b8f4003f9e30d7bfcff9d53148c86053b7855e2 AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        pkg-config \
        libssl-dev \
        python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY rust/Cargo.toml rust/Cargo.toml

# Cargo validates every declared target even when only binaries are built.
# Generate all paths from the manifest instead of maintaining a list (#687).
COPY scripts/docker-cache-targets.py /tmp/docker-cache-targets.py
RUN python3 /tmp/docker-cache-targets.py && \
    cargo build --release --locked --bins && \
    python3 /tmp/docker-cache-targets.py --clean

# Copy the committed admin UI before the Rust source. RustEmbed needs this
# directory at compile time, and keeping it in a separate layer preserves the
# cache when only Rust source changes.
COPY ui/dist/ ui/dist/

# The capability contract validates checked provider evidence at compile time.
COPY docs/provider-evidence/anthropic-adaptive-thinking.json docs/provider-evidence/anthropic-adaptive-thinking.json

# Copy every real target, including custom bench/test/example paths. Keeping
# only src/ here would make Cargo reject the manifest again after stub cleanup.
# .dockerignore excludes build output and local state from this layer.
COPY . .

ARG ROUTER_SOURCE_COMMIT=unknown
ENV ROUTER_SOURCE_COMMIT=${ROUTER_SOURCE_COMMIT}

# Touch files to invalidate cache for source changes
RUN python3 /tmp/docker-cache-targets.py --touch && \
    cargo build --release --locked --bins

# Runtime base
#
FROM oven/bun:1.4.5@sha256:3aa040e5445efa09d75bb428a64ba50db13e2b3ac9b6b0c7f145615f62b2ee18 AS bun-runtime

# Deliberately contains no vendor CLI. Native OAuth creates and refreshes the
# credential; bun is only a small runner for a disposable compatibility flow.
FROM debian:trixie-slim@sha256:8aa5a7bf5a1955bddbe7d74fcdd0b91ab30e74362a8b73af672b0481b35b44a0 AS runtime-base

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun

COPY --from=builder /app/target/release/link-assistant-router /usr/local/bin/link-assistant-router
COPY --from=builder /app/target/release/with-router /usr/local/bin/with-router

# `router` is the canonical command name every document uses, and the one
# `cargo install` puts on a workstation's PATH. Without it here, a runbook step
# copied from the docs fails inside the container with "executable file not
# found" (issue #243). A symlink rather than a second copy: the two Cargo bin
# targets build the same entry point (`src/bin/link-assistant-router.rs`
# includes `src/main.rs`), so shipping both would add ~15 MB of identical bytes
# to the image.
RUN ln -s link-assistant-router /usr/local/bin/router

# Default environment
ENV ROUTER_PORT=8080
ENV CLAUDE_CODE_HOME=/data/claude

# The login flow writes the credential it obtains here, so this must be
# writable — a read-only mount makes `POST /api/management/login` fail immediately.
RUN mkdir -p /data/claude

EXPOSE 8080

ENTRYPOINT ["link-assistant-router"]

# Single published runtime stage.
FROM runtime-base AS runtime
