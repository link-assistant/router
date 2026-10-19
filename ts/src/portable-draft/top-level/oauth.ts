// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/oauth.mjs; source sha256=b8a1f59bd7bc38a903d1e074f04fff0f8ffd13bc7987732f7311889e6b90669f; IR sha256=ae7dcc013e003b0fbc0d4b087a54a142c4ee16f6c730557c760dd5d8bc59ae3b.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
export const CLAUDE_CLIENT_ID: string = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";

export const CODEX_CLIENT_ID: string = "app_EMoamEEZ73f0CkXaXp7hrann";

export const CLAUDE_TOKEN_URL: string = "https://platform.claude.com/v1/oauth/token";

export const CODEX_TOKEN_URL: string = "https://auth.openai.com/oauth/token";

export const GEMINI_TOKEN_URL: string = "https://oauth2.googleapis.com/token";

export const QWEN_TOKEN_URL: string = "https://chat.qwen.ai/api/v1/oauth2/token";

export const GEMINI_CLIENT_ID: string = "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";

export const GEMINI_CLIENT_SECRET: string = ("GOCSPX-4uHgMPm" + "-1o7Sk-geV6Cu5clXFsxl");

export const QWEN_CLIENT_ID: string = "f0304373b74a44d2b584a3fb70ca9e56";

export const CLAUDE_AUTHORIZE_URL: string = "https://claude.com/cai/oauth/authorize";

export const CLAUDE_REDIRECT_URI: string = "https://platform.claude.com/oauth/code/callback";

export const CLAUDE_SCOPES: string = "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";

export const CLAUDE_INFERENCE_SCOPE: string = "user:inference";

export const CLAUDE_OAUTH_USER_AGENT: string = "anthropic-sdk-typescript/0.112.1 userOAuthProvider";

const PENDING_FILE: string = ".link-assistant-router-claude-login.json";

function nonempty(value?: unknown): string | null {
    return ((((typeof value) === "string") && !!(value.length)) ? value : null);
}

const CREDENTIAL_FILE_LIMIT: number = ((4 * 1024) * 1024);

const PENDING_FILE_LIMIT: number = (16 * 1024);
