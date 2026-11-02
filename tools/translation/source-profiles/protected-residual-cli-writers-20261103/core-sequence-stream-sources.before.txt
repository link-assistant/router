// Whole original helper copies selected by native TS and joined through CST.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Core sequence stream source: '+message);};
const STAGE=String.raw`
// Explicit opt-in stage lifecycle. The complete original helpers above remain
// literal copies; no source view or private proof is transported between calls.
export function assertOriginalCoreSequenceStageSource(){
 const actual=readOriginalSequenceStreamSource(new URL('./source-backed-core-adoption-sequence.mjs',import.meta.url),'utf8');
 if(hash(actual)!=='@ORIGINAL_SOURCE_SHA256@')fail('complete current original stage source changed');
}
export function runOriginalCoreSequenceStage(input){
 assertOriginalCoreSequenceStageSource();
 const value=ownObject(input,'stage option'),names=Object.keys(value);
 if(names.some(name=>!['name','entry','files','dependencyInputs','compilationProfile'].includes(name))||!['name','entry','files','dependencyInputs'].every(name=>Object.hasOwn(value,name)))fail('exact complete stage options required');
 const step=STEPS.find(step=>step.name===value.name);if(!step)fail('fixed actual stage required');
 const before=files(value.files),profile=normalizeProfile(value.compilationProfile??PRODUCTION_PROFILE),cargo=dependencies(value.dependencyInputs),join=cargoJoin(cargo),entry=value.entry;
 IO.pathName(entry);if(!Object.hasOwn(before,entry))fail('actual complete stage entry absent');
 const proposal=step.run({entry,files:before,compilationProfile:profile,dependencyInputs:cargo});
 const after=applyStep(proposal,before,step,profile,{inputs:cargo,join},entry);
 return {schema:'original-core-sequence-stage-v1',name:step.name,entry,compilationProfile:profile,cargo:{inputs:cargo,join},beforeSha256:digest(before),afterSha256:digest(after),originalFiles:before,files:after,proposal,semanticAdmission:false,executableCoverageGain:null};
}
export function reviewOriginalCoreSequenceStage(value){
 const actual=ownObject(value,'stage result'),step=STEPS.find(step=>step.name===actual.name);
 if(actual.schema!=='original-core-sequence-stage-v1'||!step||actual.semanticAdmission!==false||actual.executableCoverageGain!==null)fail('complete original source-only stage required');
 const before=files(actual.originalFiles),after=files(actual.files),profile=normalizeProfile(actual.compilationProfile),cargo=dependencies(actual.cargo.inputs),join=cargoJoin(cargo);
 if(!same(join,actual.cargo.join)||digest(before)!==actual.beforeSha256||digest(after)!==actual.afterSha256)fail('complete stage Cargo/source equation differs');
 sameFiles(applyStep(actual.proposal,before,step,profile,{inputs:cargo,join},actual.entry),after);
 return {name:step.name,summary:actual.proposal.summary,completeSourceInverse:true,semanticAdmission:false};
}
export function originalCoreSequenceBaseGroups(original,name,row,prior){
 const history=prior.map(previous=>({name:previous.name,proposal:{rows:previous.row.proposal?[{path:row.path,proposal:{functions:[],mapping:previous.row.proposal.mapping}}]:[]}}));
 history.push({name,proposal:{rows:[row]}});return candidateGroups(original,history);
}
export function reviewOriginalCoreSequenceRow(name,row,before){
 const step=STEPS.find(step=>step.name===name);if(!step)fail('fixed source row stage required');return fileChange(row,before,step);
}
export const originalCoreSequenceSourceDigest=value=>digest(files(value));
`;
const IO_HOOK=String.raw`
// These are transport helpers only. A packet cannot issue source authority.
export function assertOriginalCoreSequencePacketSource(){if(hash(readFileSync(new URL('./source-backed-core-sequence-packets.mjs',import.meta.url),'utf8'))!=='@ORIGINAL_SOURCE_SHA256@')fail('complete current original packet source changed');}
export const coreSequenceStreamPacketIO=Object.freeze({fields,requested,sources,wire,writer,reader,json,hash,limits:L});
export function readWrittenCoreSequencePacket(write,root,ordinal){
 const row=write.packets[ordinal];if(!row||row.file!==String(ordinal).padStart(6,'0')+'.json.gz')fail('actual written packet required');write.current();
 const path=join(root,row.file),before=lstatSync(path);
 if(!before.isFile()||before.isSymbolicLink()||before.size!==row.storedBytes)fail('complete written packet differs');
 const packed=readFileSync(path);if(!fileSame(before,lstatSync(path))||hash(packed)!==row.storedSha256)fail('written packet changed');
 let raw;try{raw=gunzipSync(packed,{maxOutputLength:Math.max(1,row.bytes)});}catch{fail('written packet gzip bound');}
 if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('complete written byte inverse differs');
 const value=JSON.parse(raw);if(json(value)!==raw.toString('utf8'))fail('canonical written packet required');write.current();return raw;
}
`;
const INPUTS=[['tools/translation/source-backed-core-adoption-sequence.mjs','tools/translation/core-sequence-stage-source.mjs'],['tools/translation/source-backed-core-sequence-packets.mjs','tools/translation/core-sequence-stream-packet-io.mjs']];
const rule=(a,b,id)=>({id,edits:[{span:[0,a.length],expected:a,replacement:b}]});
export function prepareCoreSequenceStreamSources({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const inputs=[],files=[];
 for(const [at,[originalPath,path]]of INPUTS.entries()){
  const before=readFileSync(resolve(root,originalPath),'utf8'),file=ts.createSourceFile(originalPath,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)fail('complete native original grammar differs');inputs.push({path:originalPath,source:before,sha256:hash(before)});
  let language=before,after;const selections=[];
  if(at===1){
   const functions=new Set(['fields','requested','sources','wire','writer','reader']);
   const chosen=file.statements.filter(node=>ts.isImportDeclaration(node)||ts.isVariableStatement(node)&&!node.declarationList.declarations.some(row=>row.name.getText(file)==='SOURCE_BACKED_CORE_SEQUENCE_PACKET_LIMITS')||ts.isFunctionDeclaration(node)&&functions.has(node.name?.text));
   if(chosen.filter(ts.isFunctionDeclaration).length!==functions.size)fail('complete original IO helper set differs');
   // Retain the real exported limits as well, with exact native source bytes.
   const limits=file.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(file)==='SOURCE_BACKED_CORE_SEQUENCE_PACKET_LIMITS'));if(!limits)fail('actual packet limits absent');
   const selected=[...chosen,limits].sort((a,b)=>a.pos-b.pos);
   language=selected.map(node=>{const text=node.getText(file);selections.push({span:[node.getStart(file),node.end],source:text,kind:node.kind});return text;}).join('\n')+'\n';
   const parsed=ts.createSourceFile(path,language,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),constants=parsed.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]);
   const schema=constants.filter(node=>node.name.getText(parsed)==='SCHEMA');if(schema.length!==1||!ts.isStringLiteral(schema[0].initializer)||schema[0].initializer.text!=='router-source-backed-core-sequence-gzip-packets-v1')fail('exact original schema literal differs');
   const literal=schema[0].initializer;after=language.slice(0,literal.getStart(parsed))+JSON.stringify('router-source-backed-core-sequence-stream-packets-v1')+language.slice(literal.end)+IO_HOOK.replace('@ORIGINAL_SOURCE_SHA256@',hash(before));
  }else after=language+"\nimport {readFileSync as readOriginalSequenceStreamSource} from 'node:fs';\n"+STAGE.replace('@ORIGINAL_SOURCE_SHA256@',hash(before));
  const native=ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(native.parseDiagnostics.length||after.split('\n').length>=1000)fail('complete generated grammar/line budget differs');
  const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),sequence={languageRules:[rule(before,language,'javascript:copy-complete-original-native-stage-and-packet-helpers')],repositoryRules:[rule(language,after,'router:explicit-stage-lifecycle-and-stream-only-transport-schema')]};
  const languageRun=applyConcreteSyntaxSubstitutions(first.document,{languageRules:sequence.languageRules,repositoryRules:[]}),languageMeta=serializeConcreteSyntaxMeta(languageRun.value);if(transportConcreteSyntaxMeta(languageMeta).source!==language)fail('complete native-selected language CST differs');
  const run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value);if(transportConcreteSyntaxMeta(afterMeta).source!==after)fail('complete generated CST differs');
  const stages=[{phase:'language',before,after:language,beforeMeta:first.meta,afterMeta:languageMeta},{phase:'repository',before:language,after,beforeMeta:languageMeta,afterMeta}];
  for(const stage of stages){const restored=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(stage.afterMeta).document,{languageRules:stage.phase==='language'?[rule(stage.after,stage.before,'javascript:restore-whole-native-selected-parent')]:[],repositoryRules:stage.phase==='repository'?[rule(stage.after,stage.before,'router:restore-whole-stage-parent')]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(restored.value)).source!==stage.before)fail('complete phase inverse differs');stage.completeInverse=true;}
  const reverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[rule(after,before,'javascript:restore-complete-original-module')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(reverse.value)).source!==before)fail('complete original inverse differs');
  let current=null;try{current=readFileSync(resolve(root,path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  files.push({path,originalPath,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta,inverse:before,sequence,trace:run.trace,stages,selections,nativeBindings});
 }
 for(const input of inputs)if(readFileSync(resolve(root,input.path),'utf8')!==input.source)fail('complete original input changed');
 return {schema:'core-sequence-stream-source-v1',typescriptVersion:ts.version,inputs,files,defaultAPIsUnchanged:true,sourceAuthority:false,semanticAdmission:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))fail('use --write|--check');const plan=prepareCoreSequenceStreamSources();
 if(args[0]==='--write'){for(const row of plan.files){let actual=null;try{actual=readFileSync(resolve(ROOT,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}if(actual!==row.current)fail('current output changed');}for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('actual generated complete source is stale');
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),typescriptVersion:plan.typescriptVersion,semanticAdmission:false}));
}
