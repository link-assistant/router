// Bounded primitive quotation; private counters grant no source or owner authority.
import testCase from 'node:test';
import {types} from 'node:util';
import {originalNamespaceTraversalIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from '../original-lexing-intrinsics.mjs';
import assert from 'node:assert/strict';
import {Hash,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {createRustConcreteSyntaxStage,readRustConcreteSyntaxMeta} from '../forward-concrete-syntax.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const base=new URL('../',import.meta.url),json=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const sha=value=>createHash('sha256').update(value).digest('hex');
const QUOTATION_EDIT={"before":"   const saved=apply(mapGet,quotedSizes,[value]);if(saved!==undefined&&saved<=limit)return saved;\n","after":"   const saved=apply(mapGet,quotedSizes,[value]);if(saved!==undefined&&saved<=limit)return saved;\n   if(typeof value==='string'&&value.length>256&&value.length<=65536){\n    const nativeUnits=apply(compositionStringify,compositionReceiver,[value]).length;\n    return nativeUnits<=limit?nativeUnits:-1;\n   }\n"};
// Complete actual measurement extraction with673 native-capture data plumbing.
// Reproduce the complete actual native capture initializer for partial private
// counters; do not disable the new lane or invent test-only native authority.
import {originalBatchedNamespaceTraversalIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {originalBatchedLexingIntrinsicsUnchanged} from '../original-lexing-intrinsics.mjs';
function shortQuotationBindings(source){
 const marker='// Primitive property lookup uses the realm intrinsic String prototype, not\n',start=source.indexOf(marker);
 if(start<0)return {};
 const prefixStart=source.indexOf('const enabled='),prefixEnd=source.indexOf('function intrinsics(){'),end=source.indexOf('// One existing bounded byte-store instance',start);
 assert.ok(prefixStart>=0&&prefixEnd>prefixStart&&end>start);
 const prefix=source.slice(prefixStart,prefixEnd),captures=source.slice(start,end),suffix='return {descriptor,own,shortQuotationStringPrototype,shortQuotationChar,shortQuotationNative};';
 const run=new Function('types','originalNamespaceTraversalIntrinsicsUnchanged','originalLexingIntrinsicsUnchanged',prefix+captures+suffix);
 const selected=source.includes("import {originalBatchedNamespaceTraversalIntrinsicsUnchanged,originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';\nimport {originalBatchedLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';\nconst originalNamespaceTraversalIntrinsicsUnchanged=originalBatchedNamespaceTraversalIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged=originalBatchedDataFreezeIntrinsicsUnchanged,originalLexingIntrinsicsUnchanged=originalBatchedLexingIntrinsicsUnchanged;\n");
 return run(types,selected?originalBatchedNamespaceTraversalIntrinsicsUnchanged:originalNamespaceTraversalIntrinsicsUnchanged,selected?originalBatchedLexingIntrinsicsUnchanged:originalLexingIntrinsicsUnchanged);
}
function measurementSequence(source,requests,details=false){
 const start=source.indexOf('  function quotedUnits('),end=source.indexOf('  function planUnits(',start);assert.ok(start>=0&&end>start);
 const signature=source.includes('  function frozenUnits(value,limit,depth,descendant=false){\n')?'  function frozenUnits(value,limit,depth,descendant=false){\n':'  function frozenUnits(value,limit,depth){\n';
 const original=source.slice(start,end),edits=[{before:signature,after:signature+'   frozenEntries++;\n'}],issuance='   if(units>=0&&measurementRecords<1024&&cellsBefore-measureCells>=64){node.measurement={depth,units,cells:cellsBefore-measureCells,text:textBefore-measureText};measurementRecords++;}';
 edits.push({before:issuance,after:issuance+'\n   if(units>=0&&measurementRecords>recordsBefore)issued.push({depth,units,cells:cellsBefore-measureCells,text:textBefore-measureText});'});
 edits.push({before:'   const prior=node.measurement;\n',after:'   const recordsBefore=measurementRecords;\n   const prior=node.measurement;\n'});
 let body=original;for(const edit of edits){assert.equal(body.split(edit.before).length,2);body=body.replace(edit.before,edit.after);}let inverse=body;for(const edit of [...edits].reverse()){assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,edit.before);}assert.equal(inverse,original);
 const primitive='  const quotedSizes=new Map();let quotedEntries=0,quotedKeyUnits=0;\n',shared='  const sharedMeasurements=new weakConstructor();let sharedMeasurementRecords=0;\n',descendantShared='  const sharedMeasurements=new weakConstructor();let sharedMeasurementRecords=0,measurementDeepest=0;\n';assert.equal(source.split(primitive).length,2);
 const declaration=primitive+(source.includes(descendantShared)?descendantShared:source.includes(shared)?shared:'');
 const prefix='"use strict";const {descriptor,own,shortQuotationStringPrototype,shortQuotationChar,shortQuotationNative}=shortQuotationBindings;const CELLS=200000,DEPTH=160,COMPOSITION_UNITS=8388608;let measureCells=CELLS,measureText=COMPOSITION_UNITS,measurementRecords=0,frozenEntries=0;const issued=[],nodes=new Map();\n';
 const suffix='\nconst rows=[];for(let at=0;at<requests.length;at++){const request=requests[at],key=request.node??at;let node=nodes.get(key);if(!node){node={value:request.value,measurement:null};nodes.set(key,node);}else if(node.value!==request.value)throw Error("test node identity changed");if(request.cells!==undefined)measureCells=request.cells;if(request.text!==undefined)measureText=request.text;const cells=measureCells,text=measureText,walks=frozenEntries,units=measuredFrozenUnits(node,request.limit??8388608,request.depth??0);rows.push({units,cells:cells-measureCells,text:text-measureText,walks:frozenEntries-walks});}return {rows,issued,measurementRecords,measureCells,measureText,quotedEntries,quotedKeyUnits,sharedRecords:typeof sharedMeasurementRecords==="undefined"?null:sharedMeasurementRecords};';
 const run=new Function('apply','weakConstructor','weakGet','weakSet','mapGet','mapSet','isArray','enumerableKeys','compositionStringify','compositionReceiver','requests','shortQuotationBindings',prefix+declaration+body+suffix);
 const quotedWrites=[],sharedWrites=[],setQuoted=function(key,units){quotedWrites.push({key,units});return apply(Map.prototype.set,this,[key,units]);},setShared=function(value,record){sharedWrites.push({request:requests.findIndex(row=>row.value===value),record:{...record}});return apply(WeakMap.prototype.set,this,[value,record]);};
 const observation=run(apply,WeakMap,WeakMap.prototype.get,details?setShared:WeakMap.prototype.set,Map.prototype.get,details?setQuoted:Map.prototype.set,Array.isArray,Object.keys,json,JSON,requests,shortQuotationBindings(source));
 return {observation,recipe:{original,body,edits,inverse,declaration},...(details?{details:{quotedWrites,sharedWrites}}:{})};
}
function test(name,run){testCase(name,{timeout:60000},async t=>{
 const vectors=[],retain=(label,value)=>{vectors.push({label,value});return value;};
 try{await run(t,retain);}finally{const folder=process.env.ROUTER_NATIVE_QUOTATION_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonTextGzip(join(folder,Buffer.from(name).toString('hex')+'.json.gz'),json({name,vectors},(_key,value)=>value===undefined?{$undefined:true}:typeof value==='bigint'?{$integer:String(value)}:typeof value==='number'&&(!Number.isFinite(value)||Object.is(value,-0))?{$number:Object.is(value,-0)?'-0':String(value)}:value));}}
});}
function frozen(value,seen=new WeakSet()){if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const field of Object.values(Object.getOwnPropertyDescriptors(value)))if(Object.hasOwn(field,'value'))frozen(field.value,seen);Object.freeze(value);}return value;}
function outcome(run){try{return {value:run()};}catch(error){return {error:{kind:error instanceof TypeError?'TypeError':error instanceof RangeError?'RangeError':'Error',message:descriptor(error,'message')?.value??null}};}}
async function copies(t,retain){
 const current=readFileSync(new URL('private-frozen-json.mjs',base),'utf8');assert.equal(current.split(QUOTATION_EDIT.after).length,2);
 const before=current.replace(QUOTATION_EDIT.after,QUOTATION_EDIT.before);assert.equal(before.split(QUOTATION_EDIT.before).length,2);assert.equal(before.replace(QUOTATION_EDIT.before,QUOTATION_EDIT.after),current);
 const folder=mkdtempSync(join(tmpdir(),'router-native-quotation-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const sides={};
 for(const [name,source] of Object.entries({before,current})){
  const edits=[],relocated=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(whole,prefix,quote,spec)=>{const after=prefix+quote+new URL(spec,base).href+quote;edits.push({before:whole,after});return after;});
  let inverse=relocated;for(const edit of [...edits].reverse()){assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,edit.before);}assert.equal(inverse,source);assert.equal(source.includes('import.meta'),false);
  const file=join(folder,name+'.mjs');writeFileSync(file,relocated);assert.equal(readFileSync(file,'utf8'),relocated);const url=pathToFileURL(file).href,api=await import(url);sides[name]={source,url,api,compose:api.createPrivateFrozenJsonComposer()};
  retain('complete-'+name+'-helper-and-import-inverse',{source,sha256:sha(source),relocated,edits,inverse});
 }
 retain('complete-native-quotation-source-stage',{before,current,edit:QUOTATION_EDIT,forward:before.replace(QUOTATION_EDIT.before,QUOTATION_EDIT.after),inverse:current.replace(QUOTATION_EDIT.after,QUOTATION_EDIT.before)});
 assert.deepEqual(Object.keys(sides.current.api),Object.keys(sides.before.api));return sides;
}
function quoteSequence(source,requests,textBudget=8388608){
 const start=source.indexOf('  function quotedUnits('),end=source.indexOf('  function scalarUnits(',start);assert.ok(start>=0&&end>start);
 const body=source.slice(start,end),declaration='  const quotedSizes=new Map();let quotedEntries=0,quotedKeyUnits=0;\n';assert.equal(source.split(declaration).length,2);
 const prefix='"use strict";const {descriptor,own,shortQuotationStringPrototype,shortQuotationChar,shortQuotationNative}=shortQuotationBindings;const COMPOSITION_UNITS=8388608;let measureText=textBudget;\n',suffix='\nconst results=[];for(const row of requests){const before=measureText,units=quotedUnits(row.value,row.limit);results.push({units,textCharge:before-measureText});}return {results,measureText,entries:quotedEntries,keyUnits:quotedKeyUnits};';
 const run=new Function('apply','mapGet','mapSet','compositionStringify','compositionReceiver','requests','textBudget','shortQuotationBindings',prefix+declaration+body+suffix);
 return {observation:run(apply,Map.prototype.get,Map.prototype.set,json,JSON,requests,textBudget,shortQuotationBindings(source)),recipe:{body,declaration,prefix,suffix}};
}
function compareQuotes(retain,label,sides,requests,budget=8388608){
 const before=quoteSequence(sides.before.source,requests,budget),current=quoteSequence(sides.current.source,requests,budget);
 retain(label,{requests,budget,before,current});assert.deepEqual(current.observation,before.observation);
 let remaining=budget;for(const [at,row] of requests.entries()){
  const raw=row.value.length,refused=raw+2>row.limit||raw>remaining,encoded=refused?null:json(row.value).length,expected=refused||encoded>row.limit?-1:encoded;
  assert.equal(current.observation.results[at].units,expected);assert.equal(current.observation.results[at].textCharge,refused?0:raw);if(!refused)remaining-=raw;
 }
 assert.equal(current.observation.measureText,remaining);assert.ok(current.observation.entries<=1024);assert.ok(current.observation.keyUnits<=65536);return current.observation;
}
function compareMeasurements(retain,label,sides,requests){
 const before=measurementSequence(sides.before.source,requests,true),current=measurementSequence(sides.current.source,requests,true);retain(label,{requests,before,current});assert.deepEqual(current.observation,before.observation);assert.deepEqual(current.details,before.details);return current.observation;
}
function compareCompose(retain,label,sides,value){
 const expected=outcome(()=>json(value)),before=outcome(()=>sides.before.compose(value)),current=outcome(()=>sides.current.compose(value));retain(label,{value,before,current,expected});assert.deepEqual(current,before);assert.deepEqual(current,expected);return current;
}
function nativeHashes(run){
 const update=descriptor(Hash.prototype,'update'),digest=descriptor(Hash.prototype,'digest'),tape=[];let result;
 try{define(Hash.prototype,'update',{...update,value:function(...args){const recorded=args.map(value=>typeof value==='string'?{type:'string',value}:{type:'bytes',base64:Buffer.from(value).toString('base64')}),output=apply(update.value,this,args);tape.push({operation:'update',args:recorded,sameReceiver:output===this});return output;}});define(Hash.prototype,'digest',{...digest,value:function(...args){const output=apply(digest.value,this,args);tape.push({operation:'digest',args,value:typeof output==='string'?output:{base64:Buffer.from(output).toString('base64')}});return output;}});result=run();}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}return {result,tape};
}
test('all UTF16 code units in selected primitive chunks retain independent native quote lengths',async(t,retain)=>{
 const sides=await copies(t,retain),requests=[];let covered=0;
 for(let first=0;first<65536;first+=257){let value='';for(let code=first;code<Math.min(first+257,65536);code++){value+=String.fromCharCode(code);covered++;}value=value.padEnd(257,'x');requests.push({value,limit:json(value).length});}
 assert.equal(covered,65536);compareQuotes(retain,'complete-65536-code-unit-census',sides,requests);
 const joined=requests.map(row=>row.value).join(''),value={recipes:frozen([{text:joined},[joined,joined]])};compareCompose(retain,'complete-all-code-unit-composer',sides,value);
});
test('surrogates controls Unicode and exact 256 257 65536 65537 domains preserve all limits',async(t,retain)=>{
 const sides=await copies(t,retain),edges=['\u0000\b\f\n\r\t"\\','\ud800','\udfff','\ud800\udc00','\ud800x\udc00','Ω猫😀','\ufeff\u2028\u2029\r\n','x\ud800\udc00y\udfff'];
 for(const [at,edge] of edges.entries()){
  for(const length of [256,257,65536,65537]){const value=edge.repeat(Math.ceil(length/edge.length)).slice(0,length),units=json(value).length;compareQuotes(retain,'edge-'+at+'-domain-'+length,sides,[{value,limit:units-1},{value,limit:units},{value,limit:units+1}]);}
 }
 let calls=0;const boxed=new String('x'.repeat(257));define(boxed,'toJSON',{value(){calls++;throw Error('boxed input must not enter native primitive branch');}});
 const requests=[{value:boxed,limit:1000}],before=quoteSequence(sides.before.source,requests),current=quoteSequence(sides.current.source,requests);retain('boxed-domain-is-not-primitive',{boxedText:String(boxed),descriptor:{enumerable:false},before,current,calls});assert.deepEqual(current.observation,before.observation);assert.equal(calls,0);
});
test('raw text budgets and encoded failures retain exact partial debit before any encoding',async(t,retain)=>{
 const sides=await copies(t,retain);
 for(const value of ['\u0000'.repeat(257),'"'.repeat(65536),'\ud800'.repeat(257),'x'.repeat(65537)]){
  const units=json(value).length;for(const budget of [value.length-1,value.length,value.length*2-1,value.length*2])compareQuotes(retain,'budget-'+value.length+'-'+units+'-'+budget,sides,[{value,limit:value.length+1},{value,limit:units-1},{value,limit:units},{value,limit:units}],budget);
 }
 const value='\u0000'.repeat(257),result=compareQuotes(retain,'encoded-miss-still-debits-full-raw-text',sides,[{value,limit:258},{value,limit:259},{value,limit:1544}],514);assert.deepEqual(result.results,[{units:-1,textCharge:0},{units:-1,textCharge:257},{units:1544,textCharge:257}]);
});
test('existing small key entry unit quotas repeated inputs and fresh calls stay exact',async(t,retain)=>{
 const sides=await copies(t,retain),small=Array.from({length:1030},(_,at)=>({value:'entry-'+at,limit:100}));assert.equal(compareQuotes(retain,'exact-1024-entry-bound',sides,small).entries,1024);
 const keys=Array.from({length:257},(_,at)=>({value:('key-'+String(at).padStart(3,'0')).padEnd(256,'x'),limit:2000})),bound=compareQuotes(retain,'exact-65536-key-unit-bound',sides,keys);assert.equal(bound.entries,256);assert.equal(bound.keyUnits,65536);
 const requests=[];for(const length of [256,257,65536,65537]){const value='x'.repeat(length);requests.push({value,limit:length+2},{value,limit:length+2});}
 const first=compareQuotes(retain,'mixed-repeated-old-cache-domain',sides,requests),fresh=compareQuotes(retain,'independent-new-call-domain',sides,requests);assert.deepEqual(fresh,first);assert.equal(first.entries,1);assert.equal(first.keyUnits,256);
});
test('complete frozen costs aliases depth cells issuance and partial ancestor failures stay exact',async(t,retain)=>{
 const sides=await copies(t,retain),leaf=frozen({text:'\ud800'.repeat(257),padding:Array.from({length:70},(_,at)=>at)}),ancestor=frozen([leaf,leaf,{text:'x'.repeat(65536)}]),units=json(ancestor).length;
 compareMeasurements(retain,'alias-fullfit-partial-and-new-depth',sides,[{value:leaf,node:'leaf',depth:2},{value:ancestor,node:'ancestor',limit:units-1},{value:ancestor,node:'ancestor',limit:units},{value:leaf,node:'again',depth:3}]);
 for(const budget of [{cells:1},{text:256},{cells:200000,text:8388608}])compareMeasurements(retain,'independent-budget-'+json(budget),sides,[{value:ancestor,node:'limit',...budget},{value:ancestor,node:'limit',cells:200000,text:8388608}]);
 let nested='x'.repeat(257);for(let at=0;at<159;at++)nested=[nested];frozen(nested);compareMeasurements(retain,'relative-depth-exact160-and-refused161',sides,[{value:nested,depth:1},{value:nested,depth:2},{value:nested,depth:1}]);
 const rows=Array.from({length:1030},(_,at)=>({value:frozen(Array(63).fill('row-'+at)),node:at})),quota=compareMeasurements(retain,'unchanged-1024-successful-outer-record-bound',sides,rows);assert.equal(quota.measurementRecords,1024);assert.equal(quota.sharedRecords,1024);
 compareCompose(retain,'actual-shared-frozen-wrapper',sides,{recipes:frozen([ancestor,ancestor]),entry:frozen({leaf,ancestor})});
});
test('changed native domains cold imports and inherited observers retain full native fallback',async(t,retain)=>{
 const sides=await copies(t,retain),value={recipes:frozen([{text:'x'.repeat(257)},['\u0000'.repeat(65536)]])};
 for(const [owner,key] of [[JSON,'stringify'],[String.prototype,'charCodeAt'],[Map.prototype,'get'],[Object,'keys']]){
  const observe=side=>{const previous=descriptor(owner,key),tape=[];let result;try{define(owner,key,{...previous,value:function(...args){const output=apply(previous.value,this,args);tape.push({receiver:this===owner,args:args.map(item=>typeof item),output:typeof output==='string'?output:typeof output});return output;}});result=outcome(()=>sides[side].compose(value));}finally{define(owner,key,previous);}return {result,tape};};
  const before=observe('before'),current=observe('current');retain('changed-native-'+key,{before,current});assert.deepEqual(current,before);
 }
 const inherited=side=>{const old=descriptor(Object.prototype,'measurement'),tape=[];let result;try{define(Object.prototype,'measurement',{configurable:true,get(){tape.push('get');throw Error('inherited measurement');},set(){tape.push('set');throw Error('inherited measurement');}});result=outcome(()=>sides[side].compose(value));}finally{if(old)define(Object.prototype,'measurement',old);else delete Object.prototype.measurement;}return {result,tape};};
 const before=inherited('before'),current=inherited('current');retain('complete-inherited-measurement-observations',{before,current});assert.deepEqual(current,before);assert.deepEqual(current.tape,[]);
 const cold=[];for(const [side,row] of Object.entries(sides)){
  const code=`const json=JSON.stringify,old=Object.getOwnPropertyDescriptor(JSON,'stringify'),tape=[];Object.defineProperty(JSON,'stringify',{...old,value:function(...args){tape.push({receiver:this===JSON,args:args.map(v=>typeof v)});return Reflect.apply(json,this,args);}});let result;try{const api=await import(${json(row.url)});result=api.createPrivateFrozenJsonComposer()({recipes:[{text:'x'.repeat(257)}]});}finally{Object.defineProperty(JSON,'stringify',old);}process.stdout.write(json({result,tape}));`;
  retain('complete-cold-'+side+'-source-before-launch',{code,originalTimeoutMs:20000});let observed;try{observed=execFileSync(process.execPath,['--input-type=module','-'],{input:code,encoding:'utf8',timeout:20000,maxBuffer:4194304});}catch(error){retain('complete-cold-'+side+'-native-failure',{code,stdout:String(error.stdout??''),stderr:String(error.stderr??''),status:error.status,signal:error.signal});throw error;}const parsed=JSON.parse(observed);cold.push(parsed);retain('complete-cold-'+side+'-source-and-observations',{code,observed,parsed,originalTimeoutMs:20000});assert.equal(parsed.result,json({recipes:[{text:'x'.repeat(257)}]}));assert.ok(parsed.tape.length>=1);assert.deepEqual(parsed.tape.at(-1),{receiver:true,args:['object']});
 }
 retain('complete-cold-before-and-current-tapes',{before:cold[0],current:cold[1]});assert.deepEqual(cold[1],cold[0]);
});
test('complete outputs fresh hash arguments mutation cycles and forged cost data stay independent',async(t,retain)=>{
 const sides=await copies(t,retain),syntax=frozen({text:'Ω😀\ud800'.repeat(100),rows:Array.from({length:80},(_,at)=>({at,text:'x'.repeat(257)}))});
 for(let at=0;at<2;at++){
  const value={recipes:frozen([syntax,syntax]),field:'fresh-'+at},before=nativeHashes(()=>createHash('sha256').update(sides.before.compose(value),'utf8').digest('hex')),current=nativeHashes(()=>createHash('sha256').update(sides.current.compose(value),'utf8').digest('hex'));retain('fresh-whole-hash-call-'+at,{value,before,current});assert.deepEqual(current,before);assert.equal(current.tape[0].args[0].value,json(value));assert.equal(current.tape[0].args[1].value,'utf8');assert.equal(current.tape.length,2);
 }
 const mutable={text:'x'.repeat(257)},shallow=Object.freeze([mutable]);compareCompose(retain,'same-call-source-before-mutation',sides,{recipes:shallow});mutable.text='\u0000'.repeat(65536);compareCompose(retain,'fresh-call-source-after-mutation',sides,{recipes:shallow});
 const forged=frozen({measurement:{units:0,text:0,cells:0},sourceResolvedCandidate:true,recipes:[syntax]});compareCompose(retain,'caller-cost-and-source-flags-remain-data',sides,forged);
 const cycle={text:'x'.repeat(257)};cycle.self=cycle;const before=outcome(()=>sides.before.compose(cycle)),current=outcome(()=>sides.current.compose(cycle));retain('complete-cycle-outcomes',{before,current});assert.deepEqual(current,before);assert.equal(current.error.kind,'TypeError');
 assert.deepEqual(sides.current.api.privateFrozenJsonCacheFacts().limits,{entryBytes:4194304,bytes:8388608,entries:16,cells:200000,depth:160});
});
test('full original source concrete semantic roundtrips and strict targets preserve real behavior',async(t,retain)=>{
 const sides=await copies(t,retain),source='#[derive(Eq,PartialEq,Copy,Clone,Debug)]pub struct Data{value:u8}pub fn accept(value:u8)->bool{value>0}',cst=createRustConcreteSyntaxStage(source),serializedCst=serializeConcreteSyntaxMeta(cst.document);assert.equal(cst.source,source);assert.equal(readRustConcreteSyntaxMeta(serializedCst).source,source);
 const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}),canonical=json(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(canonical)),canonical);assert.ok(result.meta.executable.some(row=>row.name==='accept'));
 const before=nativeHashes(()=>createHash('sha256').update(sides.before.compose(result.meta.checkedSemanticProgram),'utf8').digest('hex')),current=nativeHashes(()=>createHash('sha256').update(sides.current.compose(result.meta.checkedSemanticProgram),'utf8').digest('hex'));retain('full-CST-semantic-source-and-output',{source,cst,serializedCst,result,canonical,before,current});assert.deepEqual(current,before);
 try{await verifyTypedTargets(result,api=>{const values=[api.accept(0n),api.accept(1n),api.accept(255n)];retain('independent-JS-or-strict-TS-values',values);assert.deepEqual(values,[false,true,true]);assert.throws(()=>api.accept(256n),RangeError);assert.throws(()=>api.accept(1),TypeError);},{childTimeoutMs:20000});}
 catch(error){retain('strict-child-failure',{stdout:String(error.stdout??''),stderr:String(error.stderr??'')});throw error;}
});
