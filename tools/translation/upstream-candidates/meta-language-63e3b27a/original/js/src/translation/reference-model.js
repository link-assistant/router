import { readFileSync } from 'node:fs';
import { Link, LinkId, LinkMetadata, LinkType } from '../primitives.js';
import {
  decodeCanonicalStatements,
  encodeNetworkLino,
  parseLinoStatements,
} from '../lino-serialization.js';

// Host values are a cache of the linked heap, preserving native live iterators.
// Every value, property, entry, hole and identity has a corresponding graph link.
class ReferenceNetwork {
  constructor() {
    this.records = new Map();
    this.terms = new Map();
    this.relations = new Map();
    this.nextIdentity = 1;
  }

  insert(references, term, type = LinkType.Semantic) {
    const id = new LinkId(this.nextIdentity++);
    this.records.set(Number(id), new Link(id, references,
      LinkMetadata.new().withLinkType(type).withTerm(term)));
    return id;
  }

  point(term) {
    if (this.terms.has(term)) return this.terms.get(term);
    const id = this.insert([], term, LinkType.Concept);
    this.link(id).setReferences([id]);
    this.terms.set(term, id);
    return id;
  }

  link(id) { return this.records.get(Number(id)); }
  relation(references) {
    const key = references.map(Number).join(':');
    if (!this.relations.has(key)) this.relations.set(key, this.insert(references));
    return this.relations.get(key);
  }
  links() { return [...this.records.values()]; }
  toLino() { return encodeNetworkLino(this.links(), new Set([...this.terms.values()].map(Number))); }

  static fromLino(source) {
    const network = new ReferenceNetwork();
    for (const { id, references, metadata, registered } of decodeCanonicalStatements(parseLinoStatements(source))) {
      if (network.records.has(id)) throw new TypeError(`duplicate reference graph identity ${id}`);
      network.records.set(id, new Link(id, references, metadata));
      network.nextIdentity = Math.max(network.nextIdentity, id + 1);
      if (registered && metadata.term !== undefined) network.terms.set(metadata.term, new LinkId(id));
      if (metadata.linkType === LinkType.Semantic && metadata.term === undefined) network.relations.set(references.map(Number).join(':'), new LinkId(id));
    }
    for (const link of network.links()) {
      for (const reference of link.references()) {
        if (!network.link(reference)) throw new TypeError(`missing reference graph identity ${reference}`);
      }
    }
    return network;
  }
}

function reading(statement) {
  if (statement.id !== null) return statement.values.length
    ? [statement.id, ...statement.values.map(reading)] : statement.id;
  return statement.values.map(reading);
}

function frozenTree(value) {
  return Array.isArray(value) ? Object.freeze(value.map(frozenTree)) : value;
}

const operationNetwork = new ReferenceNetwork();
const operations = new Map();
const sourceMethods = new Map();

function insertProgram(value) {
  if (!Array.isArray(value)) return operationNetwork.point(value);
  return operationNetwork.insert(value.map(insertProgram));
}

for (const statement of parseLinoStatements(readFileSync(new URL('../data/reference-operations.lino', import.meta.url), 'utf8'))) {
  const fields = new Map(statement.values.map(reading).map(([name, ...values]) => [name, values]));
  const descriptor = Object.freeze({
    id: statement.id,
    method: fields.get('method')?.[0],
    kind: fields.get('kind')[0],
    primitive: fields.get('primitive')[0],
    mutates: fields.get('mutates')[0] === 'true',
    program: frozenTree(fields.get('program')),
    link: operationNetwork.insert(statement.values.map(reading).map(insertProgram), statement.id),
  });
  if (operations.has(descriptor.id)) throw new TypeError(`duplicate reference operation ${descriptor.id}`);
  operations.set(descriptor.id, descriptor);
  if (descriptor.method) sourceMethods.set(`${descriptor.kind}:${descriptor.method}`, descriptor);
}

