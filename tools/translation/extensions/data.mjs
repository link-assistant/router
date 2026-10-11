// Module-local algebraic layouts and immutable records. External crates and
// derive-generated behavior remain explicit frontend refusals.
import { ControlRustParser, ControlChecker, ControlEmitter } from './control.mjs';
import { emitWith } from './core.mjs';
import { tokenizeRust } from './lexical.mjs';
import { coerce } from '../vendor/meta-language/translation/check.js';
import { data } from '../vendor/meta-language/translation/types.js';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';

const span = (start, end) => ({ start: start.start, end: end.end });
export class DataRustParser extends ControlRustParser {
  items(root, items, path, done) {
    const c = this.cursor;
    while (!done()) {
      this.attributes();
      const start = c.peek();
      this.modulePath = path;
      this.visibility();
      if (c.eat('struct')) {
        const name = c.identifier('struct').value;
        if (c.is('<')) throw unsupported('generic struct', 'generic layouts require monomorphization', span(start, c.peek()));
        const fields = [];
        if (c.eat('{')) {
          while (!c.is('}')) {
            this.attributes(); this.visibility();
            const name = c.identifier('field').value;
            c.expect(':', 'field'); fields.push({ name, type: this.type() });
            if (!c.eat(',')) break;
          }
          c.expect('}', 'struct');
        } else if (c.eat('(')) {
          while (!c.is(')')) {
            this.visibility(); fields.push({ name: `field${fields.length}`, type: this.type() });
            if (!c.eat(',')) break;
          }
          c.expect(')', 'tuple struct'); c.expect(';', 'tuple struct');
        } else c.expect(';', 'unit struct');
        items.push({ k: 'data', name, ctors: [{ name, fields }], record: true, span: span(start, c.peek()) });
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
      if (c.is('enum')) { items.push(this.enumItem()); continue; }
      if (c.is('fn') && c.is('main', 1) && path.length === 0) { root.main = this.main(); continue; }
      if (c.is('fn') || c.is('const')) { items.push(c.is('fn') ? this.fn(path) : this.constItem(path)); continue; }
      throw unsupported(`Rust ${c.peek().value} item`, 'item needs a resolved semantic lowering', span(start, c.peek()));
    }
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

export class DataChecker extends ControlChecker {
  expr(node, env, path, expected, allowLiteral = false) {
    if (node.k === 'routerRecord') {
      const entry = this.lookup(node.path, path, node.span);
      if (!entry || entry.k !== 'data' || !entry.record || entry.ctors.length !== 1) throw typeError(`unknown record layout ${node.path.join('::')}`, node.span);
      const ctor = entry.ctors[0];
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

export class DataEmitter extends ControlEmitter {
  ctorObject(entry, ctor, args) {
    if (!entry.record) return super.ctorObject(entry, ctor, args);
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
