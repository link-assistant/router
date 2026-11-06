// Immutable historical SOURCE DATA only. The current compiler still freshly
// reconstructs CST, parses/checks semantics and emits every original program.
import {readFileSync,mkdirSync,writeFileSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join,dirname} from 'node:path';
import {historicalNativeSourcePath} from '../../test/fixtures/historical-language-layout.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const ARCHIVE_SHA256='95b4576068df3bd2950509dfab7ae06965534fafc73e9543c38fca141e8a4ca6';
export function historicalNativeSources({archive=new URL('../../fixtures/historical-native-source.json.gz',import.meta.url)}={}){
  const packed=readFileSync(archive);
  if(packed.length>2*1024*1024||hash(packed)!==ARCHIVE_SHA256)throw Error('Historical native archive changed');
  const raw=gunzipSync(packed,{maxOutputLength:8*1024*1024}),bundle=JSON.parse(raw.toString('utf8'));
  if(bundle.schema!=='historical-native-source-data-v1'||bundle.revision!=='83cb0d789e9f875a9e38353ce1a18ebb00a814a3'||bundle.files.length!==134)throw Error('Historical native input census changed');
  const files=new Map();
  for(const row of bundle.files){
    if(typeof row.path!=='string'||!/^js\/(?:[\w.-]+\/)*[\w.-]+$/u.test(row.path)||row.path.split('/').some(part=>part==='.'||part==='..')||files.has(row.path)||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)throw Error('Historical native full source changed');
    files.set(row.path,row.source);
  }
  const baselineBytes=readFileSync(new URL('../../fixtures/sequence-patterns/native-program-baseline.json',import.meta.url));
  if(hash(baselineBytes)!=='d3b55956cc6eb290f5c9ebbab4c12a5c2635e94dbffb637a37badd6f85ce147b')throw Error('Original native baseline changed');
  const baseline=JSON.parse(baselineBytes);
  for(const row of baseline.modules){const source=files.get(historicalNativeSourcePath(row.path));if(typeof source!=='string'||hash(source)!==row.sourceSha256||Buffer.byteLength(source)!==row.originalSourceBytes)throw Error('Original native source pin differs');}
  const paths=[...files.keys()].filter(path=>/^(?:js\/(?:src|portable)\/.*|js\/(?:index|testing)\.js)$/u.test(path)&&/\.(?:mjs|js)$/u.test(path)).sort();
  if(paths.length!==59||paths.filter(path=>path.startsWith('js/src/')&&path.endsWith('.mjs')).length!==52)throw Error('Historical native module census changed');
  return {paths,source(path){const source=files.get(historicalNativeSourcePath(path));if(source===undefined)throw Error('Unknown historical native source: '+path);return source;},files:new Map(files)};
}

export function materializeHistoricalNativeSources(directory,dependencyRoot){
  const fixture=historicalNativeSources();
  for(const [path,source]of fixture.files){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source,{flag:'wx'});}
  symlinkSync(join(dependencyRoot,'js/node_modules'),join(directory,'js/node_modules'),'dir');
  return fixture;
}