/** The source method is an alias of the executable linked operation. */
export function referenceMethodOperation(kind, method) { return sourceMethods.get(`${kind}:${method}`); }
export function referenceOperation(id) { return operations.get(id); }
export function referenceOperations() { return [...operations.values()]; }
export function referenceOperationNetwork() { return operationNetwork; }

function linkedProgram(descriptor) {
  const operation = operationNetwork.link(descriptor.link);
  const program = operation?.references().map((id) => operationNetwork.link(id)).find((field) => (
    operationNetwork.link(field.references()[0])?.metadata().term === 'program'
  ));
  if (!program) throw new TypeError('reference operation has no linked program');
  return program.references().slice(1).map((id) => operationNetwork.link(id).references().map((operand) => {
    const term = operationNetwork.link(operand)?.metadata().term;
    if (term === undefined) throw new TypeError('reference instruction operand must be a named point');
    return term;
  }));
}

export class ReferenceValue {
  constructor(heap, id) {
    Object.defineProperties(this, { heap: { value: heap }, id: { value: LinkId.from(id), enumerable: true } });
    Object.freeze(this);
  }
}

function valueKind(value) {
  if (Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype) return 'array';
  if (value instanceof Map && Object.getPrototypeOf(value) === Map.prototype) return 'map';
  if (value instanceof Set && Object.getPrototypeOf(value) === Set.prototype) return 'set';
  if (value !== null && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) return 'record';
  }
  throw new TypeError('reference heap supports arrays, maps, sets and plain records');
}

const nativePrototypes = { array: Array.prototype, map: Map.prototype, set: Set.prototype };

/**
 * A reference heap whose identities and values serialize as recursive links.
 * Native values are materialized once per identity, so aliases, live iterators
 * and nested comparator mutations observe the same object. Functions, symbols,
 * accessors and custom prototypes are not serializable reference values.
 */
export class ReferenceHeap {
  constructor(network = new ReferenceNetwork()) {
    this.network = network;
    this.objects = new WeakMap();
    this.values = new Map();
    this.scalars = new Map();
    this.root = network.links().find((link) => link.metadata().term === 'reference-heap' && link.metadata().linkType === LinkType.Object)?.id()
      ?? network.insert([network.point('reference-heap')], 'reference-heap', LinkType.Object);
  }

  _reference(reference) {
    if (!(reference instanceof ReferenceValue) || reference.heap !== this
      || this.network.link(reference.id)?.metadata().linkType !== LinkType.Reference) {
      throw new TypeError('reference value belongs to a different heap or has no cell');
    }
    return reference;
  }

  _newCell(kind) {
    const id = this.network.insert([this.network.point(`${kind}-value`)], undefined, LinkType.Reference);
    const root = this.network.link(this.root);
    root.setReferences([...root.references(), id]);
    return id;
  }

  _scalar(value) {
    const type = value === null ? 'null' : typeof value;
    if (!['undefined', 'null', 'boolean', 'number', 'bigint', 'string'].includes(type)) {
      throw new TypeError(`reference heap cannot serialize ${type} values`);
    }
    const text = type === 'number' && Object.is(value, -0) ? '-0' : String(value);
    const key = `${type}:${text}`;
    if (this.scalars.has(key)) return this.scalars.get(key);
    const marker = this.network.point(`${type === 'bigint' ? 'big-integer' : type}-value`);
    const payload = type === 'string'
      ? Array.from({ length: value.length }, (_, index) => this.network.point(String(value.charCodeAt(index))))
      : type === 'null' || type === 'undefined' ? [] : [this.network.point(text)];
    const id = this.network.insert([marker, ...payload]);
    this.scalars.set(key, id);
    return id;
  }

  _encode(value, seen = new Set()) {
    if (value instanceof ReferenceValue) return this._reference(value).id;
    if (value === null || typeof value !== 'object') return this._scalar(value);
    if (this.objects.has(value)) return this.objects.get(value);
    const id = this._newCell(valueKind(value));
    this.objects.set(value, id);
    this._store(value, id, seen);
    return id;
  }

