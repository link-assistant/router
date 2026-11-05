// Fresh bounded source DATA only. No runtime is imported or evaluated.
import {constants,openSync,fstatSync,readSync,closeSync} from 'node:fs';
function source(name){
 const descriptor=openSync(new URL('./extensions/'+name,import.meta.url),constants.O_RDONLY|constants.O_NOFOLLOW);try{
  const before=fstatSync(descriptor);if(!before.isFile()||before.size>262144)throw new TypeError('Bounded complete primitive owned vector source required');const bytes=Buffer.alloc(before.size);let offset=0;while(offset<bytes.length){const count=readSync(descriptor,bytes,offset,bytes.length-offset,offset);if(!count)throw new TypeError('Primitive owned vector source changed');offset+=count;}const after=fstatSync(descriptor),extra=Buffer.alloc(1);if(readSync(descriptor,extra,0,1,bytes.length)||before.dev!==after.dev||before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw new TypeError('Primitive owned vector source changed');const text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))throw new TypeError('Exact primitive owned vector UTF8 source required');return text;
 }finally{closeSync(descriptor);}
}
export function primitiveVectorLiteralRuntimeAssetPair(){return new Map(['primitive-vector-literal-runtime.mjs','primitive-vector-literal-runtime.d.mts'].map(name=>[name,source(name)]));}

export function primitiveVectorLiteralDeclarationSource(){return source('primitive-vector-literal-runtime.d.mts');}

// Fresh complete source rows; receiving contexts reissue their own authority.
export function primitiveVectorLiteralRuntimeSources(runtimeRoot='runtime',declarationRoot=runtimeRoot){
 for(const root of [runtimeRoot,declarationRoot])if(typeof root!=='string'||!root||root.length>4096||root.startsWith('/')||root.includes('\\')||/[\x00-\x1f\x7f:]/u.test(root)||root.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Primitive runtime roots must be bounded safe relative paths');
 const rows=[];for(const [name,source]of primitiveVectorLiteralRuntimeAssetPair()){rows.push({path:(name.endsWith('.d.mts')?declarationRoot:runtimeRoot)+'/'+name,source});if(runtimeRoot!==declarationRoot)rows.push({path:(name.endsWith('.d.mts')?runtimeRoot:declarationRoot)+'/'+name,source});}rows.push(...primitiveOwnedVectorRuntimeSources(runtimeRoot,declarationRoot));return rows;
}

import {primitiveOwnedVectorRuntimeSources} from './primitive-owned-vector-runtime-sources.mjs';
