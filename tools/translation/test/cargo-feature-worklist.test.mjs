import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {activateCargoFeatureRecords} from '../cargo-feature-worklist.mjs';
import {adaptHistoricalCargoFeatureConsumer} from '../cargo-layout-feature-profile-compatibility.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {proveJsonMacroFeatures,isJsonMacroFeatureProof} from '../json-macro-features.mjs';
import {actualJsonCapabilityProfile,isJsonCapabilityProfile} from '../json-capabilities.mjs';
const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url),fixture=new URL('./fixtures/cargo-feature-worklist/',import.meta.url);
const json=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,hash=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')),directory=mkdtempSync(join(tmpdir(),'router-cargo-features-'));after(()=>rmSync(directory,{recursive:true,force:true}));
const originals=new Map(),relocations=[],receivingProposals=[];for(const row of [...manifest.sources,manifest.license]){const raw=readFileSync(new URL(row.storedPath,fixture));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);if(row.path)originals.set(row.path,raw.toString('utf8'));}
function relocate(source,origin,label){return source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(_whole,quote,path)=>{const target=new URL(path,origin).href;relocations.push({label,path,target});return 'from '+quote+target+quote;}).replace(/\bimport\.meta\.url\b/g,()=>{relocations.push({label,kind:'original-module-url',target:origin.href});return json(origin.href);});}
const old={};for(const [path,source]of originals){const file=path.slice(path.lastIndexOf('/')+1),target=join(directory,file);const proposal=adaptHistoricalCargoFeatureConsumer(source,file);receivingProposals.push(proposal);writeFileSync(target,relocate(proposal.text,new URL(file,base),file));old[file]=await import(pathToFileURL(target).href);}
function retain(name,value){const output=process.env.ROUTER_CARGO_FEATURE_WORKLIST_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json.gz'),gzipSync(json(value,(_key,item)=>item instanceof Map?{$map:[...item]}:item instanceof Set?{$set:[...item]}:item)+String.fromCharCode(10)),{flag:'wx'});}}
const pkg=(name,features={},dependencies=[])=>({name,features,dependencies,unrelatedDependencyAliases:[]});
const dep=(alias,package_,options={})=>({alias,package:package_,kind:'dependencies',optional:false,defaultFeatures:true,features:[],...options});
const rows=active=>[...active].map(([name,features])=>[name,[...features]]);
const observe=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}};

test('ordinary default and explicit dependency substitutions preserve deterministic complete worklist order',{timeout:5000},()=>{
 const packages=new Map([['root',pkg('root',{default:['extra'],extra:[]},[dep('base','base')])],['base',pkg('base',{default:['std','simd-unsafe'],std:['alloc'],alloc:[],'simd-unsafe':[]})]]);
 const result=activateCargoFeatureRecords(()=> 'root',packages);
 assert.deepEqual(rows(result),[['root',['default','extra']],['base',['default','std','simd-unsafe','alloc']]]);
 assert.equal(isJsonMacroFeatureProof(result),false);assert.equal(isJsonCapabilityProfile(result),false);retain('01-default-full-graph',{packages,result});
});

test('default-disabled optional dependency and namespaced features activate only their actual records',{timeout:5000},()=>{
 const packages=new Map([['root',pkg('root',{default:['dep:selected','chosen/only']},[dep('off','off',{optional:true}),dep('selected','selected',{optional:true,defaultFeatures:false,features:['explicit']}),dep('chosen','chosen',{defaultFeatures:false})])],['off',pkg('off',{default:['never']})],['selected',pkg('selected',{default:['never'],explicit:[]})],['chosen',pkg('chosen',{only:[]})]]);
 const result=activateCargoFeatureRecords(()=> 'root',packages);
 assert.deepEqual(rows(result),[['root',['default']],['chosen',['only']],['selected',['explicit']]]);
 assert.equal(result.has('off'),false);assert.equal(result.get('selected').has('default'),false);retain('02-optional-and-explicit',{packages,result});
});

test('weak dependency forwarding waits for activation and cyclic local features reach a bounded fixed point',{timeout:5000},()=>{
 const packages=new Map([['root',pkg('root',{default:['weak?/extra','a'],a:['b'],b:['a','dep:weak']},[dep('weak','library',{optional:true,defaultFeatures:false})])],['library',pkg('library',{extra:[]})]]);
 const result=activateCargoFeatureRecords(()=> 'root',packages);assert.deepEqual(rows(result),[['root',['default','a','b']],['library',['extra']]]);
 const inactive=new Map([['root',pkg('root',{default:['weak?/extra']},[dep('weak','library',{optional:true})])],['library',pkg('library',{default:[],extra:[]})]]);
 const notActivated=activateCargoFeatureRecords(()=> 'root',inactive);assert.deepEqual(rows(notActivated),[['root',['default']]]);retain('03-weak-and-cycle',{packages,result,inactive,notActivated});
});

