#!/usr/bin/env python3
"""Read-only complete proposal review. No Rust/JS execution or installation.

This checks the emitted data against pinned inputs and source partitions. It
does not reissue private compiler proofs or establish Rust semantic authority.
Run only after the producer is terminal and before its source HEAD changes.
"""
from pathlib import Path, PurePosixPath
import argparse, gzip, hashlib, io, json, math, os, re, stat, subprocess, tarfile

def require(value, message):
    if not value:
        raise RuntimeError('json-readers gzip review refused: ' + message)

def fields(value, names, label):
    require(isinstance(value, dict) and set(value) == set(names), label + ': unknown fields/shape')

def pairs(rows):
    result = {}
    for key, value in rows:
        require(key not in result, 'duplicate JSON key ' + repr(key))
        result[key] = value
    return result

def parse(raw):
    return json.loads(raw, object_pairs_hook=pairs,
                      parse_constant=lambda value: require(False, 'nonfinite JSON ' + value))

def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf8')

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def digest(value):
    require(isinstance(value, str) and len(value) == 64 and
            all(c in '0123456789abcdef' for c in value), 'digest syntax')

def relative(value):
    require(isinstance(value, str) and value and len(value) <= 4096 and
            '\\' not in value and ':' not in value and
            not any(ord(c) < 32 for c in value), 'relative path spelling')
    path = PurePosixPath(value)
    require(not path.is_absolute() and str(path) == value and
            all(part not in ['', '.', '..'] for part in value.split('/')), 'relative path normalization')
    return value

def regular(root, name):
    relative(name)
    current = root
    for part in PurePosixPath(name).parts:
        current = current / part
        require(not current.is_symlink(), 'linked path ' + str(current))
    require(current.is_file(), 'missing regular file ' + str(current))
    return current

def identity(path):
    value = path.lstat()
    return value.st_dev, value.st_ino, value.st_mode, value.st_size, value.st_mtime_ns, value.st_ctime_ns

def read_stable(path, maximum):
    before = identity(path)
    require(stat.S_ISREG(before[2]) and before[3] <= maximum, 'bounded regular file ' + str(path))
    raw = path.read_bytes()
    require(before == identity(path) and len(raw) == before[3], 'file changed ' + str(path))
    return raw

