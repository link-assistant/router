const primitive = new Set(['string', 'number', 'boolean']);

export function optionalType(type) {
  const match = /^(nullable|optional)-(string|number|boolean)$/u.exec(type);
  return match ? { primitive: match[2], absent: match[1] === 'nullable' ? 'null' : 'undefined' } : null;
}

export function joinReturnTypes(left, right) {
  if (left === right) return left;
  if (!left) return right;
  if (!right) return left;
  const member = optionalType(left) ?? optionalType(right);
  if (member) {
    const union = optionalType(left) ? left : right;
    const other = union === left ? right : left;
    return [member.primitive, member.absent].includes(other) ? union : null;
  }
  const value = primitive.has(left) ? left : primitive.has(right) ? right : null;
  const absent = ['null', 'undefined'].includes(left) ? left : ['null', 'undefined'].includes(right) ? right : null;
  return value && absent ? `${absent === 'null' ? 'nullable' : 'optional'}-${value}` : null;
}

export function closedReturnType(type) {
  return primitive.has(type) || ['null', 'undefined'].includes(type) || Boolean(optionalType(type));
}

export function typescriptType(type) {
  const optional = optionalType(type);
  return optional ? `${optional.primitive} | ${optional.absent}` : type === 'value' ? 'unknown' : type;
}
