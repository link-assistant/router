// Actual complete project namespace contexts. All receiving execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withBorrowedJsonToolProject} from '../borrowed-json-tool-20261103-project.mjs';
import {withBorrowedJsonToolCallerSources} from '../borrowed-json-tool-20261103-requalification.mjs';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo} from '../policy-nominal-producer-20261101-corpus.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from '../json-capabilities.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import * as regular from '../semantic-meta.mjs';
import * as flat from '../semantic-meta-flat.mjs';
const caller='openai_tools.is_translatable';
function withInputs(run){
 return withActualPolicySourceUniverse({},context=>{
  const cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock},entry=policyOriginalEntry(context),paths=policyOriginalPaths(context),readSource=path=>policyOriginalSource(context,path);
  const options={entry,paths,readSource,cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE};
  return run(options);
 });
}
function selected(result){const declaration=result.executableDeclarations.find(row=>row.qualifiedName===caller);assert.ok(declaration,JSON.stringify(result.meta.refused.filter(row=>row.name===caller)));return declaration.lower();}
function sourceKey(program){const entry=[...program.declarations.values()].find(row=>row.k==='fn'&&row.params.some(parameter=>parameter.type.kind==='routerBorrowedJsonTool'));assert.ok(entry);assert.match(entry.borrowedJsonToolSourceKey,/^[a-f0-9]{64}$/u);return entry.borrowedJsonToolSourceKey;}
for(const mode of ['regular','flat-enclosing','owned-definitions']){
 test(mode+' identical caller bytes under independent genuine contexts retain separate live source associations',{timeout:900000},()=>withInputs(options=>{
  let firstText,secondText,firstFlat,secondFlat,firstKey,secondKey;
  withBorrowedJsonToolProject(options,first=>{
   const original=selected(first);firstKey=sourceKey(original.program);firstText=regular.serializeProgram(original.program);firstFlat=flat.serializeProgram(original.program);
   // New genuine project context; same original source bytes are intentional.
   withBorrowedJsonToolProject(options,second=>{
    const current=selected(second);secondKey=sourceKey(current.program);secondText=regular.serializeProgram(current.program);secondFlat=flat.serializeProgram(current.program);
    assert.notEqual(firstKey,secondKey);
    assert.equal(sourceKey(regular.parseProgram(firstText)),firstKey);assert.equal(sourceKey(flat.parseProgram(firstFlat)),firstKey);
    assert.equal(sourceKey(regular.parseProgram(secondText)),secondKey);assert.equal(sourceKey(flat.parseProgram(secondFlat)),secondKey);
    assert.equal(sourceKey(regular.parseProgram(firstText)),firstKey);
   },mode);
   assert.equal(sourceKey(regular.parseProgram(firstText)),firstKey);assert.equal(sourceKey(regular.parseProgram(secondText)),secondKey);
   // Repeated reconstruction in a context keeps its slot, rather than leaking
   // one new context ID per fresh original parser/semantic-meta reparse.
   for(let at=0;at<8;at++)assert.equal(sourceKey(flat.parseProgram(firstFlat)),firstKey);
  },mode);
  for(const [reader,text]of [[regular,firstText],[regular,secondText],[flat,firstFlat],[flat,secondFlat]])assert.throws(()=>withBorrowedJsonToolCallerSources(()=>reader.parseProgram(text)));
 }));
}
test('whole original root source changes create a separate namespace context while caller bytes stay untouched',{timeout:900000},()=>withInputs(options=>{
 const before=options.readSource(options.entry),after=before+'\n// independent receiving source universe\n',history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];assert.equal(history.inverse,before);assert.equal(transportConcreteSyntaxMeta(history.afterMeta).source,after);
 const receiving={...options,readSource:path=>path===options.entry?after:options.readSource(path)};
 withBorrowedJsonToolProject(options,original=>{
  const first=selected(original),saved=regular.serializeProgram(first.program),firstKey=sourceKey(first.program);
  withBorrowedJsonToolProject(receiving,next=>{const second=selected(next);assert.notEqual(firstKey,sourceKey(second.program));assert.equal(sourceKey(regular.parseProgram(saved)),firstKey);});
 });
}));
