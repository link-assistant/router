// Finite actual-source refusal investigation; no generated files are installed.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {translateSource} from '../../tools/translation/translate.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
const path='rust/src/token.rs',source=readFileSync(path,'utf8');
if(Buffer.byteLength(source)>131072)throw Error('Finite actual token module bound');
const hash=value=>createHash('sha256').update(value).digest('hex');
const items=sourceItems(source),names=['TOKEN_PREFIX','CODEX_TOKEN_PREFIX','codex_token_alias','token_jwt'];
const selected=items.filter(item=>names.includes(item.name));
if(selected.length!==names.length)throw Error('Unique complete actual declarations required');
const exact=selected.map(item=>source.slice(item.start,item.end)).join('\n');
const inputs=[{kind:'complete-actual-module',source},
 {kind:'exact-selected-declarations-diagnostic-only',source:exact}];
const results=[];
for(const input of inputs){
 const started=performance.now(),result=translateSource(input.source,path);
 results.push({...input,sha256:hash(input.source),result,elapsedMilliseconds:performance.now()-started});
 console.log(JSON.stringify({kind:input.kind,sourceBytes:Buffer.byteLength(input.source),
  items:result.ir.items.filter(item=>names.includes(item.name)).map(item=>({name:item.name,status:item.status,diagnostic:item.diagnostic})),
  elapsedMilliseconds:results.at(-1).elapsedMilliseconds,diagnosticOnly:true}));
}
const raw=Buffer.from(JSON.stringify({path,source,sourceSha256:hash(source),results,
 diagnosticOnly:true,installed:false,productionExecutableGain:0}));
if(raw.length>64*1024*1024)throw Error('Finite complete diagnostic evidence bound');
const output='ci-logs/issue-784-restart-2/token-alias-refusal.json.gz';
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('Complete diagnostic readback differs');
console.log(JSON.stringify({completeBytes:raw.length,sha256:hash(raw),output,productionExecutableGain:0}));
