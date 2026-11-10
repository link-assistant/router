// Complete receiver source DATA. Behavioral admission remains independently checked.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';
import {verifyNativeCopiedModuleBindings} from './source-copy-native-bindings.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE=new URL('./source-profiles/shared-f64-receiver-evolution/',import.meta.url);
const MANIFEST='4494921518f450b3426f6e6957a9354137c191214a40c31c186e6161d041b132';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=reason=>{throw TypeError('Shared f64 receiver source: '+reason);};
function original(pin){
 const packed=readFileSync(new URL(pin.archive,PROFILE));
 if(packed.length!==pin.archiveBytes||hash(packed)!==pin.archiveSha256)fail('complete original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:262144});
 if(raw.length!==pin.bytes||hash(raw)!==pin.sha256)fail('complete original source differs');
 return new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);
}
export function prepareSharedF64MethodReceivers({root=ROOT}={}){
 root=resolve(root);const bytes=readFileSync(new URL('manifest.json',PROFILE));
 if(hash(bytes)!==MANIFEST)fail('complete original manifest differs');
 const manifest=JSON.parse(bytes),ts=ownershipCompiler();
 if(ts.version!=='5.9.3'||manifest.schema!=='original-shared-f64-receiver-evolution-v1'
  ||JSON.stringify(manifest.phases)!=='["language","repository"]')fail('original phase or compiler domain differs');
 const proposals=manifest.files.map(pin=>{
  const before=original(pin),sequence={language:[],repository:[]};
  for(const edit of pin.edits){
   if(!Object.hasOwn(sequence,edit.phase))fail('unknown original rule phase');
   sequence[edit.phase].push(exactLiteralSubstitutionRule(edit.id,edit.before,edit.after,'complete original receiver source anchor differs'));
  }
  const language=createRulePipeline([{phase:'language',rules:sequence.language},{phase:'repository',rules:[]}]).run(before);
  const complete=createRulePipeline([{phase:'language',rules:sequence.language},{phase:'repository',rules:sequence.repository}]).run(before);
  let inverse=complete.value;
  for(const phase of ['repository','language'])for(const edit of pin.edits.filter(row=>row.phase===phase).reverse()){
   if(inverse.split(edit.after).length!==2)fail('complete ordered source inverse differs');
   inverse=inverse.replace(edit.after,()=>edit.before);
  }
  if(inverse!==before||hash(complete.value)!==pin.afterSha256)fail('complete authored successor differs');
  return {path:pin.path,before,middle:language.value,after:complete.value,sequence:pin.edits,trace:complete.trace};
 });
 for(const pin of manifest.helpers){
  const source=original(pin);proposals.push({path:pin.path,before:source,middle:source,after:source,sequence:[],trace:[]});
 }
 for(const row of proposals)for(const source of [row.before,row.middle,row.after]){
  const parsed=ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const lines=source.split('\n').length-Number(source.endsWith('\n'));
  if(parsed.parseDiagnostics.length||lines>=1000)fail('complete native grammar or original line bound differs');
 }
 const equations=transportConcreteNamedSourcePhases(proposals.map((row,index)=>({
  before:row.before,middle:row.middle,after:row.after,language:'JavaScript',
  rules:['shared-f64:language:'+index,'shared-f64:repository:'+index,'shared-f64:language-inverse:'+index,'shared-f64:repository-inverse:'+index],
 })));
 const bindingRows=proposals.flatMap(row=>[{path:resolve(root,row.path+'.original.mjs'),source:row.before},{path:resolve(root,row.path),source:row.after}]);
 const bindings=verifyNativeCopiedModuleBindings(ts,bindingRows);
 const files=proposals.map((row,index)=>{
  const equation=equations[index],current=readFileSync(resolve(root,row.path),'utf8');
  if(equation.before!==row.before||equation.middle!==row.middle||equation.after!==row.after||equation.inverse!==row.before)fail('complete serialized source equation differs');
  if(current!==row.before&&current!==row.after)fail('unknown physical source predecessor or successor');
  return {...row,current,equation,beforeSha256:hash(row.before),afterSha256:hash(row.after),nativeBindings:bindings.slice(index*2,index*2+2)};
 });
 if(!readFileSync(new URL('manifest.json',PROFILE)).equals(bytes))fail('original manifest changed during preparation');
 for(const row of files)if(readFileSync(resolve(root,row.path),'utf8')!==row.current)fail('physical source changed during preparation');
 return {schema:'shared-f64-method-receiver-source-v1',typescriptVersion:ts.version,manifestSha256:MANIFEST,files,
  sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,productionExecutableGain:0,receivingQualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--check','--write'].includes(args[0]))fail('use --check|--write');
 const plan=prepareSharedF64MethodReceivers();
 for(const row of plan.files){
  if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('physical source changed before installation');
  if(args[0]==='--write')writeFileSync(resolve(ROOT,row.path),row.after);
  else if(row.current!==row.after)fail('complete generated source is stale');
 }
 console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));
}
