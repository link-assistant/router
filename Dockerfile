# Build stage
FROM rust:1.82-slim AS builder

WORKDIR /app

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

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/link-assistant-router /usr/local/bin/link-assistant-router

# Default environment
ENV ROUTER_PORT=8080
ENV CLAUDE_CODE_HOME=/data/claude

EXPOSE 8080

ENTRYPOINT ["link-assistant-router"]
