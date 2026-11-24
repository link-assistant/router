import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {prepareSchemarsEnclosingAdoption} from '../prepare-schemars-enclosing-adoption.mjs';
import {deriveSchemarsEnclosingImportHistory,SCHEMARS_ENCLOSING_ORIGINAL,SCHEMARS_ENCLOSING_TEST} from '../schemars-enclosing-history.mjs';
import {prepareSchemarsWithOutputProposal} from '../prepare-schemars-with-output.mjs';
import {createDeriveFootprintContext,deriveFootprintOriginalModule} from '../derive-footprints.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import * as dispatch from '../schemars-enclosing-output-dispatch.mjs';
import * as old from '../schemars-bang-footprints.mjs';
import * as specialized from '../schemars-with-bang-candidate.mjs';
import * as foreignIssuer from '../schemars-with-context-candidate.mjs';
const root=new URL('../../../',import.meta.url),rootPath=fileURLToPath(root),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const withSource='/// Retained original docs.\n#[derive(schemars::JsonSchema)]#[schemars(with="String")]pub enum Entry{First,Last}';
function fixture(source=withSource){
 const context=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source,configurationCondition:'active'}],dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates.find(row=>row.name==='Entry');
 assert.ok(certificate);const module=deriveFootprintOriginalModule(context,certificate),item=originalSourceModuleItems(module).find(row=>row.start===certificate.span.start&&row.end===certificate.span.end);return {context,certificate,module,item};
}
function canonical(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document),parsed=transportConcreteSyntaxMeta(wire);assert.equal(parsed.source,source);return {wire,...parsed};}
// The trial imports the complete original issuer after its one import edit.
// Relative imports alone are relocated by actual native module-specifier spans;
// no proof or private context crosses this independently instantiated issuer.
async function loadIssuer(t,row){
 const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');const file=ts.createSourceFile(row.path,row.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);
 const base=new URL(row.path,root),edits=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text.startsWith('.')).map(node=>({span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],expected:row.after.slice(node.moduleSpecifier.getStart(file),node.moduleSpecifier.end),replacement:JSON.stringify(new URL(node.moduleSpecifier.text,base).href)}));assert.ok(edits.length>0);
 let source=row.after;for(const edit of [...edits].reverse()){assert.equal(source.slice(...edit.span),edit.expected);source=source.slice(0,edit.span[0])+edit.replacement+source.slice(edit.span[1]);}
 let inverse=source;for(const edit of edits){assert.equal(inverse.slice(edit.span[0],edit.span[0]+edit.replacement.length),edit.replacement);inverse=inverse.slice(0,edit.span[0])+edit.expected+inverse.slice(edit.span[0]+edit.replacement.length);}assert.equal(inverse,row.after);
 let current=canonical(row.after);const stages=[];
 for(const [phase,before,after]of [['language',row.after,row.after],['repository',row.after,source]]){
  const rule=(a,b)=>({id:'router:trial-native-module-imports',edits:[{span:[0,a.length],expected:a,replacement:b}]}),sequence={languageRules:[],repositoryRules:phase==='repository'?[rule(before,after)]:[]},run=applyConcreteSyntaxSubstitutions(current.document,sequence),wire=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(wire),restore={languageRules:[],repositoryRules:phase==='repository'?[rule(after,before)]:[]},restored=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(parsed.document,restore).value));assert.equal(parsed.source,after);assert.equal(restored.source,before);stages.push({phase,before,after,beforeMeta:current.wire,afterMeta:wire,sequence,inverseSequence:restore,inverse:restored.source});current={...parsed,wire};
 }
 const directory=mkdtempSync(join(tmpdir(),'schemars-same-issuer-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,'issuer.mjs');writeFileSync(path,current.source,{flag:'wx'});assert.equal(readFileSync(path,'utf8'),source);assert.equal(stages[0].inverse,row.after);assert.equal(stages[1].inverse,row.after);return import(pathToFileURL(path).href);
}

test('complete genuine history proposes only the same issuer import and retains all eight original bodies',{timeout:60000},()=>{
 const plan=prepareSchemarsEnclosingAdoption({root:rootPath});assert.equal(plan.files.length,3);assert.equal(plan.defaultInstalled,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.existingEightCaseBodiesAndDeadlinesUnchanged,true);
 const row=plan.files.find(row=>row.path===SCHEMARS_ENCLOSING_ORIGINAL);assert.equal(row.beforeSha256,'65109370660c0c64885831baadfa71f6be5d03698a5a9591229be5d2910b5d9a');assert.equal(row.nativeEdits.length,1);assert.equal(row.nativeInverse,row.before);
 for(const file of plan.files){assert.equal(transportConcreteSyntaxMeta(file.beforeMeta).source,file.before);assert.equal(transportConcreteSyntaxMeta(file.afterMeta).source,file.after);assert.equal(file.inverse,file.before);assert.equal(file.nativeInverse,file.before);assert.deepEqual(file.stages.map(row=>row.phase),['language','repository']);}
 const ts=ownershipCompiler(),control=plan.files.find(row=>row.path===SCHEMARS_ENCLOSING_TEST),calls=source=>{const file=ts.createSourceFile(control.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);return file.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(file)==='test').map(node=>node.getText(file));};assert.equal(calls(control.before).length,8);assert.deepEqual(calls(control.after),calls(control.before));assert.equal(control.nativeEdits.length,1);
 const oldHistory=deriveSchemarsEnclosingImportHistory({original:row.before,source:row.before}),newHistory=deriveSchemarsEnclosingImportHistory({original:row.before,source:row.after});assert.equal(oldHistory.restored,row.before);assert.equal(newHistory.restored,row.before);assert.throws(()=>deriveSchemarsEnclosingImportHistory({original:row.before,source:row.after+'\n'}));
 const candidate=prepareSchemarsWithOutputProposal({root:rootPath});for(const input of candidate.inputs)assert.equal(hash(readFileSync(new URL(input.path,root),'utf8')),input.sha256);
});

