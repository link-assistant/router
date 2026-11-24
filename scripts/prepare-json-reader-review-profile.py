#!/usr/bin/env python3
"""Propose the source-derived JSON reader review pin; never install source."""
import argparse
import ast
import base64
import copy
import gzip
import hashlib
import io
import json
from pathlib import Path
import sys
import tokenize


def require(value, message):
    if not value:
        raise ValueError('JSON reader review profile preparation: ' + message)


def sha(value):
    return hashlib.sha256(value).hexdigest()


def replace_once(source, before, after):
    require(source.count(before) == 1, 'one complete source anchor required')
    return source.replace(before, after)


def python_concrete_meta(source):
    """Lossless tokenize CST extension; it grants no Python/Rust authority."""
    raw = source.encode('utf-8')
    require(len(raw) <= 8_388_608 and len(source.encode('utf-16-le')) // 2 <= 2_097_152,
            'complete source byte and UTF16 bounds')
    lines = io.StringIO(source).readlines()
    starts, size = [], 0
    for line in lines:
        starts.append(size)
        size += len(line.encode('utf-8'))
    require(size == len(raw), 'complete native line census')

    def offset(position):
        row, column = position
        if row > len(lines):
            return len(raw)
        require(row >= 1 and column >= 0, 'native token position')
        return starts[row - 1] + len(lines[row - 1][:column].encode('utf-8'))

    tokens, leaves, at = [], [], 0
    for token in tokenize.generate_tokens(io.StringIO(source).readline):
        require(len(tokens) < 200_000, 'complete native token bound')
        start, end = offset(token.start), offset(token.end)
        require(0 <= start <= end <= len(raw), 'complete native token span')
        tokens.append({'kind': tokenize.tok_name[token.type], 'text': token.string,
                       'start': token.start, 'end': token.end, 'spanUTF8': [start, end]})
        if start > at:
            leaves.append({'kind': 'trivia', 'spanUTF8': [at, start],
                           'source': raw[at:start].decode('utf-8')})
            at = start
        if end > start:
            require(start == at, 'nonoverlapping native tokens')
            leaves.append({'kind': 'token', 'token': len(tokens) - 1,
                           'spanUTF8': [start, end], 'source': raw[start:end].decode('utf-8')})
            at = end
    if at < len(raw):
        leaves.append({'kind': 'trivia', 'spanUTF8': [at, len(raw)],
                       'source': raw[at:].decode('utf-8')})
    meta = {'extension': 'python-tokenize-cst-v1', 'language': 'Python',
            'source': source, 'bytes': len(raw), 'sha256': sha(raw),
            'tokens': tokens, 'leaves': leaves, 'semanticAuthority': False}
    wire = json.dumps(meta, ensure_ascii=False)
    require(len(wire.encode('utf-16-le')) // 2 <= 33_554_432, 'complete CST wire bound')
    restored = json.loads(wire)
    require(''.join(leaf['source'] for leaf in restored['leaves']) == source,
            'complete serialized/reparsed Python CST')
    return restored


def run_rule_sequences(value, sequences):
    require([phase for phase, _ in sequences] == ['language', 'repository'],
            'ordered language and repository rule sequences required')
    seen, trace = set(), []
    for phase, rules in sequences:
        for name, apply in rules:
            require(isinstance(name, str) and 0 < len(name) <= 160 and name not in seen
                    and callable(apply), 'unique stable source rule required')
            seen.add(name)
            value = apply(value)
            require(type(value) is dict, 'source rules must return ordinary data records')
            trace.append({'phase': phase, 'id': name})
    return value, trace


def language_python_pin(value):
    source, path = value['_source'], value['_path']
    before_sha, after_sha = value['_before_sha'], sha(value['_actual_profile'])
    before_meta = python_concrete_meta(source)
    source = ''.join(leaf['source'] for leaf in before_meta['leaves'])
    tree = ast.parse(source)
    matches = []
    for node in ast.walk(tree):
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                and node.func.id == 'require' and len(node.args) == 2
                and isinstance(node.args[1], ast.Constant)
                and node.args[1].value == 'exact registered JSON source profile'):
            condition = node.args[0]
            require(isinstance(condition, ast.Compare) and len(condition.ops) == 1
                    and isinstance(condition.ops[0], ast.Eq) and len(condition.comparators) == 1
                    and ast.dump(condition.left) == ast.dump(ast.parse('sha(profile_raw)', mode='eval').body),
                    'exact native profile comparison')
            matches.append(condition.comparators[0])
    require(len(matches) == 1, 'one actual reviewer pin')
    literal = matches[0]
    require(isinstance(literal, ast.Constant) and literal.value in [before_sha, after_sha],
            'registered original or derived current pin required')
    before_literal = ast.get_source_segment(source, literal)
    after_literal = repr(after_sha)
    text = replace_once(source, before_literal, after_literal)
    after_meta = python_concrete_meta(text)
    text = ''.join(leaf['source'] for leaf in after_meta['leaves'])
    changed = copy.deepcopy(tree)
    selected = [node for node in ast.walk(changed) if isinstance(node, ast.Constant)
                and node.lineno == literal.lineno and node.col_offset == literal.col_offset]
    require(len(selected) == 1, 'one complete native literal span')
    selected[0].value = after_sha
    require(ast.dump(changed) == ast.dump(ast.parse(text)), 'every other Python AST field unchanged')
    require(replace_once(text, after_literal, before_literal) == source, 'complete source inverse')
    return {**value, 'path': path, 'source': source, 'text': text,
            'sourceSha256': sha(source.encode()), 'sha256': sha(text.encode()),
            'language': {'rule': 'python:native-single-literal-and-lossless-CST',
                         'beforeMeta': before_meta, 'afterMeta': after_meta},
            'repository': {'rule': 'router:complete-Cargo-layout-profile-pin',
                           'beforeLiteral': before_literal, 'afterLiteral': after_literal},
            'nativePython': sys.version, 'inverse': source,
            'semanticAuthority': False, 'RustExecuted': False}


