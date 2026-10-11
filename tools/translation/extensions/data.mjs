// Module-local algebraic layouts and immutable records. External crates and
// derive-generated behavior remain explicit frontend refusals.
import { TupleRustParser, TupleChecker, TupleEmitter } from './tuples.mjs';
import { emitWith } from './core.mjs';
import { tokenizeRust } from './lexical.mjs';
import { coerce } from '../vendor/meta-language/translation/check.js';
import { data } from '../vendor/meta-language/translation/types.js';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';

const span = (start, end) => ({ start: start.start, end: end.end });
const LAYOUT_DERIVES = new Set(['Clone', 'Copy', 'Debug', 'PartialEq', 'Eq', 'Hash', 'PartialOrd', 'Ord']);
const metadata = attributes => ({ rustAttributes: attributes, deriveTraits: attributes.flatMap(attribute => attribute.kind === 'derive' ? attribute.traits : []) });
export class DataRustParser extends TupleRustParser {
  fieldType() {
    const c = this.cursor, start = c.index, type = this.type();
    return { type, rustTypeSyntax: c.tokens.slice(start, c.index).map(token => token.raw ?? token.value) };
  }

  attributes({ allowDefault = false } = {}) {
    const c = this.cursor, attributes = [];
    while (c.is('#') && c.is('[', 1)) {
      const index = c.index, start = c.next();
      if (c.is('derive', 1)) {
        c.expect('[', 'attribute'); c.expect('derive', 'attribute'); c.expect('(', 'derive');
        const traits = [];
        while (!c.is(')')) {
          const trait = c.identifier('derive');
          if (!LAYOUT_DERIVES.has(trait.value) && !(allowDefault && trait.value === 'Default')) throw unsupported(`derive(${trait.value})`, 'derive requires a separately checked capability', span(trait, trait));
          traits.push(trait.value); if (!c.eat(',')) break;
        }
        c.expect(')', 'derive'); const end = c.expect(']', 'attribute');
        attributes.push({ kind: 'derive', traits, span: span(start, end) });
      } else {
        // Delegate lint validation to the pinned parser; compilation-changing
        // attributes and unknown procedural derives retain its refusals.
        super.attributeBody(start);
        const tokens = c.tokens.slice(index, c.index);
        attributes.push({ kind: 'attribute', name: tokens[2].value, tokens: tokens.map(token => token.raw ?? token.value), span: span(start, tokens.at(-1)) });
      }
    }
    return attributes;
  }

  items(root, items, path, done) {
    const c = this.cursor;
    while (!done()) {
      const attributes = this.attributes({ allowDefault: true });
      const start = c.peek();
      this.modulePath = path;
      this.visibility();
      if (attributes.some(attribute => attribute.traits?.includes('Default')) && !c.is('struct') && !c.is('enum')) throw unsupported('derive(Default)', 'only the unchanged data layout is registered; generated trait behavior requires separate lowering', span(start, c.peek()));
      if (c.eat('struct')) {
        const name = c.identifier('struct').value;
        if (c.is('<')) throw unsupported('generic struct', 'generic layouts require monomorphization', span(start, c.peek()));
        const fields = []; let ctorStyle = 'unit';
        if (c.eat('{')) {
          ctorStyle = 'named';
          while (!c.is('}')) {
            const fieldAttributes = this.attributes(); this.visibility();
            const name = c.identifier('field').value;
            c.expect(':', 'field'); fields.push({ name, ...this.fieldType(), rustAttributes: fieldAttributes });
            if (!c.eat(',')) break;
          }
          c.expect('}', 'struct');
        } else if (c.eat('(')) {
          ctorStyle = 'tuple';
          while (!c.is(')')) {
            const fieldAttributes = this.attributes(); this.visibility(); fields.push({ name: `field${fields.length}`, ...this.fieldType(), rustAttributes: fieldAttributes });
            if (!c.eat(',')) break;
          }
          c.expect(')', 'tuple struct'); c.expect(';', 'tuple struct');
        } else c.expect(';', 'unit struct');
        items.push({ k: 'data', name, ctors: [{ name, fields, ctorStyle }], record: true, ...metadata(attributes), span: span(start, c.peek()) });
        continue;
      }
      if (c.eat('mod')) {
        const name = c.identifier('module').value;
        if (c.is(';')) throw unsupported('out-of-line module', 'module resolution requires a repository context', span(start, c.peek()));
        c.expect('{', 'module');
        const module = { k: 'module', name, items: [], span: span(start, c.peek()) };
        items.push(module); this.items(root, module.items, [...path, name], () => c.is('}'));
        c.expect('}', 'module'); continue;
      }
      if (c.is('use')) { this.use(path); continue; }
      if (c.is('enum')) { items.push({ ...this.enumItem(), ...metadata(attributes) }); continue; }
      if (c.is('const') && c.is('fn', 1)) {
        const qualifier = c.next(), item = this.fn(path);
        items.push({ ...item, constFunction: true, span: { ...item.span, start: qualifier.start } }); continue;
      }
      if (c.is('fn') && c.is('main', 1) && path.length === 0) { root.main = this.main(); continue; }
      if (c.is('fn') || c.is('const') || c.is('async') && c.is('fn', 1)) { items.push(c.is('const') ? this.constItem(path) : this.fn(path)); continue; }
      throw unsupported(`Rust ${c.peek().value} item`, 'item needs a resolved semantic lowering', span(start, c.peek()));
    }
  }

