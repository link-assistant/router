import assert from 'node:assert/strict';
import test from 'node:test';
import { configPointer, mergeConfigPatch } from '../src/runtime-config.mjs';
import { applyPayloadRules } from '../src/runtime-payload.mjs';

test('RFC 7396 replaces arrays, merges objects and deletes null-valued fields', { timeout: 1000 }, () => {
  assert.deepEqual(
    mergeConfigPatch({ a: 'b', c: { d: 'e', f: 'g' }, array: [1, 2] }, { a: 'z', c: { f: null }, array: [3] }),
    { a: 'z', c: { d: 'e' }, array: [3] },
  );
  assert.deepEqual(mergeConfigPatch({}, JSON.parse('{"__proto__":{"local":true}}')), JSON.parse('{"__proto__":{"local":true}}'));
});

test('JSON Pointer handles escapes, lookup, appending, replacement and deletion', { timeout: 1000 }, () => {
  const document = { 'a/b': { '~': [1, 2] } };
  assert.equal(configPointer(document, '/a~1b/~0/1'), 2);
  assert.deepEqual(configPointer(document, '/a~1b/~0/-', 'put', 3), { 'a/b': { '~': [1, 2, 3] } });
  assert.deepEqual(configPointer(document, '/a~1b/~0/0', 'delete'), { 'a/b': { '~': [2] } });
  assert.throws(() => configPointer(document, '/a~2b'));
  assert.throws(() => configPointer(document, '/a~1b/~0/01'));
});

test('the Claude final barrier preserves defaulted values, applies raw overrides and removes injected fields once', { timeout: 1000 }, () => {
  const model = { name: 'claude-*', protocol: 'claude', token: 'resume-app', match: [{ 'metadata.client': 'router' }], 'not-match': [{ 'metadata.mode': 'off' }], exist: ['messages'], 'not-exist': ['disabled'] };
  const rules = {
    default: [{ models: [model], params: { service_tier: 'auto', stream_options: { diagnostic: true } } }],
    'default-raw': [{ models: [model], params: { 'metadata.hints': '["stable"]' } }],
    override: [{ models: [model], params: { temperature: 0.1 } }],
    'override-raw': [{ models: [model], params: { max_tokens: '200' } }],
    filter: [{ models: [model], params: ['system', 'messages.0', 'tools.#(type=="image_generation")#', 'top_p'] }],
  };
  const original = {
    model: 'claude-opus', service_tier: 'priority', top_p: 0.9,
    metadata: { client: 'router' }, system: 'injected',
    messages: ['first', 'second', 'third'], tools: [{ type: 'image_generation' }, { type: 'function' }, { type: 'image_generation' }],
  };
  const context = { model: original.model, protocol: 'claude', tokenLabel: 'resume-app' };
  const { body, applied } = applyPayloadRules(rules, original, context);
  assert.deepEqual(body, {
    model: 'claude-opus', service_tier: 'priority', temperature: 0.1, max_tokens: 200,
    stream_options: { diagnostic: true }, metadata: { client: 'router', hints: ['stable'] },
    messages: ['second', 'third'], tools: [{ type: 'function' }],
  });
  assert.equal(applied.find(({ path }) => path === 'max_tokens').value, 200);
  assert.deepEqual(applyPayloadRules(rules, original, { ...context, tokenLabel: 'another-app' }), { body: original, applied: [] });
});

test('matched rules fail closed on incompatible sampling, protected fields and scalar traversals', { timeout: 1000 }, () => {
  const context = { protocol: 'claude', model: 'claude-opus' };
  const rules = (params) => ({ override: [{ models: [{ name: '*' }], params }] });
  assert.throws(() => applyPayloadRules(rules({ temperature: 0.1 }), { top_p: 0.8 }, context), /incompatible sampling/u);
  assert.throws(() => applyPayloadRules(rules({ 'metadata.nested': 1 }), { metadata: 'text' }, context), /scalar/u);
  assert.throws(() => applyPayloadRules(rules({ model: 'another' }), {}, context), /protected field/u);
});

test('config redaction covers dotted keys and embedded credentials', { timeout: 1000 }, async () => {
  const { redactRuntimeConfig } = await import('../src/runtime-config.mjs');
  const document = {
    cli: { 'token-secret': 'private', 'admin-key': 'private', 'upstream-base-url': 'https://owner:private@example.test' },
    'default-raw': [{ params: { metadata: '{"access_token":"private"}', 'headers.authorization': 'private', temperature: 0.1 } }],
  };
  const view = redactRuntimeConfig(document);
  assert.equal(JSON.stringify(view).includes('private'), false);
  assert.equal(view['default-raw'][0].params.temperature, 0.1);
});

test('credentialed CORS requires an explicit origin and valid methods and headers', { timeout: 1000 }, async () => {
  const { validateCors } = await import('../src/runtime-config.mjs');
  assert.doesNotThrow(() => validateCors({ origins: ['https://console.example.test'], methods: ['PATCH'], headers: ['authorization'], credentials: true }));
  assert.throws(() => validateCors({ origins: ['*'], credentials: true }), /explicit/u);
  assert.throws(() => validateCors({ origins: ['https://console.example.test/path'] }), /origin/u);
});

test('array predicates support nested keys and dots in JSON strings', { timeout: 1000 }, () => {
  const body = { input: [{ data: { type: 'a.b' } }, { data: { type: 'c' } }] };
  const rules = {
    filter: [{
      models: [{ name: '*', protocol: 'anthropic', exist: ['input.#(data.type=="a.b")'] }],
      params: ['input.#(data.type=="a.b")#'],
    }],
  };
  assert.deepEqual(applyPayloadRules(rules, body, { protocol: 'claude' }).body, {
    input: [{ data: { type: 'c' } }],
  });
});