def repository_profile_equation(value):
    root = value['_root']
    archive = root / 'tools/translation/source-profiles/cargo-layout-before/inputs.json.gz'
    packed = archive.read_bytes()
    require(sha(packed) == '1d0713d968e969a06efccf1e0b4a9581ad8d30224fca7c3723ec3e7a86c24eff',
            'complete original layout archive changed')
    history = json.loads(gzip.decompress(packed))
    profile_path = 'tools/translation/source-profiles/json-macro/manifest.json'
    before_profile = base64.b64decode(history['profiles'][profile_path], validate=True)
    before_sha = '101f9e042d3c4665f531017082115d209a390940732532cef1b08a1420f8cfab'
    require(sha(before_profile) == before_sha, 'complete original JSON profile')
    before_cargo = base64.b64decode(history['manifest'], validate=True).decode('utf-8')
    require(sha(before_cargo.encode()) == json.loads(before_profile)['manifestSha256'],
            'full original Cargo/profile join')
    start = before_cargo.index('[profile.release]')
    end = before_cargo.index('[package.metadata.cargo-semver-checks.lints]')
    require(end > start, 'complete original workspace profile section')
    removed = before_cargo[start:end]
    after_cargo = replace_once(before_cargo[:start] + before_cargo[end:],
                               'readme = "README.md"', 'readme = "../README.md"')
    cargo_path = root / 'rust/Cargo.toml'
    require(cargo_path.read_bytes() == after_cargo.encode(), 'complete actual package Cargo equation')
    restored = replace_once(after_cargo, 'readme = "../README.md"', 'readme = "README.md"')
    require(restored[:start] + removed + restored[start:] == before_cargo, 'complete Cargo inverse')
    expected = replace_once(before_profile,
                            ('"manifestSha256": "' + sha(before_cargo.encode()) + '"').encode(),
                            ('"manifestSha256": "' + sha(after_cargo.encode()) + '"').encode())
    actual_profile = (root / profile_path).read_bytes()
    require(expected == actual_profile, 'complete current JSON profile equation')
    after_sha = sha(actual_profile)
    require(actual_profile == value['_actual_profile'], 'current profile changed during language rules')
    require((root / value['path']).read_text() == value['source'], 'complete source changed during rules')
    return {**value, 'profileBefore': before_profile.decode(), 'profileAfter': actual_profile.decode(),
            'profileBeforeSha256': before_sha, 'profileAfterSha256': after_sha,
            'cargoBefore': before_cargo, 'cargoAfter': after_cargo}


def prepare(root):
    path = 'tools/translation/core_adoption_json_readers_review.py'
    profile_path = 'tools/translation/source-profiles/json-macro/manifest.json'
    value, trace = run_rule_sequences({
        '_root': root, '_path': path, '_source': (root / path).read_text(),
        '_actual_profile': (root / profile_path).read_bytes(),
        '_before_sha': '101f9e042d3c4665f531017082115d209a390940732532cef1b08a1420f8cfab',
    }, [
        ('language', [('python:native-single-literal-and-lossless-CST', language_python_pin)]),
        ('repository', [('router:complete-Cargo-layout-profile-pin', repository_profile_equation)]),
    ])
    return {**{key: item for key, item in value.items() if not key.startswith('_')}, 'trace': trace}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--check', action='store_true')
    modes.add_argument('--emit', type=Path)
    args = parser.parse_args()
    proposal = prepare(args.root.resolve())
    if args.check:
        require(proposal['source'] == proposal['text'], 'actual reviewer pin is stale')
        print(json.dumps({'fresh': True, 'profileSha256': proposal['profileAfterSha256'], 'RustExecuted': False}))
    else:
        output = args.emit.resolve()
        root = args.root.resolve()
        require(output != root and root not in output.parents and output not in root.parents,
                'fresh outside proposal directory required')
        output.mkdir(exist_ok=False)
        raw = (json.dumps(proposal, ensure_ascii=False) + '\n').encode()
        target = output / 'complete-source-proposal.json.gz'
        target.write_bytes(gzip.compress(raw, mtime=0))
        require(gzip.decompress(target.read_bytes()) == raw, 'complete proposal readback')
        print(json.dumps({'proposal': str(target), 'profileSha256': proposal['profileAfterSha256'],
                          'installed': False, 'qualified': False, 'RustExecuted': False}))


if __name__ == '__main__':
    main()
