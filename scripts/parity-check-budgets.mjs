// Finite nested budgets include every distinct cached test runner in the manifest.
import { resolve } from 'node:path';
export const evidenceTimeoutMs = 180_000;
export const translationTimeoutMs = 1_200_000;
export const checkerOverheadMs = 180_000;
export const acceptanceOtherMs = 1_200_000;
export const setupMs = 120_000;
export function parityCheckBudgets(manifest, root) {
  const files = new Set((manifest.features ?? []).flatMap(feature => feature.evidence ?? [])
    .filter(evidence => evidence.test && typeof evidence.file === 'string')
    .map(evidence => resolve(root, evidence.file)));
  const checkerMs = translationTimeoutMs + files.size * evidenceTimeoutMs + checkerOverheadMs;
  // strict.test executes three checker subprocesses in sequence; CI then runs
  // the fourth complete checker after the acceptance suite. Other acceptance
  // files run concurrently, but their finite allowance is kept separately.
  return { evidenceFiles: [...files].sort(), checkerMs,
    ciParityMs: 4 * checkerMs + acceptanceOtherMs + setupMs };
}
