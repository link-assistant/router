// Capture genuine original inputs for fixed historical compiler regressions.
// Requires the original Git history only when deliberately regenerating data.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const revision='83cb0d789e9f875a9e38353ce1a18ebb00a814a3';
const hash=value=>createHash('sha256').update(value).digest('hex');
const paths=execFileSync('git',['ls-tree','-r','--name-only',revision,'--','js'],{cwd:root,encoding:'utf8',maxBuffer:1024*1024}).trim().split('\n').filter(path=>
  /^(?:js\/(?:src|portable|schemas)\/|js\/(?:package\.json|index\.js|testing\.js|catalog\.json)$|js\/[^/]+\.d\.ts$)/u.test(path));
const files=paths.map(path=>{
  const bytes=execFileSync('git',['show',revision+':'+path],{cwd:root,maxBuffer:4*1024*1024});
  const source=bytes.toString('utf8');
  if(!Buffer.from(source).equals(bytes))throw Error('Historical source is not lossless UTF8: '+path);
  return {path,bytes:bytes.length,sha256:hash(bytes),source};
});
const baseline=JSON.parse(readFileSync(new URL('./fixtures/sequence-patterns/native-program-baseline.json',import.meta.url)));
for(const row of baseline.modules){
  const current=row.path.replace('packages/javascript/native/','js/src/'),file=files.find(file=>file.path===current);
  if(!file||file.sha256!==row.sourceSha256||file.bytes!==row.originalSourceBytes)throw Error('Original 52-module pin differs: '+current);
}
const output=gzipSync(JSON.stringify({schema:'historical-native-source-data-v1',revision,files})+'\n',{level:9,mtime:0});
const target=new URL('./fixtures/historical-native-source.json.gz',import.meta.url);
if(process.argv.includes('--emit'))writeFileSync(target,output);
else if(!readFileSync(target).equals(output))throw Error('Historical source fixture differs');
process.stdout.write(JSON.stringify({revision,files:files.length,bytes:files.reduce((n,row)=>n+row.bytes,0),packedBytes:output.length,sha256:hash(output)})+'\n');
