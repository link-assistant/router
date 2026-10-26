// Independent SOURCE cases. No case has run during the bulk-drafting phase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareProductionCoreBase64AdoptionSources} from '../prepare-production-core-base64-adoption-sources.mjs';
import {preparePinnedRustSourceRecipe} from '../pinned-rust-source-recipe.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import * as runtime from '../base64-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../',import.meta.url));
const archive='tools/translation/source-profiles/production-core-base64-adoption/complete-originals-and-rules.json.gz';
const packed=readFileSync(join(root,archive)),originalProfile=JSON.parse(gunzipSync(packed).toString('utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
function fixture(change,run){
 const temporary=mkdtempSync(join(tmpdir(),'router-base64-source-recipe-'));
 try{
  const profile=structuredClone(originalProfile);change?.(profile);
  for(const row of [...profile.guards,...profile.files]){const path=join(temporary,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,Object.hasOwn(row,'source')?row.source:readFileSync(join(root,row.path),'utf8'));}
  const content=gzipSync(JSON.stringify(profile)),path=join(temporary,archive);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content);
  return run({root:temporary,archive,pin:sha(content),id:profile.id},profile);
 }finally{rmSync(temporary,{recursive:true,force:true});}
}
test('complete actual batch retains eleven calls ten physical files both phases and full CST inverses',limits,()=>{
 const result=prepareProductionCoreBase64AdoptionSources();assert.equal(result.files.length,10);assert.equal(result.files.flatMap(row=>row.selections).length,11);
 for(const row of result.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(phase=>phase.phase),['language','repository']);for(const selected of row.selections){assert.equal(row.before.slice(...selected.span),selected.expected);assert.equal(selected.replacement,'crate::translation_core::'+selected.operation+'('+selected.operand+')');}}
 for(const key of ['semanticAuthority','namespaceAuthority','ownershipAuthority','executableAdmission','runtimeParity','receivingExecuted','crossInvocationCache'])assert.equal(result[key],false,key);
 assert.equal(result.guards.length,2);assert.ok(result.guards.every(row=>row.source.length>0&&sha(row.source)===row.sha256));
 const ownership=new Set(result.files.flatMap(row=>row.selections.map(selected=>selected.ownership)));assert.deepEqual(ownership,new Set(['borrow-text','borrow-bytes','move-text','move-bytes','copy-array32']));
});
test('unapplied originals produce the same complete review proposal without writing source',limits,()=>fixture(null,(options,profile)=>{
 const result=preparePinnedRustSourceRecipe(options);for(const row of result.files){assert.equal(row.current,row.before);assert.equal(readFileSync(join(options.root,row.path),'utf8'),row.before);assert.equal(sha(row.after),profile.files.find(original=>original.path===row.path).afterSha256);}
}));
test('fresh complete source and archive guards reject changed inputs and symlinks',limits,()=>{
 fixture(null,options=>{const path=join(options.root,originalProfile.files[0].path);writeFileSync(path,readFileSync(path,'utf8')+'\n');assert.throws(()=>preparePinnedRustSourceRecipe(options),/concurrent source/u);});
 fixture(null,options=>{const path=join(options.root,originalProfile.guards[0].path);writeFileSync(path,readFileSync(path,'utf8')+'\n');assert.throws(()=>preparePinnedRustSourceRecipe(options),/source guard/u);});
 fixture(null,options=>{const path=join(options.root,archive);writeFileSync(path,Buffer.concat([readFileSync(path),Buffer.from('changed')]));assert.throws(()=>preparePinnedRustSourceRecipe(options),/pinned archive/u);});
 fixture(null,options=>{const path=join(options.root,originalProfile.files[0].path),other=path+'.original';writeFileSync(other,readFileSync(path));rmSync(path);symlinkSync(other,path);assert.throws(()=>preparePinnedRustSourceRecipe(options),/ordinary current source/u);});
});
test('overlap altered arguments mismatched owners and token-interior recipes are refused',limits,()=>{
 const mutations=[profile=>{const row=profile.files.find(row=>row.calls.length);row.calls.push({...row.calls[0]});},profile=>{profile.files.find(row=>row.calls.length).calls[0].operand='different';},profile=>{profile.files.find(row=>row.calls.length).calls[0].owner='foreign';},profile=>{
  const row=profile.files.find(row=>row.calls.length),edit=row.calls[0],[start,end]=edit.span;row.source=row.source.slice(0,start)+'"'+row.source.slice(start,end)+'"'+row.source.slice(end);edit.span=[start+1,end+1];row.sha256=sha(row.source);
 }];
 for(const mutation of mutations)fixture(mutation,options=>assert.throws(()=>preparePinnedRustSourceRecipe(options),/source recipe/iu));
 let touched=false;assert.throws(()=>preparePinnedRustSourceRecipe({get root(){touched=true;return root;},archive,pin:sha(packed),id:originalProfile.id}),/accessors/u);assert.equal(touched,false);
});
test('existing owned ABI keeps application-relevant unicode binary padding errors and empty cases',limits,()=>{
 assert.equal(runtime.router_core_base64_standard_encode_text('π\0🙂'),'z4AA8J+Zgg==');
 const bytes=Object.freeze([0n,255n,16n]);assert.equal(runtime.router_core_base64_standard_encode_owned_bytes(bytes),'AP8Q');assert.equal(runtime.router_core_base64_standard_encode_bytes(bytes),'AP8Q');assert.deepEqual(bytes,[0n,255n,16n]);
 assert.deepEqual(runtime.router_core_base64_standard_decode_text('AP8Q'),{$:'Ok',field0:[0n,255n,16n]});
 assert.deepEqual(runtime.router_core_base64_url_no_pad_decode_owned_text(''),{$:'Ok',field0:[]});assert.deepEqual(runtime.router_core_base64_url_no_pad_decode_text('Zg'),{$:'Ok',field0:[102n]});
 for(const text of ['Zg=','Zg=='])assert.equal(runtime.router_core_base64_url_no_pad_decode_text(text).$,'Err');
 const zeroes=Object.freeze(Array(32).fill(0n));assert.equal(runtime.router_core_base64_url_no_pad_encode_array32(zeroes),'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
});
