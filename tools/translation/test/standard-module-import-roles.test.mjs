import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prepareStandardModuleImportRoles} from '../prepare-standard-module-import-roles.mjs';
import {migrateCoreLiteralText,proposeCoreLiteralTextCorpus} from '../migrate-core-literal-text.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {originalCorePreludeRootSource} from '../extensions/core-prelude-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function inverse(proposal){assert.equal(transportConcreteSyntaxMeta(proposal.before.meta).source,proposal.before.source);assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source,proposal.after.source);let source=proposal.after.source;for(const row of [...proposal.mapping].reverse())if(row.kind==='substitution'){assert.equal(source.slice(...row.after),row.replacement);source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);}assert.equal(source,proposal.before.source);assert.equal(proposal.executableAdmission,false);}

test('actual module-role source producer retains old standard-role bodies and complete CST inverses',{timeout:60000},()=>{
 const plan=prepareStandardModuleImportRoles(),ts=ownershipCompiler();assert.equal(plan.files.length,1);
 for(const row of plan.files){assert.equal(row.before,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);const functions=source=>{const file=ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);return new Map(file.statements.filter(ts.isFunctionDeclaration).map(n=>[n.name.text,n.getText(file)]));},before=functions(row.original),after=functions(row.after);for(const name of ['standardRole','standardTypes','closedDeclarations','dependencySnapshot','externalRoles'])assert.equal(after.get(name),before.get(name));}
 assert.equal(plan.newAcrossInvocationCaches,false);assert.equal(plan.originalTimeRoleUnchanged,true);assert.equal(plan.sourceAuthority,false);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.runtimeAuthority,false);
});

test('ordinary root module imports derive exact nontrait candidates from complete original std and core roots',{timeout:60000},()=>{
 const std=gunzipSync(readFileSync(new URL('../source-profiles/namespace-standard/rust-std-lib-1.89.0.rs.gz',import.meta.url))).toString('utf8'),core=originalCorePreludeRootSource().source;
 for(const path of ['std::fs','std::env','std::io','std::path','std::process','core::cmp']){const proposal=migrateCoreLiteralText('use '+path+';pub fn answer()->String{"module".to_owned()}');inverse(proposal);assert.equal(proposal.selections.length,1,path);assert.equal(proposal.edits.length,2,path);assert.equal(proposal.importRoles.length,1);const role=proposal.importRoles[0],step=role.role.route[0],source=path.startsWith('std::')?std:core;assert.equal(role.role.kind,'mod');assert.equal(step.sourceSha256,hash(source));assert.equal(step.itemSha256,hash(source.slice(step.span.start,step.span.end)));assert.equal(step.name,path.split('::')[1]);assert.equal(step.kind,'mod');assert.equal(step.namespaceComplete,false);assert.equal(step.runtimeAuthority,false);assert.equal(role.namespaceComplete,false);assert.equal(role.originalDispatchProved,false);assert.equal(role.executableAdmission,false);}
 const unchanged=migrateCoreLiteralText('use std::time::Duration;pub fn answer()->String{"old time".to_owned()}');inverse(unchanged);assert.equal(unchanged.selections.length,1);assert.equal(unchanged.importRoles[0].role.kind,'struct');
});

test('combined complete module imports still require actual checked Core bodies and independent strict targets',{timeout:60000},async()=>{
 const source='use std::{fs,env,io,path,process};use core::cmp;pub fn answer()->String{"Ω😀\\0whole module".to_owned()}',files={'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE},proposal=proposeCoreLiteralTextCorpus({files}),row=proposal.proposals.find(item=>item.file==='src/lib.rs');inverse(row);assert.equal(row.importRoles.length,6);assert.equal(row.selections.length,1);
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path]}),declaration=result.executableDeclarations.find(item=>item.name==='answer');assert.ok(declaration,JSON.stringify(result.meta.refused));const emitted=declaration.lower().emitted,mapping=emitted.mappings.find(item=>item.source==='answer');assert.ok(mapping);const exposed={...result,javascript:result.javascript+'\nexport {'+mapping.target+' as moduleAnswer};',typescript:result.typescript+'\nexport {'+mapping.target+' as moduleAnswer};'};
 await verifyTypedTargets(exposed,(_api,_result,module)=>assert.equal(module.moduleAnswer(),'Ω😀\0whole module'),{childTimeoutMs:20000});
 const invalid=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path].replace('crate::translation_core::format!','crate::translation_core::unknown!')});assert.equal(invalid.meta.executable.some(item=>item.name==='answer'),false);
});

test('unknown roots types globs aliases shadows and declaration producers retain complete refusals',{timeout:60000},()=>{
 const body='pub fn answer()->String{"must stay".to_owned()}';for(const prefix of ['use std::does_not_exist;','use std::path::Path;','use std::path::PathBuf;','use std::process::ExitCode;','use std::fs::*;','use std::fs as _;','use std::fs as String;','use custom::fs;','mod std{pub mod fs{}}use std::fs;','mod core{pub mod cmp{}}use core::cmp;','#[unknown]use std::fs;','emit!();use std::fs;','#[cfg(unresolved)]use std::fs;']){const source=prefix+body,proposal=migrateCoreLiteralText(source);inverse(proposal);assert.equal(proposal.edits.length,0,prefix);assert.equal(proposal.after.source,source);}
 const unresolved=migrateCoreLiteralText('use std::fs;pub fn answer()->String{unknown("preserved body".to_owned())}');inverse(unresolved);assert.equal(unresolved.selections.length,1);assert.equal(unresolved.selections[0].bodyAdmission,false);assert.ok(unresolved.after.source.includes('unknown('));
});
