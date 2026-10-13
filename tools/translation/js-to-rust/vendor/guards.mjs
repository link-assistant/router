// Refinement follows a proven typeof test along the actual short circuit or
// branch edge. Unknown parameters stay full value projections at the boundary.
export function guardedScope(expr, names, truth) {
  let refined = new Map(names);
  if (expr.kind === 'truthy') return guardedScope(expr.operand, names, truth);
  if (truth && expr.kind === 'builtin' && ['safe-integer', 'finite', 'nan'].includes(expr.name) && expr.args.length === 1 && expr.args[0].kind === 'variable') {
    if (names.get(expr.args[0].name) === 'value') refined.set(expr.args[0].name, 'value:number');
    return refined;
  }
  if (expr.kind === 'unary' && expr.op === 'not') return guardedScope(expr.operand, names, !truth);
  if (expr.kind === 'binary' && (expr.op === 'and' && truth || expr.op === 'or' && !truth)) {
    refined = guardedScope(expr.left, refined, truth);
    return guardedScope(expr.right, refined, truth);
  }
  if (expr.kind !== 'binary' || !['equal', 'not-equal'].includes(expr.op) || truth !== (expr.op === 'equal')) return refined;
  const probe = expr.left.kind === 'typeof' ? expr.left : expr.right.kind === 'typeof' ? expr.right : null;
  const tag = probe === expr.left ? expr.right : expr.left;
  if (probe?.operand.kind !== 'variable' || tag.kind !== 'string' || !['string', 'number', 'boolean'].includes(tag.value)) return refined;
  const current = names.get(probe.operand.name);
  if (current === 'value') refined.set(probe.operand.name, `value:${tag.value}`);
  return refined;
}
