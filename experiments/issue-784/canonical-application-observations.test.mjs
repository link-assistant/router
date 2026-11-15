// Bounded observations of three actual generated application functions.
// These cases do not replace the original complete review, parity or gate.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as activity from '../../js/generated/rust-draft/rust/src/activitypub.mjs';
import * as bridge from '../../js/generated/rust-draft/rust/src/bridge_request.mjs';
import * as usage from '../../js/generated/rust-draft/rust/src/subscription_usage_normalize.mjs';
import {tagged, JSON_NULL} from '../../js/generated/rust-draft/runtime/json-values.mjs';
import {json_macro_object as object, json_macro_string as string,
  json_macro_bool as boolean} from '../../js/generated/rust-draft/runtime/json-macro-runtime.mjs';

for (const module of [activity, bridge, usage]) {
  const actual = createHash('sha256').update(readFileSync(module.provenance.sourcePath)).digest('hex');
  assert.equal(actual, module.provenance.sourceSha256);
  assert.equal(module.provenance.runtimeParity, false);
}

test('actual ActivityPub validator preserves required fields and either actor route', {timeout: 10000}, () => {
  const required = [['id', string('urn:activity:1')], ['type', string('Create')]];
  for (const actor of ['actor', 'attributedTo']) {
    for (const value of ['urn:actor:1', '']) {
      assert.deepEqual(activity.translated.validate_activity(object([...required, [actor, string(value)]])),
        tagged('Ok', {field0: null}));
    }
  }
  const failures = [
    [[], 'activity id is required'],
    [[['id', string('')]], 'activity id is required'],
    [[['id', string('urn:activity:1')]], 'activity type is required'],
    [[['id', string('urn:activity:1')], ['type', string('')]], 'activity type is required'],
    [required, 'activity must include actor or attributedTo'],
    [[...required, ['actor', boolean(true)]], 'activity must include actor or attributedTo'],
  ];
  for (const [input, error] of failures) {
    assert.deepEqual(activity.translated.validate_activity(object(input)), tagged('Err', {field0: error}));
  }
  assert.throws(() => activity.translated.validate_activity({id: 'raw', type: 'Create'}), TypeError);
});

test('actual bridge rejects every non-null continuation-state combination', {timeout: 10000}, () => {
  const previous = 'previous_response_id cannot be resolved by an Anthropic bridge; send self-contained input';
  const conversation = 'conversation cannot be resolved by an Anthropic bridge; send self-contained input';
  const both = 'previous_response_id and conversation are mutually exclusive and cannot be resolved by an Anthropic bridge; send self-contained input';
  for (const left of [undefined, JSON_NULL, string(''), boolean(false)]) {
    for (const right of [undefined, JSON_NULL, string('conversation'), boolean(false)]) {
      const entries = [];
      if (left !== undefined) entries.push(['previous_response_id', left]);
      if (right !== undefined) entries.push(['conversation', right]);
      const hasLeft = left !== undefined && left !== JSON_NULL;
      const hasRight = right !== undefined && right !== JSON_NULL;
      const message = hasLeft ? hasRight ? both : previous : hasRight ? conversation : null;
      assert.deepEqual(bridge.translated.untranslatable_responses_state(object(entries)),
        message === null ? tagged('None') : tagged('Some', {field0: message}));
    }
  }
  assert.throws(() => bridge.translated.untranslatable_responses_state({}), TypeError);
});

test('actual empty usage preserves every original field for all six providers', {timeout: 10000}, () => {
  const fields = ['pool', 'allowed', 'limit_reached', 'plan', 'credits', 'extra_usage',
    'spend_control', 'rate_limit_reached_type', 'rate_limit_reset_credits_available',
    'subscription_end', 'trial_end', 'subscription_created', 'retry_after_seconds'];
  for (const name of ['Anthropic', 'OpenAi', 'ZAi', 'Lefine', 'Gemini', 'Qwen']) {
    const provider = tagged(name);
    const expected = {$: 'SubscriptionUsage', provider, state: tagged('Unverified'),
      status: 'unverified', windows: [], additional_limits: []};
    for (const field of fields) expected[field] = tagged('None');
    const actual = usage.translated.empty_usage(provider);
    assert.deepEqual(actual, expected);
    assert.ok(Object.isFrozen(actual));
    assert.ok(Object.isFrozen(actual.windows));
    assert.ok(Object.isFrozen(actual.additional_limits));
  }
  assert.throws(() => usage.translated.empty_usage(tagged('Unknown')), TypeError);
});
