import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync,symlinkSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {Hash,createHash} from 'node:crypto';
import {types} from 'node:util';
import {originalPrivateParserCommonIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {assertPrivateParserExecution} from '../private-parser-execution.mjs';
import {captureOriginalClassDefinitionContext,requireOriginalClassDefinitionContext,
  originalClassDefinitionProgram,originalClassBirthSourceHostAvailable} from '../extensions/original-class-definition-birth.mjs';
import {prepareOriginalClassBirthPlan,applyOriginalClassBirthEdits} from '../prepare-original-class-birth.mjs';
import {createRulePipeline,exactSubstitutionRule} from '../rule-pipeline.mjs';

const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,keys=Reflect.ownKeys;
const parent=Object.getPrototypeOf,setParent=Object.setPrototypeOf,remove=Reflect.deleteProperty,apply=Reflect.apply;
const stringify=JSON.stringify,functionText=Function.prototype.toString,root=globalThis;
const output=process.env.ROUTER_CLASS_DEFINITION_BIRTH_VECTOR_DIR;
const input='fn answer() -> u8 { 7 }';
// Lossless bounded graph evidence: Map/Set slots, bigint/undefined/-0,
// aliases, function text, every own descriptor and prototype provenance. Lazy
// Error stacks are already explicitly opaque in errorFacts; never observed.
const isMap=types.isMap,isSet=types.isSet,isProxy=types.isProxy,isNativeError=types.isNativeError;
const mapEntries=Map.prototype.entries,setValues=Set.prototype.values;
const mapNext=parent(apply(mapEntries,new Map(),[])).next,setNext=parent(apply(setValues,new Set(),[])).next;
const nativePrototypes=[Object.prototype,Array.prototype,Function.prototype,Map.prototype,Set.prototype,RegExp.prototype,Number.prototype,String.prototype,BigInt.prototype,Boolean.prototype,Symbol.prototype,Error.prototype,TypeError.prototype,Uint8Array.prototype];
function completeGraph(rootValue){
  const ids=new Map(),objects=[],nodes=[],symbols=[],symbolIds=new Map();let cells=0,chars=0;
  function value(item){
    if(typeof item==='string'){chars+=item.length;if(chars>16777216)throw Error('complete evidence string bound');return {string:item};}
    if(item===null)return {null:true};if(item===undefined)return {undefined:true};if(typeof item==='boolean')return {boolean:item};
    if(typeof item==='number')return {number:Number.isNaN(item)?'NaN':Object.is(item,-0)?'-0':item===Infinity?'+Infinity':item===-Infinity?'-Infinity':item};if(typeof item==='bigint')return {bigint:item.toString()};
    if(typeof item==='symbol'){let id=symbolIds.get(item);if(id===undefined){id=symbols.length;symbolIds.set(item,id);symbols.push({description:String(item),global:Symbol.keyFor(item)});}return {symbol:id};}
    if(isProxy(item))throw Error('proxy cannot enter complete evidence');
    const native=nativePrototypes.indexOf(item);if(native!==-1)return {sharedNativePrototype:native};
    let id=ids.get(item);if(id===undefined){if(objects.length>=100000)throw Error('complete evidence node bound');id=objects.length;ids.set(item,id);objects.push(item);}return {ref:id};
  }
  const selected=value(rootValue);
  for(let at=0;at<objects.length;at++){
    const object=objects[at],fields=[];for(const key of keys(object)){if(++cells>1000000)throw Error('complete evidence cell bound');if(key==='stack'&&isNativeError(object)){fields.push({key:value(key),opaqueLazyStack:true});continue;}const field=descriptor(object,key);fields.push({key:value(key),enumerable:field.enumerable,configurable:field.configurable,...(Object.hasOwn(field,'value')?{writable:field.writable,value:value(field.value)}:{get:value(field.get),set:value(field.set)})});}
    const slots=[];if(isMap(object)||isSet(object)){const map=isMap(object),iterator=apply(map?mapEntries:setValues,object,[]),next=map?mapNext:setNext;for(;;){const row=apply(next,iterator,[]);if(row.done)break;if(++cells>1000000)throw Error('complete evidence cell bound');slots.push(map?[value(row.value[0]),value(row.value[1])]:value(row.value));}}
    const source=typeof object==='function'?apply(functionText,object,[]):undefined;if(source!==undefined){chars+=source.length;if(chars>16777216)throw Error('complete evidence string bound');}
    nodes.push({kind:typeof object,functionSource:source,prototype:value(parent(object)),extensible:Object.isExtensible(object),fields,slots});
  }
  return {schema:'complete-class-birth-evidence-v1',root:selected,nodes,symbols,sharedNativePrototypeNames:['Object','Array','Function','Map','Set','RegExp','Number','String','BigInt','Boolean','Symbol','Error','TypeError','Uint8Array']};
}
function retain(name,value){if(output){const text=stringify(completeGraph(value))+'\n';if(Buffer.byteLength(text)>67108864)throw Error('complete evidence64MiB bound');mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json'),text,{flag:'wx'});}}
function errorFacts(error){
  if(!error||typeof error!=='object')return {type:typeof error};if(types.isProxy(error))return {opaqueProxy:true};const fields=[];
  for(const key of keys(error)){
    if(key==='stack'){fields.push({key,opaqueLazyStack:true});continue;}const field=descriptor(error,key);
    fields.push({key,data:Object.hasOwn(field,'value'),valueType:Object.hasOwn(field,'value')?typeof field.value:undefined,enumerable:field.enumerable,configurable:field.configurable,writable:field.writable,
      value:Object.hasOwn(field,'value')?field.value:undefined,getter:Object.hasOwn(field,'get')&&field.get!==undefined,setter:Object.hasOwn(field,'set')&&field.set!==undefined});
  }return {fields};
}
function attempt(read){let value,error;try{value=read();}catch(caught){error=caught;}return {value,error};}
function observed(row){return row.error?{error:errorFacts(row.error)}:{value:row.value};}
function program(){const text=originalClassDefinitionProgram();assert.equal(typeof text,'string','Root must generate and review the complete17-path batch before receiving this file');return JSON.parse(text);}
function fullShape(value){
  const rows=[],names=keys(value);for(let at=0;at<names.length;at++){
    const key=names[at],field=descriptor(value,key),fields=[];for(const name of keys(field)){const item=field[name];fields.push({name,type:typeof item,value:typeof item==='function'?undefined:item,functionSource:typeof item==='function'?apply(functionText,item,[]):undefined});}
    rows.push({keyType:typeof key,key:typeof key==='symbol'?String(key):key,fields});
  }return rows;
}
async function namespaces(){const p=program(),result={};for(const row of p.modules)result[row.id]=await import(new URL('../extensions/'+row.file.slice(2),import.meta.url));return result;}
function reports(p,spaces){const result=[];for(const row of p.modules){const value=spaces[row.id].originalClassDefinitionBirths();result.push({module:row.id,factoryCalls:value.factoryCalls,bindings:value.bindings.length,records:value.records.map((entry,index)=>({id:row.definitions[index],className:descriptor(entry[0],'name').value,classLength:descriptor(entry[0],'length').value,classShape:fullShape(entry[0]),prototypeShape:fullShape(entry[1]),methods:entry[3].map(([key,fn])=>({key,source:apply(functionText,fn,[])}))}))});}return result;}
function definitions(p,spaces){const result={};for(const row of p.modules){const records=spaces[row.id].originalClassDefinitionBirths().records;for(let at=0;at<row.definitions.length;at++)result[row.definitions[at]]=records[at];}return result;}
// Normalize only cross-graph reference provenance; retain actual complete
// classes/bases separately in each full evidence report before assertions.
function factoryClassFacts(ctor,base){
  const proto=descriptor(ctor,'prototype').value;
  function fields(owner){return keys(owner).map(key=>{
    const field=descriptor(owner,key),data=Object.hasOwn(field,'value');let value;
    if(data){const item=field.value;if(item===ctor)value={reference:'returned-constructor'};else if(item===proto)value={reference:'returned-prototype'};
      else if(typeof item==='function')value={kind:'method',source:apply(functionText,item,[]),ownShape:fullShape(item),functionParent:parent(item)===Function.prototype};
      else {assert.ok(item===null||typeof item!=='object');value={primitive:item};}}
    return {key,data,writable:field.writable,enumerable:field.enumerable,configurable:field.configurable,value,
      get:data?undefined:field.get&&apply(functionText,field.get,[]),set:data?undefined:field.set&&apply(functionText,field.set,[])};
  });}
  return {source:apply(functionText,ctor,[]),constructorFields:fields(ctor),prototypeFields:fields(proto),
    constructorParentIsActualBase:parent(ctor)===base,prototypeParentIsActualBasePrototype:parent(proto)===descriptor(base,'prototype').value};
}
function reverseSource(text,row){for(let at=row.reverse.length-1;at>=0;at--){const edit=row.reverse[at];assert.equal(text.slice(edit.start,edit.end),edit.expected);text=text.slice(0,edit.start)+edit.replacement+text.slice(edit.end);}return text;}

// These are bounded temporary SOURCE fixtures, never another checkout/worktree.
// Copy the COMPLETE reviewed static SCC, plus all13 birth modules and the leaf;
// aliases outside it deliberately share the same authentic active realm. No
// graph is initialized outside its actual whole case or hidden before a hook.
const SCC_SOURCE_FILES=["clone-container-fields.mjs","clone-container-no-drop.mjs","clone-source-ir.mjs","declarative-macros.mjs","default-generated-dependencies.mjs","default-source-ir.mjs","default-unit-source.mjs","extensions/array-borrows.mjs","extensions/clone-container-body.mjs","extensions/clone-source-body.mjs","extensions/const-match-source-context.mjs","extensions/constant-evaluation.mjs","extensions/data.mjs","extensions/declaration-refusals.mjs","extensions/effects.mjs","extensions/external-trait-default-context.mjs","extensions/external-trait-sources.mjs","extensions/formatting.mjs","extensions/host-contracts.mjs","extensions/iterators.mjs","extensions/json-macros.mjs","extensions/match-patterns.mjs","extensions/methods.mjs","extensions/option-equality-source.mjs","extensions/option-equality.mjs","extensions/option-nominal-proof.mjs","extensions/ordered-matches.mjs","extensions/ownership.mjs","extensions/primitive-anonymous-traits.mjs","extensions/primitive-bool-from-source.mjs","extensions/primitive-identity-from-source.mjs","extensions/primitive-try-from-body.mjs","extensions/primitive-try-from-scope.mjs","extensions/primitive-type-aliases.mjs","extensions/shared-source-patterns.mjs","extensions/source-conversion-body.mjs","extensions/source-conversion-scope.mjs","extensions/source-display-formatting.mjs","extensions/source-lifetimes.mjs","extensions/standard-body-checker.mjs","extensions/standard-body-source.mjs","extensions/standard-borrowed-body.mjs","extensions/standard-mapped-body.mjs","extensions/standard-method-context.mjs","extensions/standard-option-callback-body.mjs","extensions/standard-source-frame.mjs","extensions/static-array-element.mjs","extensions/text.mjs","extensions/tuples.mjs","extensions/unit-enum-cast.mjs","extensions/utf16-fixed-f64.mjs","external-dependency-defaults.mjs","format-display-source.mjs","format-type-namespace.mjs","impl-resolver.mjs","json-macro-arrays.mjs","json-macro-context.mjs","json-macro-sources.mjs","matches-macro-context.mjs","matches-source-bridge.mjs","private-cargo-toml.mjs","project-copy.mjs","project.mjs","shared-nullary-enum.mjs","source-implementation-targets.mjs","source-macro-fragments.mjs","source-method-admission.mjs","source-method-parser.mjs","source-method-transforms.mjs","translate.mjs"];
function graph(label,{before=false}={}){
  const p=program(),folder=realpathSync(mkdtempSync(join(tmpdir(),'router-birth-'+label+'-'))),translation=join(folder,'tools/translation'),extensions=join(translation,'extensions'),active=join(ROOT,'tools/translation');
  const physical=new Set(SCC_SOURCE_FILES);for(const row of p.files)physical.add(row.path);physical.add('extensions/original-class-definition-birth.mjs');
  const sources=[];let total=0;
  for(const path of physical){const current=readFileSync(join(active,path),'utf8'),row=p.files.find(row=>row.path===path),text=before&&row?reverseSource(current,row):current;total+=Buffer.byteLength(text);sources.push({path,text});}
  assert.equal(physical.size,77);assert.ok(total<=4194304,'complete source fixture bound');mkdirSync(extensions,{recursive:true});
  // Exclude physical source names BEFORE aliases are created: writing through
  // an alias must never mutate the active original source directory.
  for(const name of readdirSync(active))if(name!=='extensions'&&!physical.has(name))symlinkSync(join(active,name),join(translation,name));
  for(const name of readdirSync(join(active,'extensions')))if(!physical.has('extensions/'+name))symlinkSync(join(active,'extensions',name),join(extensions,name));
  for(const row of sources){const target=join(translation,row.path);writeFileSync(target,row.text,{flag:'wx'});assert.equal(readFileSync(target,'utf8'),row.text);}
  retain(label+'-complete-source-graph',{folder,before,sources,sourceLogicalBytes:total,sourceLogicalBound:4194304,physicalSourceModules:77,unchangedOutsideSccAreActiveRealmAliases:true,trustedCommonAlreadyInitialized:true});
  let trusted=false;async function trust(){if(trusted)return;const common=await import(pathToFileURL(join(translation,'original-json-intrinsics.mjs')).href),host=await import(pathToFileURL(join(translation,'private-parser-execution.mjs')).href);assert.equal(common.originalPrivateParserCommonIntrinsicsUnchanged,originalPrivateParserCommonIntrinsicsUnchanged);assert.equal(host.assertPrivateParserExecution,assertPrivateParserExecution);trusted=true;}
  return {folder,p,extensions,trust,url:pathToFileURL(join(extensions,'original-class-definition-birth.mjs')).href,async module(id){await trust();return import(pathToFileURL(join(extensions,id+'.mjs')).href);},close(){rmSync(folder,{recursive:true,force:true});}};
}
async function fullPositive(g){await g.trust();const leaf=await import(g.url),token=await leaf.captureOriginalClassDefinitionContext(),facts=leaf.requireOriginalClassDefinitionContext(token);return {leaf,token,facts};}
function restored(){assert.equal(originalPrivateParserCommonIntrinsicsUnchanged(),true);assert.equal(originalClassBirthSourceHostAvailable(),true);assertPrivateParserExecution();}
function poisoned(change,restore,read){let row;try{change();row=attempt(read);}finally{restore();}return row;}

test('source-time class program covers all24 full definitions and exact source reversals',{timeout:60000},async()=>{
  restored();const p=program(),proposal=prepareOriginalClassBirthPlan({sourceRoot:ROOT}),token=await captureOriginalClassDefinitionContext(),facts=requireOriginalClassDefinitionContext(token),spaces=await namespaces();
  const complete=reports(p,spaces);retain('01-complete',{program:p,proposal,complete,facts});
  assert.equal(proposal.selections.length,24);assert.equal(proposal.files.length,13);assert.equal(facts.classes,24);
  assert.equal(p.entry.path,'extensions/host-contracts.mjs');const hostSource=readFileSync(join(ROOT,'tools/translation',p.entry.path),'utf8');assert.equal(p.entry.sourcePin.bytes,Buffer.byteLength(hostSource));assert.equal(p.entry.sourcePin.sha256,createHash('sha256').update(hostSource).digest('hex'));
  const privateRows=proposal.selections.flatMap(owner=>owner.privateMethods.map(member=>({owner,member})));assert.equal(privateRows.length,1);
  const {owner,member}=privateRows[0];assert.equal(owner.id,'PatternControlChecker');assert.equal(member.key,'#checkedLetChain');assert.equal(member.kind,'private-instance-ordinary-method');assert.equal(member.nodeKind,'MethodDeclaration');assert.equal(member.arity,5);assert.equal(member.source,owner.source.slice(member.start-owner.start,member.end-owner.start));assert.equal(member.bytes,Buffer.byteLength(member.source));assert.equal(member.sha256,createHash('sha256').update(member.source).digest('hex'));assert.equal(owner.methods.some(method=>method.key===member.key),false);
  const privateProgram=p.definitions.find(row=>row.id===owner.id).privateMethods;assert.equal(privateProgram.length,1);assert.equal(privateProgram[0].sha256,member.sha256);assert.equal(privateProgram[0].start,member.start);assert.equal(privateProgram[0].end,member.end);
  assert.deepEqual(proposal.trace,[{phase:'language',id:'select-complete-classes-and-plan-lexical-births'},{phase:'repository',id:'bind-core-urls-materialize-sources-and-package-program'}]);
  assert.deepEqual(facts,{schema:'original-class-definition-identity-v1',classes:24,type:false,owner:false,cfg:false,body:false,executable:false});
  for(const row of proposal.files){assert.equal(applyOriginalClassBirthEdits(row.beforeSource,row.edits).value,row.afterSource);assert.equal(reverseSource(row.afterSource,row),row.beforeSource);}
  const factories=proposal.selections.filter(row=>row.factory);assert.equal(factories.length,4);for(const row of factories){const file=proposal.files.find(file=>'tools/translation/'+file.path===row.path);assert.ok(file);assert.ok(file.afterSource.includes('const '+row.local+'=(function(item){return item;})('+row.source+');'));assert.equal(row.name,row.id==='StandardStringEqualityChecker'?'StandardStringEqualityChecker':'');}
  for(const row of proposal.selections){assert.ok(row.source.length>0);assert.ok(row.memberSpans.length>0);for(const member of row.memberSpans)assert.equal(row.source.includes(member.source),true);}
  for(const row of complete)for(const count of row.factoryCalls)assert.ok(count===0||count===1);restored();
});

test('same-text different-closure methods and same-shape wrappers refuse before construction',{timeout:60000},async()=>{
  const p=program(),spaces=await namespaces(),entries=definitions(p,spaces),token=await captureOriginalClassDefinitionContext(),rows=[];let constructed=0,called=0;
  for(const id of ['RustParser','Checker','StringRustParser','MethodChecker']){
    const entry=entries[id],key=entry[3].find(pair=>pair[0]!=='constructor')[0],before=descriptor(entry[1],key),text=apply(functionText,before.value,[]);
    const sameText=new Function('return ({'+text+'});')()[key];assert.notEqual(sameText,before.value);assert.equal(apply(functionText,sameText,[]),text);
    const same=poisoned(()=>define(entry[1],key,{...before,value:sameText}),()=>define(entry[1],key,before),()=>{requireOriginalClassDefinitionContext(token);constructed++;return new entry[0]();});
    function wrapper(...args){called++;return apply(before.value,this,args);}define(wrapper,'name',{value:before.value.name,configurable:true});define(wrapper,'length',{value:before.value.length,configurable:true});
    const wrapped=poisoned(()=>define(entry[1],key,{...before,value:wrapper}),()=>define(entry[1],key,before),()=>{requireOriginalClassDefinitionContext(token);constructed++;return new entry[0]();});
    rows.push({id,key,originalSource:text,substituteSource:apply(functionText,sameText,[]),same:observed(same),wrapped:observed(wrapped),restored:requireOriginalClassDefinitionContext(token)});
  }
  retain('02-complete',{rows,constructed,called});assert.equal(constructed,0);assert.equal(called,0);for(const row of rows){assert.ok(row.same.error);assert.ok(row.wrapped.error);assert.equal(row.restored.classes,24);}restored();
});

test('cold-shaped ancestry accessors additions and write slots refuse with zero callbacks',{timeout:60000},async()=>{
  const p=program(),spaces=await namespaces(),entry=definitions(p,spaces).MethodChecker,token=await captureOriginalClassDefinitionContext(),rows=[];let callbacks=0;
  const key=entry[3].find(pair=>pair[0]!=='constructor')[0],method=descriptor(entry[1],key),ctorParent=parent(entry[0]),protoParent=parent(entry[1]),name=descriptor(entry[0],'name');
  const privateOwner=definitions(p,spaces).PatternControlChecker;assert.equal(descriptor(privateOwner[1],'#checkedLetChain'),undefined);
  const proxy=new Proxy(ctorParent,{get(){callbacks++;throw 0;},getPrototypeOf(){callbacks++;throw 0;},construct(){callbacks++;throw 0;}});
  const cases=[
    [()=>define(entry[1],key,{configurable:true,get(){callbacks++;return method.value;}}),()=>define(entry[1],key,method)],
    [()=>setParent(entry[0],proxy),()=>setParent(entry[0],ctorParent)],
    [()=>setParent(entry[1],proxy),()=>setParent(entry[1],protoParent)],
    [()=>define(entry[1],'foreign',{configurable:true,get(){callbacks++;return 0;}}),()=>remove(entry[1],'foreign')],
    [()=>define(entry[0],'name',{...name,writable:true}),()=>define(entry[0],'name',name)],
    [()=>define(Object.prototype,'items',{configurable:true,set(){callbacks++;}}),()=>remove(Object.prototype,'items')],
    [()=>define(privateOwner[1],'#checkedLetChain',{configurable:true,get(){callbacks++;throw 0;}}),()=>remove(privateOwner[1],'#checkedLetChain')],
  ];
  for(let at=0;at<cases.length;at++){const row=poisoned(cases[at][0],cases[at][1],()=>requireOriginalClassDefinitionContext(token));rows.push({index:at,result:observed(row),restored:requireOriginalClassDefinitionContext(token)});}
  retain('03-complete',{rows,callbacks,originalClass:fullShape(entry[0]),originalPrototype:fullShape(entry[1]),privateOwnerPrototype:fullShape(privateOwner[1])});assert.equal(callbacks,0);for(const row of rows){assert.ok(row.result.error);assert.equal(row.restored.classes,24);}restored();
});

test('first factory records reject extra before after and recursive calls in independent graphs',{timeout:60000},async()=>{
  const rows=[];
  const factoryComparisons=[];
  for(const original of [true,false]){const g=graph('04-factory-names-'+(original?'original':'current'),{before:original});try{
    await g.module('host-contracts');const control=await g.module('control'),pattern=await g.module('pattern-control'),text=await g.module('text'),parameters=await g.module('parameter-patterns'),equality=await g.module('standard-string-equality');
    const bases=[control.ControlRustParser,control.ControlChecker,pattern.PatternControlRustParser,text.TextChecker];
    const classes=[pattern.withPatternControlParser(bases[0]),pattern.withPatternControlChecker(bases[1]),parameters.withParameterPatternParser(bases[2]),equality.withStandardStringEqualityChecker(bases[3])];
    const facts=classes.map((ctor,index)=>factoryClassFacts(ctor,bases[index]));factoryComparisons.push({original,classes,bases,facts});
    retain('04-factory-names-'+(original?'original':'current'),{row:factoryComparisons[factoryComparisons.length-1]});
  }finally{g.close();}}
  retain('04-factory-name-comparison',{factoryComparisons});
  assert.deepEqual(factoryComparisons[1].facts,factoryComparisons[0].facts);
  for(const row of factoryComparisons){assert.deepEqual(row.classes.map(ctor=>descriptor(ctor,'name').value),['','','','StandardStringEqualityChecker']);for(const fact of row.facts){assert.equal(fact.constructorParentIsActualBase,true);assert.equal(fact.prototypeParentIsActualBasePrototype,true);}}
  const before=graph('04-before');try{
    const factory=await before.module('parameter-patterns'),foreign=class {},value=factory.withParameterPatternParser(foreign),leaf=await import(before.url);let error;try{await leaf.captureOriginalClassDefinitionContext();}catch(caught){error=caught;}
    rows.push({kind:'before',publicResultType:typeof value,factory:factory.originalClassDefinitionBirths().factoryCalls,error:errorFacts(error)});retain('04-before-outcome',{row:rows[rows.length-1]});assert.ok(error);
  }finally{before.close();}
  const failed=graph('04-failed-entry');try{
    const factory=await failed.module('parameter-patterns'),publicFailure=attempt(()=>factory.withParameterPatternParser({})),leaf=await import(failed.url);let error;try{await leaf.captureOriginalClassDefinitionContext();}catch(caught){error=caught;}
    rows.push({kind:'failed-before',publicFailure:observed(publicFailure),counts:factory.originalClassDefinitionBirths().factoryCalls,error:errorFacts(error)});retain('04-failed-entry-outcome',{row:rows[rows.length-1]});assert.ok(publicFailure.error);assert.ok(error);
  }finally{failed.close();}
  const after=graph('04-after');try{
    const positive=await fullPositive(after),control=await after.module('control'),pattern=await after.module('pattern-control'),text=await after.module('text'),parameters=await after.module('parameter-patterns'),equality=await after.module('standard-string-equality');
    const returns=[pattern.withPatternControlParser(control.ControlRustParser),pattern.withPatternControlChecker(control.ControlChecker),parameters.withParameterPatternParser(pattern.PatternControlRustParser),equality.withStandardStringEqualityChecker(text.TextChecker)];
    const result=attempt(()=>positive.leaf.requireOriginalClassDefinitionContext(positive.token));rows.push({kind:'after',result:observed(result),publicReturnTypes:returns.map(value=>typeof value),counts:[pattern.originalClassDefinitionBirths().factoryCalls,parameters.originalClassDefinitionBirths().factoryCalls,equality.originalClassDefinitionBirths().factoryCalls]});retain('04-after-outcome',{row:rows[rows.length-1]});assert.ok(result.error);assert.deepEqual(returns.map(value=>typeof value),['function','function','function','function']);
  }finally{after.close();}
  const recursive=graph('04-recursive');let traps=0;try{
    const pattern=await recursive.module('pattern-control'),factory=await recursive.module('parameter-patterns');const base=new Proxy(pattern.PatternControlRustParser,{get(target,key,receiver){if(key==='prototype'){traps++;factory.withParameterPatternParser(pattern.PatternControlRustParser);}return Reflect.get(target,key,receiver);}});
    const value=factory.withParameterPatternParser(base),leaf=await import(recursive.url);let error;try{await leaf.captureOriginalClassDefinitionContext();}catch(caught){error=caught;}rows.push({kind:'recursive',traps,publicResultType:typeof value,counts:factory.originalClassDefinitionBirths().factoryCalls,error:errorFacts(error)});retain('04-recursive-outcome',{row:rows[rows.length-1]});assert.ok(error);assert.ok(traps>0);
  }finally{recursive.close();}
  const independent=graph('04-independent');try{const positive=await fullPositive(independent);rows.push({kind:'independent-positive',facts:positive.facts});retain('04-independent-outcome',{row:rows[rows.length-1]});assert.equal(positive.facts.classes,24);}finally{independent.close();}
  retain('04-complete',{rows});restored();
});

function physicalCore(label,source,{forgeRead=false,forgePipeline=false}={}){
  const origin=new URL('../extensions/core.mjs',import.meta.url),folder=realpathSync(mkdtempSync(join(tmpdir(),'router-birth-core-'+label+'-'))),file=join(folder,'core.mjs'),reader=join(folder,'read-observer.mjs'),edits=[];
  const readerSource="import fs from 'node:fs';const read=fs.readFileSync,apply=Reflect.apply;export const tape=[];export function readFileSync(...args){const original=apply(read,undefined,args);const result="+(forgeRead?"original.replace('new TokenCursor(tokens,','new TokenCursor(tokenz,')":"original")+";tape.push({arguments:args,original,result});return result;}\n";
  writeFileSync(reader,readerSource,{flag:'wx'});
  const pipeline=join(folder,'pipeline-observer.mjs'),pipelineURL=new URL('../rule-pipeline.mjs',import.meta.url).href;
  const pipelineSource="import {createRulePipeline as create,exactSubstitutionRule} from "+stringify(pipelineURL)+";export {exactSubstitutionRule};export const tape=[];export function createRulePipeline(declarations){const original=create(declarations);return {run(...args){const result=original.run(...args);const value=result.value.replace('new TokenCursor(tokens,','new TokenCursor(tokenz,');tape.push({arguments:args,original:result.value,value});return {...result,value};}};}\n";
  if(forgePipeline)writeFileSync(pipeline,pipelineSource,{flag:'wx'});
  const imports=[...source.matchAll(/^import\b[\s\S]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)];
  for(const match of imports){if(!match[2].startsWith('.')&&match[2]!=='node:fs')continue;const expected=match[1]+match[2]+match[1],start=match.index+match[0].lastIndexOf(expected);edits.push({start,end:start+expected.length,expected,replacement:stringify(match[2]==='node:fs'?pathToFileURL(reader).href:forgePipeline&&match[2]==='../rule-pipeline.mjs'?pathToFileURL(pipeline).href:new URL(match[2],origin).href)});}
  for(const match of source.matchAll(/\bimport\.meta\.url\b/gu))edits.push({start:match.index,end:match.index+match[0].length,expected:match[0],replacement:stringify(origin.href)});edits.sort((a,b)=>a.start-b.start);
  const relocated=applyOriginalClassBirthEdits(source,edits);writeFileSync(file,relocated.value,{flag:'wx'});assert.equal(readFileSync(file,'utf8'),relocated.value);retain(label+'-physical-core',{source,readerSource,pipelineSource:forgePipeline?pipelineSource:null,relocated,edits});
  return {url:pathToFileURL(file).href,reader:pathToFileURL(reader).href,pipeline:forgePipeline?pathToFileURL(pipeline).href:null,close(){rmSync(folder,{recursive:true,force:true});}};
}
test('core read URL and Buffer observations retain whole actual source payloads',{timeout:60000},async()=>{
  const rows=[],p=program(),coreRow=p.files.find(row=>row.path==='extensions/core.mjs'),current=readFileSync(new URL('../extensions/core.mjs',import.meta.url),'utf8');
  const names=['$1','$2','$3','$4','$5','$6','$7','$8','$9','input','lastMatch','lastParen','leftContext','rightContext'];
  const statics=()=>Object.fromEntries(names.map(name=>[name,RegExp[name]]));
  for(const before of [true,false]){
    const g=physicalCore('05-'+(before?'old':'current'),before?reverseSource(current,coreRow):current),reader=await import(g.reader),stockURL=descriptor(root,'URL'),from=descriptor(Buffer,'from'),text=descriptor(Buffer.prototype,'toString'),tape=[];let result,error;
    const observedURL=new Proxy(stockURL.value,{construct(target,args,newTarget){tape.push({kind:'URL',arguments:args.map(value=>typeof value==='string'?value:String(value))});return Reflect.construct(target,args,newTarget);}});
    /birth(seed)/u.exec('birthseed');const staticsBefore=statics();
    try{
      define(root,'URL',{...stockURL,value:observedURL});
      define(Buffer,'from',{...from,value:function(...args){tape.push({kind:'Buffer.from',thisBuffer:this===Buffer,arguments:args});return apply(from.value,this,args);}});
      define(Buffer.prototype,'toString',{...text,value:function(...args){const value=apply(text.value,this,args);tape.push({kind:'Buffer.toString',arguments:args,result:value});return value;}});
      try{const core=await import(g.url);result={parserName:core.RustParser.name,checkerName:core.Checker.name};}catch(caught){error=caught;}
    }finally{define(root,'URL',stockURL);define(Buffer,'from',from);define(Buffer.prototype,'toString',text);}
    rows.push({before,tape,reads:reader.tape,result,error:error&&errorFacts(error),staticsBefore,staticsAfter:statics()});g.close();
  }
  retain('05-complete-old-current-tapes',{rows,sourceDifferences:'Complete original versus exact reviewed birth transformation; all full arguments/results retained. Test-only same genuine read wrapper addresses named-import observation without changing production source.'});
  for(const row of rows){assert.equal(row.error,undefined);assert.deepEqual(row.result,{parserName:'RustParser',checkerName:'Checker'});assert.equal(row.reads.length,3);for(const read of row.reads){assert.equal(read.arguments.length,2);assert.equal(read.arguments[1],'utf8');assert.equal(typeof read.result,'string');}}
  assert.deepEqual(rows[1].tape.map(row=>row.kind),rows[0].tape.map(row=>row.kind));assert.deepEqual(rows[1].staticsBefore,rows[0].staticsBefore);assert.deepEqual(rows[1].staticsAfter,rows[0].staticsAfter);restored();
});

test('copied contexts source drift and changed own observer data never become authority',{timeout:60000},async()=>{
  const token=await captureOriginalClassDefinitionContext(),p=program(),spaces=await namespaces(),report=spaces.strings.originalClassDefinitionBirths(),original=reports(p,spaces);
  report.records[0][3][0][1]=function forged(){};report.records.length=0;report.factoryCalls[0]=2;
  const copy=attempt(()=>requireOriginalClassDefinitionContext({...token})),plain=attempt(()=>requireOriginalClassDefinitionContext({schema:'original-class-definition-identity-v1',classes:24})),g=graph('06-drift');let drift;
  try{
    const positive=await fullPositive(g),path=join(g.extensions,'strings.mjs'),source=readFileSync(path,'utf8');try{writeFileSync(path,source+'\n// foreign source\n');drift=attempt(()=>positive.leaf.requireOriginalClassDefinitionContext(positive.token));}finally{writeFileSync(path,source);}
    assert.equal(positive.leaf.requireOriginalClassDefinitionContext(positive.token).classes,24);
  }finally{g.close();}
  const sourceForgeries=[],coreSource=readFileSync(new URL('../extensions/core.mjs',import.meta.url),'utf8');
  for(const kind of ['read','pipeline','Buffer']){
    const core=physicalCore('06-forged-'+kind,coreSource,{forgeRead:kind==='read',forgePipeline:kind==='pipeline'}),reader=await import(core.reader),pipeline=core.pipeline?await import(core.pipeline):null,from=descriptor(Buffer,'from');let error,calls=0;const tape=[];
    try{
      if(kind==='Buffer')define(Buffer,'from',{...from,value:function(...args){calls++;const changed=typeof args[0]==='string'?args[0].replace('new TokenCursor(tokens,','new TokenCursor(tokenz,'):args[0];tape.push({arguments:args,changed});return apply(from.value,this,[changed,...args.slice(1)]);}});
      try{await import(core.url);}catch(caught){error=caught;}
    }finally{define(Buffer,'from',from);}
    sourceForgeries.push({kind,calls,tape,reads:reader.tape,pipeline:pipeline?.tape,error:error&&errorFacts(error)});core.close();
  }
  const after=reports(p,spaces),facts=requireOriginalClassDefinitionContext(token);retain('06-complete',{copy:observed(copy),plain:observed(plain),drift:observed(drift),sourceForgeries,original,after,facts});assert.ok(copy.error);assert.ok(plain.error);assert.ok(drift.error);for(const row of sourceForgeries){assert.ok(row.error);assert.ok(row.reads.length>0);if(row.kind==='Buffer')assert.ok(row.calls>0);if(row.kind==='pipeline')assert.ok(row.pipeline.length>0);}assert.deepEqual(after,original);restored();
});

test('physical cold reflection and URI ingress are sticky and execute no poisoned callback',{timeout:60000},async()=>{
  const origin=new URL('../extensions/original-class-definition-birth.mjs',import.meta.url),source=readFileSync(origin,'utf8'),rows=[];
  for(const key of ['getOwnPropertyDescriptor','getPrototypeOf','decodeURIComponent']){
    const owner=key==='decodeURIComponent'?root:Object,before=descriptor(owner,key),folder=realpathSync(mkdtempSync(join(tmpdir(),'router-birth-cold-'))),file=join(folder,'leaf.mjs');let callbacks=0,module,error;
    // Exact fixed import relocation only. Preserve the genuine original URL
    // for source registration, then retain complete source/reverse before poison.
    const imports=[...source.matchAll(/^import\b[\s\S]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)],edits=[];
    for(const match of imports)if(match[2].startsWith('.')){const expected=match[1]+match[2]+match[1],start=match.index+match[0].lastIndexOf(expected);edits.push({start,end:start+expected.length,expected,replacement:stringify(new URL(match[2],origin).href)});}
    for(const match of source.matchAll(/\bimport\.meta\.url\b/gu))edits.push({start:match.index,end:match.index+match[0].length,expected:match[0],replacement:stringify(origin.href)});edits.sort((a,b)=>a.start-b.start);
    const relocated=applyOriginalClassBirthEdits(source,edits);writeFileSync(file,relocated.value,{flag:'wx'});assert.equal(readFileSync(file,'utf8'),relocated.value);retain('07-'+key+'-source',{source,relocated,edits});
    try{define(owner,key,{configurable:true,get(){callbacks++;throw 0;}});try{module=await import(pathToFileURL(file).href);}catch(caught){error=caught;}}finally{define(owner,key,before);}
    const sticky=module?attempt(()=>module.originalClassBirthSourceHostAvailable()):null;let contextError;if(module)try{await module.captureOriginalClassDefinitionContext();}catch(caught){contextError=caught;}
    rows.push({key,callbacks,error:error&&errorFacts(error),sticky:sticky&&observed(sticky),contextError:contextError&&errorFacts(contextError),distinct:module?.originalClassBirthSourceHostAvailable!==originalClassBirthSourceHostAvailable});rmSync(folder,{recursive:true,force:true});
  }
  const token=await captureOriginalClassDefinitionContext(),before=descriptor(root,'decodeURIComponent');let callbacks=0,late;
  try{define(root,'decodeURIComponent',{configurable:true,get(){callbacks++;throw 0;}});late=attempt(()=>requireOriginalClassDefinitionContext(token));}finally{define(root,'decodeURIComponent',before);}
  const update=descriptor(Hash.prototype,'update'),spaces=await namespaces(),entry=definitions(program(),spaces).MethodChecker,key=entry[3].find(pair=>pair[0]!=='constructor')[0],method=descriptor(entry[1],key);
  let hashCalls=0,hashGetters=0,hashResult,nested;
  try{
    define(Hash.prototype,'update',{...update,value:function(...args){const result=apply(update.value,this,args);hashCalls++;nested=attempt(()=>requireOriginalClassDefinitionContext(token));define(root,'decodeURIComponent',{configurable:true,get(){hashGetters++;throw 0;}});return result;}});
    hashResult=attempt(()=>requireOriginalClassDefinitionContext(token));
  }finally{define(root,'decodeURIComponent',before);define(Hash.prototype,'update',update);}
  let classHashCalls=0,classResult;
  try{
    define(Hash.prototype,'update',{...update,value:function(...args){const result=apply(update.value,this,args);classHashCalls++;define(entry[1],key,{...method,value:function forgedLateMethod(){throw 0;}});return result;}});
    classResult=attempt(()=>requireOriginalClassDefinitionContext(token));
  }finally{define(entry[1],key,method);define(Hash.prototype,'update',update);}
  retain('07-complete',{rows,late:observed(late),callbacks,hashCalls,hashGetters,hashResult:observed(hashResult),nested:observed(nested),classHashCalls,classResult:observed(classResult),restored:requireOriginalClassDefinitionContext(token)});
  assert.ok(hashCalls>0);assert.equal(hashGetters,0);assert.ok(hashResult.error);assert.ok(nested.error);assert.ok(classHashCalls>0);assert.ok(classResult.error);
  for(const row of rows){assert.equal(row.error,undefined);assert.equal(row.callbacks,0);assert.equal(row.distinct,true);assert.equal(row.sticky.value,false);assert.ok(row.contextError);}assert.equal(callbacks,0);assert.ok(late.error);restored();
});

// Diagnostic provenance only: replay the complete registered source recipe
// for this exact physical graph. No partial URL/path matching grants equality.
function originalCoreDiagnosticSource(g,before,proposal){
  assert.deepEqual(g.p.core,proposal.program.core);
  const row=g.p.core.find(row=>row.name==='rust.js'),core=g.p.files.find(row=>row.path==='extensions/core.mjs');
  const coreSource=readFileSync(join(g.extensions,'core.mjs'),'utf8'),corePin=before?core.before:core.after;
  assert.equal(Buffer.byteLength(coreSource),corePin.bytes);assert.equal(createHash('sha256').update(coreSource).digest('hex'),corePin.sha256);
  const originalCore=before?coreSource:reverseSource(coreSource,core);assert.equal(Buffer.byteLength(originalCore),core.before.bytes);assert.equal(createHash('sha256').update(originalCore).digest('hex'),core.before.sha256);
  const raw=readFileSync(join(g.folder,'tools/translation/vendor/meta-language/translation/rust.js'),'utf8');
  assert.equal(Buffer.byteLength(raw),row.original.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),row.original.sha256);
  assert.equal(row.language.length,10);assert.equal(row.language[9].id,'original-class-birth-RustParser');
  const language=before?row.language.slice(0,-1):row.language,repository=row.repository;
  assert.equal(language.length,before?9:10);assert.equal(repository.length,5);
  const resolved=repository.map(edit=>({...edit,url:new URL('../'+edit.target,pathToFileURL(join(g.extensions,'core.mjs'))).href}));
  const pipeline=createRulePipeline([
    {phase:'language',rules:language.map(edit=>exactSubstitutionRule('rust.js:'+edit.id,edit.expected,edit.replacement,'complete original diagnostic source anchor differs'))},
    {phase:'repository',rules:[{id:'rust.js:resolve-imports',apply(source){
      let result=source;for(let at=resolved.length-1;at>=0;at--){const edit=resolved[at];assert.equal(result.slice(edit.start,edit.end),edit.expected);result=result.slice(0,edit.start)+edit.expected[0]+edit.url+edit.expected[0]+result.slice(edit.end);}return result;
    }}]},
  ]);
  const outcome=pipeline.run(raw),transformed=outcome.value,url='data:text/javascript;base64,'+Buffer.from(transformed,'utf8').toString('base64');
  assert.equal(Buffer.from(url.slice('data:text/javascript;base64,'.length),'base64').toString('utf8'),transformed);
  return {module:'rust.js',logical:'router-original-core:rust.js',before,coreSource,originalCore,corePin,raw,rawPin:row.original,language,repository:resolved,transformed,url,trace:outcome.trace};
}
function normalizeOriginalCoreRefusal(raw,proof){
  if(!raw.error)return {value:raw,mapped:0};let seen=0,mapped=0;
  const fields=raw.error.fields.map(field=>{
    if(field.key!=='sourceURL')return field;
    if(++seen!==1||field.data!==true||field.valueType!=='string'||typeof field.value!=='string'||field.value!==proof.url)throw new Error('unproved original core diagnostic sourceURL');
    mapped++;return {...field,value:proof.logical};
  });
  const value={...raw,error:{...raw.error,fields}};
  const reversed={...value,error:{...value.error,fields:fields.map(field=>field.key==='sourceURL'?{...field,value:proof.url}:field)}};
  return {value,mapped,reversed};
}

test('original parse check emit behavior and strictTS stay independent of identity-only context',{timeout:60000},async()=>{
  const proposal=prepareOriginalClassBirthPlan({sourceRoot:ROOT}),rows=[];for(const before of [true,false]){const g=graph('08-λ-'+(before?'old':'current'),{before});try{
    await g.module('host-contracts');
    const methods=await g.module('methods'),originalRefusal=attempt(()=>methods.parseRust(input)),executableSource=input+'\nfn main() {}',parsed=methods.parseRust(executableSource),checked=methods.checkProgram(parsed),emitted=methods.emitJavaScript(checked),refusal=attempt(()=>methods.parseRust('fn malformed('));
    const provenance=originalCoreDiagnosticSource(g,before,proposal);rows.push({before,input,originalRefusal:observed(originalRefusal),executableSource,parsed,checked,emitted,refusal:observed(refusal),provenance});
    if(!before){const positive=await fullPositive(g);assert.equal(positive.facts.owner,false);assert.equal(positive.facts.body,false);}
  }finally{g.close();}}
  const folder=mkdtempSync(join(tmpdir(),'router-birth-strict-ts-'));let result;try{
    const leaf=fileURLToPath(new URL('../extensions/original-class-definition-birth.mjs',import.meta.url)),file=join(folder,'contract.mts');
    const source="import {captureOriginalClassDefinitionContext,requireOriginalClassDefinitionContext,originalClassDefinitionProgram} from "+stringify(leaf)+";\nconst context=await captureOriginalClassDefinitionContext();\nconst facts=requireOriginalClassDefinitionContext(context);\nconst owner:boolean=facts.owner;\nconst source:string|null=originalClassDefinitionProgram();\n// @ts-expect-error no caller-supplied observer argument\ncaptureOriginalClassDefinitionContext(()=>true);\n// @ts-expect-error a genuine context argument is required\nrequireOriginalClassDefinitionContext();\nvoid [owner,source];\n";
    writeFileSync(file,source);const sourceRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??ROOT,require=createRequire(join(sourceRoot,'js/package.json')),tsc=require.resolve('typescript/bin/tsc');
    result=spawnSync(process.execPath,[tsc,'--noEmit','--strict','--allowJs','--checkJs','false','--skipLibCheck','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022',file],{encoding:'utf8',timeout:20000,maxBuffer:1048576});retain('08-strict-typescript',{source,result});
  }finally{rmSync(folder,{recursive:true,force:true});}
  retain('08-complete-old-current',{rows});
  const normalized=rows.map(row=>normalizeOriginalCoreRefusal(row.originalRefusal,row.provenance));
  const foreign=rows.map(row=>{
    let seen=false;const fields=row.originalRefusal.error.fields.map(field=>{if(field.key!=='sourceURL')return field;seen=true;return {...field,value:row.provenance.url+'x'};});
    if(!seen)fields.push({key:'sourceURL',data:true,valueType:'string',enumerable:false,configurable:true,writable:true,value:row.provenance.url+'x',getter:false,setter:false});
    const facts={...row.originalRefusal,error:{...row.originalRefusal.error,fields}};return {facts,result:observed(attempt(()=>normalizeOriginalCoreRefusal(facts,row.provenance)))};
  });
  retain('08-complete-source-url-associations',{rows,normalized,foreign});
  assert.equal(result.status,0,result.stdout+result.stderr);for(let at=0;at<rows.length;at++){assert.ok(rows[at].originalRefusal.error);assert.deepEqual(normalized[at].reversed,rows[at].originalRefusal);assert.ok(foreign[at].result.error);}
  assert.equal(normalized[1].mapped,normalized[0].mapped);assert.deepEqual(normalized[1].value,normalized[0].value);
  assert.deepEqual(rows[1].parsed,rows[0].parsed);assert.deepEqual(rows[1].checked,rows[0].checked);assert.deepEqual(rows[1].emitted,rows[0].emitted);assert.deepEqual(rows[1].refusal,rows[0].refusal);restored();
});
