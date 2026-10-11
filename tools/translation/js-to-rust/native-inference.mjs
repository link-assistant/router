// Conservative compiler inference for the runtime-identical TS target. Keep
// dynamic contracts explicit; never replace any with an alias that conceals it.
// Only closed primitive/container types can be emitted without inventing an
// import or narrowing an unannotated public parameter contract.
const primitives = new Set(['boolean', 'string', 'number', 'bigint', 'null', 'undefined', 'void', 'never']);

export function describeType(ts, checker, type, depth = 0) {
  if (!type || depth > 8 || type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) return null;
  const flags = type.flags;
  const primitive = flags & ts.TypeFlags.BooleanLike ? 'boolean'
    : flags & ts.TypeFlags.StringLike ? 'string'
      : flags & ts.TypeFlags.NumberLike ? 'number'
        : flags & ts.TypeFlags.BigIntLike ? 'bigint'
          : flags & ts.TypeFlags.Null ? 'null'
            : flags & ts.TypeFlags.Undefined ? 'undefined'
              : flags & ts.TypeFlags.Void ? 'void'
                : flags & ts.TypeFlags.Never ? 'never' : null;
  if (primitive) return { kind: 'primitive', name: primitive };
  if (type.isUnion?.()) {
    const members = type.types.map(member => describeType(ts, checker, member, depth + 1));
    if (members.some(member => !member)) return null;
    const unique = [...new Map(members.map(member => [JSON.stringify(member), member])).values()];
    return unique.length === 1 ? unique[0] : { kind: 'union', members: unique };
  }
  const symbol = type.target?.symbol;
  const builtin = symbol?.declarations?.some(declaration => declaration.getSourceFile().isDeclarationFile && /(?:^|[/\\])lib\.[^/\\]+\.d\.ts$/u.test(declaration.getSourceFile().fileName));
  if (builtin && ['Promise', 'Array', 'ReadonlyArray'].includes(symbol.name)) {
    const arguments_ = checker.getTypeArguments(type);
    if (arguments_.length !== 1) return null;
    const element = describeType(ts, checker, arguments_[0], depth + 1);
    if (!element) return null;
    return { kind: symbol.name === 'Promise' ? 'promise' : symbol.name === 'ReadonlyArray' ? 'readonly-array' : 'array', element };
  }
  return null;
}

export function typeNode(ts, hint, depth = 0) {
  const f = ts.factory;
  if (!hint || depth > 8 || typeof hint !== 'object' || Array.isArray(hint)) throw new Error('invalid native type inference hint');
  if (hint.kind === 'primitive' && primitives.has(hint.name)) {
    if (hint.name === 'null') return f.createLiteralTypeNode(f.createNull());
    if (hint.name === 'undefined') return f.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
    const keyword = { boolean: 'BooleanKeyword', string: 'StringKeyword', number: 'NumberKeyword', bigint: 'BigIntKeyword', void: 'VoidKeyword', never: 'NeverKeyword' }[hint.name];
    return f.createKeywordTypeNode(ts.SyntaxKind[keyword]);
  }
  if (hint.kind === 'union' && Array.isArray(hint.members) && hint.members.length > 1 && hint.members.length < 32) return f.createUnionTypeNode(hint.members.map(member => typeNode(ts, member, depth + 1)));
  if (['promise', 'array', 'readonly-array'].includes(hint.kind)) return f.createTypeReferenceNode({ promise: 'Promise', array: 'Array', 'readonly-array': 'ReadonlyArray' }[hint.kind], [typeNode(ts, hint.element, depth + 1)]);
  throw new Error('unsupported native type inference hint');
}

export function inferenceProgram(ts, root, paths) {
  const dependencyTypes = `${root}/packages/javascript/node_modules/@types`;
  const program = ts.createProgram(paths.map(path => `${root}/${path}`), {
    allowJs: true, checkJs: false, noEmit: true, strictNullChecks: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true,
    typeRoots: [dependencyTypes], types: ['node'],
  });
  return { program, checker: program.getTypeChecker() };
}

export function returnHint(ts, checker, node) {
  if (!checker || ts.isConstructorDeclaration(node) || ts.isSetAccessorDeclaration(node) || node.asteriskToken) return null;
  const signature = checker.getSignatureFromDeclaration(node);
  return signature ? describeType(ts, checker, checker.getReturnTypeOfSignature(signature)) : null;
}

export function localHint(ts, checker, node) {
  if (!checker || !ts.isIdentifier(node.name) || !ts.isVariableDeclarationList(node.parent) || !(node.parent.flags & ts.NodeFlags.Const)) return null;
  const hint = describeType(ts, checker, checker.getTypeAtLocation(node));
  const reliable = value => value && (value.kind === 'primitive' ? !['null', 'undefined', 'never', 'void'].includes(value.name) : value.kind === 'union' ? value.members.every(reliable) : reliable(value.element));
  // JS dynamic property writes and evolving arrays can appear as undefined or
  // never before later mutation. Preserve an explicit gap at those callsites.
  // Nullable reads also need a source invariant before narrowing their callers.
  return reliable(hint) ? hint : null;
}
