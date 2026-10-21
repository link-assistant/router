
// Generated draft from rust/src/deploy_local/preservation.rs; sha256=9aac1b197675ec21bd2b913dfad551ae5eb84a70277ab8d043ec6bf9adb7d232
// Carried constructs are data, never runtime parity evidence.
function rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f454e56(): string {
  return "ROUTER_PRESERVATION_TOKEN";
}

function rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f534352495054(): string {
  return "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_PRESERVATION_TOKEN}});if(r.status!==200)process.exit(2);const b=await r.json();if(!Array.isArray(b.data))process.exit(3);console.log(JSON.stringify(b.data.map(m=>String(m.owned_by||'')+'/'+m.id).sort()))";
}

export const translated: { "CATALOG_ENV": string; "CATALOG_SCRIPT": string } = { ["CATALOG_ENV"]: rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f454e56(), ["CATALOG_SCRIPT"]: rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f534352495054() };
export const provenance = {"sourcePath":"rust/src/deploy_local/preservation.rs","sourceSha256":"9aac1b197675ec21bd2b913dfad551ae5eb84a70277ab8d043ec6bf9adb7d232","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":12,"runtimeParity":false};
