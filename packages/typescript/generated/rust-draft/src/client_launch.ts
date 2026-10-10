// Generated draft from src/client_launch.rs; sha256=189a3a84e23c3860d58bf408dec77a1e73b69a15f9688755e7ba6b8d23652f00
// Carried constructs are data, never runtime parity evidence.
function CLAUDE_NATIVE_SERVICES_LIMITATION() {
  return "released Claude Code (checked through 2.1.283) has no supported split-auth mechanism: Router inference and /v1/models discovery use only the Router token, while the stored Claude.ai login remains untouched; Claude.ai connectors, Remote Control and /remote-control, /schedule, notification preferences, cloud sessions (--cloud, --environment, --teleport, and ultrareview), remote managed settings, and organization policy are unavailable in this Router-directed process";
}

function CLAUDE_NATIVE_SERVICE_REQUEST_ERROR() {
  return "this Claude.ai operation cannot be routed because released Claude Code (checked through 2.1.283) has no supported split-auth mechanism; run it directly with Claude.ai authentication instead; no Router token was minted and no client was launched";
}

export const translated: { "CLAUDE_NATIVE_SERVICES_LIMITATION": string; "CLAUDE_NATIVE_SERVICE_REQUEST_ERROR": string } = { "CLAUDE_NATIVE_SERVICES_LIMITATION": CLAUDE_NATIVE_SERVICES_LIMITATION(), "CLAUDE_NATIVE_SERVICE_REQUEST_ERROR": CLAUDE_NATIVE_SERVICE_REQUEST_ERROR() };
export const provenance = {"sourcePath":"src/client_launch.rs","sourceSha256":"189a3a84e23c3860d58bf408dec77a1e73b69a15f9688755e7ba6b8d23652f00","executable":2,"carried":22,"preserved":25,"runtimeParity":false};
