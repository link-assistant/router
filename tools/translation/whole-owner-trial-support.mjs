// Explicit source transport/proposal only; no default installation or execution.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {proposeCanonicalDeriveTrial} from './prepare-builtin-canonical-trial.mjs';
import {prepareWholeOwnerDeriveCandidate} from './prepare-whole-owner-derive-candidate.mjs';
import {prepareWholeOwnerOriginalTrial} from './prepare-whole-owner-original-trial.mjs';
import {COMPILER_SOURCE_INPUT_LIMITS} from './compiler-source-inputs.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const CODEC='tools/translation/builtin-source-meta.mjs',BANG='tools/translation/derive-bang-context.mjs',COPY='tools/translation/whole-owner-derive-bang-context-candidate.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Whole-owner trial source: '+message);};
const equal=(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))fail('complete source packet equation differs');};
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete actual source grammar differs');return file;}
function one(rows){if(rows.length!==1)fail('one actual complete original declaration required');return rows[0];}
function publicCreator(ts,path,source){const file=parse(ts,path,source),node=one(file.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='createDeriveBangContext'));if(!node.body||!node.modifiers?.some(row=>row.kind===ts.SyntaxKind.ExportKeyword)||node.parameters.length!==1)fail('actual public creator shape differs');return {file,node,source:node.getText(file)};}
function route(ts,path,source,original){const selected=publicCreator(ts,path,source);if(selected.source!==original)fail('original complete public creator was not preserved');const before=selected.node.body.getText(selected.file),after='{return createWholeOwnerDeriveBangContext({deriveContext});}';return {source:source.slice(0,selected.node.body.getStart(selected.file))+after+source.slice(selected.node.body.end),selection:{originalPublicSource:original,originalBody:before,selectedBodySpan:[selected.node.body.getStart(selected.file),selected.node.body.end],candidateBody:after}};}
function overlay(ts,root,path,original,language,candidate,selection){
 const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]}),sequence={languageRules:[rule(original,language,'javascript:route-actual-original-public-creator-to-complete-owner-operation')],repositoryRules:[rule(language,candidate,'router:physical-original-module-retains-complete-copied-issuer-closure')]};
 const before=transportConcreteSyntaxSource(original,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(before.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==candidate)fail('whole physical creator CST equation differs');
 const inverseSequence={languageRules:[rule(candidate,original,'javascript:restore-complete-original-public-creator-and-issuer')],repositoryRules:[]},restored=applyConcreteSyntaxSubstitutions(last.document,inverseSequence);if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(restored.value)).source!==original)fail('complete physical creator inverse differs');
 return {path,original,language,candidate,beforeMeta:before.meta,afterMeta,sequence,inverseSequence,inverse:original,trace:run.trace,nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),candidate),selection};
}
export function proposeWholeOwnerCanonicalTrial({root}={}){
 root=resolve(root);const canonical=proposeCanonicalDeriveTrial({root}),bulk=prepareWholeOwnerDeriveCandidate({root}),runner=prepareWholeOwnerOriginalTrial({root}),ts=ownershipCompiler();if(ts.version!=='5.9.3'||bulk.files.some(row=>row.current!==row.after)||runner.files.some(row=>row.current!==row.after))fail('fresh complete materialized whole-owner source and runner equations required');
 const original=one(bulk.inputs.filter(row=>row.path===BANG)).source,copy=one(bulk.files.filter(row=>row.path===COPY)),originalPublic=publicCreator(ts,BANG,original).source,language=route(ts,COPY,copy.language,originalPublic),candidate=route(ts,COPY,copy.after,originalPublic);
 const bang=overlay(ts,root,BANG,original,language.source,candidate.source,{language:language.selection,repository:candidate.selection}),codec={path:canonical.path,original:canonical.original,language:canonical.candidateProducer.files.find(row=>row.path===CODEC.replace(/\.mjs$/u,'-canonical-candidate.mjs')).language,candidate:canonical.candidate,beforeMeta:canonical.beforeMeta,afterMeta:canonical.afterMeta,sequence:canonical.sequence,inverseSequence:canonical.inverseSequence,inverse:canonical.inverse,trace:canonical.trace};
 const paths=[...new Set([...bulk.inputs.map(row=>row.path),...bulk.files.map(row=>row.path),'tools/translation/whole-owner-trial-support.mjs','tools/translation/prepare-whole-owner-original-trial.mjs','tools/translation/whole-owner-original-derive-trial.mjs','tools/translation/prepare-builtin-canonical-trial.mjs'])].sort(),requiredSourceInputs=paths.map(path=>{const bytes=readFileSync(resolve(root,path));if(bytes.length>COMPILER_SOURCE_INPUT_LIMITS.fileBytes)fail('source input file bound differs');return {path,bytes:bytes.length,sha256:hash(bytes)};});
 for(const row of requiredSourceInputs){const bytes=readFileSync(resolve(root,row.path));if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete source input changed during proposal');}
 return {schema:'isolated-original-derive-whole-owner-canonical-source-v1',overlays:[codec,bang],canonicalProducer:canonical,wholeOwnerProducer:bulk,requiredSourceInputs,test:canonical.test,originalPublicAPIUnchanged:true,originalTestUnchanged:true,productionSelected:false,trialSelected:true,performanceQualified:false,sourceAuthority:false,runtimeAuthority:false,scope:'fresh whole-owner creator plus existing canonical codec; later resolver reproofs retain original lane'};
}
function selected(overlays,path){
 if(!Array.isArray(overlays)||overlays.length!==2||new Set(overlays.map(row=>row.path)).size!==2||overlays.some(row=>![CODEC,BANG].includes(row.path)||typeof row.candidate!=='string'||row.candidate.length>COMPILER_SOURCE_INPUT_LIMITS.fileBytes||Buffer.byteLength(row.candidate)>COMPILER_SOURCE_INPUT_LIMITS.fileBytes))fail('exact complete physical codec and creator overlays required');
 return overlays.find(row=>row.path===path);
}
export function assertWholeOwnerTrialInputs(vector,proposal){
 selected(proposal.overlays,CODEC);for(const row of proposal.requiredSourceInputs){const fact=vector.files.find(item=>item.path===row.path);if(!fact||fact.bytes!==row.bytes||fact.sha256!==row.sha256)fail('complete actual candidate input absent from unchanged source universe: '+row.path);}
 for(const row of proposal.overlays){const fact=vector.files.find(item=>item.path===row.path);if(!fact||Buffer.byteLength(row.original)!==fact.bytes||hash(row.original)!==fact.sha256||row.original===row.candidate)fail('actual original physical overlay source join differs');}
}
export function wholeOwnerTrialFilePacket(fact,original,trial,{overlays}={}){
 const row=selected(overlays,fact.path),limit=COMPILER_SOURCE_INPUT_LIMITS.fileBytes;if(!Buffer.isBuffer(original)||!Buffer.isBuffer(trial)||original.length!==fact.bytes||hash(original)!==fact.sha256||original.length>limit||trial.length>limit)fail('complete bounded original/trial source bytes required');
 if(row?original.equals(trial)||!trial.equals(Buffer.from(row.candidate)):!original.equals(trial))fail('only the exact complete proposed overlays may differ');
 return {schema:'complete-original-and-whole-owner-trial-file-v1',path:fact.path,original:{...fact,base64:original.toString('base64')},trial:{sourceAssociation:row?'complete-candidate-source':'same-original-source',bytes:trial.length,sha256:hash(trial),...(row?{base64:trial.toString('base64')}:{})}};
}
export function decodeWholeOwnerTrialFilePacket(packet,fact,{overlays}={}){
 const row=selected(overlays,fact.path);if(typeof packet?.original?.base64!=='string'||packet.original.base64.length>Math.ceil(COMPILER_SOURCE_INPUT_LIMITS.fileBytes/3)*4)fail('bounded complete original encoding required');
 const original=Buffer.from(packet.original.base64,'base64'),trial=row?Buffer.from(row.candidate):original;equal(packet,wholeOwnerTrialFilePacket(fact,original,trial,{overlays}));return {original,trial};
}
