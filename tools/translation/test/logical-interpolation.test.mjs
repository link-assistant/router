import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseJsonMacroSyntax,isOriginalJsonMacroSyntax,jsonMacroSyntaxSource} from '../json-macro-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {proposeCoreJsonUpdateCorpus} from '../migrate-core-json-updates.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',T=C+'Json',J=C+'json!',hash=value=>createHash('sha256').update(value).digest('hex');
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{const root=process.env.ROUTER_LOGICAL_INTERPOLATION_VECTOR_DIR;if(root){mkdirSync(root,{recursive:true});writeFileSync(join(root,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,...extra});
const project=input=>retain('complete-checked-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies,deriveDependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));
const yes=(result,names)=>{for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));};
const plain=value=>{const result=serde_json_to_string(value);assert.equal(result.$,'Ok');return JSON.parse(result.field0);};
async function targets(input,names,verify){const result=project(input);yes(result,names);const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-targets',{wire,javascript:result.javascript,typescript:result.typescript});try{await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}catch(error){retain('strict-child-failure',{name:error.name,message:error.message,stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8'),status:error.status,signal:error.signal});throw error;}}
const errorOf=run=>{let found;try{run();}catch(error){found={name:error.name,message:error.message};}assert.ok(found,'expected checked panic');return found;};
function syntax(source){const stage=transportConcreteSyntaxSource(source,{language:'Rust'});assert.equal(transportConcreteSyntaxMeta(stage.meta).source,source);const value=parseJsonMacroSyntax(stage.source);retain('complete-original-syntax',{source,stage,value});assert.equal(value.source,source);assert.equal(value.ownerResolved,false);assert.equal(value.namespaceAuthority,false);assert.equal(value.expansionAuthority,false);assert.equal(value.runtimeParity,false);for(const leaf of value.leaves)assert.equal(source.slice(leaf.span.start,leaf.span.end),leaf.source);return value;}

test('prefix not and infix or retain complete original token spans without semantic authority',()=>{
 for(const source of [`${J}(!false || false)`,`${J}(!(left && (!right || false)))`,`${J}(left != !right || false)`,`${J}(helper(!left, right || false))`]){const value=syntax(source);assert.equal(isOriginalJsonMacroSyntax(value),true);assert.equal(jsonMacroSyntaxSource(value).source,source);assert.equal(value.leaves.length,1);assert.equal(isOriginalJsonMacroSyntax(structuredClone(value)),false);assert.throws(()=>jsonMacroSyntaxSource({...value,ownerResolved:true}),/Unsealed/);}
 const question=syntax(`${J}(!value? || false)`);assert.equal(question.leaves[0].requiresQuestionMarkFlow,true);
});

test('all bool truth-table rows execute direct original unary and logical syntax',async()=>{
 const source=`pub fn logic(left:bool,right:bool)->${T}{${J}({"not":!left,"or":left || right,"and":left && right,"nested":!(left && (!right || false)),"equal":left == !right})}`;
 await targets(files(source),['logic'],api=>{for(const left of [false,true])for(const right of [false,true])assert.deepEqual(plain(api.logic(left,right)),{not:!left,or:left||right,and:left&&right,nested:!(left&&(!right||false)),equal:left===!right});});
});

test('logical operators short circuit checked panic operands and preserve necessary panics',async()=>{
 const source=`pub fn or_panic(left:bool,n:u64)->${T}{${J}(left || (8u64 / n == 2u64))}pub fn and_panic(left:bool,n:u64)->${T}{${J}(left && (8u64 / n == 2u64))}`;
 await targets(files(source),['or_panic','and_panic'],api=>{assert.equal(plain(api.or_panic(true,0n)),true);assert.equal(plain(api.and_panic(false,0n)),false);assert.equal(plain(api.or_panic(false,4n)),true);assert.equal(plain(api.and_panic(true,4n)),true);assert.throws(()=>api.or_panic(false,0n));assert.throws(()=>api.and_panic(true,0n));});
});

test('source field evaluation order remains before UTF8 key sorting and later panic operands',async()=>{
 const source=`pub fn div_panic(n:u64)->bool{8u64 / n == 2u64}pub fn add_panic(n:u8)->bool{8u8 + n == 0u8}pub fn ordered(n:u64,b:u8)->${T}{${J}({"z":false || (8u64 / n == 2u64),"a":false || (8u8 + b == 0u8)})}pub fn reversed(n:u64,b:u8)->${T}{${J}({"a":false || (8u8 + b == 0u8),"z":false || (8u64 / n == 2u64)})}`;
 await targets(files(source),['div_panic','add_panic','ordered','reversed'],api=>{const division=errorOf(()=>api.div_panic(0n)),overflow=errorOf(()=>api.add_panic(255n));assert.notDeepEqual(division,overflow);assert.deepEqual(errorOf(()=>api.ordered(0n,255n)),division);assert.deepEqual(errorOf(()=>api.reversed(0n,255n)),overflow);const result=api.ordered(4n,0n);assert.deepEqual(result.field0.entries.map(row=>row.key),['a','z']);assert.deepEqual(plain(result),{a:false,z:true});});
});