  _validate(value, seen = new Set()) {
    if (value instanceof ReferenceValue) { this._reference(value); return; }
    if (value === null || typeof value !== 'object') {
      if (!['undefined', 'boolean', 'number', 'bigint', 'string', 'object'].includes(typeof value)) {
        throw new TypeError(`reference heap cannot serialize ${typeof value} values`);
      }
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);
    const kind = valueKind(value);
    if (Object.getOwnPropertySymbols(value).length) throw new TypeError('reference heap cannot serialize symbol properties');
    for (const name of Object.getOwnPropertyNames(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!Object.hasOwn(descriptor, 'value')) throw new TypeError('reference heap cannot serialize accessor properties');
      this._validate(descriptor.value, seen);
    }
    if (kind === 'map') for (const [key, member] of value) { this._validate(key, seen); this._validate(member, seen); }
    if (kind === 'set') for (const member of value) this._validate(member, seen);
  }

  _properties(value, seen) {
    if (Object.getOwnPropertySymbols(value).length) throw new TypeError('reference heap cannot serialize symbol properties');
    const properties = [];
    for (const name of Object.getOwnPropertyNames(value)) {
      if (Array.isArray(value) && name === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!Object.hasOwn(descriptor, 'value')) throw new TypeError('reference heap cannot serialize accessor properties');
      properties.push(this.network.relation([
        this.network.point('property-value'), this._scalar(name), this._encode(descriptor.value, seen),
        this._scalar(descriptor.writable), this._scalar(descriptor.enumerable), this._scalar(descriptor.configurable),
      ]));
    }
    return properties;
  }

  _store(value, id, seen = new Set()) {
    const numeric = Number(id);
    if (seen.has(numeric)) return;
    seen.add(numeric);
    const kind = valueKind(value);
    const references = [this.network.point(`${kind}-value`)];
    if (kind === 'array') references.push(this.network.relation([
      this.network.point('array-length'), this._scalar(value.length), this._scalar(Object.getOwnPropertyDescriptor(value, 'length').writable),
    ]));
    if (kind === 'record') references.push(this.network.point(Object.getPrototypeOf(value) === null ? 'null-prototype' : 'object-prototype'));
    if (kind === 'map') {
      for (const [key, member] of value) {
        references.push(this.network.relation([this.network.point('map-entry'), this._encode(key, seen), this._encode(member, seen)]));
      }
    }
    if (kind === 'set') {
      for (const member of value) references.push(this.network.relation([this.network.point('set-member'), this._encode(member, seen)]));
    }
    references.push(...this._properties(value, seen));
    references.push(this.network.relation([this.network.point('object-extensibility'), this._scalar(Object.isExtensible(value))]));
    this.network.link(id).setReferences(references);
  }

  _decode(id) {
    const numeric = Number(id);
    if (this.values.has(numeric)) return this.values.get(numeric);
    const link = this.network.link(id);
    if (!link) throw new TypeError(`missing reference graph identity ${id}`);
    const [marker, ...payload] = link.references();
    const term = this.network.link(marker)?.metadata().term;
    if (link.metadata().linkType !== LinkType.Reference) {
      const literal = this.network.link(payload[0])?.metadata().term;
      if (term === 'undefined-value') return undefined;
      if (term === 'null-value') return null;
      if (term === 'boolean-value') return literal === 'true';
      if (term === 'number-value') return Number(literal);
      if (term === 'big-integer-value') return BigInt(literal);
      if (term === 'string-value') return payload.map((unit) => String.fromCharCode(Number(this.network.link(unit).metadata().term))).join('');
      throw new TypeError(`unknown reference scalar ${term}`);
    }
    const kind = term?.replace(/-value$/, '');
    const value = kind === 'array' ? [] : kind === 'map' ? new Map() : kind === 'set' ? new Set()
      : kind === 'record' ? Object.create(this.network.link(payload[0])?.metadata().term === 'null-prototype' ? null : Object.prototype) : undefined;
    if (value === undefined) throw new TypeError(`unknown reference cell kind ${kind}`);
    this.values.set(numeric, value);
    this.objects.set(value, LinkId.from(id));
    for (const child of payload) {
      const [childMarker, key, member, writable, enumerable, configurable] = this.network.link(child).references();
      const childKind = this.network.link(childMarker)?.metadata().term;
      if (childKind === 'array-length') value.length = this._decode(key);
      if (childKind === 'map-entry') value.set(this._decode(key), this._decode(member));
      if (childKind === 'set-member') value.add(this._decode(key));
      if (childKind === 'property-value') Object.defineProperty(value, this._decode(key), {
        value: this._decode(member), writable: this._decode(writable), enumerable: this._decode(enumerable), configurable: this._decode(configurable),
      });
    }
    if (kind === 'array') {
      const lengthRelation = this.network.link(payload[0]).references();
      Object.defineProperty(value, 'length', { writable: this._decode(lengthRelation[2]) });
    }
    const extensibility = payload.map((child) => this.network.link(child).references()).find((references) => (
      this.network.link(references[0])?.metadata().term === 'object-extensibility'
    ));
    if (extensibility && !this._decode(extensibility[1])) Object.preventExtensions(value);
    return value;
  }

