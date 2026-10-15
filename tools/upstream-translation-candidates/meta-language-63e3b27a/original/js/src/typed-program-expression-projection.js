// Host JSON boundary adapter. Projection instructions and admission decisions
// are shared data; the existing checker still owns types and semantics.
import { TYPED_PROGRAM_LINKS_SCHEMA } from './typed-program-links.js';
import { acceptProgramExpressionField, acceptProgramExpressionOperation, readProgramExpressionProjection } from './typed-program-link-rules.js';
import { checkRustScalarLoopProof } from './translation/rust-scalar-loops.js';

/** Restore identities from actual declarations after independent namespace validation. */
export function projectLinkedProgramDeclarationPath(name, declarations, rooted = false) {
  if (!rooted) return name.split('.');
  const declaration = declarations.get(name);
  if (!declaration) throw new TypeError('an owned namespace projection has no actual declaration target');
  const actual = [...declaration.modulePath, declaration.name];
  if (actual.join('.') !== name) throw new TypeError('an owned namespace projection disagrees with its actual declaration binding');
  return ['crate', ...actual];
}

export function projectLinkedProgramExpression(value, declarations = new Map(), {rootedNamespace = false} = {}) {
  const plans = TYPED_PROGRAM_LINKS_SCHEMA.expressionProjections;
  if (['tuple', 'tupleIndex'].includes(value?.k)
    && Object.keys(value).some(field => !acceptProgramExpressionField(value.k, field))) throw new TypeError('a linked tuple expression has an unrecognized projection field');
  if (Object.hasOwn(TYPED_PROGRAM_LINKS_SCHEMA.expressionOperations, value?.k)
    && !acceptProgramExpressionOperation(value.k, value.op)) throw new TypeError('the linked program contains an unrecognized expression operation');
  let key = value?.k;
  const base = plans[key];
  if (base?.variant) {
    const discriminator = base.variant.reduce((current, field) => current?.[field], value);
    const variant = `${key}:${discriminator}`;
    if (readProgramExpressionProjection(variant)) key = variant;
  }
  if (!readProgramExpressionProjection(key ?? '') || !plans[key].construct) throw new TypeError(`the linked expression ${value?.k} has no surface projection`);
  const plan = plans[key];
  const result = { k: plan.construct, ...(value.span !== undefined ? { span: value.span } : {}) };
  const project = child => projectLinkedProgramExpression(child, declarations, {rootedNamespace});
  const operation = plan.renames?.[value.op] ?? value.op;
  for (const [target, mode, source, right] of plan.fields) {
    const child = value[source];
    if (mode === 'copy') { if (child !== undefined) result[target] = child; }
    else if (mode === 'expression') result[target] = project(child);
    else if (mode === 'expressions') result[target] = child.map(project);
    else if (mode === 'name-path') result[target] = [child];
    else if (mode === 'function-path') {
      let path=rootedNamespace ? projectLinkedProgramDeclarationPath(child, declarations, true) : [child];
      const declaration=declarations.get(child);
      if(declaration?.sourceLoop?.continuation!==undefined){
        if(declaration.k!=='fn'||declaration.fullName!==child)throw new TypeError('a projected continuation must target its actual declaration identity');
        const proof=checkRustScalarLoopProof(declaration,declaration.sourceLoop.language,child);
        path=[proof.continuation.root,...proof.continuation.path];
      }
      result[target]={k:'name',path};
    }
    else if (mode === 'array-items') result[target] = child.map((item) => ({ value: project(item), spread: plan.spreadOperations?.includes(value.op) ?? false }));
    else if (mode === 'spread-pair') result[target] = [child, value[right]].map((item) => ({ value: project(item), spread: true }));
    else if (mode === 'constructor-path') result[target] = { k: 'name', path: [...projectLinkedProgramDeclarationPath(value.data, declarations, rootedNamespace), child] };
    else if (mode === 'constructor-fields') {
      const declaration = declarations.get(value.data);
      const constructor = declaration?.k === 'data' && declaration.ctors.find(constructor => constructor.name === value.ctor);
      if (!constructor || child.length !== constructor.fields.length) throw new TypeError('the linked constructor projection differs from its declaration');
      result[target] = Object.fromEntries(constructor.fields.map((field, index) => [field.name, project(child[index])]));
    } else if (mode === 'match-cases') result[target] = child.map(kase => ({
      pattern: kase.pattern.k === 'ctor'
        ? { k: 'ctor', path: [...projectLinkedProgramDeclarationPath(kase.pattern.data, declarations, rootedNamespace), kase.pattern.ctor], binds: kase.pattern.binds }
        : { ...kase.pattern },
      body: project(kase.body), ...(kase.span !== undefined ? { span: kase.span } : {}),
    }));
    else if (mode === 'element-type') result[target] = child.element;
    else if (mode === 'binding-type') result[target] = child.type;
    else if (mode === 'integer-type') result[target] = child.kind !== 'float';
    else if (mode === 'operation') result[target] = operation;
    else if (mode === 'operation-name') result[target] = `Math.${operation}`;
    else if (mode === 'constant') result[target] = source;
    else throw new TypeError(`unknown shared projection instruction ${mode}`);
  }
  return result;
}
