// Read-only physical source/Cargo joins around the actual in-memory sequence.
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {proposeSourceBackedCoreAdoptionSequence, reviewSourceBackedCoreAdoptionSequence} from './source-bound-core-adoption-sequence.mjs';
const fail = message => { throw new TypeError('Physical core adoption sequence: ' + message); };
function physicalRoot(root) {
  if (typeof root !== 'string' || !root.length || root.length > IO.limits.pathUnits || root.includes('\0') || realpathSync(root) !== resolve(root)) fail('unlinked physical source root required');
  return resolve(root);
}
function capture(root) {
  const source = IO.snapshot(root), cargo = IO.sequenceDependencies(root);
  if (!cargo.inputs || cargo.rows.some(row => row.absent)) fail('complete actual package/workspace Cargo inputs required');
  return {source, cargo};
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function originalMap(source, sequence) {
  const paths = Object.keys(source.files);
  if (!same(paths, Object.keys(sequence.originalFiles)) || paths.some(path => source.files[path] !== sequence.originalFiles[path])) fail('whole physical original source map differs');
}
function physicalFacts(root, snapshots) {
  return {root, sourceDomain: 'complete-physical-production-source-tree',
    sourceRows: snapshots.source.rows, sourceCensus: snapshots.source.census,
    rootIdentity: {dev: snapshots.source.rootIdentity.dev, ino: snapshots.source.rootIdentity.ino, mode: snapshots.source.rootIdentity.mode},
    cargoRows: snapshots.cargo.rows, ownershipAuthority: false, includesAllTrackedRustOutsideProductionTree: false};
}
export function proposePhysicalCoreAdoptionSequence(rootInput, {compilationProfile = PRODUCTION_PROFILE} = {}) {
  const root = physicalRoot(rootInput), snapshots = capture(root);
  const sequence = proposeSourceBackedCoreAdoptionSequence({entry: IO.rootEntry(root), files: snapshots.source.files,
    dependencyInputs: snapshots.cargo.inputs, compilationProfile});
  IO.rejoin(snapshots.source); snapshots.cargo.verify();
  originalMap(snapshots.source, sequence);
  return {schema: 'router-physical-core-adoption-sequence-v1', physical: physicalFacts(root, snapshots), sequence,
    applicationSourcesInstalled: false, semanticAdmission: false, executableCoverageGain: null};
}
export function reviewPhysicalCoreAdoptionSequence(value, rootInput) {
  const root = physicalRoot(rootInput), snapshots = capture(root);
  if (value?.schema !== 'router-physical-core-adoption-sequence-v1' || value.applicationSourcesInstalled !== false || value.semanticAdmission !== false || value.executableCoverageGain !== null || !same(value.physical, physicalFacts(root, snapshots))) fail('complete physical source/Cargo identities differ');
  const reviewed = reviewSourceBackedCoreAdoptionSequence(value.sequence);
  originalMap(snapshots.source, value.sequence);
  if (!same(value.sequence.cargo.inputs, snapshots.cargo.inputs)) fail('complete physical manifest/lock source association differs');
  IO.rejoin(snapshots.source); snapshots.cargo.verify();
  return {schema: 'router-physical-core-adoption-sequence-readback-v1', sourceFiles: snapshots.source.rows.length,
    cargoFiles: snapshots.cargo.rows.length, summary: reviewed.summary, completeSourceInverse: reviewed.completeSourceInverse,
    semanticAdmission: false, executableCoverageGain: null, applicationSourcesInstalled: false};
}
