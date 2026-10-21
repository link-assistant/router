#!/usr/bin/env node
// Source proposal only: same existing issuer, one native-selected import edit.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {readSchemarsEnclosingHistory,assertSchemarsEnclosingHistoryFresh,captureSchemarsEnclosingHistory,deriveSchemarsEnclosingImportHistory,SCHEMARS_ENCLOSING_ORIGINAL,SCHEMARS_ENCLOSING_OLD_CONTROL,SCHEMARS_ENCLOSING_TEST} from './schemars-enclosing-history.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),SELF='tools/translation/prepare-schemars-enclosing-adoption.mjs',DISPATCH='tools/translation/schemars-enclosing-output-dispatch.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Schemars enclosing import adoption: '+message);};
const read=(root,path)=>readFileSync(resolve(root,path),'utf8');
function canonical(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document),result=transportConcreteSyntaxMeta(wire);if(result.source!==source)fail('complete concrete source differs');return {...result,wire};}
function plan({root,path,before,after,current,edit=null}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const first=canonical(before),stages=[];let concrete=first;
 for(const [phase,start,end]of [['language',before,before],['repository',before,after]]){
  const rule=(old,next,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:next}]}),sequence={languageRules:[],repositoryRules:phase==='repository'&&start!==end?[rule(start,end,'router:actual-original-enclosing-Schemars-import')]:[]},run=applyConcreteSyntaxSubstitutions(concrete.document,sequence),wire=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(wire),inverseSequence={languageRules:[],repositoryRules:phase==='repository'&&start!==end?[rule(end,start,'router:restore-whole-genuine-original-enclosing-source')]:[]},inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(parsed.document,inverseSequence).value));
  if(parsed.source!==end||inverse.source!==start)fail('whole serialized/reparsed phase or inverse differs');stages.push({phase,before:start,after:end,beforeMeta:concrete.wire,afterMeta:wire,sequence,inverseSequence,inverse:inverse.source,trace:run.trace});concrete={...parsed,wire};
 }
 let inverse=after;for(const stage of [...stages].reverse()){if(inverse!==stage.after)fail('whole source phase association differs');inverse=stage.inverse;}if(inverse!==before)fail('complete source inverse differs');
 const syntax=ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(syntax.parseDiagnostics.length)fail('complete native after source grammar differs');
 let nativeInverse=after;if(edit){if(after.slice(edit.span[0],edit.span[0]+edit.replacement.length)!==edit.replacement)fail('actual native after span differs');nativeInverse=after.slice(0,edit.span[0])+edit.expected+after.slice(edit.span[0]+edit.replacement.length);}if(nativeInverse!==before)fail('whole independent native inverse differs');
 return {path,before,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.wire,afterMeta:concrete.wire,stages,nativeEdits:edit?[edit]:[],nativeInverse,inverse,nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),compositionRequired:current!==null&&current!==before&&current!==after};
}
function original(history,path){const rows=history.files.filter(row=>row.path===path);if(rows.length!==1)fail('one complete genuine original source required');return rows[0].source;}
function testImport(ts,source){
 const file=ts.createSourceFile(SCHEMARS_ENCLOSING_TEST,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original eight-case native syntax differs');const imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../derive-enclosing-namespace-context.mjs');if(imports.length!==1)fail('one actual old-context test import required');const selected=imports[0],elements=selected.importClause?.namedBindings?.elements;
 if(!elements||elements.length!==2||JSON.stringify(elements.map(row=>[(row.propertyName??row.name).text,row.name.text]))!==JSON.stringify([['createDeriveEnclosingNamespaceContext','createOriginalEnclosing'],['deriveEnclosingNamespaceOutputAt','originalEnclosingAt']]))fail('complete original old-context alias bindings differ');
 const node=selected.moduleSpecifier,span=[node.getStart(file),node.end];return {span,expected:source.slice(...span),replacement:"'../schemars-enclosing-original-control.mjs'"};
}
export function deriveSchemarsEnclosingImport({root=ROOT,source}={}){
 root=resolve(root);const history=readSchemarsEnclosingHistory({root}),before=original(history,SCHEMARS_ENCLOSING_ORIGINAL),native=deriveSchemarsEnclosingImportHistory({original:before,source:source??before}),row=plan({root,path:SCHEMARS_ENCLOSING_ORIGINAL,before,after:native.after,current:native.current,edit:native.edit});assertSchemarsEnclosingHistoryFresh({root,history});return {...row,history,nativeHistory:native,sourceAuthority:false,runtimeAuthority:false};
}
export function prepareSchemarsEnclosingAdoption({root=ROOT}={}){
 root=resolve(root);const history=readSchemarsEnclosingHistory({root}),before=original(history,SCHEMARS_ENCLOSING_ORIGINAL),birth=deriveSchemarsEnclosingImportHistory({original:before,source:before}),physical=read(root,SCHEMARS_ENCLOSING_ORIGINAL),dispatch=read(root,DISPATCH),self=read(root,SELF),testBefore=original(history,SCHEMARS_ENCLOSING_TEST),testPhysical=read(root,SCHEMARS_ENCLOSING_TEST),ts=ownershipCompiler(),testEdit=testImport(ts,testBefore),testAfter=testBefore.slice(0,testEdit.span[0])+testEdit.replacement+testBefore.slice(testEdit.span[1]);
 const files=[plan({root,path:SCHEMARS_ENCLOSING_ORIGINAL,before,after:birth.after,current:physical,edit:birth.edit}),plan({root,path:SCHEMARS_ENCLOSING_OLD_CONTROL,before,after:before,current:existsSync(resolve(root,SCHEMARS_ENCLOSING_OLD_CONTROL))?read(root,SCHEMARS_ENCLOSING_OLD_CONTROL):null}),plan({root,path:SCHEMARS_ENCLOSING_TEST,before:testBefore,after:testAfter,current:testPhysical,edit:testEdit})];
 const inputs=[{path:SCHEMARS_ENCLOSING_ORIGINAL,source:physical,sha256:hash(physical)},{path:SCHEMARS_ENCLOSING_TEST,source:testPhysical,sha256:hash(testPhysical)},{path:DISPATCH,source:dispatch,sha256:hash(dispatch)},{path:SELF,source:self,sha256:hash(self)},...history.inputs];
 const dispatcher={path:DISPATCH,source:dispatch,meta:canonical(dispatch).wire,nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,DISPATCH),dispatch)};
 // The birth plan remains derivable after another explicit layer changes the
 // physical body. Only a final composer can qualify that later whole source.
 for(const input of inputs)if(read(root,input.path)!==input.source)fail('fresh complete physical input changed');assertSchemarsEnclosingHistoryFresh({root,history});
 return {schema:'complete-schemars-enclosing-import-adoption-v1',inputs,history,dispatcher,files,compositionRequired:files.some(row=>row.compositionRequired),oldStandaloneAndBangAPIsUnchanged:true,existingEightCaseBodiesAndDeadlinesUnchanged:true,defaultInstalled:false,sourceAuthority:false,typeOwnerResolved:false,runtimeAuthority:false,performanceQualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(mode==='--capture-history'){if(rest.length!==1)fail('use --capture-history FRESH_OUTSIDE_DIRECTORY');console.log(JSON.stringify(captureSchemarsEnclosingHistory({root:ROOT,output:rest[0]})));}
 else{if(rest.length||!['--emit','--check'].includes(mode))fail('use --emit|--check');const proposal=prepareSchemarsEnclosingAdoption();if(mode==='--emit')console.log(JSON.stringify(proposal));else{if(proposal.compositionRequired||proposal.files.some(row=>row.current!==row.after))fail('birth layer is not the exact current source; use an explicit complete later-layer composer where required');console.log(JSON.stringify({checked:true,files:proposal.files.map(row=>({path:row.path,sha256:row.afterSha256})),sourceAuthority:false}));}}
}
