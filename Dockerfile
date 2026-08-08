# Build stage
FROM rust:1-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        pkg-config \
        libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Create a dummy src to build dependencies
RUN mkdir src && \
    echo "pub const VERSION: &str = \"0.0.0\";" > src/lib.rs && \
    echo "fn main() {}" > src/main.rs && \
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
# Deliberately minimal: no Claude CLI. The router refreshes an expired Claude
# token itself by exchanging the `refreshToken` in the mounted credential file,
# so `/data/claude` may stay read-only. Use the `with-claude-cli` stage below
# when you need to *create* a credential inside the container.
FROM debian:bookworm-slim AS runtime-base

# TLS roots only. `POST /api/login` (issue #47) drives the Claude Code CLI on a
# PTY, so that surface needs the `with-claude-cli` stage below; this base image
# stays minimal for the mounted-credential deployment.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/link-assistant-router /usr/local/bin/link-assistant-router

# Default environment
ENV ROUTER_PORT=8080
ENV CLAUDE_CODE_HOME=/data/claude

# The login flow writes the credential it obtains here, so this must be
# writable — a read-only mount makes `POST /api/login` fail immediately.
RUN mkdir -p /data/claude

EXPOSE 8080

ENTRYPOINT ["link-assistant-router"]

# Runtime stage with the Claude Code CLI (published as `:with-claude-cli`)
#
# Adds Node.js and `@anthropic-ai/claude-code` so a first-time login can be
# performed inside the container:
#
#   docker run -it --entrypoint claude -v claude-home:/data/claude \
#     ghcr.io/link-assistant/router:with-claude-cli /login
#
# `CLAUDE_CODE_HOME` must be writable in this image — `claude` writes
# `/data/claude/.credentials.json`.
FROM runtime-base AS with-claude-cli

ARG NODE_MAJOR=22
ARG CLAUDE_CODE_VERSION=latest

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" && \
    npm cache clean --force && \
    apt-get purge -y gnupg && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# `claude` stores its credential here; keep it writable in this image.
ENV CLAUDE_CONFIG_DIR=/data/claude

ENTRYPOINT ["link-assistant-router"]

# Default stage. Kept last so a plain `docker build .` (and the release
# workflow's default target) still produces the minimal image.
FROM runtime-base AS runtime
