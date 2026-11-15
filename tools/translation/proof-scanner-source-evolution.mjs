// Complete original/current scanner source equations. DATA only.
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {deriveGuardedProofLexingConsumerSource} from './prepare-guarded-proof-lexing.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const path='tools/translation/private-native-proof-json.mjs';
const originalPin='b02892e676b928339f15d2a529d0467dfd60efedbe8e991df0910400289db338';
const additivePin='f23c8f96cddf92af07495e67622fd98d8b9bcf04b9ed62a78693ee7455ba027b';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Proof scanner source evolution: '+message);};
function stage(before,after,phase){
 const beforeMeta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(before,{language:'JavaScript'}).document),fresh=transportConcreteSyntaxMeta(beforeMeta);
 const rule={id:'proof-scanner:'+phase,edits:[{span:[0,before.length],expected:before,replacement:after}]},sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
 const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(afterMeta);
 const inverseSequence={languageRules:[],repositoryRules:[{id:'proof-scanner:restore-complete-source',edits:[{span:[0,after.length],expected:after,replacement:before}]}]};
 const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(parsed.document,inverseSequence).value));
 if(fresh.source!==before||parsed.source!==after||inverse.source!==before)fail('complete serialized/reparsed source or inverse differs');
 return {phase,before,after,beforeMeta,afterMeta,sequence,inverseSequence,inverse:before,trace:run.trace};
}
export function deriveProofScannerSourceEvolution(current){
 if(typeof current!=='string'||Buffer.byteLength(current)>65536)fail('bounded complete source required');
 const guarded=deriveGuardedProofLexingConsumerSource(current,path),unguarded=guarded.source;
 if(hash(unguarded)!==additivePin)fail('complete additive scanner source pin differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const file=ts.createSourceFile(path,unguarded,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete native grammar differs');
 const selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='privateNativeProofJsonDataWithinBudget');
 if(selected.length!==1)fail('one native stateless export required');
 const node=selected[0],span=[node.getFullStart(),node.end],removed=unguarded.slice(...span),original=unguarded.slice(0,span[0])+unguarded.slice(span[1]);
 if(hash(original)!==originalPin||original.slice(0,span[0])+removed+original.slice(span[0])!==unguarded)fail('complete original scanner pin or native inverse differs');
 return {path,original,unguarded,current,originalSha256:originalPin,additiveSha256:additivePin,currentSha256:hash(current),nativeSelection:{span,source:removed},guarded,
  stages:[stage(original,unguarded,'language'),stage(unguarded,current,'repository')],inverse:original,sourceAuthority:false,runtimeAuthority:false};
}
