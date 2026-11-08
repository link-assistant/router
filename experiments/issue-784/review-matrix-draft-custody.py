#!/usr/bin/env python3
"""Read every complete CI matrix byte and join original physical input DATA.

This does not install outputs, reconstruct a missing matrix index, replay private
issuers, qualify semantics or turn a failed freshness check into a success.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--directory', required=True, type=Path)
parser.add_argument('--head', required=True)
parser.add_argument('--checked-head', required=True)
parser.add_argument('--base', required=True)
parser.add_argument('--checked-commit', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
if any(not re.fullmatch('[a-f0-9]{40}', value) for value in
       [args.head, args.checked_head, args.base]) or args.output.exists():
    raise RuntimeError('A complete published SHA and fresh report are required')


def git(*arguments):
    return subprocess.check_output(['git', *arguments], cwd=ROOT).decode().strip()


checked_commit_raw = args.checked_commit.read_bytes()
checked_commit = json.loads(checked_commit_raw)
if (checked_commit['sha'] != args.checked_head or
        [row['sha'] for row in checked_commit['parents']] != [args.base, args.head] or
        checked_commit['commit']['tree']['sha'] != git('rev-parse', args.head + '^{tree}')):
    raise RuntimeError('The checked merge must have the exact base/head parents and complete published tree')
subprocess.check_call(['git', 'merge-base', '--is-ancestor', args.base, args.head], cwd=ROOT)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def safe(name):
    if not isinstance(name, str) or len(name) > 4096 or any(c in name for c in ['\\', ':', '\0']):
        raise RuntimeError('Unsafe complete member path')
    path = PurePosixPath(name)
    if path.is_absolute() or path.as_posix() != name or any(c in ['', '.', '..'] for c in name.split('/')):
        raise RuntimeError('Unsafe complete member path')
    return name


def physical(name):
    cursor = ROOT
    for part in safe(name).split('/'):
        cursor /= part
        if cursor.is_symlink():
            raise RuntimeError('Physical source joins cannot follow links')
    if not cursor.is_file():
        raise RuntimeError('Complete original source is absent: ' + name)
    return cursor


def file_fact(path):
    with path.open('rb') as source:
        return {'bytes': path.stat().st_size, 'sha256': hashlib.file_digest(source, 'sha256').hexdigest()}


def current_inputs():
    raw = subprocess.check_output(['node', '--max-old-space-size=512',
                                   'experiments/issue-784/snapshot-matrix-draft-inputs.mjs'], cwd=ROOT)
    if len(raw) > 32 * 1024 * 1024:
        raise RuntimeError('Current input description exceeds its complete bound')
    value = json.loads(raw)
    base = ROOT / 'js/node_modules/typescript'
    types = []
    for path in sorted(base.rglob('*')):
        if path.is_symlink():
            raise RuntimeError('Installed TypeScript cannot follow links')
        if path.is_file():
            fact = file_fact(path)
            if fact['bytes'] > 32 * 1024 * 1024:
                raise RuntimeError('Installed TypeScript file bound differs')
            types.append({'path': path.relative_to(base).as_posix(), **fact})
    if len(types) > 512 or sum(row['bytes'] for row in types) > 64 * 1024 * 1024:
        raise RuntimeError('Installed TypeScript census bound differs')
    value['typescript'] = types
    return value


current = current_inputs()
runs = json.loads((args.directory / 'completed-head-runs.json').read_bytes())
if len(runs) != 7 or any(row['headSha'] != args.head or row['status'] != 'completed'
                        or any(job['status'] != 'completed' for job in row['jobs']) for row in runs):
    raise RuntimeError('Every published workflow and job must be terminal')
verification = json.loads((args.directory / 'completed-artifact-verification.json').read_bytes())
selected = [row for row in verification if row['metadata']['name'] in
            ['matrix-drafts-' + args.checked_head, 'matrix-owned-drafts-' + args.checked_head]]
if not selected:
    raise RuntimeError('No genuine completed matrix draft artifact is present')
report = {'schema': 'complete-matrix-custody-investigation-v1', 'headSha': args.head,
          'checkedHeadSha': args.checked_head, 'baseSha': args.base,
          'checkedCommitMetadataSha256': sha(checked_commit_raw),
          'artifacts': [], 'semanticAuthority': False, 'runtimeParity': False,
          'freshnessQualified': False, 'rustExecuted': False, 'outputsInstalled': False}
legacy_inputs = {}
for receipt in selected:
    path = args.directory / receipt['file']
    if file_fact(path)['sha256'] != receipt['sha256'] or receipt['metadata']['workflow_run']['head_sha'] != args.head or receipt['metadata']['digest'] != 'sha256:' + receipt['sha256']:
        raise RuntimeError('Complete artifact archive differs from collected receipt')
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 200001 or sum(row.file_size for row in entries) > 500_000_000:
            raise RuntimeError('Complete artifact exceeds the receiving bounds')
        by_name = {}
        for row in entries:
            safe(row.filename)
            mode = row.external_attr >> 16
            if row.is_dir() or stat.S_IFMT(mode) not in [0, stat.S_IFREG] or row.filename in by_name:
                raise RuntimeError('Only unique regular complete ZIP members are admitted')
            by_name[row.filename] = row
        manifests = [name for name in by_name if re.fullmatch(r'complete-[A-Za-z0-9]+/manifest.json', name)]
        if len(manifests) != 1:
            raise RuntimeError('One complete original matrix attempt is required')
        manifest_name = manifests[0]
        if by_name[manifest_name].file_size > 128 * 1024 * 1024:
            raise RuntimeError('Complete manifest bound differs')
        raw_manifest = archive.read(manifest_name)
        capsule = json.loads(raw_manifest)
        if capsule['schema'] != 'unqualified-isolated-matrix-draft-v1' or any(
                capsule[key] is not False for key in ['semanticAuthority', 'runtimeParity', 'rustExecuted']):
            raise RuntimeError('Unqualified original custody scope differs')
        inputs = capsule['inputs']
        if inputs['head'] != args.checked_head or any(inputs[key] != current[key] for key in
                ['tracked', 'compiler', 'profiles', 'typescript', 'corpus', 'matrix']):
            raise RuntimeError('Complete current original input vector differs')
        owned = receipt['metadata']['name'].startswith('matrix-owned-drafts-')
        planner = 'retained-owned-definitions-bulk.mjs' if owned else 'bulk.mjs'
        if inputs['plannerModule'] != planner:
            raise RuntimeError('Original mandatory command planner differs')
        plans, members = capsule['plans'], capsule['members']
        profiles = current['matrix']['profiles']
        if len(plans) != len(profiles) or len(members) > 200000:
            raise RuntimeError('Complete original profile selection differs')
        outputs = [row for plan in plans for row in plan['outputs']]
        if len(outputs) != len(members) or len({row['path'] for row in outputs}) != len(outputs):
            raise RuntimeError('Complete output row census differs')
        originals = {row['path']: row['sha256'] for key in ['compiler', 'profiles'] for row in current[key]}
        implementation = plans[0]['manifest']['implementationHashes']
        for plan, profile in zip(plans, profiles):
            inventory = plan['manifest']
            if plan['schema'] != 'checked-bulk-output-plan-v1' or plan['outputPrefix'] != profile['directory'] or inventory['compilationProfile'] != profile['compilationProfile']:
                raise RuntimeError('Complete profile identity differs')
            expected_corpus = {key: inputs['corpus'][key] for key in
                               ['schema', 'sourceSetSha256', 'sources', 'cargo', 'totalSourceBytes']}
            if inventory['originalSourceCorpus'] != expected_corpus:
                raise RuntimeError('Complete original Rust/Cargo census differs')
            expected_matrix = {'sha256': current['matrixSha256'], 'profile': profile['name'],
                               'profileSha256': profile['sha256'], 'requiredProfiles': current['matrix']['requiredProfiles'],
                               'selectedProfiles': [{key: item[key] for key in ['name', 'sha256']} for item in profiles],
                               'platformDomainComplete': False, 'commonExecutableOutput': False, 'runtimeParity': False}
            if inventory['explicitCompilationMatrix'] != expected_matrix or inventory['runtimeParity'] is not False:
                raise RuntimeError('Complete original explicit matrix scope differs')
            hashes = inventory['implementationHashes']
            if hashes != implementation or any(hashes.get(name) != value for name, value in originals.items()):
                raise RuntimeError('Complete current compiler/profile fingerprint differs')
            roots = plan['outputRoots']
            original_roots = ['tools/translation/meta', 'js/generated/rust-draft', 'ts/generated/rust-draft',
                              'tools/translation/projects', 'js/generated/rust-project', 'ts/generated/rust-project']
            if owned:
                original_roots += ['tools/translation/generated/owned-definitions', 'js/generated/rust-owned-definitions', 'ts/generated/rust-owned-definitions']
            if roots != [profile['directory'] + '/' + name for name in original_roots]:
                raise RuntimeError('A complete output root escapes its original profile')
            for row in plan['outputs']:
                safe(row['path'])
                if type(row['bytes']) is not int or not 0 <= row['bytes'] <= 64 * 1024 * 1024 or not re.fullmatch('[a-f0-9]{64}', row['sha256']):
                    raise RuntimeError('Complete original output byte/hash bound differs')
                if row['path'] != profile['directory'] + '/parity/rust-source-inventory.json' and not any(row['path'].startswith(root + '/') for root in roots):
                    raise RuntimeError('Complete output path escapes its original roots')
            if sum(row['bytes'] for row in plan['outputs']) != plan['expectedBytes']:
                raise RuntimeError('Complete original output byte accounting differs')
        for name, expected in implementation.items():
            if name not in originals:
                actual = file_fact(physical(name))
                if actual['sha256'] != expected or name in legacy_inputs and legacy_inputs[name] != actual:
                    raise RuntimeError('Original implementation bytes differ: ' + name)
                legacy_inputs[name] = actual
        prefix = manifest_name.rsplit('/', 1)[0] + '/'
        expected_names = {manifest_name}
        complete_bytes = 0
        for index, (output, member) in enumerate(zip(outputs, members), 1):
            if any(member.get(key) != value for key, value in output.items()) or member['storedAs'] != f'{index:06d}.gz':
                raise RuntimeError('Complete original member order/row differs')
            name = prefix + member['storedAs']
            expected_names.add(name)
            row = by_name[name]
            if row.file_size != member['storedBytes'] or row.file_size > 128 * 1024 * 1024:
                raise RuntimeError('Complete stored member length differs')
            stored = archive.read(row)
            if sha(stored) != member['storedSha256']:
                raise RuntimeError('Complete stored member bytes differ')
            digest, length = hashlib.sha256(), 0
            inventory_plan = next((plan for plan in plans if output['path'] == plan['outputPrefix'] + '/parity/rust-source-inventory.json'), None)
            inventory_bytes = bytearray() if inventory_plan else None
            with archive.open(row) as original, gzip.GzipFile(fileobj=original) as decoded:
                while block := decoded.read(1024 * 1024):
                    length += len(block)
                    if length > 64 * 1024 * 1024:
                        raise RuntimeError('Original complete decoded member byte bound differs')
                    digest.update(block)
                    if inventory_bytes is not None:
                        inventory_bytes.extend(block)
            complete_bytes += length
            if length != output['bytes'] or digest.hexdigest() != output['sha256'] or complete_bytes > 1024 * 1024 * 1024:
                raise RuntimeError('Complete decoded original output bytes differ')
            if inventory_bytes is not None and json.loads(inventory_bytes) != inventory_plan['manifest']:
                raise RuntimeError('Complete decoded original inventory and plan differ')
        if set(by_name) != expected_names or complete_bytes != capsule['completeBytes']:
            raise RuntimeError('Complete original artifact/member accounting differs')
        report['artifacts'].append({'file': path.name, 'sha256': receipt['sha256'],
            'manifestSha256': sha(raw_manifest), 'completeOutputs': len(outputs),
            'completeOutputBytes': complete_bytes, 'compilerInputs': len(inputs['compiler']),
            'profileInputs': len(inputs['profiles']), 'rustSources': len(inputs['tracked']),
            'profiles': [{'name': member['name'], 'totals': plan['manifest']['totals'],
                          'functionCoverage': plan['manifest']['functionCoverage']} for member, plan in zip(profiles, plans)]})
if current_inputs() != current:
    raise RuntimeError('Complete original inputs changed during byte inspection')
if any(file_fact(physical(name)) != value for name, value in legacy_inputs.items()):
    raise RuntimeError('Complete legacy implementation inputs changed during byte inspection')
raw = json.dumps(report).encode()
with args.output.open('xb') as target:
    target.write(gzip.compress(raw))
if gzip.decompress(args.output.read_bytes()) != raw:
    raise RuntimeError('Complete report readback differs')
print(json.dumps({'artifacts': len(report['artifacts']), 'completeOutputs': sum(row['completeOutputs'] for row in report['artifacts']), 'outputsInstalled': False, 'freshnessQualified': False, 'semanticAuthority': False}))
