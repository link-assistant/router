=== dtzp555-max__ocp.README.md ===
1:# OCP — Open Claude Proxy
3:> **Already paying for Claude Pro/Max? Use your subscription as an OpenAI-compatible API — $0 extra cost.**
5:OCP turns your Claude Pro/Max subscription into a standard OpenAI-compatible API on localhost. Any tool that speaks the OpenAI protocol can use it — no separate API key, no extra billing.
8:Cline          ──┐
10:Aider          ───┼──→ OCP :3456 ──→ Claude CLI ──→ Your subscription
15:One proxy. Multiple IDEs. All models. **$0 API cost.**
17:## Supported Tools
19:Any tool that accepts `OPENAI_BASE_URL` works with OCP:
21:| Tool | Configuration |
23:| **Cline** | Settings → `OPENAI_BASE_URL=http://127.0.0.1:3456/v1` |
24:| **OpenCode** | `OPENAI_BASE_URL=http://127.0.0.1:3456/v1` |
25:| **Aider** | `aider --openai-api-base http://127.0.0.1:3456/v1` |
28:| **Any OpenAI client** | Set base URL to `http://127.0.0.1:3456/v1` |
32:OCP has two roles: **Server** (runs the proxy, needs Claude CLI) and **Client** (connects to a server, zero dependencies).
37:│  Claude CLI + OCP server → bound to 0.0.0.0:3456       │
43: (client)           (browser)           (client)
50:> **Recommended:** Install OCP on a device that stays powered on — Mac mini, NAS, Raspberry Pi, or a desktop that doesn't sleep. This ensures all clients always have access.
54:- [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) installed and authenticated (`claude auth login`)
64:1. Verify Claude CLI is installed and authenticated
65:2. Start the proxy on port 3456
66:3. Install auto-start (launchd on macOS, systemd on Linux)
67:4. Symlink `ocp` to `/usr/local/bin` for CLI access
69:**Single-machine use** — just set your IDE to use the proxy:
71:export OPENAI_BASE_URL=http://127.0.0.1:3456/v1
76:# Enable LAN access with per-user auth (recommended)
77:node setup.mjs --bind 0.0.0.0 --auth-mode multi
80:Then create API keys for each person/device:
82:export OCP_ADMIN_KEY=your-secret-admin-key
84:ocp keys add wife-laptop
85:#  ✓ Key created for "wife-laptop"
86:#    API Key: ocp_example12345abcde...
87:#    Copy this key now — you won't see it again.
89:ocp keys add son-ipad
90:ocp keys add pi-server
97:curl http://127.0.0.1:3456/v1/models
103:### Client Setup
105:> Clients do **not** need to install Node.js, Claude CLI, or the OCP repo. Only `curl` and `python3` are required (pre-installed on most Linux/Mac systems).
115:**Zero-config** — when the server admin has set `PROXY_ANONYMOUS_KEY` (see [Anonymous Access](#anonymous-access-optional) below), just pass the server IP and nothing else. `ocp-connect` reads the anonymous key from `/health` and uses it automatically:
121:If the server requires a key, pass it with `--key`:
123:./ocp-connect <server-ip> --key <your-api-key>
142:  Remote OCP v3.11.0  (auth: multi)
144:  ⓘ Using server-advertised anonymous key: ocp_publ...n_v1
145:    (set by admin via PROXY_ANONYMOUS_KEY; see issue #12 §14 Path A)
148:  ✓ API accessible (4 models available)
153:    OPENAI_BASE_URL=http://192.168.1.100:3456/v1
156:    ✓ OPENAI_BASE_URL set for GUI apps and daemons
163:  Provider name (models show as <name>/model-id) [ocp]: ocp
165:  How should OCP models be configured?
166:    1) Primary — use OCP by default, keep existing models as backup
172:    ✓ Per-agent auth profile seeded (2):
173:      • ~/.openclaw/agents/main/agent/auth-profiles.json
174:      • ~/.openclaw/agents/macbook_bot/agent/auth-profiles.json
176:    Provider: ocp
177:    Models:
188:    Note: smoke test only verifies OCP is reachable and the key is valid.
199:- **Auto-discovers anonymous key** from `/health.anonymousKey` when no `--key` given (v1.3.0+, requires server v3.10.0+)
200:- Configures OpenClaw automatically (including per-agent `auth-profiles.json` for multi-agent setups)
201:- Detects Cline, Continue.dev, Cursor, and opencode, and prints setup hints (manual configuration required for these IDEs)
207:export OPENAI_BASE_URL=http://<server-ip>:3456/v1
208:export OPENAI_API_KEY=ocp_<your-key>
210:Add these lines to `~/.bashrc` or `~/.zshrc` to persist across sessions.
217:# Per-key usage stats
218:ocp usage --by-key
219:#  Key                  Reqs   OK  Err  Avg Time
223:# Manage keys
224:ocp keys              # List all keys
225:ocp keys revoke son-ipad   # Revoke a key
228:**Web Dashboard:** Open `http://<server-ip>:3456/dashboard` in any browser for real-time monitoring — per-key usage, request history, plan utilization, and system health.
230:![OCP Dashboard](docs/images/dashboard.png)
232:### Auth Modes
236:| `none` | `CLAUDE_AUTH_MODE=none` | Trusted home network, no auth needed |
237:| `shared` | `CLAUDE_AUTH_MODE=shared` + `PROXY_API_KEY=xxx` | Everyone shares one key |
238:| `multi` | `CLAUDE_AUTH_MODE=multi` + `OCP_ADMIN_KEY=xxx` | Per-person keys with usage tracking (recommended) |
242:In `multi` mode, the admin can designate a single well-known "anonymous" key that bypasses `validateKey()` and grants public read/write access. This is useful for letting LAN users (or clients like OpenClaw multi-agent setups) connect without individual per-user keys.
247:export PROXY_ANONYMOUS_KEY=ocp_public_anon   # or any string of your choice
251:**Client side**: the anonymous key value is exposed via `GET /health` as the field `anonymousKey` (null when not set). Clients like `ocp-connect` can auto-discover and use it, so the end user doesn't need to get a personal key from the admin.
253:**Security note**: setting this env var is an **opt-in** to public access — anyone who can reach your OCP endpoint can use it, up to any rate limits you configure. Don't enable this on internet-exposed OCP instances without additional protection.
255:**Not a secret**: because `/health` is an unauthenticated endpoint, the anonymous key is **publicly readable** by anyone who can reach the server. That is intentional — the key exists so clients can self-configure without out-of-band coordination. Treat it as a convenience handle, not as an access credential.
257:### Per-Key Quota (Budget Control)
259:Prevent any single user from exhausting your subscription. Set daily, weekly, or monthly request limits per API key:

=== AntonioAEMartins__claude-code-proxy.README.md ===
1:# Claude Code Proxy
3:Use your **Claude Max subscription** as an API. This proxy wraps the Claude CLI as a subprocess and exposes standard API endpoints that any SDK or tool can talk to.
5:**Two APIs, one proxy:**
6:- **Anthropic Messages API** — `POST /v1/messages`
7:- **OpenAI Chat Completions API** — `POST /v1/chat/completions`
9:Works with the Anthropic SDK, OpenAI SDK, Python clients, Cursor, Continue, aider, LiteLLM, OpenClaw, and anything else that accepts a custom base URL.
13:Claude Max gives you generous usage through the CLI, but no API access. This proxy bridges that gap — run it locally and point any SDK at it.
18:- **Claude CLI** installed and authenticated (`claude --version` should work)
19:- **Claude Max subscription** (the CLI must be logged in)
24:git clone https://github.com/AntonioAEMartins/claude-code-proxy.git
25:cd claude-code-proxy
28:npm link     # makes `claude-proxy` available globally
31:## Usage
34:# Start the proxy (no auth, for local use)
35:REQUIRE_AUTH=false claude-proxy
37:# With auth
38:PROXY_API_KEYS=my-secret-key claude-proxy
41:PORT=8080 REQUIRE_AUTH=false claude-proxy
44:The proxy starts on `http://127.0.0.1:4523` by default.
51:// Anthropic SDK
52:import Anthropic from "@anthropic-ai/sdk";
54:const client = new Anthropic({
55:  apiKey: "any-string",
59:const message = await client.messages.create({
61:  max_tokens: 1024,
67:// OpenAI SDK
68:import OpenAI from "openai";
70:const client = new OpenAI({
71:  apiKey: "any-string",
75:const completion = await client.chat.completions.create({
84:# Anthropic
85:import anthropic
87:client = anthropic.Anthropic(api_key="any-string", base_url="http://localhost:4523")
88:message = client.messages.create(
90:    max_tokens=1024,
96:# OpenAI
97:import openai
99:client = openai.OpenAI(api_key="any-string", base_url="http://localhost:4523/v1")
100:completion = client.chat.completions.create(
106:### Other Tools
108:Any tool with a "custom base URL" or "OpenAI-compatible" setting works:
110:| Tool | Base URL Setting |
114:| **aider** | `--openai-api-base http://localhost:4523/v1` |
116:| **OpenClaw** | `OPENAI_BASE_URL=http://host.docker.internal:4523/v1` |
118:Use any `sonnet`, `opus`, or `haiku` family name as the model, including versioned variants like `claude-sonnet-4-6`, `claude-opus-4-7`, `sonnet-4-7`, or `haiku-5`. Model names with a `claude-code-cli/` or `openai/` prefix are also accepted (the prefix is stripped automatically). Unknown model families return HTTP 400 instead of falling back to the `DEFAULT_MODEL`.
125:// Anthropic streaming
126:const stream = client.messages.stream({
128:  max_tokens: 1024,
138:// OpenAI streaming
139:const stream = await client.chat.completions.create({
150:## Available Models
152:| Family advertised at `/v1/models` | Accepted examples |
160:- **Streaming & non-streaming** for both Anthropic and OpenAI formats
163:- **Tool use / function calling** via MCP bridge
167:- **Rate limit propagation** from CLI quota
168:- **Auto-cleanup** — subprocess killed on client disconnect or timeout
169:- **OpenClaw integration** — automatic tool name mapping, system prompt filtering, and `input_text` block support
179:| `PROXY_API_KEYS` | — | Comma-separated API keys for auth |
180:| `REQUIRE_AUTH` | `true` | Set `false` for local use |
181:| `CLAUDE_PATH` | `claude` | Path to Claude CLI |
182:| `DEFAULT_MODEL` | `sonnet` | Reserved default model setting; unknown request models now return 400 |
187:| `PROXY_MCP_CONFIG` | — | Path to MCP server registry JSON file |
189:## MCP Server Registry
191:Optionally expose pre-registered MCP servers (e.g., Neon, Supabase) to API clients. Credentials stay server-side; clients activate servers by name.
193:**1. Create a config file** (`mcp-servers.json`):
197:  "mcpServers": {
200:      "args": ["-y", "@neondatabase/mcp-server-neon"],
201:      "env": { "NEON_API_KEY": "your-key-here" }
207:**2. Start the proxy:**
210:PROXY_MCP_CONFIG=./mcp-servers.json claude-proxy
216:# Anthropic format — metadata.mcp_servers
219:  -d '{"model":"sonnet","max_tokens":1024,"metadata":{"mcp_servers":["neon"]},"messages":[{"role":"user","content":"List my database tables"}]}'
221:# OpenAI format — x-mcp-servers header
224:  -H "x-mcp-servers: neon" \
228:Without `PROXY_MCP_CONFIG`, behavior is unchanged (full MCP isolation). Without `mcp_servers` in a request, no registry servers are activated.
234:| `POST` | `/v1/messages` | Anthropic Messages API |
235:| `POST` | `/v1/chat/completions` | OpenAI Chat Completions |
236:| `GET` | `/v1/models` | List available models |
237:| `GET` | `/health` | Health check |
239:## Rate Limit Headers

=== GodYeh__claude-max-api-proxy.README.md ===
1:# Claude Max API Proxy
5:**Use your Claude Max subscription with any OpenAI-compatible client.**
9:Claude Max ($200/month) offers unlimited access to Claude, but Anthropic restricts it to the web UI and Claude Code CLI — you can't use your subscription to power third-party tools.
11:This proxy works around that limitation. It spawns the real Claude Code CLI as a subprocess and exposes an OpenAI-compatible HTTP API locally. Any client that speaks the OpenAI chat completions protocol can use your Max subscription as the backend — including [OpenClaw](https://openclaw.dev) for Telegram/Discord bots.
17:│  Any OpenAI  │ ──────────▶ │  Claude Max API   │ ──────────▶ │  Claude Code   │
18:│  compatible  │ ◀────────── │  Proxy (Express)  │ ◀────────── │  CLI (--print) │
19:│  client      │   SSE/JSON   │  localhost:3456   │  stream-json │               │
23:No third-party servers. Everything runs locally. Requests go through Anthropic's own CLI binary — identical to you typing in your terminal.
25:## Key Features
27:- **OpenAI-compatible API** — Drop-in replacement for any client that supports `POST /v1/chat/completions`
29:- **Session persistence** — Conversations maintain context across messages via CLI session resume
30:- **No turn limits** — The CLI runs as many tool-call rounds as needed for complex tasks
32:- **Telegram progress** — Real-time progress updates showing which tools are running (optional)
40:2. **Claude Code CLI** installed and authenticated:
42:   npm install -g @anthropic-ai/claude-code
43:   claude auth login
49:npm install -g claude-max-api-proxy
56:# Health check
57:curl http://localhost:3456/health
74:git clone https://github.com/GodYeh/claude-max-api-proxy.git
75:cd claude-max-api-proxy
90:### Available Models
110:    <key>Label</key>
112:    <key>RunAtLoad</key>
114:    <key>KeepAlive</key>
116:      <key>SuccessfulExit</key>
119:    <key>ProgramArguments</key>
122:      <string>/opt/homebrew/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
124:    <key>EnvironmentVariables</key>
126:      <key>HOME</key>
128:      <key>PATH</key>
131:    <key>StandardOutPath</key>
133:    <key>StandardErrorPath</key>
146:Add as a model provider in your `openclaw.json`:
149:  "models": {
150:    "providers": {
151:      "maxproxy": {
153:        "apiKey": "not-needed",
154:        "api": "openai-completions"
161:When used with [OpenClaw](https://openclaw.dev), this proxy supports all native agent features: web search, browser automation, voice messages, scheduled tasks, media attachments, and more.
167:| `/health` | GET | Health check |
168:| `/v1/models` | GET | List available models |
176:│   ├── openai-to-cli.ts    # OpenAI request → CLI prompt + system prompt
177:│   └── cli-to-openai.ts    # CLI JSON stream → OpenAI response format
179:│   └── manager.ts           # CLI subprocess lifecycle & activity timeout
180:├── session/
181:│   └── manager.ts           # Conversation → CLI session mapping
187:    ├── openai.ts             # OpenAI API type definitions
188:    └── claude-cli.ts         # CLI stream-json event types
194:- **No stored credentials** — Authentication handled by Claude CLI's OS keychain
200:- **Don't run heartbeat/cron jobs through Opus** — Fixed-interval requests look like bot traffic. Use lightweight models for scheduled tasks.
201:- **Stay within your weekly token limits** — The proxy doesn't circumvent any usage caps. If you rarely hit your Claude Code weekly limit, you have plenty of headroom.
209:- Initial codebase based on [atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
210:- Session management, streaming, and OpenClaw integration built with [Claude Code](https://github.com/anthropics/claude-code)

=== meaning-systems__claude-code-proxy.README.md ===
1:# claude-code-proxy
3:OpenAI-compatible API proxy for Claude Code CLI. Use your Claude Code Max subscription for inference instead of paying for API credits.
5:> **⚠️ Disclaimer:** As of December 2024, this is compatible with Anthropic's Terms of Service for personal use. TOS may change. This repo is not maintained. See [LICENSE](LICENSE). **Use at your own risk.**
10:# Prerequisites: Claude Code CLI authenticated, Go installed
13:PROXY_API_KEY=your-secret go run main.go
22:| **API Key** | `your-secret` |
27:- macOS (launchd)
28:- Linux (systemd)
35:| `PROXY_API_KEY` | (required) | Any string |
45:The proxy receives OpenAI-format requests, pipes them to the Claude CLI, and returns OpenAI-format responses.
49:[Unlicense](LICENSE) (public domain) — but read the Anthropic TOS notice in the license file.

=== wende__claude-max-api-proxy.README.md ===
1:# Claude Max API Proxy
3:> Actively maintained fork of [atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy) with OpenClaw integration, improved streaming, and expanded model support.
5:**Use your Claude Max subscription ($200/month) with any OpenAI-compatible client — no separate API costs!**
7:This proxy wraps the Claude Code CLI as a subprocess and exposes an OpenAI-compatible HTTP API, allowing tools like OpenClaw, Continue.dev, or any OpenAI-compatible client to use your Claude Max subscription instead of paying per-API-call.
13:| Claude API | ~$15/M input, ~$75/M output tokens | Pay per use |
14:| Claude Max | $200/month flat | OAuth blocked for third-party API use |
15:| **This Proxy** | $0 extra (uses Max subscription) | Routes through CLI |
17:Anthropic blocks OAuth tokens from being used directly with third-party API clients. However, the Claude Code CLI *can* use OAuth tokens. This proxy bridges that gap by wrapping the CLI and exposing a standard API.
24:    HTTP Request (OpenAI format)
26:   Claude Max API Proxy (this project)
28:   Claude Code CLI (subprocess)
30:   OAuth Token (from Max subscription)
32:   Anthropic API
34:   Response → OpenAI format → Your App
39:- **OpenAI-compatible API** — Works with any client that supports OpenAI's API format
40:- **Streaming support** — Real-time token streaming via Server-Sent Events
41:- **Multiple models** — Claude Opus, Sonnet, and Haiku with flexible model aliases
42:- **OpenClaw integration** — Automatic tool name mapping and system prompt adaptation
43:- **Content block handling** — Proper text block separators for multi-block responses
44:- **Session management** — Maintains conversation context via session IDs
46:- **Zero configuration** — Uses existing Claude CLI authentication
51:- **OpenClaw tool mapping** — Maps OpenClaw tool names (`exec`, `read`, `web_search`, etc.) to Claude Code equivalents (`Bash`, `Read`, `WebSearch`)
52:- **System prompt stripping** — Removes OpenClaw-specific tooling sections that confuse the CLI
54:- **Tool call types** — Full OpenAI tool call type definitions for streaming and non-streaming
55:- **Improved streaming** — Better SSE handling with connection confirmation and client disconnect detection
60:2. **Claude Code CLI** installed and authenticated:
62:   npm install -g @anthropic-ai/claude-code
63:   claude auth login
70:git clone https://github.com/wende/claude-max-api-proxy.git
71:cd claude-max-api-proxy
80:## Usage
99:# Health check
100:curl http://localhost:3456/health
102:# List models
103:curl http://localhost:3456/v1/models
127:| `/health` | GET | Health check |
128:| `/v1/models` | GET | List available models |
131:## Available Models
133:| Model ID | Alias | CLI Model |
139:All model IDs also accept a `claude-code-cli/` prefix (e.g., `claude-code-cli/claude-opus-4`). Unknown models default to Opus.
141:## Configuration with Popular Tools
145:OpenClaw works with this proxy out of the box. The proxy automatically maps OpenClaw tool names to Claude Code equivalents and strips conflicting tooling sections from system prompts.
153:  "models": [{
155:    "provider": "openai",
158:    "apiKey": "not-needed"
163:### Generic OpenAI Client (Python)
166:from openai import OpenAI
168:client = OpenAI(
170:    api_key="not-needed"  # Any value works
173:response = client.chat.completions.create(
181:The proxy can run as a macOS LaunchAgent on port 3456.
183:**Plist location:** `~/Library/LaunchAgents/com.openclaw.claude-max-proxy.plist`
187:launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.openclaw.claude-max-proxy.plist
190:launchctl kickstart -k gui/$(id -u)/com.openclaw.claude-max-proxy
193:launchctl bootout gui/$(id -u)/com.openclaw.claude-max-proxy
196:launchctl list com.openclaw.claude-max-proxy
204:│   ├── claude-cli.ts      # Claude CLI JSON streaming types + type guards
205:│   └── openai.ts          # OpenAI API types (including tool calls)
207:│   ├── openai-to-cli.ts   # Convert OpenAI requests → CLI format
208:│   └── cli-to-openai.ts   # Convert CLI responses → OpenAI format
210:│   └── manager.ts         # Claude CLI subprocess + OpenClaw tool mapping
211:├── session/
212:│   └── manager.ts         # Session ID mapping
223:- No API keys stored or transmitted by this proxy
224:- All authentication handled by Claude CLI's secure keychain storage
225:- Prompts passed as CLI arguments, not through shell interpretation
229:### "Claude CLI not found"
231:Install and authenticate the CLI:
233:npm install -g @anthropic-ai/claude-code
234:claude auth login
246:Check that the Claude CLI is in your PATH:
261:- Originally created by [atalovesyou](https://github.com/atalovesyou/claude-max-api-proxy)
263:- Powered by [Claude Code CLI](https://github.com/anthropics/claude-code)

=== sethschnrt__claude-max-api-proxy.README.md ===
1:# Claude Max API Proxy
3:**Turn your $200/mo Claude Max subscription into a full OpenAI-compatible API. Stop paying per token.**
5:Your Claude Max subscription includes unlimited* Claude usage through the CLI. This proxy wraps that CLI and exposes a standard OpenAI API, so any tool — Continue.dev, Cursor, custom apps, OpenClaw — can use your Max subscription instead of expensive API keys.
7:> \* Subject to Anthropic's fair use policy
14:| Claude Max | $200/mo flat | CLI only, no third-party API |
15:| **This Proxy** | **$0 extra** | Uses your existing Max subscription |
23:npm install -g claude-max-api-proxy
25:# Start the proxy (requires Claude CLI authenticated)
29:curl http://localhost:3456/v1/models
35:git clone https://github.com/atalovesyou/claude-max-api-proxy.git
36:cd claude-max-api-proxy
44:Your App (any OpenAI client)
47:Claude Max API Proxy (this)  <-- localhost:3456
50:Claude Code CLI (subprocess)
53:Your Max subscription (OAuth)
56:Anthropic API --> Response --> OpenAI format --> Your App
59:Anthropic blocks OAuth tokens from direct third-party API use. But the CLI can use them. This proxy bridges that gap.
63:- **OpenAI-compatible API** — Drop-in replacement for any OpenAI client
64:- **Streaming** — Real-time token streaming via SSE
65:- **Usage tracking** — See token counts, cost savings, and request history
66:- **API key auth** — Optional Bearer token auth for team/shared use
67:- **Multiple models** — Opus, Sonnet, and Haiku
68:- **Session management** — Conversation context across requests
70:- **Secure** — Uses `spawn()` (no shell injection), no API keys stored
72:## Usage Tracking (New in v1.2)
77:# Get usage summary
78:curl http://localhost:3456/v1/usage
83:  "totalInputTokens": 12500000,
84:  "totalOutputTokens": 3200000,
95:curl http://localhost:3456/v1/usage/recent?limit=10
98:## API Key Authentication (New in v1.2)
100:Secure your proxy for team use:
103:# Start with API keys
104:API_KEYS=sk-team-abc123,sk-team-def456 claude-max-api
106:# Clients must include Bearer token
108:  -H "Authorization: Bearer sk-team-abc123" \
113:When `API_KEYS` is not set, auth is disabled (backwards compatible).
119:| `/health` | GET | Health check + usage summary |
120:| `/v1/models` | GET | List available models |
122:| `/v1/usage` | GET | Usage stats and cost savings |
123:| `/v1/usage/recent` | GET | Recent request log |
125:## Models
129:| `claude-opus-4-6` | Claude Opus 4.6 | $15/$75 per M tokens |
130:| `claude-opus-4` | Claude Opus 4 | $15/$75 per M tokens |
131:| `claude-sonnet-4` | Claude Sonnet 4 | $3/$15 per M tokens |
132:| `claude-haiku-4` | Claude Haiku 4 | $0.25/$1.25 per M tokens |
134:Provider-prefixed IDs also work: `anthropic/claude-opus-4-6`, `claude-max/claude-opus-4-6`, etc.
142:  "models": [{
144:    "provider": "openai",
147:    "apiKey": "not-needed"
152:### Python (OpenAI SDK)
155:from openai import OpenAI
157:client = OpenAI(
159:    api_key="not-needed"
162:response = client.chat.completions.create(
170:Built-in support — just configure the `claude-max` provider pointing to `localhost:3456`.
190:cat > ~/Library/LaunchAgents/com.claude-max-proxy.plist << 'EOF'
195:  <key>Label</key>
196:  <string>com.claude-max-proxy</string>
197:  <key>ProgramArguments</key>
200:    <string>/path/to/claude-max-api-proxy/dist/server/standalone.js</string>
202:  <key>RunAtLoad</key>
204:  <key>KeepAlive</key>
210:launchctl load ~/Library/LaunchAgents/com.claude-max-proxy.plist
216:2. **Claude Code CLI** installed and authenticated:
218:   npm install -g @anthropic-ai/claude-code
219:   claude auth login
226:├── adapter/          # OpenAI <-> CLI format conversion
227:├── server/           # Express server, routes, auth
228:├── session/          # Conversation session management
229:├── subprocess/       # Claude CLI process management
230:├── usage/            # Token tracking and cost analytics
237:- No API keys stored or transmitted
238:- All auth handled by Claude CLI's secure keychain
239:- Optional API key auth for shared deployments
243:This proxy uses the official Claude Code CLI (`claude --print`) as a subprocess. It does **not** extract OAuth tokens, reverse-engineer private APIs, or bypass authentication — it simply wraps the CLI you already have installed.
245:That said, please review [Anthropic's Terms of Service](https://www.anthropic.com/terms) before using this tool. Anthropic's policies on third-party tooling may change. Use at your own discretion and risk.

=== Arasple__pluribus.README.md ===
6:A lightweight API gateway that exposes Claude Code subscriptions as standard Anthropic Messages API.
10:- **Client Spoofing** - Replicates Claude Code official client signatures (User-Agent, headers, beta flags, auto-fetched version)
12:- **Tool Name Mapping** - Maps third-party tool names (OpenCode) to Claude Code conventions to bypass detection
13:- **OAuth Authentication** - Standard OAuth 2.0 PKCE flow with automatic token refresh
14:- **Multi-Account** - Round-robin request distribution across multiple accounts
15:- **Rate Limit Tracking** - Monitors 5-hour / 7-day quota windows
48:## Usage
53:curl http://localhost:8080/anthropic/v1/messages \
54:  -H "Authorization: Bearer your-secret-key" \
58:    "max_tokens": 1024,
65:### Health Check
68:curl http://localhost:8080/health
71:Returns service status and rate limit info for all accounts.
79:| `PLURIBUS_SECRET` | -         | API access key (required) |
81:Account credentials are stored in `./providers/*.toml`.
86:> Using this software may violate [Anthropic Terms of Service](https://console.anthropic.com/legal/terms) and [Anthropic Usage Policy](https://console.anthropic.com/legal/aup), which could result in account suspension or permanent ban. Use at your own risk.

=== mattschwen__claude-max-api-proxy.README.md ===
5:  <img alt="Claw Proxy - OpenAI-compatible gateway powered by Claude Code CLI." src="./assets/banner-light.svg" width="100%">
9:  <b>Claw Proxy</b> is the user-facing name for
10:  <code>claude-max-api-proxy</code>.
17:  <img alt="openai" src="https://img.shields.io/badge/openai-compatible-3df7ff?style=flat-square&labelColor=08101d">
18:  <img alt="models" src="https://img.shields.io/badge/models-dynamic-a87cff?style=flat-square&labelColor=08101d">
19:  <img alt="resume" src="https://img.shields.io/badge/sessions-resume-ff9df3?style=flat-square&labelColor=08101d">
20:  <img alt="docker" src="https://img.shields.io/badge/docker-optional-4ac1ff?style=flat-square&labelColor=08101d">
25:  <b>Route any OpenAI-compatible client into your live Claude Max session.</b><br/>
26:  OpenAI on the edge. Claude Code CLI in the core. Localhost in between.
30:  <code>Continue.dev</code> / <code>Aider</code> / <code>OpenAI SDKs</code> / <code>curl</code>
32:  &rarr; <code>Claw Proxy</code>
33:  &rarr; <code>authenticated claude CLI</code>
38:  <a href="#why-claw-proxy-exists">Why</a> ·
40:  <a href="#default-routing">Default Routing</a> ·
44:  <a href="#plug-in-any-openai-client">Clients</a> ·
56:## Why Claw Proxy Exists
58:You already have a working Claude Max session on your machine. Your local
59:`claude` CLI is authenticated. But the rest of the modern tooling ecosystem
60:keeps asking for an OpenAI-compatible `baseURL`.
64:**Claw Proxy** is the product identity for this repo. The repository and
65:package stay named `claude-max-api-proxy`, but the thing you actually run is a
66:local bridge that speaks OpenAI on the outside and Claude Code CLI on the
69:Claw Proxy runs a local HTTP server on `127.0.0.1:3456`, accepts OpenAI-shaped
70:requests, invokes the authenticated Claude Code CLI underneath, and streams the
71:result back in the format your client already expects.
73:On the default Claude path: no separate Anthropic API key, no extra Anthropic
74:API bill, and no Docker requirement. External OpenAI-compatible providers are
75:optional. Just your existing Claude Max session exposed behind a sharp, local,
76:OpenAI-shaped surface, with extra routes available when you choose to wire them
88:      Requests flow through the authenticated <code>claude</code> CLI, so the
89:      proxy rides the real local session you already use.
93:      Stable aliases stay simple while <code>/v1/models</code> publishes the
94:      exact model IDs your installed CLI resolves today.
104:| External models are explicit only | Gemini CLI, GLM, and other OpenAI-compatible providers only activate when the request names that exact external model ID. |
105:| Operators get built-in visibility | `/`, `/ops`, `/launch`, `/health`, and `/metrics` are all served by the proxy itself. |
106:| Production can stay simple | Host-run Node first. Add LaunchAgent, systemd, or Docker only when you actually need service management. |
114:│ OpenAI-compatible client             │
120:│ Claw Proxy                           │
122:│ queue • sessions • metrics • /ops    │
127:│ Claude Code CLI                      │
128:│ authenticated on this machine        │
142:│ OpenAI-compatible client             │
148:│ Claw Proxy                           │
151:                   │ explicit provider route
154:│ External provider                    │
155:│ gemini CLI / Z.AI / OpenAI endpoint  │
159:Configured external models such as `gemini-2.5-pro`, `gemini-2.5-flash`,
161:`GET /v1/models`, but they never become the implicit default.
163:## Default Routing
170:| exact Claude ID from `/v1/models` | Claude exact runtime model |
174:external model, the proxy returns a Claude error instead of silently switching
175:providers.
181:| OpenAI-compatible edge | `POST /v1/chat/completions`, `POST /v1/responses`, `GET /v1/models`, `GET /v1/capabilities`, `GET /v1/agents`, `GET /health`, and `GET /metrics`. |
182:| Zero extra credentials | Reuses the machine's existing `claude auth login` session instead of asking clients for a second API key. |
183:| Dynamic model routing | Probes stable families like `sonnet`, `opus`, and `haiku`, then surfaces the exact model IDs your local Claude CLI currently resolves. |
184:| Agent discovery | `GET /v1/capabilities` advertises the current runtime surface, CLI feature flags, and which resolved models use adaptive reasoning. |
185:| Canonical coding agent | Ship one repo-native `expert-coder` agent so external tools can reuse the same curated coding brain instead of inventing their own prompts. |
186:| Session continuity | Reuses the OpenAI `user` field as a conversation key and resumes the underlying CLI session automatically. |
187:| Optional external providers | Claude stays the default path. External models such as Gemini or Z.AI GLM are available only when you request them explicitly by model ID. |
188:| Operational discipline | CLI warm-up loop, per-family stall timeouts, kill escalation, structured logs, and a detailed `/health` snapshot. |
189:| Operator command center | `GET /` serves the native Grafana-style command deck, `GET /ops` and `GET /dashboard` mirror it, and `GET /launch` keeps the cinematic launch deck for quick links and signal summaries. |
190:| Sensible deployment | Plain Node.js checkout first. Docker supported, but optional. macOS and Linux service docs included. |
194:You need **Node.js 22+**, **npm**, and the **Claude Code CLI** already logged
198:# 1. Install Claude CLI and authenticate (skip if already installed)
199:npm install -g @anthropic-ai/claude-code
200:claude auth login
203:git clone https://github.com/mattschwen/claude-max-api-proxy.git
204:cd claude-max-api-proxy
210:The proxy warms up by probing model availability against your authenticated CLI,
214:curl http://127.0.0.1:3456/health
215:curl http://127.0.0.1:3456/metrics
218:curl http://127.0.0.1:3456/v1/models
224:> If `/v1/models` returns `{"object":"list","data":[]}`, the proxy started but
225:> your Claude CLI account cannot access any models right now. Fix auth first.
229:> Prefer containers? See [docs/setup/docker-setup.md](./docs/setup/docker-setup.md). Docker
234:For the best local setup, run the Claude-backed proxy on the host so it can
235:reuse your authenticated CLI session directly, then optionally bring up
236:Open WebUI in Docker:
240:export CLAUDE_PROXY_LOG_FILE=logs/proxy.jsonl
244:docker compose up -d open-webui

=== NYTEMODEONLY__claude-max-proxy.README.md ===
1:# Claude Max Proxy v3.4.0
3:**The only working proxy that enables Claude Max subscriptions to work with full tool support in OpenAI-compatible clients.**
5:Uses OAuth tokens with XML-based tool calling and history reconstruction - the same method Claude Code uses internally.
9:- **XML History Reconstruction**: Fixes the "[Using tools...]" infinite loop by converting tool_calls back to XML format in conversation history
10:- **Full Tool Support**: Works with OpenClaw, Cursor, and any OpenAI-compatible client
11:- **XML Tool Parsing**: Converts Claude's XML function calls to OpenAI tool_calls format
12:- **Clean Output**: No XML visible in chat - tool calls are parsed and stripped
13:- **Multi-turn Conversations**: Properly handles tool results and maintains conversation context
17:Claude Max OAuth tokens have restrictions that prevent direct API tool usage:
19:1. OAuth tokens are **restricted to Claude Code CLI only**
20:2. Cannot use the API `tools` parameter directly
23:This proxy works around these limitations by:
25:1. Using the magic system prompt: `"You are Claude Code, Anthropic's official CLI for Claude."`
26:2. Using the beta header: `anthropic-beta: oauth-2025-04-20`
27:3. Injecting tool definitions into user messages (not system prompt)
28:4. Parsing Claude's XML tool calls and converting to OpenAI format
29:5. **Reconstructing tool call history back to XML** so Claude recognizes its own previous actions
31:## Key Innovation
34:- They use subprocess calls to Claude Code CLI (slow/unreliable)
35:- They don't handle tool calls properly
36:- They get stuck in "[Using tools...]" loops
38:This proxy solves all these issues with direct API calls and proper history reconstruction.
43:- **Claude Max subscription** with OAuth tokens
50:git clone https://github.com/NYTEMODEONLY/claude-max-proxy
51:cd claude-max-proxy
55:Reads tokens from macOS Keychain automatically.
59:Create a config file with your OAuth tokens:
62:cat > ~/.claude-max-proxy.json << 'EOF'
64:  "accessToken": "sk-ant-oat01-YOUR_ACCESS_TOKEN",
65:  "refreshToken": "sk-ant-ort01-YOUR_REFRESH_TOKEN",
69:chmod 600 ~/.claude-max-proxy.json
74:### Getting Your Tokens
76:On a Mac with Claude CLI authenticated:
79:security find-generic-password -s "Claude Code-credentials" -w | jq '.claudeAiOauth'
86:### Health Check
88:curl http://127.0.0.1:3456/health
89:# {"status":"ok","version":"3.4.0","mode":"xml-history-reconstruction","features":["oauth","tools","xml-history"]}
92:### List Models
94:curl http://127.0.0.1:3456/v1/models
97:### Chat Completions with Tools
104:    "tools": [{
126:      "tool_calls": [{
135:    "finish_reason": "tool_calls"
140:## Available Models
147:| `gpt-4` | claude-opus-4-5-20251101 | OpenAI compatibility alias |
148:| `gpt-4o` | claude-sonnet-4-5-20250929 | OpenAI compatibility alias |
149:| `gpt-3.5-turbo` | claude-3-5-haiku-20241022 | OpenAI compatibility alias |
157:  "models": {
159:    "providers": {
162:        "apiKey": "not-needed",
163:        "api": "openai-completions",
164:        "models": [
167:            "name": "Claude Opus 4.5 (via Max Proxy)",
172:            "maxTokens": 65536
176:            "name": "Claude Sonnet 4.5 (via Max Proxy)",
181:            "maxTokens": 65536
192:  "tools": {
202:│  OpenClaw / Cursor / Any OpenAI Client                      │
203:│  (sends OpenAI-format request with tools)                   │
208:│  Claude Max Proxy v3.4.0                                    │
209:│  1. Inject tool definitions into user message               │
210:│  2. Convert previous tool_calls back to XML (v3.4 fix!)     │
211:│  3. Use Claude Code system prompt + OAuth header            │
216:│  Anthropic API (with OAuth token)                           │
222:│  Claude Max Proxy                                           │
225:│  3. Convert to OpenAI tool_calls format                     │
230:│  Client receives clean OpenAI-format response               │
231:│  with tool_calls array (no XML visible)                     │
237:### systemd (User Service)
240:mkdir -p ~/.config/systemd/user
242:cat > ~/.config/systemd/user/claude-max-proxy.service << 'EOF'
244:Description=Claude Max Proxy v3.4.0 - OAuth + Full Tool Support
249:WorkingDirectory=/home/lobo/claude-max-proxy
250:ExecStart=/usr/bin/node /home/lobo/claude-max-proxy/server.js
260:systemctl --user enable claude-max-proxy
261:systemctl --user start claude-max-proxy
270:| `CLAUDE_ACCESS_TOKEN` | - | Override OAuth token (optional) |
276:| "credential only authorized for Claude Code" | Direct API tool usage attempted | Use this proxy - it handles OAuth restrictions |
277:| "[Using tools...]" loop | Tool history not reconstructed | Update to v3.4.0 - fixes this with XML history |
278:| "messages.N: non-empty content" | Empty message from tool-only response | v3.3+ adds placeholder content automatically |

=== thhuang__claude-max-api-proxy-rs.README.md ===
1:# claude-max-api-proxy-rs
3:[![CI](https://github.com/thhuang/claude-max-api-proxy-rs/actions/workflows/ci.yml/badge.svg)](https://github.com/thhuang/claude-max-api-proxy-rs/actions/workflows/ci.yml)
5:**Use your Claude Max subscription with any OpenAI or Anthropic-compatible client — no separate API costs.**
7:A fast Rust proxy that wraps the [Claude Code CLI](https://github.com/anthropics/claude-code) as a subprocess and exposes both **OpenAI** and **Anthropic** HTTP APIs. Any tool that speaks either protocol can now use your Max subscription directly.
13:| Anthropic API | ~$15/M input, ~$75/M output tokens | Pay per use |
14:| Claude Max | $200/month flat | OAuth blocked for third-party API use |
15:| **This proxy** | $0 extra (uses Max subscription) | Routes through CLI |
17:Anthropic blocks OAuth tokens from third-party API clients, but the Claude Code CLI can use them. This proxy bridges that gap.
22:Your App (OpenAI or Anthropic client)
28:   claude-max-api-proxy-rs
31:   Claude Code CLI (subprocess)
34:   Anthropic API (via Max OAuth)
42:- **Dual API support** — OpenAI `/v1/chat/completions` and Anthropic `/v1/messages` on the same server
45:- **Session management** — Conversation continuity via persistent session IDs
46:- **Zero config** — Uses existing Claude CLI auth, no API keys to manage
53:2. **Claude Code CLI** installed and authenticated:
55:   npm install -g @anthropic-ai/claude-code
56:   claude auth login
58:3. **Rust toolchain** (for building from source):
66:git clone https://github.com/thhuang/claude-max-api-proxy-rs.git
67:cd claude-max-api-proxy-rs
73:## Usage
82:# Custom port + working directory for CLI subprocesses
91:# Health check
92:curl http://localhost:8080/health
94:# List models
95:curl http://localhost:8080/v1/models
97:# OpenAI format
105:# Anthropic format
110:    "max_tokens": 1024,
128:| `/health` | GET | Health check with uptime |
129:| `/v1/models` | GET | OpenAI-compatible model list |
130:| `/v1/chat/completions` | POST | OpenAI Chat Completions (streaming & non-streaming) |
131:| `/v1/messages` | POST | Anthropic Messages (streaming & non-streaming) |
133:## Models
135:| Model ID | CLI Alias | Context Window | Max Output |
141:Date-suffixed variants (e.g. `claude-opus-4-20250514`) and `claude-code-cli/` prefixed names are also accepted.
143:## Client Examples
145:### Python (OpenAI SDK)
148:from openai import OpenAI
150:client = OpenAI(
152:    api_key="not-needed"
155:response = client.chat.completions.create(
162:### Python (Anthropic SDK)
165:import anthropic
167:client = anthropic.Anthropic(
169:    api_key="not-needed"
172:message = client.messages.create(
174:    max_tokens=1024,
184:  "models": [{
186:    "provider": "openai",
189:    "apiKey": "not-needed"
198:├── main.rs           # CLI args, startup checks, graceful shutdown
200:├── routes.rs         # Endpoint handlers (health, models, completions, messages)
201:├── subprocess.rs     # Claude CLI process lifecycle and NDJSON parsing
202:├── session.rs        # Session persistence (~/.claude-code-cli-sessions.json)
203:├── error.rs          # Unified error types → HTTP responses
205:│   ├── openai.rs     # OpenAI request/response types
206:│   ├── anthropic.rs  # Anthropic request/response types
207:│   └── claude_cli.rs # CLI NDJSON message types
209:    ├── openai_to_cli.rs    # OpenAI request → CLI invocation
210:    ├── cli_to_openai.rs    # CLI output → OpenAI response
211:    ├── anthropic_to_cli.rs # Anthropic request → CLI invocation
212:    └── cli_to_anthropic.rs # CLI output → Anthropic response
223:This project is inspired by [claude-max-api-proxy](https://docs.openclaw.ai/providers/claude-max-api-proxy), the Node.js proxy documented by the OpenClaw project. That work demonstrated the core idea — wrapping the Claude Code CLI as a local API server to unlock Max subscription access for third-party clients. This Rust rewrite builds on that foundation with native Anthropic API support and a leaner runtime.
229:| **API support** | OpenAI only | OpenAI + Anthropic |