def check_identity(path, expected):
    fields(expected,['dev','ino','mode','size','mtimeMs','ctimeMs'],'complete source identity')
    value=path.lstat()
    require([value.st_dev,value.st_ino,value.st_mode,value.st_size]==[expected[k] for k in ['dev','ino','mode','size']],'snapshot device/inode/mode/size')
    for name,ns,seconds in [('mtimeMs',value.st_mtime_ns,value.st_mtime),('ctimeMs',value.st_ctime_ns,value.st_ctime)]:
        actual=expected[name]
        require(type(actual) in [int,float] and math.isfinite(actual) and actual in [ns/1000000,(ns//1000000000)*1000+(ns%1000000000)/1000000,seconds*1000],'snapshot exact native millisecond mapping '+name)


def u16(source):
    return source.encode('utf-16-le', 'surrogatepass')

def span(value, maximum):
    if isinstance(value, dict):
        fields(value, ['start', 'end'], 'source span')
        value = [value['start'], value['end']]
    require(isinstance(value, list) and len(value) == 2 and
            all(type(n) is int for n in value) and 0 <= value[0] <= value[1] <= maximum, 'source span bounds')
    return value

def part(source, value, units=None):
    units = u16(source) if units is None else units
    a, b = span(value, len(units) // 2)
    return units[a * 2:b * 2].decode('utf-16-le', 'surrogatepass')

def trace(value, expected):
    require(value == [{'phase': 'language', 'id': expected[0]},
                      {'phase': 'repository', 'id': expected[1]}], 'actual fixed rule trace differs')

def check_cst(doc, source):
    require(list(doc) == ['schema', 'representationLevel', 'language', 'source', 'sourceEncoding',
                          'status', 'nodes', 'diagnostics', 'authority'], 'CST complete field order/shape')
    require(doc['schema'] == 'meta-language-concrete-syntax-v1' and
            doc['representationLevel'] == 'concrete-syntax' and doc['language'] == 'Rust' and
            doc['source'] == source, 'CST source/schema/language')
    fields(doc['authority'], ['type', 'owner', 'executable'], 'CST authority')
    require(all(v is False for v in doc['authority'].values()), 'CST authority differs')
    units, raw = u16(source), source.encode('utf8')
    require(len(units) // 2 <= 2097152 and len(raw) <= 8388608, 'original CST source limits')
    boundaries = {0: 0}
    at = byte = 0
    for char in source:
        at += 2 if ord(char) > 65535 else 1
        byte += len(char.encode('utf8'))
        boundaries[at] = byte
    require(doc['sourceEncoding'] == {'utf16CodeUnits': at, 'utf8Bytes': len(raw),
            'wellFormedUnicode': True, 'utf8BytePreservation': True,
            'utf8Mapping': 'unicode-scalar-boundaries'}, 'complete CST encoding')
    require(doc['sourceEncoding']['wellFormedUnicode'] is True and doc['sourceEncoding']['utf8BytePreservation'] is True and type(doc['sourceEncoding']['utf16CodeUnits']) is int and type(doc['sourceEncoding']['utf8Bytes']) is int, 'CST strict encoding primitives')
    nodes = doc['nodes']
    require(isinstance(nodes, list) and 1 <= len(nodes) <= 200000 and
            nodes[0] == ['root', 'file', 0, at, 0, len(raw), -1], 'CST root/nodes')
    children = [[] for _ in nodes]
    leaves, depths = [], [0]
    for index, row in enumerate(nodes):
        require(isinstance(row, list) and len(row) == 7 and
                isinstance(row[1], str) and len(row[1]) <= 40 and
                all(type(n) is int for n in row[2:]), 'CST node complete shape')
        kind, role, a, z, b, e, parent = row
        require(kind in ['root', 'group', 'token', 'trivia', 'opaque', 'error'] and
                0 <= a <= z <= at and a in boundaries and z in boundaries and
                [b, e] == [boundaries[a], boundaries[z]], 'CST UTF16/UTF8 coordinates')
        if index:
            require(kind != 'root' and 0 <= parent < index and nodes[parent][0] in ['root', 'group'], 'CST parent')
            owner = nodes[parent]
            require(owner[2] <= a <= z <= owner[3] and owner[4] <= b <= e <= owner[5], 'CST containment')
            children[parent].append(index)
            depths.append(depths[parent] + 1)
            require(depths[-1] <= 256, 'original CST group depth')
        if kind not in ['root', 'group']:
            require(z > a, 'CST empty leaf')
            leaves.append(row)
    # Every immediate child partition covers its entire root/group, including
    # delimiters. This also checks nonoverlap and preorder sibling ordering.
    delimiters = {'brace': ('{', '}'), 'paren': ('(', ')'), 'bracket': ('[', ']')}
    for index, row in enumerate(nodes):
        if row[0] not in ['root', 'group']:
            require(not children[index], 'leaf has children')
            continue
        old, current = row[2], row[4]
        for child in children[index]:
            node = nodes[child]
            require([node[2], node[4]] == [old, current], 'CST direct-child partition gap/overlap')
            old, current = node[3], node[5]
        require([old, current] == [row[3], row[5]], 'CST complete group/root partition endpoint')
        if row[0] == 'group':
            require(row[1] in delimiters and len(children[index]) >= 2, 'unknown CST group role')
            first, last = nodes[children[index][0]], nodes[children[index][-1]]
            require(first[:2] == last[:2] == ['token', 'delimiter'] and
                    part(source, first[2:4], units) == delimiters[row[1]][0] and
                    part(source, last[2:4], units) == delimiters[row[1]][1], 'group delimiter leaves')
    cursor = byte_cursor = 0
    reconstructed, reconstructed_utf8 = [], []
    for row in leaves:
        require([row[2], row[4]] == [cursor, byte_cursor], 'CST complete leaf partition')
        piece = units[row[2] * 2:row[3] * 2]
        piece8 = raw[row[4]:row[5]]
        require(piece.decode('utf-16-le').encode('utf8') == piece8, 'full leaf UTF16/UTF8 bytes')
        reconstructed.append(piece)
        reconstructed_utf8.append(piece8)
        cursor, byte_cursor = row[3], row[5]
    require(cursor == at and byte_cursor == len(raw) and b''.join(reconstructed) == units and
            b''.join(reconstructed_utf8) == raw, 'complete CST reconstruction')
    require(doc['status'] in ['lexical', 'opaque', 'error'], 'unknown CST status')
    if doc['status'] == 'lexical':
        require(doc['diagnostics'] == [] and all(row[0] in ['root', 'group', 'token', 'trivia'] for row in nodes), 'lexical CST status differs')
    else:
        require(nodes == ([nodes[0], [doc['status'], 'whole-source', 0, at, 0, len(raw), 0]] if source else [nodes[0]]), 'opaque/error full-source shape')
        require(len(doc['diagnostics']) == 1, 'opaque/error diagnostics')
    for diagnostic in doc['diagnostics']:
        require(isinstance(diagnostic, list) and len(diagnostic) == 3 and isinstance(diagnostic[0], str), 'CST diagnostic shape')
        require(diagnostic[0] in ['lexer-refused','node-budget','slash-context','delimiter-depth','delimiter-mismatch','delimiter-unclosed','provider-partition','unclassified-source','split-surrogate','provider-boundary'],'unknown CST diagnostic reason')
        span(diagnostic[1:], at)
    return doc

def proposal(row, source, expected_trace):
    require(row.get('executableAdmission') is False and isinstance(row.get('edits'), list) and
            isinstance(row.get('mapping'), list) and isinstance(row.get('selections'), list), 'proposal explicit source-only shape')
    documents = {}
    for key in ['before', 'after']:
        obj = row[key]
        fields(obj, ['source', 'sha256', 'meta'], 'proposal ' + key)
        require(isinstance(obj['source'], str) and sha(obj['source'].encode('utf8')) == obj['sha256'], 'proposal source hash')
        doc = parse(obj['meta'])
        require(encoded(doc).decode('utf8') == obj['meta'], 'CST canonical text/key order')
        documents[key] = check_cst(doc, obj['source'])
    before, after = row['before']['source'], row['after']['source']
    before_units, after_units = u16(before), u16(after)
    require(before == source, 'per-file proposal complete before source')
    old = new = 0
    replacements, pieces, after_pieces = [], [], []
    for item in row['mapping']:
        kind = item.get('kind')
        fields(item, ['kind', 'before', 'after'] + (['expected', 'replacement'] if kind == 'substitution' else []), 'mapping')
        require(kind in ['unchanged', 'substitution'], 'unknown mapping kind')
        a, b = span(item['before'], len(before_units) // 2), span(item['after'], len(after_units) // 2)
        require(a[0] == old and b[0] == new, 'mapping full partition gap/overlap')
        x, y = part(before, a, before_units), part(after, b, after_units)
        if kind == 'unchanged':
            require(x == y, 'mapping unchanged bytes')
        else:
            require(x == item['expected'] and y == item['replacement'], 'mapping exact substitution')
            replacements.append({'span': a, 'expected': x, 'replacement': y})
        pieces.append(x)
        after_pieces.append(y)
        old, new = a[1], b[1]
    require(old == len(before_units) // 2 and new == len(after_units) // 2 and
            ''.join(pieces) == before and ''.join(after_pieces) == after, 'complete forward source/mapping')
    require(len(replacements) == len(row['edits']), 'edit/mapping count differs')
    for actual, expected in zip(row['edits'], replacements):
        require(actual.get('span') == expected['span'] and actual.get('expected') == expected['expected'] and
                actual.get('replacement') == expected['replacement'], 'full edit correspondence')
    inverse = after_units
    for item in reversed(row['mapping']):
        if item['kind'] == 'substitution':
            a, b = item['after']
            require(inverse[a * 2:b * 2] == u16(item['replacement']), 'inverse selector bytes')
            inverse = inverse[:a * 2] + u16(item['expected']) + inverse[b * 2:]
    require(inverse == before_units, 'complete source inverse')
    # CST substitution traces retain rules and source spans, whereas outer
    # orchestration traces retain one id per phase. Check the actual two schemas.
    expected = [
        {'phase':'language','rules':[{'id':expected_trace[0], 'edits':[],
          'beforeCodeUnits':len(before_units)//2,'afterCodeUnits':len(before_units)//2}]},
        {'phase':'repository','rules':[{'id':expected_trace[1],
          'edits':[edit['span'] for edit in row['edits']],
          'beforeCodeUnits':len(before_units)//2,'afterCodeUnits':len(after_units)//2}]},
    ]
    require(row['trace']==expected, 'actual complete CST rule trace and spans differ')
    return before, after, len(replacements), documents['before']

class GzipTransport:
    """Fresh storage integrity only; no decoded cache/private source authority."""
    def __init__(self, root, index, index_raw):
        self.root,self.index_raw=root,index_raw
        self.index_state=identity(regular(root,'index.json'))
        self.sidecar_raw=read_stable(regular(root,'packet-storage.json'),64*1024*1024)
        self.sidecar_state=identity(regular(root,'packet-storage.json'))
        manifest=parse(self.sidecar_raw.decode('utf8','strict'))
        require(encoded(index)+b'\n'==index_raw and encoded(manifest)+b'\n'==self.sidecar_raw,'canonical complete control JSON, exact duplicate-free ordered fields')
        fields(manifest,['schema','complete','encoding','index','packets'],'complete gzip transport manifest')
        require(manifest['schema']=='router-core-adoption-gzip-storage-v1' and manifest['complete'] is True and manifest['encoding']=='gzip','successful fixed gzip storage')
        require(manifest['index']=={'path':'index.json','bytes':len(index_raw),'sha256':sha(index_raw)},'full logical index bytes/digest association')
        require(isinstance(manifest['packets'],list) and len(manifest['packets'])==len(index['packets'])<=20000,'full transport ordered packet census')
        self.rows={};stored=len(index_raw)+len(self.sidecar_raw);raw=0
        for logical,item in zip(index['packets'],manifest['packets']):
            fields(logical,['path','kind','bytes','sha256'],'logical transport row')
            fields(item,['path','kind','rawBytes','rawSha256','file','bytes','sha256'],'stored transport row')
            name=relative(logical['path']);physical=relative(item['file'])
            require(name not in self.rows and physical==name+'.gz' and name not in ['index.json','packet-storage.json','failure.json'],'unique nonreserved gzip association')
            require(item['path']==name and item['kind']==logical['kind'] and item['rawBytes']==logical['bytes'] and item['rawSha256']==logical['sha256'],'complete logical/stored association')
            require(type(item['bytes']) is int and 0<=item['bytes']<=384*1024*1024 and type(logical['bytes']) is int and 0<=logical['bytes']<=64*1024*1024,'original packet/stored bounds')
            digest(item['sha256']);digest(item['rawSha256'])
            self.rows[name]=dict(item);raw+=item['rawBytes'];stored+=item['bytes']
        require(raw==index['packetBytes'] and raw+len(index_raw)+len(self.sidecar_raw)<=1024*1024*1024-16384,'original logical aggregate includes complete sidecar')
        require(stored<=384*1024*1024-16384,'stored physical file aggregate/failure reserve')
        self.stored_bytes=stored;self.raw_bytes=raw;self.root_state=identity(root)
        self.initial_inventory=self.inventory()
    def path(self,row):
        require(isinstance(row,dict) and row.get('path') in self.rows,'registered logical descriptor')
        stored=self.rows[row['path']]
        require(row=={'path':stored['path'],'kind':stored['kind'],'bytes':stored['rawBytes'],'sha256':stored['rawSha256']},'exact descriptor including kind/full bytes')
        return regular(self.root,stored['file'])
    def controls(self):
        require(identity(self.root)==self.root_state and identity(regular(self.root,'index.json'))==self.index_state and identity(regular(self.root,'packet-storage.json'))==self.sidecar_state,'current physical root/index/sidecar identity')
    def inventory(self):
        expected={item['file']:item['bytes']for item in self.rows.values()};expected.update({'index.json':len(self.index_raw),'packet-storage.json':len(self.sidecar_raw)})
        required={''}
        for name in expected:
            parent=PurePosixPath(name).parent
            while str(parent)!='.':required.add(str(parent));parent=parent.parent
        actual={};directories={};count=total=0
        def visit(path,name):
            nonlocal count,total
            count+=1;require(count<=40003,'physical full storage census bound including root')
            before=identity(path);require(not path.is_symlink(),'linked stored path')
            if stat.S_ISDIR(before[2]):
                directories[name]=before
                for child in sorted(path.iterdir()):visit(child,(name+'/'if name else '')+child.name)
            else:
                require(stat.S_ISREG(before[2])and name in expected and name not in actual,'regular complete storage inventory/no extras')
                require(before[3]==expected[name],'physical stored byte size')
                actual[name]=before;total+=before[3]
            require(before==identity(path),'physical storage census identity changed')
        visit(self.root,'')
        require(set(actual)==set(expected) and set(directories)==required and total==self.stored_bytes,'full physical files/directories/bytes census')
        return {'files':actual,'directories':directories}
    def read(self,row):
        self.controls();path=self.path(row);stored=self.rows[row['path']];expected=self.initial_inventory['files'][stored['file']]
        require(identity(path)==expected,'stored packet original identity')
        packed=read_stable(path,384*1024*1024)
        require(len(packed)==stored['bytes'] and sha(packed)==stored['sha256'],'full stored gzip bytes/hash')
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(packed)) as stream:
                raw=stream.read(row['bytes']+1)
                require(len(raw)==row['bytes'] and not stream.read(1),'full decoded packet bound/EOF')
        except (OSError,EOFError) as error:
            require(False,'gzip framing/CRC/ISIZE refused: '+str(error))
        require(len(raw)==row['bytes'] and sha(raw)==row['sha256'],'full decoded raw length/hash')
        raw.decode('utf8','strict');self.controls();return raw
    def finish(self):
        self.controls();require(self.inventory()==self.initial_inventory,'final complete physical inventory identities')
        require(read_stable(regular(self.root,'index.json'),64*1024*1024)==self.index_raw and read_stable(regular(self.root,'packet-storage.json'),64*1024*1024)==self.sidecar_raw,'final full control bytes')
        self.controls()


def reader_mapping(row, source):
    documents = {}
    for key in ['before', 'after']:
        obj = row[key]
        fields(obj, ['source', 'sha256', 'meta'], 'proposal ' + key)
        require(isinstance(obj['source'], str) and sha(obj['source'].encode('utf8')) == obj['sha256'], 'proposal source hash')
        doc = parse(obj['meta'])
        require(encoded(doc).decode('utf8') == obj['meta'], 'CST canonical text/key order')
        documents[key] = check_cst(doc, obj['source'])
    before, after = row['before']['source'], row['after']['source']
    before_units, after_units = u16(before), u16(after)
    require(before == source, 'per-file proposal complete before source')
    old = new = 0
    replacements, pieces, after_pieces = [], [], []
    for item in row['mapping']:
        kind = item.get('kind')
        fields(item, ['kind', 'before', 'after'] + (['expected', 'replacement'] if kind == 'substitution' else []), 'mapping')
        require(kind in ['unchanged', 'substitution'], 'unknown mapping kind')
        a, b = span(item['before'], len(before_units) // 2), span(item['after'], len(after_units) // 2)
        require(a[0] == old and b[0] == new, 'mapping full partition gap/overlap')
        x, y = part(before, a, before_units), part(after, b, after_units)
        if kind == 'unchanged':
            require(x == y, 'mapping unchanged bytes')
        else:
            require(x == item['expected'] and y == item['replacement'], 'mapping exact substitution')
            replacements.append({'span': a, 'expected': x, 'replacement': y})
        pieces.append(x)
        after_pieces.append(y)
        old, new = a[1], b[1]
    require(old == len(before_units) // 2 and new == len(after_units) // 2 and
            ''.join(pieces) == before and ''.join(after_pieces) == after, 'complete forward source/mapping')
    require(len(replacements) == len(row['edits']), 'edit/mapping count differs')
    for actual, expected in zip(row['edits'], replacements):
        require(actual.get('span') == expected['span'] and actual.get('expected') == expected['expected'] and
                actual.get('replacement') == expected['replacement'], 'full edit correspondence')
    inverse = after_units
    for item in reversed(row['mapping']):
        if item['kind'] == 'substitution':
            a, b = item['after']
            require(inverse[a * 2:b * 2] == u16(item['replacement']), 'inverse selector bytes')
            inverse = inverse[:a * 2] + u16(item['expected']) + inverse[b * 2:]
    require(inverse == before_units, 'complete source inverse')
    return before, after, len(replacements), documents['before']


# Repository paths are operational data; source/namespace checks stay independent.
def repository_rust_layout(root):
    root = Path(root).resolve()
    nested = root / 'rust/Cargo.toml'
    try:
        nested_status = nested.lstat()
    except FileNotFoundError:
        nested_status = None
    if nested_status is not None:
        require(stat.S_ISREG(nested_status.st_mode) and not nested.is_symlink()
                and not (root / 'rust').is_symlink(),
                'Rust package manifest must be an ordinary physical file')
    prefix = 'rust/' if nested_status is not None else ''
    manifest = prefix + 'Cargo.toml'
    lock = 'Cargo.lock' if (root / 'Cargo.lock').exists() else prefix + 'Cargo.lock'
    return {'root': 'rust' if prefix else '.', 'manifest': manifest, 'lock': lock,
            'cargoInputs': list(dict.fromkeys((['Cargo.toml'] if prefix else [])
                                              + [manifest, lock])),
            'entries': [prefix + 'src/lib.rs', prefix + 'src/main.rs'],
            'productionPrefix': prefix + 'src/'}


def rust_package_source_path(root, path):
    if type(path) is not str:
        raise TypeError('ordinary repository path required')
    if path not in ['Cargo.toml', 'Cargo.lock', 'build.rs'] and not re.match(
            r'^(?:src|tests|benches|examples|fixtures|fuzz|proptest-regressions)(?:/|$)', path):
        return path
    layout = repository_rust_layout(root)
    if path == 'Cargo.toml':
        return layout['manifest']
    if path == 'Cargo.lock':
        return layout['lock']
    return path if layout['root'] == '.' else layout['root'] + '/' + path


def is_rust_cargo_path(path):
    return type(path) is str and (path.endswith('.rs')
                                  or PurePosixPath(path).name in ['Cargo.toml', 'Cargo.lock'])
