// Source namespace evidence is separate from an adapter's private lowering ABI.
// All external tables remain incomplete: a supported adapter never proves a glob.
const namespaces = new Set(['type', 'value', 'macro']);
const identifier = /^(?:[\p{ID_Start}_][\p{ID_Continue}_]*)$/u;
const key = path => path.join('::');
function pathOf(path) {
  if (!Array.isArray(path) || path.length < 2 || path.some(part => typeof part !== 'string' || !identifier.test(part)) || ['crate', 'self', 'super'].includes(path[0])) throw new TypeError('Registered bindings require an actual external Rust path');
  return [...path];
}
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}

export function externalModuleBindings({ data = [], contracts = [], extraBindings = [] } = {}) {
  if (![data, contracts, extraBindings].every(Array.isArray)) throw new TypeError('Registered bindings require registry lists');
  const descriptors = [], layoutTypes = new Set(), tables = new Map();
  const walk = (items, path = []) => {
    for (const item of items) {
      if (!item || typeof item !== 'object') throw new TypeError('Malformed registered declaration');
      if (item.k === 'module') { if (!Array.isArray(item.items)) throw new TypeError('Registered modules require declarations'); walk(item.items, [...path, item.name]); }
      else if (item.k === 'data') {
        layoutTypes.add(key([...path, item.name]));
        if (item.sourceBinding) {
          const { constructors = [], ...binding } = item.sourceBinding;
          if (!Array.isArray(constructors) || binding.namespace !== 'type') throw new TypeError('Registered source data requires explicit type and constructor namespaces');
          descriptors.push(binding, ...constructors);
        }
      }
    }
  };
  walk(data);
  descriptors.push(...extraBindings);
  const sourceTypes = new Map();
  for (const binding of descriptors) {
    if (binding.namespace === 'type' && ['struct', 'enum', 'trait', 'type'].includes(binding.kind)) {
      const path = pathOf(binding.target), old = sourceTypes.get(key(path));
      if (old && old !== binding.kind) throw new TypeError('Conflicting registered source type evidence');
      sourceTypes.set(key(path), binding.kind);
    }
  }
  const ensure = (path, kind = 'mod') => {
    const name = key(path), existing = tables.get(name);
    if (existing) {
      if (existing.kind !== kind) throw new TypeError('A source type cannot also be an external module');
      return existing;
    }
    if (sourceTypes.has(name) && sourceTypes.get(name) !== kind) throw new TypeError('A registered function path has a source type as its module owner');
    const table = { bindings: [], complete: false, kind };
    tables.set(name, table);
    return table;
  };
  const add = descriptor => {
    if (!descriptor || !namespaces.has(descriptor.namespace) || typeof descriptor.kind !== 'string') throw new TypeError('Registered bindings require explicit source namespaces and kinds');
    const target = pathOf(descriptor.target), name = descriptor.name ?? target.at(-1);
    if (typeof name !== 'string' || !identifier.test(name)) throw new TypeError('Registered binding name must be a Rust identifier');
    const owner = target.slice(0, -1), ownerKind = sourceTypes.get(key(owner));
    if (ownerKind && ownerKind !== 'enum') throw new TypeError('Associated items are not importable module bindings');
    for (let length = 1; length <= owner.length; length++) {
      const prefix = owner.slice(0, length), kind = sourceTypes.get(key(prefix)) ?? 'mod';
      if (!['mod', 'enum'].includes(kind)) throw new TypeError('Registered source path requires module or enum ancestry');
      const table = ensure(prefix, kind);
      if (length > 1 && kind === 'mod') addTo(ensure(prefix.slice(0, -1)), { name: prefix.at(-1), namespace: 'type', target: prefix, kind: 'mod' });
      if (length === owner.length) addTo(table, { ...structuredClone(descriptor), name, target });
    }
  };
  const addTo = (table, binding) => {
    const old = table.bindings.find(value => value.name === binding.name && value.namespace === binding.namespace);
    if (old && JSON.stringify(old) !== JSON.stringify(binding)) throw new TypeError('Conflicting registered source namespace binding');
    if (!old) table.bindings.push(binding);
  };
  for (const descriptor of descriptors) add(descriptor);
  for (const contract of contracts) {
    if (!contract || !Array.isArray(contract.rustPath)) throw new TypeError('Registered contracts require actual Rust paths');
    const target = pathOf(contract.rustPath);
    // Receiver operations and associated functions do not create modules or
    // importable value names. Their owner must already have source evidence.
    if (['method', 'index'].includes(contract.kind) || contract.receiver || contract.trait || layoutTypes.has(key(target.slice(0, -1))) || sourceTypes.has(key(target.slice(0, -1)))) continue;
    if (contract.kind && contract.kind !== 'function') continue;
    add({ name: target.at(-1), namespace: 'value', target, kind: 'fn' });
  }
  return new Map([...tables].sort(([left], [right]) => left.localeCompare(right)).map(([name, table]) => [name, freeze({ ...table, bindings: table.bindings.sort((left, right) => key([left.namespace, left.name]).localeCompare(key([right.namespace, right.name]))) })]));
}
