// Independent actual standard-loop regression SOURCE; execute after full draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCoreJsonLoopCorpus} from '../migrate-core-json-loops.mjs';
import {proposeCoreAdoptionSequence} from '../propose-json-loop-adoption-corpus.mjs';
import {planCheckedJsonLoopAdoption,applyCheckedJsonLoopAdoption} from '../checked-json-loop-adoption.mjs';
import {prepareJsonLoopAdoption} from '../prepare-json-loop-adoption.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
const limits={timeout:60_000},C='crate::translation_core::',T=C+'Json',S='crate::translation_state_core::';
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn collected(values:&[${T}],initial:${T})->${T}{let mut result=initial;for value in values{result=${S}json_append(result,value.clone());}result}
pub fn replaced(values:&[${T}],initial:${T})->${T}{let mut result:${T}=${C}json_copy(&initial);for value in values.iter(){result=${C}json_with_field(result,"last",value.clone());}result}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE,'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE};}
const propose=input=>proposeCoreJsonLoopCorpus({entry:'src/lib.rs',files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
test('actual standard slice loops become checked owned folds with empty and ordered update behavior',limits,async()=>{
 const proposal=propose(files()),selections=proposal.proposals.flatMap(row=>row.selections);assert.equal(selections.length,2);assert.ok(selections.every(row=>row.operation==='json_fold'&&row.oldTraitDispatchProved===false&&row.oldDropTimingProved===false));for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['collected','replaced'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{const values=Object.freeze([nil(),bool(false),text('λ😀')]);assert.deepEqual(api.collected(values,array([])),array(values));assert.deepEqual(api.collected([],array([])),array([]));assert.deepEqual(api.replaced(values,nil()),object([['last',text('λ😀')]]));assert.deepEqual(api.replaced([],nil()),nil());},{childTimeoutMs:20_000});
});
test('general control effects mutable slices and changed native fold boundaries stay unmodified',limits,()=>{
 const bodies=[source.replace('result='+S+'json_append(result,value.clone());','return value.clone();'),source.replace('value.clone()','unknown(value)'),source.replace('values:&[','values:&mut ['),'trait Unknown {}\n'+source];for(const body of bodies){const proposal=propose(files(body));assert.ok(proposal.proposals.some(row=>row.preserved.length));}
 const changed=files();changed['src/translation_collections_core.rs']+='\n// changed native source\n';assert.throws(()=>propose(changed));
});
test('complete bounded loop packets and fresh selected installation retain actual whole functions',limits,async t=>{
 const root=mkdtempSync(join(tmpdir(),'router-json-loop-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};for(const [path,value]of Object.entries(files()))write(path,value);write('Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'});git(['init','--quiet']);git(['add','.']);git(['commit','--quiet','-m','Original loop source']);const output=join(root,'..','loop-packets-'+root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root,output},'json-loops','gzip');assert.equal(receipt.sequence,'json-loops');
 const options={root,functions:[{path:'src/lib.rs',name:'collected'}]},proposal=planCheckedJsonLoopAdoption(options),row=proposal.outputs.find(row=>row.kind==='adopted-source');assert.equal(proposal.functions.length,1);assert.ok(row.after.includes('json_fold(values, initial'));assert.ok(row.after.includes('for value in values.iter()'));const forged=structuredClone(proposal);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedJsonLoopAdoption(JSON.stringify(forged),options),/fresh source translation/u);const applied=applyCheckedJsonLoopAdoption(JSON.stringify(proposal),options);assert.ok(applied.changed.includes('src/lib.rs'));assert.equal(applied.rustExecuted,false);
});
test('all three complete source copies retain their original preparation and CST inverse boundaries',limits,()=>{
 const proposal=prepareJsonLoopAdoption();assert.equal(proposal.files.length,3);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.semanticAuthority,false);
});
