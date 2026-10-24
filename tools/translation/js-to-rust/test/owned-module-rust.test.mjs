// Independent packaged reverse regression SOURCE. Do not run during bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {translateOwnedModuleProject} from '../owned-module-project.mjs';
import {translateOwnedModuleRust} from '../owned-module-rust.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources} from '../owned-outcome.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {prepareOwnedModuleReverseSources} from '../../prepare-owned-module-reverse-sources.mjs';
import {prepareOwnedModuleProjectSources} from '../../prepare-owned-module-project-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
import {json_macro_null as nil,json_macro_bool as bool} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},project={entry:'entry.mjs',language:'JavaScript',modules:[{path:'entry.mjs',source:"import {cloned as selected} from './helper.mjs';\nexport {cloned as publicTitle} from './helper.mjs';\n/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */\nexport function run(value){return selected(value);}\n"},{path:'helper.mjs',source:"import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\n/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */\nexport function cloned(value){return copy(value);}\n"}]};
function fixture(){const data=ownedStateReceivingData(project.modules);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE});const forward=translateOwnedModuleProject(project,{context:createOwnedOutcomeContext(data)});return {data,forward,options:{sourcePath:'generated/project.rs',javascriptPath:forward.ownedProjectBundlePath,typescriptOutputPath:forward.ownedProjectTypeScriptBundlePath}};}
function received(row,source=row.forward.rust,{paired=true}={}){return createOwnedOutcomeContext({...row.data,files:row.data.files.concat([{path:row.options.sourcePath,source}],paired?[{path:row.options.javascriptPath,source:row.forward.javascript}]:[])});}
test('complete original packaged Rust freshly reproduces its body namespace and public aliases',limits,()=>{
 const row=fixture(),result=translateOwnedModuleRust(row.forward.rust,{...row.options,context:received(row)});assert.ok(sameRustSourceSyntax(result.rust,row.forward.rust));assert.equal(result.ownedRustSourceHistory.equation.inverse,row.forward.rust);assert.equal(transportConcreteSyntaxMeta(result.ownedRustSourceHistory.concreteSyntax).source,row.forward.rust);assert.equal(result.ownedRustSourceHistory.moduleEnvelope.aliases.length,2);assert.match(result.javascript,/ as publicTitle/);assert.equal(result.rustExecuted,false);
 const unpaired=translateOwnedModuleRust(row.forward.rust,{...row.options,context:received(row,row.forward.rust,{paired:false})});assert.ok(sameRustSourceSyntax(unpaired.rust,row.forward.rust));assert.match(unpaired.javascript,/public_title/);
});
test('emitted actual JavaScript executes after whole packaged root rechecking',limits,async t=>{
 const row=fixture(),result=translateOwnedModuleRust(row.forward.rust,{...row.options,context:received(row)}),root=mkdtempSync(join(tmpdir(),'router-owned-project-rust-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write(file.path,file.source);write(row.options.javascriptPath,result.javascript);const module=await import(pathToFileURL(join(root,row.options.javascriptPath)).href);assert.deepEqual(Object.keys(module).sort(),['publicTitle','run']);for(const value of [nil(),bool(false)]){assert.deepEqual(module.run(value),value);assert.deepEqual(module.publicTitle(value),value);}
});
test('unknown root effects malformed modules private or missing aliases and forged native support refuse',limits,()=>{
 const row=fixture(),bad=[row.forward.rust+'\npub fn injected(){}\n',row.forward.rust.replace('mod __router_owned_project','pub mod __router_owned_project'),row.forward.rust.replace(/pub use self::__router_owned_project::[a-z0-9_]+ as public_title;/u,'pub use self::__router_owned_project::absent as public_title;'),row.forward.rust.replace('fn __ro_domain','fn forged_support'),row.forward.rust.replace(' as public_title;',' as self;')];for(const source of bad){assert.notEqual(source,row.forward.rust);assert.throws(()=>translateOwnedModuleRust(source,{...row.options,context:received(row,source)}));}assert.throws(()=>translateOwnedModuleRust(row.forward.rust+'\n',{...row.options,context:received(row)}),/authoritative Rust source/u);
});
test('all three complete original source predecessors compose both project histories without stored verdicts',limits,()=>{const current=prepareOwnedModuleReverseSources();assert.equal(current.files.length,3);for(const plan of [current,prepareOwnedModuleProjectSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(current.receivingExecuted,false);});
