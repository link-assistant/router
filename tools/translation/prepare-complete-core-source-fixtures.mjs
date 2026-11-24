#!/usr/bin/env node
// Source DATA fixture proposals; ordinary compiler entrypoints retain authority.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {sourceItems} from './rust-structure.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from './router-core-source-data.mjs';
const fixture='tools/translation/test/complete-core-source-fixture.mjs';
export const CORE_SOURCE_FIXTURE_CONSUMERS=Object.freeze(['character-scalars','source-option-constructor-metadata','function-tail-ordered-matches'].map(name=>'tools/translation/test/'+name+'.test.mjs'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const beforeImport="import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';";
const afterImport="import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';";
const begin='// Begin generated complete owned Core fixture.',end='// End generated complete owned Core fixture.';
function concrete(source,language='JavaScript'){const meta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language}).document);if(transportConcreteSyntaxMeta(meta).source!==source)throw Error('Complete source CST differs');return meta;}
function syntax(path,source){const ts=ownershipCompiler();if(ts.version!=='5.9.3')throw Error('Installed TypeScript 5.9.3 required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw Error('Complete JavaScript grammar failed');if(process.versions.bun)new Bun.Transpiler({loader:'js',target:'bun'}).scan(source);else execFileSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8',timeout:20000,maxBuffer:1048576});return {ts,file};}
function derive(path,source,language,repository){
 syntax(path,source);const make=rows=>rows.map(([id,before,after])=>exactLiteralSubstitutionRule(id,before,after,'Complete unique source anchor changed: '+id)),result=createRulePipeline([{phase:'language',rules:make(language)},{phase:'repository',rules:make(repository)}]).run(source),text=result.value;let inverse=text;
 for(const [,before,after]of [...language,...repository].reverse()){if(inverse.split(after).length!==2)throw Error('Complete inverse anchor differs');inverse=inverse.replace(after,()=>before);}if(inverse!==source)throw Error('Complete source inverse differs');syntax(path,text);
 return {path,source,text,sourceSha256:hash(source),sha256:hash(text),beforeMeta:concrete(source),afterMeta:concrete(text),inverse,language,repository,literalSubstitutions:true,trace:result.trace};
}
export function deriveCompleteCoreSourceFixtures({sources}={}){
 if(!(sources instanceof Map)||sources.size!==4||[fixture,...CORE_SOURCE_FIXTURE_CONSUMERS].some(path=>!sources.has(path)))throw Error('Complete original fixture and three consumers required');
 const actual=sources.get(fixture);let source=actual;
 if(source.includes(begin)){const from=source.indexOf(begin),to=source.indexOf(end);if(from<0||to<from||source.indexOf(begin,from+1)!==-1||source.indexOf(end,to+1)!==-1||source.split(afterImport).length!==2||!source.endsWith(end+'\n'))throw Error('Complete installed fixture block differs');source=source.slice(0,from).replace(afterImport,()=>beforeImport);}
 const {ts,file}=syntax(fixture,source),functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='completeCoreSourceFixture');if(functions.length!==1)throw Error('Actual unique complete source fixture function required');const original=functions[0].getText(file);
 const facade=ROUTER_FORMATTING_FACADE_SOURCE,facadeMeta=concrete(facade,'Rust'),children=sourceItems(facade).filter(item=>item.term==='mod').map(item=>{if(facade.slice(item.start,item.end).trim()!=='mod '+item.name+';')throw Error('Original external facade child required');return item.name;});
 const symbols={primitives:'ROUTER_CORE_PRIMITIVES_SOURCE',json_collections:'ROUTER_CORE_JSON_COLLECTIONS_SOURCE',ranges:'ROUTER_CORE_RANGES_SOURCE',base64:'ROUTER_CORE_BASE64_SOURCE'};
 if(children.length!==4||new Set(children).size!==4||children.some(name=>!Object.hasOwn(symbols,name)))throw Error('Every actual facade child needs its source DATA mapping');
 const copied=derive(fixture,original,[['source-fixture:parameterize-existing-complete-child-copy','export function completeCoreSourceFixture(input){','function completeOwnedCoreChildSourceFixture(input,childPath,childSource){'],['source-fixture:parameterize-complete-original-child','value:ROUTER_CORE_JSON_COLLECTIONS_SOURCE,','value:childSource,']],[]).text;
 const block=begin+'\nconst OWNED_CORE_SOURCE_CHILDREN=[\n'+children.map(name=>" ['src/translation_core/"+name+".rs',"+symbols[name]+']').join(',\n')+'\n];\n'+copied+'\nexport function completeOwnedCoreSourceFixture(input){\n let result=input;for(const [path,source]of OWNED_CORE_SOURCE_CHILDREN)result=completeOwnedCoreChildSourceFixture(result,path,source);return result;\n}\n'+end+'\n';
 const withImports=source.replace(beforeImport,()=>afterImport);
 const helper=derive(fixture,source,[['source-fixture:complete-original-data-imports',beforeImport,afterImport]],[['router:complete-owned-core-source-children',withImports,withImports+block]]);helper.copiedFunction={source:original,meta:concrete(original),span:[functions[0].getStart(file),functions[0].end]};
 if(actual!==source&&actual!==helper.text)throw Error('Installed complete fixture fixed point differs');if(actual!==source)helper.installedSource=actual;
 const files=[helper];
 for(const path of CORE_SOURCE_FIXTURE_CONSUMERS){const current=sources.get(path),old="import {completeCoreSourceFixture} from './complete-core-source-fixture.mjs';",next="import {completeOwnedCoreSourceFixture as completeCoreSourceFixture} from './complete-core-source-fixture.mjs';";if(typeof current!=='string')throw Error('Complete actual consumer source required');const input=current.includes(next)?current.replace(next,()=>old):current,{ts,file}=syntax(path,input),imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.getText(file)===old);if(imports.length!==1)throw Error('Actual unique source fixture import required');const row=derive(path,input,[],[['router:compose-every-owned-core-child',old,next]]);if(current!==input&&current!==row.text)throw Error('Installed consumer fixed point differs');if(current!==input)row.installedSource=current;files.push(row);}
 return {schema:'complete-owned-core-source-fixtures-v1',files,facade:{source:facade,meta:facadeMeta,children},sourceAndOwnerVerdictsCached:false,qualified:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))throw Error('Usage: prepare-complete-core-source-fixtures.mjs --emit|--check');const root=new URL('../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),proposal=deriveCompleteCoreSourceFixtures({sources:new Map([fixture,...CORE_SOURCE_FIXTURE_CONSUMERS].map(path=>[path,read(path)]))});
 if(args[0]==='--emit')console.log(JSON.stringify(proposal));else{for(const row of proposal.files)if(read(row.path)!==row.text)throw Error('Owned Core source fixture stale: '+row.path);console.log(JSON.stringify({checked:true,files:proposal.files.map(({path,sha256})=>({path,sha256})),sourceAndOwnerVerdictsCached:false,rustExecuted:false}));}
}
