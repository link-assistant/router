import { recordShape,errorShape } from './aggregates.mjs';
const primitive = new Set(['string', 'number', 'boolean']);

export function optionalType(type) {
  const match = /^(nullable|optional)-(string|number|boolean)$/u.exec(type);
  return match ? { primitive: match[2], absent: match[1] === 'nullable' ? 'null' : 'undefined' } : null;
}

export function joinReturnTypes(left, right) {
  if (left === right) return left;
  if (!left) return right;
  if (!right) return left;
  if ([left,right].includes('value') && [left,right].every(type => type === 'value' || primitive.has(type) || ['null','undefined'].includes(type))) return 'value';
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
  return primitive.has(type) || ['null', 'undefined','value','array-value','json-response'].includes(type) || Boolean(optionalType(type)) || Boolean((recordShape(type)??errorShape(type))?.every(([,field])=>closedReturnType(field)));
}

export function typescriptType(type) {
  if(type==='utf16-string')return 'string';
  if(type==='json-response')return 'Response';
  const error=errorShape(type);
  if(error)return `Error & { ${error.map(([name,field])=>`${JSON.stringify(name)}: ${typescriptType(field)}`).join('; ')} }`;
  if(type==='array-value')return 'unknown[]';
  const record=recordShape(type);
  if(record)return `{ ${record.map(([name,field])=>`${JSON.stringify(name)}: ${typescriptType(field)}`).join('; ')} }`;
  if(type==='table-set')return 'ReadonlySet<unknown>';
  const map=/^table-map-(string|number|boolean)$/u.exec(type);
  if(map)return `ReadonlyMap<unknown, ${map[1]}>`;
  const optional = optionalType(type);
  return optional ? `${optional.primitive} | ${optional.absent}` : type === 'value' ? 'unknown' : type;
}