  enumItem() {
    const c = this.cursor, start = c.next(), name = c.identifier('enum').value;
    if (c.is('<')) throw unsupported('generic enum', 'type parameters require monomorphization', span(start, c.peek()));
    c.expect('{', 'enum'); const ctors = [];
    while (!c.is('}')) {
      const attributes = this.attributes(), variant = c.identifier('variant'), fields = []; let ctorStyle = 'unit';
      if (c.eat('(')) {
        ctorStyle = 'tuple';
        while (!c.is(')')) {
          const fieldAttributes = this.attributes();
          fields.push({ ...this.fieldType(), rustAttributes: fieldAttributes }); if (!c.eat(',')) break;
        }
        c.expect(')', 'variant');
      } else if (c.eat('{')) {
        ctorStyle = 'named';
        while (!c.is('}')) {
          const fieldAttributes = this.attributes(), field = c.identifier('variant field');
          if (fields.some(entry => entry.name === field.value)) throw typeError(`duplicate variant field ${field.value}`, field);
          c.expect(':', 'variant field');
          fields.push({ name: field.value, ...this.fieldType(), rustAttributes: fieldAttributes });
          if (!c.eat(',')) break;
        }
        c.expect('}', 'variant');
      }
      else if (c.is('=')) throw unsupported('explicit discriminant', 'discriminant values require a separately checked capability', span(variant, c.peek()));
      ctors.push({ name: variant.value, fields, ctorStyle, rustAttributes: attributes }); if (!c.eat(',')) break;
    }
    c.expect('}', 'enum'); return { k: 'data', name, ctors, span: span(start, c.peek()) };
  }

  primary(path, options) {
    const c = this.cursor;
    const first = c.peek();
    // Look ahead without consuming an ordinary identifier/call.
    if (first.kind === 'identifier' && !options.noStruct) {
      let offset = 1;
      while (c.is('::', offset) && c.peek(offset + 1).kind === 'identifier') offset += 2;
      if (c.is('{', offset) && /^[A-Z]/u.test(c.peek(offset - 1).value)) {
        const type = this.pathSegments('record type'); c.expect('{', 'record');
        const fields = [];
        while (!c.is('}')) {
          if (c.is('..')) throw unsupported('record update', 'ownership and omitted-field evaluation require separate lowering', span(first, c.peek()));
          const token = c.identifier('record field');
          const value = c.eat(':') ? this.expr(path) : { k: 'name', path: [token.value], span: span(token, token) };
          if (fields.some(field => field.name === token.value)) throw typeError(`duplicate record field ${token.value}`, token);
          fields.push({ name: token.value, value });
          if (!c.eat(',')) break;
        }
        c.expect('}', 'record');
        return { k: 'routerRecord', path: this.resolve(type, path), fields, span: span(first, c.peek()) };
      }
    }
    return super.primary(path, options);
  }

  postfix(path, options) {
    const c = this.cursor;
    let value = this.primary(path, options);
    for (;;) {
      const first = c.peek();
      if (c.eat('[')) { const index = this.expr(path); c.expect(']', 'index'); value = { k: 'routerIndex', object: value, index, span: span(first, c.peek()) }; continue; }
      if (c.eat('.')) {
        if (c.peek().kind === 'number' && !c.peek().suffix && /^\d+$/u.test(c.peek().value)) {
          const index = Number(c.next().value);
          if (!Number.isSafeInteger(index)) throw unsupported('tuple index', 'requires a bounded literal tuple field', span(first, c.peek()));
          value = { k: 'routerTupleField', object: value, index, span: span(first, c.peek()) }; continue;
        }
        const name = c.identifier('field or method');
        if (!c.eat('(')) { value = { k: 'routerField', object: value, field: name.value, span: span(first, name) }; continue; }
        const args = [];
        while (!c.is(')')) { args.push(this.expr(path)); if (!c.eat(',')) break; }
        c.expect(')', 'method'); value = this.method(value, name, args, span(first, c.peek())); continue;
      }
      if (c.is('?')) throw unsupported('? operator', 'error propagation requires constructor conversion semantics', first);
      return value;
    }
  }
}

export class DataChecker extends TupleChecker {
  program(surface) {
    this.generatedConstructorHeads = new WeakSet();
    const visit = items => { for (const item of items) {
      if (item.k === 'module') visit(item.items);
      if (item.generated === 'router-data-constructor' && item.body?.k === 'app') this.generatedConstructorHeads.add(item.body.fn);
    } }; visit(surface.items);
    return super.program(surface);
  }

