// Diagnostic only: fresh public guards and actual complete comparison inputs.
import {readFileSync as nativeRead} from 'node:fs';
import {createHash} from 'node:crypto';
import {readCompilerAliasHistory} from '../../tools/translation/test/fixtures/compiler-data-alias-history.mjs';
import {legacyProofConsumerSource} from '../../tools/translation/test/fixtures/native-proof-json-format.mjs';
import * as guards from '../../tools/translation/original-json-intrinsics.mjs';
import {translateProject} from '../../tools/translation/project.mjs';
const root=new URL('../../',import.meta.url);
const names=['originalPrivateParserIngressUnchanged','originalNamespaceTraversalIntrinsicsUnchanged',
 'originalDataFreezeIntrinsicsUnchanged','originalStaticSourceIntrinsicsUnchanged',
 'originalPrivateParserCommonIntrinsicsUnchanged','originalPrivateParserNumericCommonIntrinsicsUnchanged'];
const sample=()=>Object.fromEntries(names.map(name=>[name,guards[name]()]));
const sha=source=>createHash('sha256').update(source).digest('hex');
console.log(JSON.stringify({phase:'initial',node:process.versions,guards:sample()}));
for(const name of ['private-frozen-json.mjs','builtin-debug-ast-route.mjs','builtin-derive-bang-footprints.mjs']){
 const url=new URL('tools/translation/'+name,root),source=nativeRead(url,'utf8');
 const row={name,bytes:Buffer.byteLength(source),sha256:sha(source),before:sample()};
 try{
  const alias=readCompilerAliasHistory(url,'utf8');row.afterRead=sample();row.aliasSha256=sha(alias);
  const result=legacyProofConsumerSource(alias);row.afterLegacy=sample();row.legacySha256=sha(result);
 }catch(error){row.error={name:error.name,message:error.message,stack:error.stack??null};row.afterError=sample();}
 console.log(JSON.stringify(row));
}
try{const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>
 '#[derive(Copy,Clone,Debug)]pub struct Data{value:u8}pub fn accept(value:u8)->bool{value>0}'});
 console.log(JSON.stringify({phase:'translate',executable:result.meta.executable.length,guards:sample()}));
}catch(error){console.log(JSON.stringify({phase:'translate',error:{name:error.name,message:error.message,stack:error.stack??null},guards:sample()}));process.exitCode=1;}
