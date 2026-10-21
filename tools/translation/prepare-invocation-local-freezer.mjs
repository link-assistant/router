// Source preparation only. Scalar traversal arithmetic is never source authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE='tools/translation/source-profiles/invocation-local-freezer/complete-originals.json.gz';
const HASH='1e9e9148d08128ecb71c6e2cbc387dfeb7e2ccc77555c9f4c37c20fe70e31c57';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Invocation-local freezer source: '+message);};
const APPEND=`
// A factory-private arithmetic store exists only during the current retained
// synchronous proof scope. Its key never escapes, and it stores no sources,
// owners, digests, encoded results or eligibility decisions.
export function createRetainedPrivateScalarCostStore(){
 const key={};
 return function currentScalarCostStore(){
  const scope=retainedPrivateProofCostPolicy?.scope;
  if(!scope||!scope.open||!nativeReady())return null;
  const memo=scope.memo??(scope.memo=new weakOwner());
  let store=apply(weakGet,memo,[key]);
  if(!store){store={values:new weakOwner(),entries:0};apply(weakSet,memo,[key,store]);}
  return store;
 };
}
`;
const FREEZER_RULES=[
 {id:'javascript:select-current-invocation-completed-costs',before:'  if(lookup(value))return value;\n  const selected=packedPlan(value,lookup);',after:'  const store=currentScalarCostStore();\n  const selectedLookup=store?value=>store.values.get(value)??lookup(value):lookup;\n  if(selectedLookup(value))return value;\n  const selected=packedPlan(value,selectedLookup);'},
 {id:'javascript:remember-only-completely-frozen-arithmetic',before:'   Object.freeze(state.value);remember(state.value,state,state.value===value);\n  }\n  return value;',after:'   Object.freeze(state.value);remember(state.value,state,state.value===value);\n   if(store&&store.entries<32768&&store.values.get(state.value)===undefined){store.values.set(state.value,encoded);store.entries++;}\n  }\n  return value;'},
];
const IMPORT="import {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';";
const IMPORTED=IMPORT+"\nimport {createRetainedPrivateScalarCostStore} from './private-native-proof-json.mjs';\nconst currentScalarCostStore=createRetainedPrivateScalarCostStore();";
function unique(source,before,after){if(source.split(before).length!==2)fail('unique complete source anchor required');return source.replace(before,()=>after);}
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar: '+path);return file;}
function stage(source,after,id){return {id,edits:[{span:[0,source.length],expected:source,replacement:after}]};}
export function invocationLocalFreezerSourcePairs(root=ROOT){
 const packed=readFileSync(resolve(root,PROFILE));if(packed.length!==9066||hash(packed)!==HASH)fail('complete original source profile differs');
 const profile=JSON.parse(gunzipSync(packed,{maxOutputLength:131072}));
 if(profile.schema!=='complete-original-freezer-cost-inputs-v1'||profile.commit!=='1c8085e312c45a65665fbed319e3b30d5e0345bb'||profile.files.length!==2)fail('complete original input domain differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 return profile.files.map((row,index)=>{
  const name=index===0?'private-data-freeze.mjs':'private-native-proof-json.mjs',path='tools/translation/'+name;
  if(row.path!==path||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)fail('complete source identity differs');
  const original=row.source;grammar(ts,path,original);let language=original,after;
  if(index===0){for(const rule of FREEZER_RULES)language=unique(language,rule.before,rule.after);after=unique(language,IMPORT,IMPORTED);}
  else{language+=APPEND;after=language;}
  grammar(ts,path,after);
  return {path,original,language,after,originalSha256:row.sha256,afterSha256:hash(after)};
 });
}
export function prepareInvocationLocalFreezer({root=ROOT}={}){
 const files=[];
 for(const row of invocationLocalFreezerSourcePairs(root)){
  const before=readFileSync(resolve(root,row.path),'utf8');if(before!==row.original&&before!==row.after)fail('unexpected complete current source');
  const beforeMeta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(row.original,{language:'JavaScript'}).document),first=transportConcreteSyntaxMeta(beforeMeta);if(first.source!==row.original)fail('complete original CST');
  const sequence={languageRules:[stage(row.original,row.language,'javascript:invocation-local-immutable-scalar-traversal-costs')],repositoryRules:[stage(row.language,row.after,'router:bind-private-synchronous-proof-cost-lifetime')]};
  const run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==row.after)fail('complete proposed CST');
  const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[stage(row.after,row.original,'javascript:restore-complete-original-freezer')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==row.original)fail('complete inverse');
  files.push({...row,before,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:row.original});
 }
 return {schema:'invocation-local-freezer-source-v1',files,newAcrossInvocationCache:false,globalRetentionPolicyUnchanged:true,invocationRecords:32768,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-invocation-local-freezer.mjs --emit|--check');
 const result=prepareInvocationLocalFreezer();if(args[0]==='--check'){if(result.files.some(row=>row.before!==row.after))fail('complete current sources are stale');console.log('Invocation-local freezer source producer is current; no compiler authority.');}else console.log(JSON.stringify(result));
}
