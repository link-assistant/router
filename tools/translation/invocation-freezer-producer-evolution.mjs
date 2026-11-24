// Complete receiving history only; original scanner/runtime issuers stay private.
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const PATH='tools/translation/prepare-invocation-local-freezer.mjs';
const ORIGINAL='f0cdde90b547b6c7a6f4e638ac4b12d3c323ca541dd0bac6632924409a78c602';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Invocation freezer producer history: '+message);};
const changes=[
 ["const before=readFileSync(resolve(root,row.path),'utf8');if(before!==row.original&&before!==row.after)fail('unexpected complete current source');",
  "const before=readFileSync(resolve(root,row.path),'utf8');let sourceEvolution=null,language=row.language,after=row.after;\n  if(before!==row.original&&before!==row.after){\n   if(row.path!=='tools/translation/private-native-proof-json.mjs')fail('unexpected complete current source');\n   sourceEvolution=deriveProofScannerSourceEvolution(before);if(sourceEvolution.original!==row.after)fail('complete original scanner source differs');\n   language=sourceEvolution.unguarded;after=sourceEvolution.current;\n  }"],
 ["stage(row.original,row.language,'javascript:invocation-local-immutable-scalar-traversal-costs')","stage(row.original,language,'javascript:invocation-local-immutable-scalar-traversal-costs')"],
 ["stage(row.language,row.after,'router:bind-private-synchronous-proof-cost-lifetime')","stage(language,after,'router:bind-private-synchronous-proof-cost-lifetime')"],
 ["if(last.source!==row.after)","if(last.source!==after)"],
 ["stage(row.after,row.original,'javascript:restore-complete-original-freezer')","stage(after,row.original,'javascript:restore-complete-original-freezer')"],
 ["  files.push({...row,before,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:row.original});",
  "  if(readFileSync(resolve(root,row.path),'utf8')!==before)fail('complete physical source changed');\n  files.push({...row,language,after,afterSha256:hash(after),before,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:row.original,sourceEvolution});"],
];
function grammar(ts,source){
 const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;
}
function one(rows,label){if(rows.length!==1)fail('one exact native selection required: '+label);return rows[0];}
function stage(before,after,phase,edits){
 const input=transportConcreteSyntaxSource(before,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(input.document);
 const fresh=transportConcreteSyntaxMeta(beforeMeta);if(fresh.source!==before)fail('complete phase input differs');
 const rule={id:'invocation-freezer-producer:'+phase,edits};
 const sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
 const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(afterMeta);
 if(parsed.source!==after)fail('complete phase output differs');
 const inverseRule={id:'invocation-freezer-producer:complete-inverse',edits:[{span:[0,after.length],expected:after,replacement:before}]};
 const inverse=applyConcreteSyntaxSubstitutions(parsed.document,{languageRules:phase==='language'?[inverseRule]:[],repositoryRules:phase==='repository'?[inverseRule]:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('complete phase inverse differs');
 return {phase,before,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:before};
}
export function deriveInvocationFreezerProducerEvolution(original,current){
 if(typeof original!=='string'||typeof current!=='string'||Buffer.byteLength(current)>65536||hash(original)!==ORIGINAL)fail('complete original/current source required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const file=grammar(ts,original),fn=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareInvocationLocalFreezer'),'original complete producer');
 let replacement=fn.getText(file);
 for(const [before,after]of changes){if(replacement.split(before).length!==2)fail('unique complete original operation required');replacement=replacement.replace(before,()=>after);}
 const selection={span:[fn.getStart(file),fn.end],expected:fn.getText(file),replacement};
 const language=original.slice(0,selection.span[0])+replacement+original.slice(selection.span[1]);
 const languageFile=grammar(ts,language),compiler=one(languageFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./js-to-rust/vendor/module-syntax.mjs'),'actual native compiler import');
 const imported="\nimport {deriveProofScannerSourceEvolution} from './proof-scanner-source-evolution.mjs';";
 const importEdit={span:[compiler.end,compiler.end],expected:'',replacement:imported};
 const after=language.slice(0,compiler.end)+imported+language.slice(compiler.end);grammar(ts,after);
 if(current!==original&&current!==after)fail('unregistered complete current producer');
 return {schema:'invocation-freezer-producer-evolution-v1',path:PATH,original,current,language,after,inverse:original,originalSha256:ORIGINAL,currentSha256:hash(current),afterSha256:hash(after),nativeSelections:[selection,importEdit],
  stages:[stage(original,language,'language',[selection]),stage(language,after,'repository',[importEdit])],sourceAuthority:false,runtimeAuthority:false};
}