  application(head, args, env, path, expected, range) {
    const owner = head.k === 'name' ? this.lookup(head.path, path, range) : null;
    const entry = owner?.k === 'ctor' ? this.items.get(owner.data) : owner;
    const ctor = owner?.k === 'ctor' ? entry?.ctors.find(ctor => ctor.name === owner.name) : entry?.record && entry.ctors.length === 1 ? entry.ctors[0] : null;
    if (ctor?.ctorStyle === 'named' && !this.generatedConstructorHeads.has(head)) throw typeError('named source constructors require a record expression', range);
    return super.application(head, args, env, path, expected, range);
  }

  walk(items, path, visit) {
    for (const item of items) {
      if (item.k === 'module') { this.walk(item.items, [...path, item.name], visit); continue; }
      const entry = this.items.get([...path, item.name].join('.')); visit(item, path, entry);
      if (item.k !== 'data') continue;
      // The pinned checker rebuilds constructors with resolved types. Restore
      // syntax metadata after that visit, before any subsequent body checking.
      entry.ctors = entry.ctors.map((ctor, index) => ({
        ...ctor, ...(item.ctors[index].ctorStyle ? { ctorStyle: item.ctors[index].ctorStyle } : {}),
        ...(item.ctors[index].rustAttributes ? { rustAttributes: item.ctors[index].rustAttributes } : {}),
        fields: ctor.fields.map((field, fieldIndex) => ({ ...field, ...(item.ctors[index].fields[fieldIndex].rustAttributes ? { rustAttributes: item.ctors[index].fields[fieldIndex].rustAttributes } : {}), ...(item.ctors[index].fields[fieldIndex].rustTypeSyntax ? { rustTypeSyntax: item.ctors[index].fields[fieldIndex].rustTypeSyntax } : {}) })),
      }));
    }
  }

  expr(node, env, path, expected, allowLiteral = false) {
    env = this.contextEnvironment(node, env, expected);
    if (node.k === 'routerRecord') {
      const owner = this.lookup(node.path, path, node.span);
      const entry = owner?.k === 'ctor' ? this.items.get(owner.data) : owner;
      const ctor = owner?.k === 'ctor' ? entry?.ctors.find(ctor => ctor.name === owner.name) : entry?.record && entry.ctors.length === 1 ? entry.ctors[0] : null;
      if (entry?.k !== 'data' || !ctor || !['named', 'unit'].includes(ctor.ctorStyle)) throw typeError(`record construction requires an actual source record or variant ${node.path.join('::')}`, node.span);
      if (node.fields.length !== ctor.fields.length || node.fields.some(field => !ctor.fields.some(declared => declared.name === field.name))) throw typeError(`record ${entry.name} has missing or unexpected fields`, node.span);
      const bindings = node.fields.map(field => {
        const declared = ctor.fields.find(candidate => candidate.name === field.name);
        return { name: this.freshName('ml_record'), field: field.name, value: coerce(this.expr(field.value, env, path, declared.type), declared.type, this.language, node.span) };
      });
      let body = { k: 'ctor', data: entry.fullName, ctor: ctor.name, args: ctor.fields.map(field => {
        const binding = bindings.find(candidate => candidate.field === field.name);
        return { k: 'var', name: binding.name, type: field.type };
      }), type: data(entry.fullName), span: node.span };
      // Bind in written field order before reordering into the declared layout.
      for (const binding of bindings.toReversed()) body = { k: 'let', name: binding.name, value: binding.value, body, type: body.type };
      return body;
    }
    if (node.k === 'routerField') {
      const object = this.expr(node.object, env, path);
      const entry = object.type.kind === 'data' ? this.items.get(object.type.name) : null;
      if (!entry?.record || entry.ctors.length !== 1) throw unsupported('field receiver', 'only known immutable struct fields have a resolved layout', node.span);
      const field = entry.ctors[0].fields.find(field => field.name === node.field);
      if (!field) throw typeError(`unknown field ${node.field} of ${entry.name}`, node.span);
      return { k: 'routerField', object, field: field.name, type: field.type, span: node.span };
    }
    return super.expr(node, env, path, expected, allowLiteral);
  }
}

export class DataEmitter extends TupleEmitter {
  ctorObject(entry, ctor, args) {
    if (!entry.record && ctor.ctorStyle !== 'named') return super.ctorObject(entry, ctor, args);
    return `Object.freeze({ $: ${JSON.stringify(ctor.name)}${ctor.fields.map((field, index) => `, [${JSON.stringify(field.name)}]: ${args[index]}`).join('')} })`;
  }

  expr(node) {
    if (node.k === 'routerField') return `(${this.expr(node.object)}).${node.field}`;
    return super.expr(node);
  }
}

export const parseRust = source => new DataRustParser(tokenizeRust(source)).file();
export const checkProgram = surface => new DataChecker(surface.language, surface.externals ?? []).program(surface);
export const emitJavaScript = program => emitWith(program, DataEmitter);
