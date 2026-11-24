"""Read and independently compare present index bytes; never create an index."""
import gzip
import hashlib
import json
import re


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def serialized_digest(value):
    # These path/hash/integer DATA rows contain no JS-specific number values.
    return digest((json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode())


def read_complete_indices(archive, by_name, prefix, capsule, plans, inputs, matrix_sha, entries, owned):
    if capsule['schema'] == 'unqualified-isolated-matrix-draft-v1':
        if 'indices' in capsule or 'completeIndexBytes' in capsule:
            raise RuntimeError('Legacy custody cannot claim computed index bytes')
        return {'indices': [], 'members': [], 'completeBytes': 0}
    if capsule['schema'] != 'unqualified-isolated-matrix-draft-v2':
        raise RuntimeError('Unknown complete matrix custody schema')
    paths = [f'profiles/matrix-{matrix_sha}.json']
    if owned:
        paths.append(f'profiles/owned-definitions-matrix-{matrix_sha}.json')
    rows = capsule['indices']
    if not isinstance(rows, list) or len(rows) != len(paths):
        raise RuntimeError('Every actual computed matrix index is required')
    profiles = inputs['matrix']['profiles']
    ordinary_profiles = []
    for plan, profile in zip(plans, profiles):
        outputs = [row for row in plan['outputs'] if not owned or not any(
            row['path'].startswith(root + '/') for root in plan['outputRoots'][6:])]
        ordinary_profiles.append({
            'name': profile['name'], 'profileSha256': profile['sha256'],
            'compilationProfile': profile['compilationProfile'], 'directory': profile['directory'],
            'inventory': profile['directory'] + '/parity/rust-source-inventory.json',
            'outputPlanSha256': serialized_digest(outputs), 'outputFiles': len(outputs),
            'expectedBytes': sum(row['bytes'] for row in outputs),
            **{key: plan['manifest'][key] for key in ['totals', 'functionCoverage', 'projects']},
            'runtimeParity': False})
    expected = [{
        'schema': 'independent-profile-bulk-inventory-v1', 'matrixSha256': matrix_sha,
        'requiredProfiles': inputs['matrix']['requiredProfiles'],
        'sourceSetSha256': inputs['corpus']['sourceSetSha256'],
        'sources': inputs['corpus']['sources'], 'cargo': inputs['corpus']['cargo'],
        'translatorImplementationSha256': serialized_digest(plans[0]['manifest']['implementationHashes']),
        'entries': entries, 'expectedBytes': sum(row['expectedBytes'] for row in ordinary_profiles),
        'limits': {'entries': 16, 'expectedBytes': 1073741824}, 'profiles': ordinary_profiles,
        'canonicalNeutralOutputsChanged': False, 'platformDomainComplete': False,
        'commonExecutableOutput': False, 'runtimeParity': False,
        'obligations': [
            {'kind': 'profile-domain-incomplete', 'message': 'Explicit profiles do not cover all Rust targets, Cargo features, build modes or residual platform families.'},
            {'kind': 'native-parity-unproved', 'message': 'Independent draft outputs preserve all refusals and do not establish complete native behavior.'},
            {'kind': 'common-executable-unproved', 'message': 'No merged output or profile-independent executable is emitted.'}]}]
    if owned:
        expected.append({'schema': 'materialized-owned-definitions-matrix-v1', 'matrixSha256': matrix_sha,
            'sourceSetSha256': inputs['corpus']['sourceSetSha256'], 'profiles': [{
                'name': profile['name'], 'profileSha256': profile['sha256'], 'directory': profile['directory'],
                'index': profile['directory'] + '/tools/translation/generated/owned-definitions/index.json',
                'outputs': [row for row in plan['outputs'] if any(
                    row['path'].startswith(root + '/') for root in plan['outputRoots'][6:])],
                'expectedBytes': plan['expectedBytes']} for plan, profile in zip(plans, profiles)],
            'runtimeParity': False, 'moduleStartupEquivalent': False})
    result, members, total = [], [], 0
    for at, (row, path, wanted) in enumerate(zip(rows, paths, expected), 1):
        if (not isinstance(row, dict) or set(row) != {'path', 'bytes', 'sha256', 'storedAs', 'storedBytes', 'storedSha256'}
                or row['path'] != path or row['storedAs'] != f'index-{at:02d}.json.gz'
                or type(row['bytes']) is not int or not 0 <= row['bytes'] <= 64 * 1024 * 1024
                or type(row['storedBytes']) is not int or not 0 <= row['storedBytes'] <= 128 * 1024 * 1024
                or not all(isinstance(row[key], str) and re.fullmatch('[a-f0-9]{64}', row[key])
                           for key in ['sha256', 'storedSha256'])):
            raise RuntimeError('Complete computed index member identity differs')
        name = prefix + row['storedAs']
        if name not in by_name or by_name[name].file_size != row['storedBytes']:
            raise RuntimeError('Actual computed index bytes are absent or have a wrong length')
        stored = archive.read(by_name[name])
        if digest(stored) != row['storedSha256']:
            raise RuntimeError('Complete stored index digest differs')
        with archive.open(by_name[name]) as source, gzip.GzipFile(fileobj=source) as stream:
            decoded = stream.read(64 * 1024 * 1024 + 1)
        if len(decoded) != row['bytes'] or len(decoded) > 64 * 1024 * 1024 or digest(decoded) != row['sha256']:
            raise RuntimeError('Complete decoded index bytes differ')
        actual = json.loads(decoded.decode('utf8'))
        # Python's ordinary equality equates False with 0 and True with 1.
        # Preserve JSON DATA types during this independent comparison.
        if json.dumps(actual, sort_keys=True, ensure_ascii=False, separators=(',', ':')) != json.dumps(wanted, sort_keys=True, ensure_ascii=False, separators=(',', ':')):
            raise RuntimeError('Actual computed matrix index differs from complete original plan DATA')
        total += len(decoded)
        result.append({**row, 'completeParsedIndex': wanted})
        members.append(name)
    if type(capsule['completeIndexBytes']) is not int or total != capsule['completeIndexBytes'] or total + capsule['completeBytes'] > 1024 * 1024 * 1024:
        raise RuntimeError('Complete computed index byte accounting differs')
    return {'indices': result, 'members': members, 'completeBytes': total}
