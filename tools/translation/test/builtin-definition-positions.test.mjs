import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,Hash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,originalAstDefinition,astEnumVariant,withBuiltinAstDefinitionPositions as scoped,builtinAstDefinitionPositionFacts as facts} from '../builtin-derive-ast-meta.mjs';
import {prepareBuiltinDefinitionPositions,prepareBuiltinDefinitionPositionDataProbe} from '../prepare-builtin-definition-positions.mjs';
import {originalMacroTrees,freezeMacroTree} from '../macro-token-trees.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),schema='compiler/rustc_ast/src/ast.rs',hash=value=>createHash('sha256').update(value).digest('hex');
const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,nativeJSON=JSON.stringify;
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60000},async()=>{vectors=[];try{await run();}finally{const out=process.env.ROUTER_BUILTIN_DEFINITION_POSITION_EVIDENCE_DIR;if(out){mkdirSync(out,{recursive:true});const raw=Buffer.from(nativeJSON({name,vectors})+'\n'),packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);writeFileSync(join(out,hash(name)+'.json.gz'),packed);}}});
function setup(){const manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});return {dependencies,profile:builtinDeriveAstSourceProfile(dependencies)};}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function observeHash(run){
 const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),tape=[];
 try{define(Hash.prototype,'update',{...update,value:function(...args){tape.push({operation:'update',args:args.map(value=>typeof value==='string'?value:{base64:Buffer.from(value).toString('base64')})});return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape.push({operation:'digest',args,value});return value;}});return {value:run(),tape};}
 finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}
}
test('complete pinned original owner and every native source CST phase inverse and original parse hash tail are retained',()=>{
 const plan=retain('complete-source-plan',prepareBuiltinDefinitionPositions()),row=plan.files[0];assert.equal(plan.files.length,1);assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.defaultOperationUnchanged,true);assert.equal(plan.allOriginalHashSitesRetained,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.performanceQualified,false);assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);
 assert.equal(row.nativeSelections.length,2);assert.equal(row.nativeSelections[1].expected,'visit(roots);');assert.ok(row.after.includes(row.unchangedParseHashTail));assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}assert.equal(facts().active,false);
});
test('actual complete original compiler definitions remain fresh privately issued fragments inside a single indexed operation',()=>{
 const {profile}=setup(),names=['ExprKind','PatKind','StmtKind','LocalKind','TyKind','ItemKind','AssocItemKind','GenericBound'],expected=names.map(name=>originalAstDefinition(profile,schema,'enum',name));
 const actual=scoped(()=>{const first=names.map(name=>originalAstDefinition(profile,schema,'enum',name)),afterFirst=facts(),second=names.map(name=>originalAstDefinition(profile,schema,'enum',name)),afterSecond=facts();assert.equal(afterFirst.builds,1);assert.equal(afterFirst.hits,names.length-1);assert.equal(afterSecond.builds,1);assert.equal(afterSecond.hits,names.length*2-1);for(let at=0;at<names.length;at++){assert.notEqual(first[at],second[at]);assert.deepEqual(first[at],second[at]);}retain('actual-frame-counters',{afterFirst,afterSecond});return first;});
 retain('complete-original-and-indexed-fragments',{expected,actual});assert.deepEqual(actual,expected);assert.equal(astEnumVariant(profile,actual[0],'Path').arity,2);assert.equal(facts().active,false);assert.equal(facts().rootEntries,0);
 scoped(()=>{originalAstDefinition(profile,schema,'enum','ExprKind');assert.equal(facts().builds,1);assert.equal(facts().hits,0);});assert.equal(facts().active,false);
});
test('every original native hash update digest argument and complete fragment payload remains unchanged',()=>{
 const {profile}=setup(),read=()=>['ExprKind','TyKind','ItemKind','ExprKind'].map(name=>originalAstDefinition(profile,schema,'enum',name));read();
 const expected=observeHash(read),actual=observeHash(()=>scoped(read));retain('complete-Hash-update-digest-tapes',{expected,actual});assert.ok(expected.tape.length>0);assert.deepEqual(actual,expected);assert.equal(facts().active,false);
});
test('changed JSON parser keeps original callbacks and permanently retires the index for that operation',()=>{
 const {profile}=setup(),read=()=>originalAstDefinition(profile,schema,'enum','ExprKind');read();
 function observed(run){const prior=get(JSON,'parse'),tape=[];try{define(JSON,'parse',{...prior,value:function(...args){tape.push(args);return apply(prior.value,this,args);}});return {result:outcome(run),tape};}finally{define(JSON,'parse',prior);}}
 const expected=observed(read),actual=scoped(()=>{read();assert.equal(facts().builds,1);const result=observed(read);assert.equal(facts().disabled,true);assert.equal(facts().rootEntries,0);read();assert.equal(facts().disabled,true);assert.equal(facts().builds,1);return result;});retain('complete-late-native-fallback',{expected,actual});assert.ok(expected.tape.length>0);assert.deepEqual(actual,expected);assert.equal(facts().active,false);
});
test('missing unsupported and copied foreign profiles preserve original failures without becoming indexed authority',()=>{
 const {profile}=setup(),foreign=setup().profile,cases=[()=>originalAstDefinition({...profile},schema,'enum','ExprKind'),()=>originalAstDefinition(structuredClone(profile),schema,'enum','ExprKind'),()=>originalAstDefinition(profile,schema,'enum','NoSuchOriginalDefinition'),()=>originalAstDefinition(profile,schema,'not-an-item-kind','ExprKind'),()=>astEnumVariant(foreign,originalAstDefinition(profile,schema,'enum','ExprKind'),'Path')];
 for(const run of cases){const expected=outcome(run),actual=outcome(()=>scoped(run));assert.ok(expected.error);retain('complete-original-refusal',{expected,actual});assert.deepEqual(actual,expected);}scoped(()=>{assert.throws(cases[3]);assert.equal(facts().fallbacks,1);});assert.equal(facts().active,false);
});
test('nested returns throws and thenables cannot retain definition positions or execute caller then getters',async()=>{
 const {profile}=setup(),read=()=>originalAstDefinition(profile,schema,'enum','ExprKind');
 scoped(()=>{read();const outer=facts();scoped(()=>{assert.equal(facts().rootEntries,0);read();assert.equal(facts().builds,1);});assert.deepEqual(facts(),outer);read();assert.equal(facts().hits,outer.hits+1);});assert.equal(facts().active,false);
 const marker={originalThrow:true};assert.throws(()=>scoped(()=>{read();throw marker;}),error=>error===marker);assert.equal(facts().active,false);
 let getters=0;const own=define({},'then',{get(){getters++;throw Error('own then');}}),inherited=Object.create(define({},'then',{get(){getters++;throw Error('inherited then');}}));for(const value of [Promise.resolve(1),own,inherited,new Proxy({},{})]){assert.throws(()=>scoped(()=>{read();return value;}),/synchronous|thenable/);assert.equal(facts().active,false);}assert.equal(getters,0);assert.throws(()=>scoped(new Proxy(()=>1,{})),/qualified/);
 let continuation;assert.throws(()=>scoped(()=>{read();continuation=Promise.resolve().then(()=>{assert.equal(facts().active,false);return read();});return continuation;}),/thenable/);assert.ok(await continuation);assert.equal(facts().active,false);
});
test('actual native-copied position builder retains duplicate occurrences full roots and bounded allocation misses as DATA only',async()=>{
 const probe=retain('complete-native-CST-DATA-probe',prepareBuiltinDefinitionPositionDataProbe()),row=probe.file;assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
 const api=await import('data:text/javascript;base64,'+Buffer.from(row.after).toString('base64')),source='enum Unique{A}mod first{enum Choice{A}}mod second{enum Choice{B}}struct Record{v:u8}',roots=freezeMacroTree(originalMacroTrees(source)),budget={cells:0,positions:0},operations={Map,get:Map.prototype.get,set:Map.prototype.set,apply},index=api.buildDefinitionPositionIndex(roots,budget,operations);
 const choices=index.get('enum').get('Choice');assert.equal(choices.length,2);assert.notEqual(choices[0].nodes,choices[1].nodes);assert.deepEqual(choices.map(row=>source.slice(row.nodes[row.start].span.start,row.nodes[row.end-1].span.end)),['enum Choice{A}','enum Choice{B}']);assert.equal(index.get('enum').get('Unique').length,1);assert.equal(index.get('struct').get('Record').length,1);assert.equal(index.get('enum').get('Absent'),undefined);
 for(const full of [{cells:200000,positions:0},{cells:0,positions:8192}])assert.equal(api.buildDefinitionPositionIndex(roots,full,operations),null);retain('complete-duplicate-source-and-positions',{source,roots,budget,choices,semanticAuthority:false});assert.equal(facts().active,false);
});
