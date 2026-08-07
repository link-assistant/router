- **`GOOGLE_GEMINI_BASE_URL`**:
  - Overrides the default base URL for Gemini API requests (when using
    `gemini-api-key` authentication).
  - Must be a valid URL. For security, it must use HTTPS unless pointing to
    `localhost` (or `127.0.0.1` / `[::1]`).
  - Example: `export GOOGLE_GEMINI_BASE_URL="https://my-proxy.com"` (Windows
    PowerShell: `$env:GOOGLE_GEMINI_BASE_URL="https://my-proxy.com"`)
- **`GOOGLE_VERTEX_BASE_URL`**:
  - Overrides the default base URL for Vertex AI API requests (when using
    `vertex-ai` authentication).
  - Must be a valid URL. For security, it must use HTTPS unless pointing to
    `localhost` (or `127.0.0.1` / `[::1]`).
  - Example: `export GOOGLE_VERTEX_BASE_URL="https://my-vertex-proxy.com"`
    (Windows PowerShell:
    `$env:GOOGLE_VERTEX_BASE_URL="https://my-vertex-proxy.com"`)
- **`OTLP_GOOGLE_CLOUD_PROJECT`**:
