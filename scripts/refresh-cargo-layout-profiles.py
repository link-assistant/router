#!/usr/bin/env python3
"""Rebuild current Cargo profile metadata from a complete checked layout equation.

No Rust is executed. Historical capture receipts and dependency archives remain
unchanged. The baseline records complete original bytes, not an observed repin.
"""
import argparse,base64,copy,gzip,hashlib,json,re,subprocess,tomllib
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
BASELINE='tools/translation/source-profiles/cargo-layout-before/inputs.json.gz'
OLD_MANIFEST_SHA='328a6026c740f42468d0752d9cea4cb4930304b45c979b03d3f3db9ce658d476'
LANGUAGE_RULES=['toml:complete-package-source-equation','toml:unchanged-package-dependencies-targets-features','toml:identical-workspace-profiles','cargo:unchanged-complete-lockfile']
REPOSITORY_RULES=['router:current-manifest-profile-fields','router:complete-consumer-manifest-archives','router:transitive-profile-file-fingerprints']
sha=lambda raw:hashlib.sha256(raw).hexdigest()
encode=lambda value:(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()

def capture(reference):
    if not re.fullmatch('[a-f0-9]{40}',reference):raise ValueError('Full original Git revision required')
    def original(path):return subprocess.check_output(['git','show',reference+':'+path],cwd=ROOT)
    manifest=original('Cargo.toml')
    if sha(manifest)!=OLD_MANIFEST_SHA:raise ValueError('Original complete package manifest differs')
    paths=subprocess.check_output(['git','ls-tree','-r','--name-only',reference,'--','tools/translation/source-profiles','tools/translation/serialization-schema'],cwd=ROOT).decode().splitlines()
    profiles={}
    for path in paths:
        if not path.endswith('.json')or 'receipt'in Path(path).name or any(part=='generated'or part.endswith('-generated')for part in Path(path).parts):continue
        raw=original(path)
        if OLD_MANIFEST_SHA.encode()in raw:profiles[path]=base64.b64encode(raw).decode()
    archives={}
    for path in ['tools/translation/source-profiles/json-capabilities/link-assistant-router-1.24.1-Cargo.toml.gz','tools/translation/source-profiles/json-macro/features/link-assistant-router-1.24.1-Cargo.toml.gz']:
        raw=original(path)
        if gzip.decompress(raw)!=manifest:raise ValueError('Complete original consumer manifest archive differs')
        archives[path]=base64.b64encode(raw).decode()
    value={'schema':'cargo-layout-before-v1','revision':reference,'manifest':base64.b64encode(manifest).decode(),'lockSha256':sha(original('Cargo.lock')),'profiles':profiles,'archives':archives,'historicalReceiptsRetained':True,'rustExecuted':False}
    target=ROOT/BASELINE
    if target.exists():raise ValueError('Original layout baseline is immutable')
    target.parent.mkdir(parents=True,exist_ok=True);packed=gzip.compress(encode(value),compresslevel=1,mtime=0);target.write_bytes(packed)
    if gzip.decompress(target.read_bytes())!=encode(value):raise ValueError('Complete original baseline readback differs')
    return value

def rebuild(baseline):
    before=base64.b64decode(baseline['manifest'],validate=True);actual=(ROOT/'rust/Cargo.toml').read_bytes();workspace=tomllib.loads((ROOT/'Cargo.toml').read_text())
    if sha(before)!=OLD_MANIFEST_SHA:raise ValueError('Original package baseline changed')
    text=before.decode();old='readme = "README.md"';new='readme = "../README.md"'
    if text.count(old)!=1:raise ValueError('Unique readme source rule required')
    text=text.replace(old,new)
    for header in ['[profile.release]','[profile.bench]']:
        pattern=r'(?m)^'+re.escape(header)+r'\n.*?(?=^\[|\Z)';matches=list(re.finditer(pattern,text,re.S))
        if len(matches)!=1:raise ValueError('Unique complete profile source rule required')
        m=matches[0];text=text[:m.start()]+text[m.end():]
    if actual!=text.encode():raise ValueError('Current manifest is outside the complete approved layout source equation')
    original=tomllib.loads(before.decode());expected=copy.deepcopy(original);profiles=expected.pop('profile');expected['package']['readme']='../README.md'
    if tomllib.loads(actual.decode())!=expected or workspace.get('profile')!=profiles:raise ValueError('Package/dependency/feature/target or workspace profile semantics differ')
    expected_workspace={'workspace':{'members':['rust'],'default-members':['rust'],'exclude':['rust/fuzz'],'resolver':'3'},'profile':profiles}
    if workspace!=expected_workspace or sha((ROOT/'Cargo.lock').read_bytes())!=baseline['lockSha256']:raise ValueError('Complete workspace configuration or lockfile differs')
    old_json={p:base64.b64decode(raw,validate=True)for p,raw in baseline['profiles'].items()};documents={p:json.loads(raw)for p,raw in old_json.items()};outputs={};hashes={}
    packed=gzip.compress(actual,compresslevel=9,mtime=0)
    if gzip.decompress(packed)!=actual:raise ValueError('Actual consumer manifest archive readback differs')
    for path,encoded in baseline['archives'].items():
        oldraw=base64.b64decode(encoded,validate=True)
        if gzip.decompress(oldraw)!=before:raise ValueError('Original complete consumer archive changed')
        outputs[path]=packed;hashes[sha(oldraw)]=sha(packed)
    def update(value):
        if isinstance(value,dict):
            for key,child in list(value.items()):
                if isinstance(child,str)and child==OLD_MANIFEST_SHA and key in ['manifestSha256','cargoManifestSha256','rootManifestSha256']:value[key]=sha(actual)
                elif key=='Cargo.toml'and isinstance(child,dict)and child.get('sha256')==OLD_MANIFEST_SHA:child['sha256']=sha(actual);child['bytes']=len(actual)
                elif key=='manifest'and isinstance(child,dict)and child.get('sha256')==OLD_MANIFEST_SHA:
                    child['sha256']=sha(actual);child['bytes']=len(actual);child['archiveSha256']=sha(packed)
                else:update(child)
        elif isinstance(value,list):
            for child in value:update(child)
    for value in documents.values():update(value)
    def references(value,mapping):
        if isinstance(value,dict):
            for key,child in list(value.items()):
                if isinstance(child,str)and child in mapping and ('sha256'in key.lower()or key.lower().endswith('digest')):value[key]=mapping[child]
                else:references(child,mapping)
        elif isinstance(value,list):
            for child in value:references(child,mapping)
    for _ in range(16):
        for value in documents.values():references(value,hashes)
        current={sha(old_json[p]):sha(encode(value))for p,value in documents.items()}
        if all(hashes.get(k)==v for k,v in current.items()):break
        for old,new in current.items():
            prior=hashes.get(old)
            if prior is not None and prior!=new:hashes[prior]=new
        hashes.update(current)
    else:raise ValueError('Profile fingerprint graph did not converge')
    outputs.update({path:encode(value)for path,value in documents.items()})
    # Current source consumers get only exact coupled profile file digests.
    # Historical fixtures, archived projects and generated output are untouched.
    profile_hashes={sha(old_json[p]):sha(outputs[p])for p in documents}
    for path in (ROOT/'tools/translation').rglob('*.mjs'):
        relative=path.relative_to(ROOT).as_posix();parts=path.relative_to(ROOT/'tools/translation').parts
        if any(part in ['test','fixtures','source-profiles','projects','meta','generated','vendor']or part.endswith('-generated')for part in parts):continue
        raw=path.read_bytes();newraw=raw;coupled=False
        for old,new in profile_hashes.items():
            if old.encode()in raw or new.encode()in raw:coupled=True
            newraw=newraw.replace(old.encode(),new.encode())
        if coupled:outputs[relative]=newraw
    receipt={'schema':'cargo-layout-profile-refresh-v1','baseline':BASELINE,'baselineRevision':baseline['revision'],'beforeManifestSha256':sha(before),'actualManifest':'rust/Cargo.toml','manifestSha256':sha(actual),'lockSha256':baseline['lockSha256'],'languageRules':LANGUAGE_RULES,'repositoryRules':REPOSITORY_RULES,'completeSourceEquation':True,'packageDependencyFeatureTargetDataUnchanged':True,'workspaceProfilesUnchanged':True,'historicalCaptureReceiptsUnchanged':True,'rustExecuted':False,'outputs':[{'path':p,'bytes':len(raw),'sha256':sha(raw)}for p,raw in sorted(outputs.items())]}
    outputs['tools/translation/source-profiles/cargo-layout-before/refresh.json']=encode(receipt)
    return outputs,receipt

def main():
    p=argparse.ArgumentParser(__doc__);p.add_argument('--capture-baseline');p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');p.add_argument('--output',type=Path);a=p.parse_args()
    if a.capture_baseline:baseline=capture(a.capture_baseline)
    else:baseline=json.loads(gzip.decompress((ROOT/BASELINE).read_bytes()))
    outputs,receipt=rebuild(baseline);stale=[]
    for name,raw in outputs.items():
        path=ROOT/name
        if path.exists()and path.read_bytes()==raw:continue
        stale.append(name)
        if a.write:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
    if a.output:
        a.output.mkdir();(a.output/'receipt.json').write_bytes(encode(receipt))
        for at,(name,raw)in enumerate(outputs.items()):
            target=a.output/(str(at).zfill(3)+'.gz');target.write_bytes(gzip.compress(raw,compresslevel=1,mtime=0))
            if gzip.decompress(target.read_bytes())!=raw:raise ValueError('Complete proposal readback differs')
    print(json.dumps({'outputs':len(outputs),'stale':stale,'mode':'write'if a.write else'check','rules':LANGUAGE_RULES+REPOSITORY_RULES,'rustExecuted':False}))
    if not a.write and stale:raise SystemExit(1)
if __name__=='__main__':main()