  _synchronize() {
    const seen = new Set();
    for (const [id, value] of this.values) this._store(value, new LinkId(id), seen);
  }

  allocate(kind, value) {
    if (value === undefined) value = kind === 'array' ? [] : kind === 'map' ? new Map() : kind === 'set' ? new Set() : {};
    if (valueKind(value) !== kind) throw new TypeError(`reference allocation expected ${kind}`);
    this._validate(value);
    return new ReferenceValue(this, this._encode(value));
  }

  alias(reference) { return new ReferenceValue(this, this._reference(reference).id); }
  read(reference) { return this._decode(this._reference(reference).id); }
  getElement(reference, index) { return this.execute('read-array-element', reference, index); }
  setElement(reference, index, value) { return this.execute('write-array-element', reference, index, value); }
  getField(reference, field) { return this.execute('read-record-field', reference, field); }
  setField(reference, field, value) { return this.execute('write-record-field', reference, field, value); }

  write(reference, value) {
    reference = this._reference(reference);
    if (value instanceof ReferenceValue) value = this.read(value);
    this._validate(value);
    const current = this.read(reference);
    const kind = valueKind(current);
    if (valueKind(value) !== kind) throw new TypeError(`reference write expected ${kind}`);
    if (value !== current) {
      // Retain the host identity so existing aliases and live iterators survive.
      const replacement = this._decode(this._encode(value));
      if (kind === 'map') { current.clear(); for (const [key, member] of replacement) current.set(key, member); }
      if (kind === 'set') { current.clear(); for (const member of replacement) current.add(member); }
      for (const name of Object.getOwnPropertyNames(current)) {
        if (kind !== 'array' || name !== 'length') delete current[name];
      }
      if (kind === 'array') current.length = replacement.length;
      if (kind === 'record') Object.setPrototypeOf(current, Object.getPrototypeOf(replacement));
      for (const name of Object.getOwnPropertyNames(replacement)) {
        if (kind !== 'array' || name !== 'length') Object.defineProperty(current, name, Object.getOwnPropertyDescriptor(replacement, name));
      }
    }
    this._synchronize();
    return reference;
  }

  identity(left, right) {
    return left instanceof ReferenceValue && right instanceof ReferenceValue
      && left.heap === this && right.heap === this && Number(left.id) === Number(right.id);
  }

  reference(value) {
    if (value instanceof ReferenceValue) return this._reference(value);
    this._validate(value);
    return new ReferenceValue(this, this._encode(value));
  }

  _argument(value) {
    if (value instanceof ReferenceValue) return this.read(value);
    if (value !== null && typeof value === 'object') return this._decode(this._encode(value));
    return value;
  }

