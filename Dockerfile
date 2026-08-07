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
    cargo build --release && \
    rm -rf src

# Copy real source code
COPY src/ src/

# Touch files to invalidate cache for source changes
RUN touch src/lib.rs src/main.rs && \
    cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# `POST /api/login` (issue #47) drives the Claude Code CLI on a PTY inside this
# container, so the CLI — and the Node runtime it needs — must be present. Set
# `--disable-login-api` if you authorize by mounting a credential file instead.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g @anthropic-ai/claude-code && \
    npm cache clean --force && \
    apt-get purge -y gnupg && \
    apt-get autoremove -y && \
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
