// Read-only fixture census. This grants no semantic or execution authority.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodeStaticSourceTextData} from '../../tools/translation/static-source-layout-storage.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024});
const base=git('rev-parse','origin/main').toString().trim();
const head=git('rev-parse','HEAD').toString().trim();
const folder='tools/translation/source-profiles/static-source-lifecycle/';
const index=JSON.parse(readFileSync(folder+'manifest.json'));
const raw=gunzipSync(readFileSync(folder+index.archive),{maxOutputLength:32*1024*1024});
if(raw.length!==index.rawBytes||hash(raw)!==index.rawSha256)throw Error('Archive authentication failed');
const projection=decodeStaticSourceTextData(raw,index);
const expected=projection.bundle.current.files.map(row=>row.path).sort();
const paths=revision=>git('ls-tree','-r','--name-only','-z',revision).toString().split('\0')
  .filter(path=>path.endsWith('.rs')||path==='Cargo.toml'||path==='Cargo.lock'||path==='rust/Cargo.toml').sort();
const compare=revision=>{
  const actual=paths(revision),actualSet=new Set(actual),expectedSet=new Set(expected);
  return {revision,expectedCount:expected.length,actualCount:actual.length,
    missing:expected.filter(path=>!actualSet.has(path)),
    added:actual.filter(path=>!expectedSet.has(path))};
};
const files=['tools/translation/translate.mjs','tools/translation/concrete-syntax-meta.mjs',
  'tools/translation/private-frozen-json.mjs','tools/translation/test/real-source-fixtures.mjs',
  folder+'manifest.json',folder+index.archive];
const sourceComparisons=files.map(path=>{
  const current=readFileSync(path),baseBytes=git('show',base+':'+path),headBytes=git('show',head+':'+path);
  return {path,bytes:current.length,sha256:hash(current),matchesMain:current.equals(baseBytes),
    matchesHead:current.equals(headBytes)};
});
const result={base,head,archiveSha256:hash(raw),census:[compare(base),compare(head)],
  sourceComparisons,semanticAuthority:false,completeCohortQualification:false};
writeFileSync('ci-logs/restart-fixture-base-comparison.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
