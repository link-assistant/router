// Validate one provider key in an isolated Router (issue #680): the provider's
// model must be in a client catalog, not degraded, and one minimal request
// must succeed. Prints one JSON result. The key itself is never read here.
const origin = process.env.PKV_ORIGIN;
const admin = process.env.PKV_ADMIN;
const name = process.env.PKV_NAME;
const clients = {
  claude: {catalog:"/api/services/anthropic/v1/models", carrier:"x-api-key", live:"/api/services/anthropic/v1/messages", body:id=>({model:id,max_tokens:16,messages:[{role:"user",content:"Reply OK"}]})},
  codex: {catalog:"/api/services/codex/v1/models", carrier:"authorization", live:"/api/services/codex/v1/responses", body:id=>({model:id,input:"Reply OK",max_output_tokens:16})},
  "qwen-code": {catalog:"/api/services/qwen/v1/models", carrier:"authorization", live:"/api/services/qwen/v1/chat/completions", body:id=>({model:id,max_tokens:16,messages:[{role:"user",content:"Reply OK"}]})},
  gemini: {catalog:"/api/services/gemini/v1beta/models", carrier:"x-goog-api-key", liveModel:true, body:()=>({contents:[{role:"user",parts:[{text:"Reply OK"}]}],generationConfig:{maxOutputTokens:16}})},
  opencode: {catalog:"/api/services/openai/v1/models", carrier:"authorization", live:"/api/services/openai/v1/chat/completions", body:id=>({model:id,max_tokens:16,messages:[{role:"user",content:"Reply OK"}]})},
};
const done = result => { console.log(JSON.stringify(result)); process.exit(0); };
async function call(path, options = {}) {
  const response = await fetch(origin + path, {...options, signal: AbortSignal.timeout(30000)});
  return {status: response.status, text: await response.text()};
}
try {
  if (!admin) done({result:"negative", reason:"the isolated Router could not mint an admin token"});
  const listed = await call("/api/management/providers", {headers:{authorization:`Bearer ${admin}`}});
  const provider = (JSON.parse(listed.text).data || []).find(item => item.name === name);
  if (!provider) done({result:"negative", reason:"the isolated Router does not list the provider"});
  const kind = (provider.supported_clients || []).find(item => clients[item]) || "opencode";
  const client = clients[kind];
  const issued = await call("/api/management/tokens/client", {
    method:"POST", headers:{authorization:`Bearer ${admin}`, "content-type":"application/json"},
    body:JSON.stringify({client_kind:kind, label:"deploy-key-validation", ttl_hours:1, ephemeral:true}),
  });
  if (issued.status !== 200) done({result:"negative", client:kind, reason:`client token refused: ${issued.status}`});
  const token = JSON.parse(issued.text).token;
  const headers = {"content-type":"application/json"};
  headers[client.carrier] = client.carrier === "authorization" ? `Bearer ${token}` : token;
  if (kind === "claude") headers["anthropic-version"] = "2023-06-01";
  const catalog = await call(client.catalog, {headers});
  if (catalog.status !== 200) done({result:"negative", client:kind, catalog:false, reason:`catalog returned ${catalog.status}`});
  const parsed = JSON.parse(catalog.text);
  const owner = provider.kind === "z.ai-coding-plan" ? "z.ai" : provider.name;
  const degraded = parsed.degraded_providers || [];
  if (degraded.includes(owner) || degraded.includes(provider.name))
    done({result:"negative", client:kind, catalog:false, reason:"the provider's live catalog is degraded"});
  const ids = (parsed.data || parsed.models || []).filter(item => typeof item !== "string" &&
    (item.owned_by === owner || item.owned_by === provider.name))
    .map(item => (item.id || item.slug || item.name || "").replace(/^models\//, "")).filter(Boolean);
  const model = provider.default_model && ids.includes(provider.default_model) ? provider.default_model : ids[0];
  if (!model) done({result:"negative", client:kind, catalog:false, reason:"the catalog lists no model of this provider"});
  const path = client.liveModel ? `/api/services/gemini/v1beta/models/${encodeURIComponent(model)}:generateContent` : client.live;
  const live = await call(path, {method:"POST", headers, body:JSON.stringify(client.body(model))});
  const positive = live.status >= 200 && live.status < 300;
  done({result: positive ? "positive" : "negative", client:kind, model, catalog:true, status:live.status,
    ...(positive ? {} : {reason:`minimal request returned ${live.status}`})});
} catch (error) {
  done({result:"negative", reason:String(error && error.message || error).slice(0, 200)});
}
