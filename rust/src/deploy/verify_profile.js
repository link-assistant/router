// Verification profile (issue #683): what this deployment must prove before
// cutover. Runs after the built-in checks, prints one PROFILE_RESULT line for
// the deploy JSON, and fails verification when anything required is unproven.
if (process.env.VERIFY_PROFILE) {
  const profile = JSON.parse(process.env.VERIFY_PROFILE);
  const removedRoutes = @@REMOVED_ROUTES@@;
  const started = Date.now();
  const result = {status:"passed", failures:[], timings:{}};
  const timed = async (name, action) => {
    const at = Date.now();
    try { return await action(); } finally { result.timings[name] = Date.now() - at; }
  };
  const failure = message => result.failures.push(message);
  const livePath = (client, model) => client.liveModel
    ? `/api/services/gemini/v1beta/models/${encodeURIComponent(model)}:generateContent`
    : client.live;
  const byKind = kind => clients.find(client => client.kind === kind);

  // Every removed route answers 404 on every listener; none may come back.
  await timed("removed_routes", async () => {
    const origins = [origin, ...(publicOrigin ? [publicOrigin] : [])];
    const answers = [];
    for (const base of origins) {
      for (const [method, path] of removedRoutes) {
        const answer = await call(base, path, {method, headers:{authorization:`Bearer ${admin}`,
          "content-type":"application/json"}, ...(method === "GET" ? {} : {body:"{}"})});
        if (answer.status !== 404) {
          answers.push({method, path, listener: base === origin ? "management" : "public", status:answer.status});
        }
      }
    }
    result.removed_routes = {checked: removedRoutes.length * origins.length, unexpected: answers};
    for (const answer of answers) failure(`removed route ${answer.method} ${answer.path} returned ${answer.status}`);
  });

  // One live request, judged by the profile's evidence rule.
  async function prove(client, model, base = origin) {
    const before = logSnapshot();
    const at = Date.now();
    const answer = await call(base, livePath(client, model), {
      method:"POST", headers:auth(client, client.token), body:JSON.stringify(client.body(model))});
    const upstream = upstreamReached(before);
    let proven = answer.status >= 200 && answer.status < 300;
    let evidence = proven ? "answer" : "none";
    if (answer.status === 429) {
      proven = !profile.quota_requires_upstream_evidence || upstream;
      evidence = upstream ? "quota-exhausted-upstream" : "quota-exhausted-local";
    }
    return {client:client.kind, model, status:answer.status, proven, evidence, upstream_reached:upstream,
      duration_ms:Date.now() - at};
  }

  const proofs = new Map();
  async function proof(client, model) {
    const key = `${client.kind}\u0000${model}`;
    if (!proofs.has(key)) {
      if (!client.models.some(item => item.id === model)) {
        proofs.set(key, {client:client.kind, model, proven:false, evidence:"not-in-catalog"});
      } else {
        proofs.set(key, await prove(client, model));
      }
    }
    return proofs.get(key);
  }
  const exact = profile.models || {};

  await timed("providers", async () => {
    result.providers = [];
    for (const provider of profile.providers || []) {
      const pinned = Object.entries(exact[provider] || {});
      const pairs = pinned.length ? pinned.map(([kind, model]) => ({kind, model}))
        : plans.filter(plan => plan.provider === provider).slice(0, 1)
          .map(plan => ({kind:plan.client.kind, model:plan.model}));
      if (!pairs.length) {
        result.providers.push({provider, proven:false, evidence:"no-model"});
        failure(`provider ${provider} has no model to prove`);
        continue;
      }
      for (const pair of pairs) {
        const client = byKind(pair.kind);
        const outcome = {provider, ...(await proof(client, pair.model))};
        result.providers.push(outcome);
        if (!outcome.proven) failure(`provider ${provider} not proven with ${pair.kind} ${pair.model}: ${outcome.evidence}`);
      }
    }
  });

  await timed("clients", async () => {
    result.clients = [];
    for (const kind of profile.clients || []) {
      const client = byKind(kind);
      const pinned = Object.entries(exact).flatMap(([provider, models]) =>
        models[kind] ? [{provider, model:models[kind]}] : []);
      const pairs = pinned.length ? pinned : client.models.slice(0, 1).map(model => ({model:model.id}));
      if (!pairs.length) {
        result.clients.push({client:kind, proven:false, evidence:"empty-catalog"});
        failure(`client ${kind} has an empty catalog`);
        continue;
      }
      for (const pair of pairs) {
        const outcome = {...(pair.provider ? {provider:pair.provider} : {}), ...(await proof(client, pair.model))};
        result.clients.push(outcome);
        if (!outcome.proven) failure(`client ${kind} not proven with ${pair.model}: ${outcome.evidence}`);
      }
    }
  });

  if (publicOrigin) {
    await timed("public_listener", async () => {
      const sample = byKind((profile.clients || [])[0]) || clients.find(client => client.models.length) || clients[0];
      const usage = await call(publicOrigin, "/api/usage", {headers:auth(sample, sample.token)});
      const leaked = /"(pool|email|account_id|account|accounts|home)"\s*:/.test(usage.text);
      result.public_usage = {status:usage.status, anonymized:!leaked};
      if (usage.status !== 200) failure(`public /api/usage returned ${usage.status}`);
      if (leaked) failure("public /api/usage names accounts");
      const model = (sample.models[0] || {id:"verification"}).id;
      const adminHeaders = auth(sample, admin);
      const refused = await call(publicOrigin, livePath(sample, model), {
        method:"POST", headers:adminHeaders, body:JSON.stringify(sample.body(model))});
      result.public_admin_inference = {status:refused.status, refused:refused.status === 401 || refused.status === 403};
      if (!result.public_admin_inference.refused) failure(`public inference accepted the admin token: ${refused.status}`);
    });
  }

  // Launch `router with <client>` against a stub client that records argv.
  const fs = require("node:fs");
  const binaries = {claude:"claude", codex:"codex", "qwen-code":"qwen", gemini:"gemini", opencode:"opencode"};
  function launch(kind, model) {
    const directory = fs.mkdtempSync("/tmp/router-launch-");
    try {
      fs.mkdirSync(`${directory}/bin`);
      fs.mkdirSync(`${directory}/home`);
      const stub = `${directory}/bin/${binaries[kind]}`;
      fs.writeFileSync(stub, "#!/bin/sh\ncase \"$1\" in --version|-v|version) echo '99.0.0 (stub)'; exit 0;; esac\n" +
        "for argument in \"$@\"; do printf '%s\\000' \"$argument\"; done >> \"$0.argv\"\nprintf 'Reply OK\\n'\n", {mode:0o755});
      const at = Date.now();
      const run = Bun.spawnSync(["router", "with", "--server", origin, "--token-stdin", "--isolated-config",
        "--non-interactive", ...(model ? ["--model", model] : []), kind, "Reply OK"], {
        env:{...process.env, PATH:`${directory}/bin:${process.env.PATH}`, HOME:`${directory}/home`,
          CLAUDE_CONFIG_DIR:`${directory}/home/.claude`, CODEX_HOME:`${directory}/home/.codex`,
          XDG_CONFIG_HOME:`${directory}/home/.config`, XDG_DATA_HOME:`${directory}/home/.local/share`},
        stdin:new TextEncoder().encode(`${byKind(kind).token}\n`), stdout:"ignore", stderr:"pipe", timeout:60000});
      let argv = [];
      try { argv = fs.readFileSync(`${stub}.argv`, "utf8").split("\u0000").filter(Boolean); } catch {}
      return {client:kind, model:model || null, exit_code:run.exitCode, launched:run.exitCode === 0 && argv.length > 0,
        arguments:argv.length, duration_ms:Date.now() - at, argv,
        ...(run.exitCode === 0 ? {} : {stderr:run.stderr.toString().split("\n").filter(Boolean).slice(-3)})};
    } finally {
      fs.rmSync(directory, {recursive:true, force:true});
    }
  }
  const modelFor = kind => Object.values(exact).map(models => models[kind]).find(Boolean);
  if (profile.require_client_launch) {
    await timed("client_launch", async () => {
      const kinds = (profile.clients || []).length ? profile.clients : clients.filter(c => c.models.length).map(c => c.kind);
      result.client_launch = kinds.map(kind => {
        const { argv, ...launched } = launch(kind, modelFor(kind));
        if (!launched.launched) failure(`router with ${kind} did not launch the client`);
        return launched;
      });
    });
  }

  if (profile.check_thinking_display) {
    await timed("thinking_display", async () => {
      const claude = byKind("claude");
      const model = modelFor("claude");
      const launched = launch("claude", model);
      const index = launched.argv.lastIndexOf("--settings");
      let settings = null;
      try { settings = index >= 0 ? JSON.parse(launched.argv[index + 1]) : null; } catch {}
      const thinking = {settings_verbose: Boolean(settings && settings.verbose === true)};
      if (!thinking.settings_verbose) failure("router with claude does not pass --settings with verbose thinking display");
      if (model) {
        const answer = await call(origin, claude.live, {method:"POST", headers:auth(claude, claude.token),
          body:JSON.stringify({model, max_tokens:2048, thinking:{type:"enabled", budget_tokens:1024},
            messages:[{role:"user", content:"Reply OK"}]})});
        let blocks = [];
        try { blocks = JSON.parse(answer.text).content || []; } catch {}
        thinking.model = model;
        thinking.status = answer.status;
        thinking.thinking_returned = blocks.some(block => block.type === "thinking" || block.type === "redacted_thinking");
        if (!thinking.thinking_returned) failure(`claude ${model} returned no thinking block (${answer.status})`);
      }
      result.thinking = thinking;
    });
  }

  if (result.failures.length) result.status = "failed";
  result.timings.total_ms = Date.now() - started;
  console.log(`PROFILE_RESULT ${JSON.stringify(result)}`);
  if (result.failures.length) fail(`verification profile: ${result.failures[0]}`);
}