  execute(operation, receiver, ...arguments_) {
    const descriptor = typeof operation === 'string' ? referenceOperation(operation) : operation;
    if (!descriptor || referenceOperation(descriptor.id) !== descriptor) throw new TypeError('unknown reference operation');
    if (descriptor.kind !== 'reference' && valueKind(this.read(receiver)) !== descriptor.kind) throw new TypeError(`reference operation expected ${descriptor.kind}`);
    const environment = new Map([['receiver', receiver], ['arguments', arguments_]]);
    try {
      for (const instruction of linkedProgram(descriptor)) {
        const [name, ...operands] = instruction;
        if (name === 'read-reference') environment.set(operands[1], this.read(environment.get(operands[0])));
        else if (name === 'allocate-reference') {
          const [kind, value] = environment.get(operands[0]);
          environment.set(operands[1], this.allocate(kind, value));
        } else if (name === 'compare-identities') environment.set(operands[2], this.identity(environment.get(operands[0]), environment.get(operands[1])[0]));
        else if (name === 'read-selected-value' || name === 'write-selected-value') {
          const target = environment.get(operands[0]);
          const [key, input] = environment.get(operands[1]);
          if (typeof key === 'symbol' || key !== null && (typeof key === 'object' || typeof key === 'function')) {
            throw new TypeError('reference property keys must be serializable primitive values');
          }
          if (descriptor.kind === 'record' && typeof key !== 'string') throw new TypeError('record field names must be strings');
          if (name === 'read-selected-value') environment.set(operands[2], target[key]);
          else {
            if (key === '__proto__' && !Object.hasOwn(target, key) && Object.getPrototypeOf(target) !== null) {
              throw new TypeError('reference heap cannot execute inherited prototype setters');
            }
            this._validate(input);
            const member = this._argument(input);
            target[key] = member;
            environment.set(operands[2], member);
          }
        }
        else if (name === 'write-reference') {
          const input = environment.get(operands[1]);
          this.write(environment.get(operands[0]), operands[1] === 'arguments' ? input[0] : input);
        } else if (name === 'return-value') {
          const result = environment.get(operands[0]);
          return result !== null && typeof result === 'object' && !(result instanceof ReferenceValue) ? this.reference(result) : result;
        } else if (name.startsWith('invoke-') && name.endsWith('-method')) {
          const kind = name.slice('invoke-'.length, -'-method'.length);
          const [method, value, argumentsName, result] = operands;
          if (method !== descriptor.method || kind !== descriptor.kind) throw new TypeError('reference program method disagrees with its descriptor');
          const nativeArguments = environment.get(argumentsName).map((argument, index) => {
            if (!(kind === 'array' && method === 'sort' && index === 0 && typeof argument === 'function')) this._validate(argument);
            return this._argument(argument);
          });
          environment.set(result, Reflect.apply(nativePrototypes[kind][method], environment.get(value), nativeArguments));
        } else throw new TypeError(`unknown reference instruction ${name}`);
      }
      throw new TypeError('reference operation has no return instruction');
    } finally {
      // A comparator can mutate and throw; JavaScript retains those mutations.
      this._synchronize();
    }
  }

  iterate(reference, mode = 'values') {
    const value = this.read(reference);
    if (!['keys', 'values', 'entries'].includes(mode) || typeof value[mode] !== 'function') throw new TypeError('unknown reference iteration mode');
    return value[mode]();
  }

  toLino() { this._synchronize(); return this.network.toLino(); }
  static fromLino(source) {
    const network = ReferenceNetwork.fromLino(source);
    const roots = network.links().filter((link) => link.metadata().term === 'reference-heap' && link.metadata().linkType === LinkType.Object);
    if (roots.length !== 1) throw new TypeError('serialized reference heap needs exactly one root');
    const [marker, ...cells] = roots[0].references();
    if (network.link(marker)?.metadata().term !== 'reference-heap'
      || cells.some((cell) => network.link(cell)?.metadata().linkType !== LinkType.Reference)) {
      throw new TypeError('serialized reference heap has an invalid root');
    }
    return new ReferenceHeap(network);
  }
}
