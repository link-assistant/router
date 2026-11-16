// Requirement bookkeeping DATA only. This module grants no parser, namespace,
// type, ownership, translation, runtime or coverage authority. Never import it
// into semantic admission or use a matching Git blob as an executable permit.
const groups = ['L', 'R', 'C', 'O', 'B', 'F', 'V', 'S', 'P', 'T', 'Q', 'J', 'E', 'D'];
export const DRAFT_REQUIREMENT_IDS = Object.freeze(groups.flatMap(group =>
  Array.from({length: 5}, (_, index) => group + String(index + 1).padStart(2, '0'))));
const ids = new Set(DRAFT_REQUIREMENT_IDS);
const MAX_ROWS = 20_000;
const fail = message => { throw new TypeError('Draft inventory: ' + message); };

export function draftInventoryPath(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 ||
      /[\u0000-\u001f\u007f\\]/u.test(value) || value.startsWith('/') ||
      value.split('/').some(part => !part || part === '.' || part === '..')) {
    fail('relative repository path required');
  }
  return value;
}

export function draftInventorySelection(selection) {
  if (!selection || !Array.isArray(selection.roots) || !Array.isArray(selection.exact) ||
      selection.roots.length > 100 || selection.exact.length > 100) fail('bounded selection required');
  const roots = selection.roots.map(root => {
    if (typeof root !== 'string' || !root.endsWith('/')) fail('root requires slash');
    draftInventoryPath(root.slice(0, -1));
    return root;
  });
  const exact = new Set(selection.exact.map(draftInventoryPath));
  if (new Set(roots).size !== roots.length || exact.size !== selection.exact.length) fail('duplicate selection');
  return value => {
    draftInventoryPath(value);
    return exact.has(value) || roots.some(root => value.startsWith(root));
  };
}

function rowsByPath(rows, baseline, selected) {
  if (!Array.isArray(rows) || rows.length > MAX_ROWS) fail('bounded row array required');
  const result = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object') fail('row required');
    const path = draftInventoryPath(row.path);
    if (!selected(path) || result.has(path)) fail('unselected or duplicate path: ' + path);
    if (!/^[a-f0-9]{40}$/u.test(row.blob) || !['100644', '100755', '120000'].includes(row.mode) ||
        !Number.isSafeInteger(row.bytes) || row.bytes < 0) fail('complete blob/mode/byte metadata required');
    if (baseline) {
      if (!Array.isArray(row.draftIds) || row.draftIds.some(id => !ids.has(id)) ||
          new Set(row.draftIds).size !== row.draftIds.length) fail('known unique draft IDs required');
      if (!Array.isArray(row.unresolved) || row.unresolved.some(value => typeof value !== 'string' || !value)) {
        fail('explicit unresolved list required');
      }
      if (!['OPEN', 'REVIEWED'].includes(row.reviewStatus)) fail('explicit review status required');
      if (typeof row.role !== 'string' || !row.role) fail('explicit review role required');
      if (!Array.isArray(row.functionReviewAnchors) || row.functionReviewAnchors.some(anchor =>
        !Array.isArray(anchor) || anchor.length !== 2 || !Number.isSafeInteger(anchor[0]) ||
        anchor[0] < 1 || typeof anchor[1] !== 'string' || !anchor[1])) fail('lexical review anchors required');
    }
    result.set(path, row);
  }
  return result;
}

export function reconcileDraftInventory({baseline, current, selection}) {
  const selected = draftInventorySelection(selection);
  const before = rowsByPath(baseline, true, selected), after = rowsByPath(current, false, selected);
  const added = [], removed = [], changed = [], unassigned = [], needsReview = [];
  const requirements = new Map(DRAFT_REQUIREMENT_IDS.map(id => [id, []]));
  for (const [path, row] of before) {
    const actual = after.get(path);
    if (!actual) removed.push(path);
    else if (row.blob !== actual.blob || row.mode !== actual.mode || row.bytes !== actual.bytes) changed.push(path);
    if (!row.draftIds.length) unassigned.push(path);
    if (row.reviewStatus !== 'REVIEWED' || row.unresolved.length) needsReview.push(path);
    for (const id of row.draftIds) requirements.get(id).push(path);
  }
  for (const path of after.keys()) if (!before.has(path)) added.push(path);
  for (const list of [added, removed, changed, unassigned, needsReview]) list.sort();
  return {
    schema: 'router-source-draft-reconciliation-v1',
    baselinePaths: before.size, currentPaths: after.size,
    added, removed, changed, unassigned, needsReview,
    affectedRequirements: Object.fromEntries([...requirements].map(([id, paths]) => [id, paths.sort()])),
    pathSnapshotMatches: added.length === 0 && removed.length === 0 && changed.length === 0,
    scopeReviewComplete: added.length === 0 && removed.length === 0 && changed.length === 0 &&
      unassigned.length === 0 && needsReview.length === 0,
    // A reviewed file list still cannot establish exact function inventory,
    // implementation completeness, behavior, or closed acceptance bundles.
    functionCount: null, draftedRequirements: null, translationCoverage: null,
    semanticAuthority: false, executionEvidence: 'UNRUN',
  };
}
