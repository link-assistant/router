// Generated draft from src/deploy_local/preservation.rs; sha256=3a3d9bb7de27c70d877b3aac0582987f7d5ba0beb85312b6f1ec7dda76de62b4
// Carried constructs are data, never runtime parity evidence.
function rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f454e56() {
  return "ROUTER_PRESERVATION_TOKEN";
}

function rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f534352495054() {
  return "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_PRESERVATION_TOKEN}});if(r.status!==200)process.exit(2);const b=await r.json();if(!Array.isArray(b.data))process.exit(3);console.log(JSON.stringify(b.data.map(m=>String(m.owned_by||'')+'/'+m.id).sort()))";
}

export const translated = { ["CATALOG_ENV"]: rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f454e56(), ["CATALOG_SCRIPT"]: rp_6465706c6f795f6c6f63616c2e707265736572766174696f6e2e434154414c4f475f534352495054() };
export const provenance = {"sourcePath":"src/deploy_local/preservation.rs","sourceSha256":"3a3d9bb7de27c70d877b3aac0582987f7d5ba0beb85312b6f1ec7dda76de62b4","executable":2,"executableFunctions":0,"executableConstants":2,"executableTypes":0,"executableConstructors":0,"carried":9,"preserved":12,"runtimeParity":false};
