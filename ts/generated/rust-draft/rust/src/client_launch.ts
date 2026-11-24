
// Generated draft from rust/src/client_launch.rs; sha256=683035fe2bf1e440bb599e5fd73a0d04288b0e1aa1599a045c2d61b59ea9c296
// Carried constructs are data, never runtime parity evidence.
function rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f53455256494345535f4c494d49544154494f4e(): string {
  return "released Claude Code (checked through 2.1.283) has no supported split-auth mechanism: Router inference and /v1/models discovery use only the Router token, while the stored Claude.ai login remains untouched; Claude.ai connectors, Remote Control and /remote-control, /schedule, notification preferences, cloud sessions (--cloud, --environment, --teleport, and ultrareview), remote managed settings, and organization policy are unavailable in this Router-directed process";
}

function rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f534552564943455f524551554553545f4552524f52(): string {
  return "this Claude.ai operation cannot be routed because released Claude Code (checked through 2.1.283) has no supported split-auth mechanism; run it directly with Claude.ai authentication instead; no Router token was minted and no client was launched";
}

export const translated: { "CLAUDE_NATIVE_SERVICES_LIMITATION": string; "CLAUDE_NATIVE_SERVICE_REQUEST_ERROR": string } = { ["CLAUDE_NATIVE_SERVICES_LIMITATION"]: rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f53455256494345535f4c494d49544154494f4e(), ["CLAUDE_NATIVE_SERVICE_REQUEST_ERROR"]: rp_636c69656e745f6c61756e63682e434c415544455f4e41544956455f534552564943455f524551554553545f4552524f52() };
export const provenance = {"sourcePath":"rust/src/client_launch.rs","sourceSha256":"683035fe2bf1e440bb599e5fd73a0d04288b0e1aa1599a045c2d61b59ea9c296","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":22,"preserved":25,"runtimeParity":false};
