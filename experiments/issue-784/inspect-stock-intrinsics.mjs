// Bounded, read-only diagnosis of the retained-output stock-runtime refusal.
// This script changes no intrinsic, guard, source pin, deadline or heap limit.
import {types} from 'node:util';
import * as guards from '../../tools/translation/original-json-intrinsics.mjs';

const text = Function.prototype.toString;
const native = (fn, name) => typeof fn === 'function'
  && !types.isProxy(fn)
  && Reflect.apply(text, fn, []) === `function ${name}() { [native code] }`;
const results = [];
for (const [kind, owner] of [
  ['Array', Array.prototype], ['Map', Map.prototype],
  ['Set', Set.prototype], ['WeakSet', WeakSet.prototype],
]) {
  const names = Reflect.ownKeys(owner);
  if (names.length > 128) throw Error('Unexpected prototype diagnostic size');
  for (const key of names) {
    const field = Object.getOwnPropertyDescriptor(owner, key);
    if (Object.hasOwn(field, 'value')) {
      if (typeof field.value !== 'function') continue;
      const expected = key === 'constructor' ? kind
        : key === Symbol.iterator ? (kind === 'Map' ? 'entries' : 'values')
          : kind === 'Set' && key === 'keys' ? 'values' : key;
      const accepted = typeof expected === 'string' && (native(field.value, expected)
        || kind === 'Set' && key === 'keys' && native(field.value, 'keys'));
      if (!accepted) results.push({kind, key: String(key), expected: String(expected),
        actual: Reflect.apply(text, field.value, [])});
    } else {
      for (const part of ['get', 'set']) {
        if (field[part] !== undefined && !native(field[part], part + ' ' + String(key))) {
          results.push({kind, key: String(key), accessor: part,
            actual: Reflect.apply(text, field[part], [])});
        }
      }
    }
  }
}
const qualification = {};
for (const name of ['originalJsonIntrinsicsUnchanged',
  'originalPathMembershipIntrinsicsUnchanged',
  'originalNamespaceTraversalIntrinsicsUnchanged',
  'originalStaticSourceIntrinsicsUnchanged',
  'originalPrivateParserIngressUnchanged',
  'originalPrivateParserNumericCommonIntrinsicsUnchanged']) {
  qualification[name] = guards[name]();
}
const ingress = [];
for (const [owner, name] of [[Object, 'getOwnPropertyDescriptor'],
  [Object, 'hasOwn'], [Object, 'getPrototypeOf'], [Reflect, 'ownKeys'],
  [Array, 'isArray'], [types, 'isProxy'], [globalThis, 'WeakMap'],
  [WeakMap.prototype, 'has']]) {
  const field = Object.getOwnPropertyDescriptor(owner, name);
  ingress.push({name, ownValue: !!field && Object.hasOwn(field, 'value'),
    native: !!field && native(field.value, name),
    text: field && typeof field.value === 'function'
      ? Reflect.apply(text, field.value, []) : null});
}
console.log(JSON.stringify({node: process.version, qualification, results, ingress,
  scope: 'Read-only stock prototype observations; no compiler or runtime qualification.'}));
