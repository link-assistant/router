// Materialize inspectable graph-owned pattern binders using the existing checker.
import { readCheckedMatchPatternBindings } from './translation/check.js';
import { readProgramPatternBindingForm } from './typed-program-link-rules.js';

function bindingRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 2 || !Object.hasOwn(value, 'name') || !Object.hasOwn(value, 'type')
    || typeof value.name !== 'string' || !value.name) throw new TypeError('a linked pattern binding must be an owned name and type record');
  return value;
}

export function readLinkedPatternBindingScope(pattern, scrutineeType, declarations, { graph = false } = {}) {
  const form = readProgramPatternBindingForm(pattern?.k ?? '');
  if (!form) throw new TypeError('a linked match contains an unsupported pattern');
  let records = [];
  let restored = pattern;
  if (graph && form === 'single') {
    const binding = bindingRecord(pattern.name);
    records = [binding];
    restored = { ...pattern, name: binding.name };
  } else if (graph && form === 'fields') {
    if (!Array.isArray(pattern.binds)) throw new TypeError('a linked constructor pattern has no binding slots');
    const slots = pattern.binds.map(value => value === null ? null : bindingRecord(value));
    records = slots.filter(value => value !== null);
    restored = { ...pattern, binds: slots.map(value => value?.name ?? null) };
  }
  const checked = readCheckedMatchPatternBindings(restored, scrutineeType, declarations);
  if (graph) {
    if (records.length !== checked.bindings.length) throw new TypeError('a linked pattern has inconsistent binding slots');
  } else records = checked.bindings;
  const byName = new Map(records.map(record => [record.name, record]));
  const graphPattern = form === 'single' ? { ...pattern, name: records[0] }
    : form === 'fields' ? { ...pattern, binds: checked.pattern.binds.map(name => name === null ? null : byName.get(name)) }
      : { ...pattern };
  // The validator checks each retained record's type with its existing
  // semantic resource budget before comparing it with this checked type.
  return { pattern: checked.pattern, graphPattern, bindings: records, expectedBindings: checked.bindings };
}