test('dispatcher selects genuine old or Type-override proofs and readers require private membership',{timeout:60000},()=>{
 const selected=fixture(),withProof=dispatch.proveSchemarsBangFootprint(selected);assert.equal(specialized.isSchemarsWithOutput(withProof),true);assert.equal(old.isSchemarsBangFootprint(withProof),false);assert.equal(dispatch.assertSchemarsBangFootprint(withProof,selected.context,selected.certificate),withProof);assert.ok(dispatch.originalSchemarsOutput(withProof,selected.context,selected.certificate,selected.module,selected.item));assert.throws(()=>old.proveSchemarsBangFootprint(selected));
 const original=fixture('#[derive(schemars::JsonSchema)]pub enum Entry{First,Last}'),oldProof=old.proveSchemarsBangFootprint(original),routed=dispatch.proveSchemarsBangFootprint(original);assert.equal(old.isSchemarsBangFootprint(routed),true);assert.equal(specialized.isSchemarsWithOutput(routed),false);assert.equal(dispatch.assertSchemarsBangFootprint(oldProof,original.context,original.certificate),oldProof);assert.ok(dispatch.originalSchemarsOutput(oldProof,original.context,original.certificate,original.module,original.item));
 for(const proof of [withProof,oldProof])for(const fake of [structuredClone(proof),{...proof},new Proxy(proof,{})]){assert.equal(dispatch.isSchemarsBangFootprint(fake),false);assert.throws(()=>dispatch.assertSchemarsBangFootprint(fake,selected.context,selected.certificate));assert.throws(()=>dispatch.originalSchemarsOutput(fake,selected.context,selected.certificate,selected.module,selected.item));}
});

test('one-import original issuer closes its own output and rejects foreign issuer contexts and effects',{timeout:60000},async t=>{
 const plan=prepareSchemarsEnclosingAdoption({root:rootPath}),row=plan.files.find(row=>row.path===SCHEMARS_ENCLOSING_ORIGINAL),issuer=await loadIssuer(t,row),input=fixture(),context=issuer.createDeriveEnclosingNamespaceContext({deriveContext:input.context}),certificate=issuer.deriveEnclosingNamespaceOutputAt(context,input.context,input.module,input.item);assert.ok(certificate,JSON.stringify(context.diagnostics));assert.deepEqual(certificate.residualOwners,[]);assert.equal(certificate.generatedImplBehavior,false);
 const effect=issuer.proveDeriveEnclosingNamespaceEffect(context,input.context,input.module,input.item),facts=issuer.deriveEnclosingNamespaceEffectFacts(effect,context,input.context,input.module,input.item);assert.equal(facts.runtimeAuthority,false);assert.equal(facts.generatedImplBehavior,false);
 const foreign=foreignIssuer.createDeriveEnclosingNamespaceContext({deriveContext:input.context});assert.equal(issuer.isDeriveEnclosingNamespaceContext(foreign),false);assert.throws(()=>issuer.deriveEnclosingNamespaceOutputAt(foreign,input.context,input.module,input.item));assert.throws(()=>foreignIssuer.deriveEnclosingNamespaceEffectFacts(effect,foreign,input.context,input.module,input.item));assert.throws(()=>issuer.deriveEnclosingNamespaceEffectFacts({...effect},context,input.context,input.module,input.item));
 const second=fixture();assert.throws(()=>issuer.deriveEnclosingNamespaceEffectFacts(effect,context,second.context,second.module,second.item));
});

test('forged accessor proxy source and unsupported helper carriers cannot select a new private output',{timeout:60000},()=>{
 const row=fixture();let reads=0;const options=Object.defineProperty({},'context',{get(){reads++;throw Error('must not read');}}),certificate=Object.defineProperty({},'attributes',{get(){reads++;throw Error('must not read');}});
 for(const input of [options,new Proxy(row,{get(){reads++;throw Error('must not read');}}),{context:row.context,certificate},{context:structuredClone(row.context),certificate:row.certificate},{context:row.context,certificate:structuredClone(row.certificate)}])assert.throws(()=>dispatch.proveSchemarsBangFootprint(input));assert.equal(reads,0);
 for(const source of [withSource.replace('with="String"','schema_with="callback"'),withSource.replace('with="String"','with="callback!()"'),withSource.replace('with="String"','with="String",with="Other"'),withSource.replace('First,','#[unknown]First,')])assert.throws(()=>dispatch.proveSchemarsBangFootprint(fixture(source)));
 const proof=dispatch.proveSchemarsBangFootprint(row),other=fixture();assert.throws(()=>dispatch.assertSchemarsBangFootprint(proof,other.context,other.certificate));assert.throws(()=>dispatch.originalSchemarsOutput(proof,row.context,row.certificate,{...row.module,source:row.module.source+' '},row.item));
});