test('unknown records and malformed features never acquire a private profile and the original queue bound still refuses',{timeout:10000},()=>{
 const unknown=observe(()=>activateCargoFeatureRecords(()=> 'root',new Map([['root',pkg('root',{default:['missing']})]])));
 assert.deepEqual(unknown.error,{name:'TypeError',message:'Unregistered original Cargo feature root/missing'});
 const malformed=observe(()=>activateCargoFeatureRecords(()=> 'root',new Map([['root',pkg('root',{default:[null]})]])));assert.deepEqual(malformed.error,{name:'TypeError',message:'Unproved Cargo feature syntax'});
 const features={default:['f0']};for(let at=0;at<4100;at++)features['f'+at]=at===4099?[]:['f'+(at+1)];
 const over=observe(()=>activateCargoFeatureRecords(()=> 'root',new Map([['root',pkg('root',features)]]),{label:'JSON'}));assert.deepEqual(over.error,{name:'TypeError',message:'JSON dependency feature activation budget exceeded'});
 const unrelated=new Map([['root',pkg('root',{default:['outside/feature']},[dep('outside','unregistered')])]]);
 const union=activateCargoFeatureRecords(()=> 'root',unrelated);assert.deepEqual(rows(union),[['root',['default']]]);for(const value of [unknown,malformed,over,union])assert.equal(isJsonMacroFeatureProof(value),false);
 retain('04-complete-refusals',{unknown,malformed,over,unrelated,union});
});

test('stateful root reads retain both original reads after collection construction',{timeout:5000},()=>{
 const packages=new Map([['first',pkg('first')],['second',pkg('second')]]),NativeMap=Map,NativeSet=Set,mapPin=descriptor(globalThis,'Map'),setPin=descriptor(globalThis,'Set'),events=[];let reads=0,result;
 try{
  define(globalThis,'Map',{...mapPin,value:class extends NativeMap{constructor(...args){events.push('Map');super(...args);}}});
  define(globalThis,'Set',{...setPin,value:class extends NativeSet{constructor(...args){events.push('Set');super(...args);}}});
  result=activateCargoFeatureRecords(()=>{events.push('root'+reads);return reads++===0?'first':'second';},packages);
 }finally{define(globalThis,'Map',mapPin);define(globalThis,'Set',setPin);}
 assert.deepEqual(events.slice(0,4),['Map','Set','root0','Set']);assert.equal(events[4],'root1');assert.equal(reads,2);assert.deepEqual(rows(result),[['first',[]],['second',['default']]]);retain('05-root-read-order',{events,reads,result});
});

test('complete original JSON issuers preserve every proof source profile refusal and cryptographic byte',{timeout:30000},()=>{
 const inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadJsonMacroSourceProof(inputs),observations=[];
 const pairs=[{id:'macro',original:old['json-macro-features.mjs'].proveJsonMacroFeatures,current:proveJsonMacroFeatures,args:[dependencies]},{id:'parser',original:old['json-capabilities.mjs'].actualJsonCapabilityProfile,current:actualJsonCapabilityProfile,args:[inputs]}];
 function run(fn,args){const prior=descriptor(Hash.prototype,'update'),tape=[];let result;try{define(Hash.prototype,'update',{...prior,value(value,...rest){tape.push({input:Buffer.from(value,typeof rest[0]==='string'?rest[0]:undefined).toString('base64'),encoding:rest[0]??null});return apply(prior.value,this,[value,...rest]);}});result=observe(()=>fn(...args));}finally{define(Hash.prototype,'update',prior);}return {result,tape};}
 for(const pair of pairs){const expected=run(pair.original,pair.args),actual=run(pair.current,pair.args);retain('06-'+pair.id,{manifest,originals:[...originals],receivingProposals,relocations,inputs,dependencies,expected,actual});assert.deepEqual(actual,expected);assert.equal(json(actual),json(expected));assert.ok(actual.tape.length>0);observations.push({id:pair.id,expected,actual});}
 const currentProof=proveJsonMacroFeatures(dependencies),oldProof=old['json-macro-features.mjs'].proveJsonMacroFeatures(dependencies);assert.equal(isJsonMacroFeatureProof(currentProof),true);assert.equal(isJsonMacroFeatureProof(oldProof),false);assert.equal(isJsonMacroFeatureProof(structuredClone(currentProof)),false);
 for(const input of [{},structuredClone(dependencies)])assert.deepEqual(observe(()=>proveJsonMacroFeatures(input)),observe(()=>old['json-macro-features.mjs'].proveJsonMacroFeatures(input)));
 assert.deepEqual(observe(()=>proveJsonMacroFeatures(dependencies,{includeDev:true})),observe(()=>old['json-macro-features.mjs'].proveJsonMacroFeatures(dependencies,{includeDev:true})));
 for(const input of [{},{...inputs,manifest:inputs.manifest+' '},{...inputs,compilationProfile:{values:{feature:['unproved']}}}])assert.deepEqual(actualJsonCapabilityProfile(input),old['json-capabilities.mjs'].actualJsonCapabilityProfile(input));
 retain('06-complete-private-refusers',{observations,currentProof,oldProof});
});

test('late array and collection callbacks retain complete original worklist function text and operation order',{timeout:30000},()=>{
 const input={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadJsonMacroSourceProof(input),observations=[],text=Function.prototype.toString;
 for(const key of ['filter','find']){
  function run(fn){const prior=descriptor(Array.prototype,key),tape=[];let result;try{define(Array.prototype,key,{...prior,value(callback,...rest){tape.push({callback:apply(text,callback,[]),length:this.length});return apply(prior.value,this,[callback,...rest]);}});result=observe(()=>fn(dependencies));}finally{define(Array.prototype,key,prior);}return {result,tape};}
  const expected=run(old['json-macro-features.mjs'].proveJsonMacroFeatures),actual=run(proveJsonMacroFeatures);assert.deepEqual(actual,expected);assert.ok(actual.tape.length>0);observations.push({key,expected,actual});
 }
 retain('07-full-worklist-callbacks',{observations});
});
