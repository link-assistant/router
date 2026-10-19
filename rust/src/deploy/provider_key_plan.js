// Plan one provider-key install (issue #680). Prints `present 0|1`, then one
// `arg VALUE` line per `providers add` argument. The record on the target
// wins; the --config template only fills what it lacks. No key is read here.
const name = process.env.PKV_NAME;
const template = process.env.PKV_TEMPLATE ? JSON.parse(process.env.PKV_TEMPLATE) : {};
const shown = Bun.spawnSync(["router", "providers", "show", name, "--local"], {stderr: "ignore"});
let record = null;
if (shown.exitCode === 0) {
  try { record = JSON.parse(shown.stdout.toString()); } catch { record = null; }
}
const pick = (...values) => values.find(value => value !== undefined && value !== null && value !== "" &&
  !(Array.isArray(value) && value.length === 0));
const kind = pick(record && record.kind, template.kind);
const baseUrl = pick(record && record.base_url, template.base_url);
console.log(`present ${record ? 1 : 0}`);
if (!kind || !baseUrl) process.exit(0);
const args = ["--kind", kind, "--base-url", baseUrl];
const model = pick(record && record.default_model, template.default_model);
if (model) args.push("--model", model);
const models = pick(record && record.models, template.models);
if (models) args.push("--models", models.join(","));
const supported = pick(record && record.supported_clients, template.supported_clients);
if (supported) args.push("--supported-client", supported.join(","));
if (record && record.subscriber_id) args.push("--subscriber-id", record.subscriber_id);
if (record && record.intermediary_risk_acknowledged) args.push("--acknowledge-intermediary-risk");
if (record && record.unsupported_clients && record.unsupported_clients.length)
  args.push("--acknowledge-unsupported-client", record.unsupported_clients.join(","));
if (record && record.enabled === false) args.push("--enabled=false");
for (const value of args) {
  if (/[\n\r]/.test(value)) process.exit(3);
  console.log(`arg ${value}`);
}
