// Fresh bounded source DATA only. No runtime is imported or evaluated.
import {constants,openSync,fstatSync,readSync,closeSync} from 'node:fs';
function source(name){
 const descriptor=openSync(new URL('./extensions/'+name,import.meta.url),constants.O_RDONLY|constants.O_NOFOLLOW);try{
  const before=fstatSync(descriptor);if(!before.isFile()||before.size>262144)throw new TypeError('Bounded complete primitive sequence source required');const bytes=Buffer.alloc(before.size);let offset=0;while(offset<bytes.length){const count=readSync(descriptor,bytes,offset,bytes.length-offset,offset);if(!count)throw new TypeError('Primitive sequence source changed');offset+=count;}const after=fstatSync(descriptor),extra=Buffer.alloc(1);if(readSync(descriptor,extra,0,1,bytes.length)||before.dev!==after.dev||before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw new TypeError('Primitive sequence source changed');const text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))throw new TypeError('Exact primitive sequence UTF8 source required');return text;
 }finally{closeSync(descriptor);}
}
export function primitiveSequenceRuntimeAssetPair(){return new Map(['primitive-sequence-runtime.mjs','primitive-sequence-runtime.d.mts'].map(name=>[name,source(name)]));}

export function primitiveSequenceDeclarationSource(){return source('primitive-sequence-runtime.d.mts');}

// Fresh complete source rows; receiving contexts reissue their own authority.
export function primitiveSequenceRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 for(const root of [runtimeRoot,declarationRoot])if(typeof root!=='string'||!root||root.length>4096||root.startsWith('/')||root.includes('\\')||/[\x00-\x1f\x7f:]/u.test(root)||root.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Primitive runtime roots must be bounded safe relative paths');
 const rows=[];for(const [name,source]of primitiveSequenceRuntimeAssetPair()){rows.push({path:(name.endsWith('.d.mts')?declarationRoot:runtimeRoot)+'/'+name,source});if(runtimeRoot!==declarationRoot)rows.push({path:(name.endsWith('.d.mts')?runtimeRoot:declarationRoot)+'/'+name,source});}for(const row of primitiveOperatorRuntimeSources(runtimeRoot,declarationRoot)){rows.push(row);if(runtimeRoot!==declarationRoot)rows.push({path:(row.path.endsWith('.d.mts')?runtimeRoot:declarationRoot)+'/'+row.path.split('/').at(-1),source:row.source});}return rows;
}

import {primitiveOperatorRuntimeSources} from './primitive-operator-runtime-sources.mjs';
