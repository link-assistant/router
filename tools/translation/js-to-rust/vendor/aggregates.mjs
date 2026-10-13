// Structural aggregate contracts describe fresh allocations, not arbitrary
// object shapes. No property observation or coercion follows from this type.
export function recordType(fields) {
  return 'record:' + JSON.stringify(fields.map(field => [field.name, field.value.type]));
}
export function recordShape(type) {
  if (!type?.startsWith('record:')) return null;
  try {
    const fields = JSON.parse(type.slice(7));
    return Array.isArray(fields) && fields.every(field => Array.isArray(field) && field.length === 2 && field.every(value => typeof value === 'string')) ? fields : null;
  } catch { return null; }
}
export function carriesValue(type) {
  return ['value','array-value'].includes(type) || Boolean(recordShape(type)?.some(([,field]) => carriesValue(field)));
}
// Lossless value lifts cannot reinterpret scalar strings as UTF-16 payloads.
// String literals have known units; arbitrary strings retain unknown payloads.
export function canLiftValue(expr) {
  return ['value','number','boolean','null','undefined'].includes(expr.type) || expr.type === 'string' && expr.kind === 'string';
}
export function payloadBoundary(item) {
  if(item.kind!=='function')return false;
  const body=JSON.stringify(item.body);
  return carriesValue(item.returns) || body.includes('"kind":"record"') || body.includes('"kind":"array"') || body.includes('"primitiveComparison":true') || Boolean(item.params?.some(param=>param.rest));
}