test('macro bangs leading closures and member or cast positions remain source refusals',()=>{
 for(const expression of ['unknown!()','known::unknown ! ()','!unknown!()','|| true','(|| true)()','left || || right','(left)!(right)','left!false','left::!false','left.!false','left as !bool','true || move || false','true | false','!','left ||','left && !'])assert.throws(()=>syntax(`${J}(${expression})`),TypeError,expression);
});

test('semantic checking still rejects wrong owners borrowed mutation and effectful operands',()=>{
 const cases=[
  `pub fn bad(value:&${C}Str)->${T}{${J}(!value || false)}`,
  `pub fn bad(value:&${T})->${T}{${J}(true || value)}`,
  `pub fn bad(value:&mut bool)->${T}{${J}(!value || false)}`,
  `struct Flag{value:bool}pub fn bad(value:Flag)->${T}{${J}(!value || false)}`,
  `fn effect()->bool{true}pub fn bad()->${T}{${J}(!effect() || false)}`,
  `pub fn bad()->${T}{${J}(true || {let mut value=false;value=true;value})}`,
 ];
 for(const source of cases){const result=project(files(source));assert.equal(result.meta.executable.some(row=>row.name==='bad'),false,source);assert.ok(result.meta.refused.some(row=>row.name==='bad'),source);}
});

test('original lexical-update Unicode source now executes unchanged with full adoption inverses',async()=>{
 assert.equal(hash(ORIGINAL.source),ORIGINAL.sha256);const input=files('',{'src/lib.rs':ORIGINAL.source}),value=retain('complete-original-adoption',proposeCoreJsonUpdateCorpus({files:input,dependencyInputs,compilationProfile:PRODUCTION_PROFILE})),row=value.proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.selections.length,2);assert.equal(row.before.source,ORIGINAL.source);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,ORIGINAL.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const piece of [...row.mapping].reverse())if(piece.kind==='substitution'){assert.equal(inverse.slice(...piece.after),piece.replacement);inverse=inverse.slice(0,piece.after[0])+piece.expected+inverse.slice(piece.after[1]);}assert.equal(inverse,ORIGINAL.source);
 await targets(value.after,['unicode'],api=>{assert.deepEqual(plain(api.unicode(true)),{raw:'Ω😀 { doc }',猫:true});assert.deepEqual(plain(api.unicode(false)),{raw:'Ω😀 { doc }',猫:false});});
});

test('malformed grammar and syntax-budget boundaries still require fresh real checking',()=>{
 for(const expression of ['!()','true || ()','1u8 || false','true || missing','true || (false false)']){const result=project(files(`pub fn bad()->${T}{${J}(${expression})}`));assert.equal(result.meta.executable.some(row=>row.name==='bad'),false,expression);assert.ok(result.meta.refused.some(row=>row.name==='bad'),expression);}
 assert.throws(()=>parseJsonMacroSyntax(`${J}(!false || false)`,{maxBytes:1}),/source budget/);assert.throws(()=>parseJsonMacroSyntax(`${J}(!false || false)`,{maxDepth:25}),/invalid source budgets/);assert.throws(()=>parseJsonMacroSyntax(`${J}([!false || false,!true])`,{maxNodes:2}),/budget/);
 const first=syntax(`${J}(!left || false)`),changed=syntax(`${J}(!right || false)`);assert.notEqual(first.sourceSha256,changed.sourceSha256);assert.equal(first.leaves[0].source,'!left || false');assert.equal(changed.leaves[0].source,'!right || false');
});
const ORIGINAL={"source": "pub mod translation_core;\n// block spelling outside any binding: doc Ω😀\r\npub fn unicode(flag:bool)->crate::translation_core::Json{\r\n let __router_json_rhs_394=true;\r\n let mut doc=crate::translation_core::json!({\"raw\":r#\"Ω😀 { doc }\"#}); /* doc comment */\r\n if flag {doc[r#\"猫\"#]=crate::translation_core::json!(!false || false);}else{doc[r#\"猫\"#]=crate::translation_core::json!(false);}\r\n doc\r\n}", "sha256": "ea72d62a36c16c3c9351d9ee494ef306ce78c690b2c17228a3900067565615d4"};
