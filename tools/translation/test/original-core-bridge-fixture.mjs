// Test-scoped root selection; this is not a full-crate namespace equivalence.
import assert from 'node:assert/strict';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const names=['untranslatable_moderation','untranslatable_chat_prediction'];
function retain(name,value){
 const folder=process.env.ROUTER_ORIGINAL_CORE_BRIDGE_VECTOR_DIR;if(!folder)return;
 const wire=JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:String(item)}:item instanceof Map?{$map:[...item]}:item)+'\n';
 assert.ok(Buffer.byteLength(wire)<=67108864,'bounded complete bridge evidence');mkdirSync(folder,{recursive:true});writeFileSync(join(folder,name+'.json.gz'),gzipSync(wire),{flag:'wx'});
}
export function compileCurrentBridgeControls(standalone){
 const originalParent=read('src/bridge_controls.rs'),originalRoot=read('src/lib.rs');
 // Keep the unchanged original missing-Core attempt before any new project work.
 retain('01-complete-standalone-bridge',{originalParent,originalRoot,standalone});
 const before=transportConcreteSyntaxSource(originalRoot,{language:'Rust'}),beforeWire=serializeConcreteSyntaxMeta(before.document),reparsed=transportConcreteSyntaxMeta(beforeWire),items=sourceItems(reparsed.source),selected=[];
 for(const [name,expected]of [['bridge_controls','mod bridge_controls;'],['translation_core','pub mod translation_core;']]){
  const matches=items.filter(item=>item.term==='mod'&&item.name===name);assert.equal(matches.length,1,'one actual root declaration '+name);const item=matches[0],source=originalRoot.slice(item.start,item.end);assert.equal(source,expected,'unconditional complete root declaration '+name);
  selected.push({name,span:[item.start,item.end],source,tokens:item.tokens,sha256:hash(source)});
 }
 selected.sort((left,right)=>left.span[0]-right.span[0]);const authored=selected.map(item=>item.source+'\n').join('');
 const applied=applyConcreteSyntaxSubstitutions(reparsed.document,{languageRules:[{id:'bridge-fixture:retain-complete-root-cst',edits:[]}],repositoryRules:[{id:'bridge-fixture:author-explicit-two-module-scope',edits:[{span:[0,originalRoot.length],expected:originalRoot,replacement:authored}]}]}),afterWire=serializeConcreteSyntaxMeta(applied.value),after=transportConcreteSyntaxMeta(afterWire);
 const mapping=[{kind:'substitution',before:[0,originalRoot.length],after:[0,authored.length],expected:originalRoot,replacement:authored}],inverse=after.source.slice(0,0)+originalRoot+after.source.slice(authored.length);
 const rootSelection={before,beforeWire,reparsed,selected,authored,applied,afterWire,after,mapping,inverse,scope:'authored scoped fixture; not full-crate namespace equivalence'};
 assert.equal(reparsed.source,originalRoot);assert.equal(after.source,authored);assert.equal(inverse,originalRoot);
 const files={'src/lib.rs':authored};for(const path of ['src/bridge_controls.rs','src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs','src/translation_core/json_collections.rs','src/translation_core/base64.rs'])files[path]=read(path);
 const cargo={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},options={entry:'src/lib.rs',paths:Object.keys(files),compilationProfile:PRODUCTION_PROFILE},result=translateProject({...options,readSource:path=>{assert.ok(Object.hasOwn(files,path),'captured complete source '+path);return files[path];},cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});
 const sourceCst=Object.entries(files).map(([path,source])=>{const transported=transportConcreteSyntaxSource(source,{language:'Rust'}),wire=serializeConcreteSyntaxMeta(transported.document),again=transportConcreteSyntaxMeta(wire);assert.equal(again.source,source);return {path,source,sha256:hash(source),transported,wire,again};});
 const observation={standalone,originalParent,originalRoot,rootSelection,files,cargo,options,result,scope:rootSelection.scope};retain('02-complete-authored-bridge-project',{...observation,sourceCst});
 assert.equal(standalone.meta.sources.find(row=>row.source==='src/bridge_controls.rs').sha256,hash(originalParent));assert.equal(standalone.meta.sources.some(row=>row.module[0]==='translation_core'),false);
 for(const name of names){const refusal=standalone.meta.refused.find(row=>row.name===name);assert.ok(refusal,'standalone missing-Core refusal '+name);assert.match(refusal.message,/actual owned facade/u);assert.equal(standalone.meta.executable.some(row=>row.name===name),false);}
 assert.equal(result.meta.sources.length,7);for(const [path,source]of Object.entries(files)){const rows=result.meta.sources.filter(row=>row.source===path);assert.equal(rows.length,1);assert.equal(rows[0].sha256,hash(source));}
 for(const field of ['checkedSemanticProgram','targetSemanticProgram']){const wire=JSON.stringify(result.meta[field]);assert.equal(serializeProgram(parseProgram(wire)),wire);}
 return observation;
}
