# Build stage
FROM rust:1.98.1-slim-trixie@sha256:4cd829461bd5c4d511c32e269da9cb8929223b666519d8004e35fc8d1d771ab7 AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        pkg-config \
        libssl-dev \
        python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./

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

# Touch files to invalidate cache for source changes
RUN python3 /tmp/docker-cache-targets.py --touch && \
    cargo build --release --locked --bins

# Runtime base
#
FROM oven/bun:1@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895 AS bun-runtime

# Deliberately contains no vendor CLI. Native OAuth creates and refreshes the
# credential; bun is only a small runner for a disposable compatibility flow.
FROM debian:trixie-slim@sha256:a99cfc517144bc59b1978475ec53b46ecabec7e43635402ee5b77cc54cd1b20a AS runtime-base

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
