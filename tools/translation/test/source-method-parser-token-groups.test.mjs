import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {mkdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext,configureMatchesMethodParser,originalMethodParserNamespace} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {createOriginalMethodTokenTransform,originalMethodTransformFacts,originalMethodParserTokens,originalMethodParserTokenFacts,originalMethodParserTokenFactsGrouped} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts,originalMethodParsedFactsGrouped} from '../source-method-parser.mjs';
import {originalMethodSemantic,originalMethodSemanticFacts,originalMethodSemanticFactsGrouped,originalMethodRefusalRange,originalMethodRefusalRangeGrouped} from '../source-method-admission.mjs';
import {originalMethodValidationIntrinsicsUnchanged} from '../source-method-validation.mjs';
import {originalFlatTokenIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {translateProject,originalProjectDeclarationRefusalRanges,originalProjectDeclarationRefusalRangesGroupedTokens} from '../project.mjs';
import {copyMetadata} from '../extensions/source-links.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {readRustConcreteSyntaxMeta} from '../forward-concrete-syntax.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {associatedOriginalParentInputs,associatedOriginalDependencyInputs} from './associated-original-context.mjs';
const root=new URL('../../../',import.meta.url),get=Object.getOwnPropertyDescriptor,fields=Object.getOwnPropertyDescriptors,define=Object.defineProperty,apply=Reflect.apply;
const hashPrototype=Object.getPrototypeOf(createHash('sha256'));
const shortSource='pub struct Counter{value:u8}impl Counter{pub fn read(&self)->u8{self.value}}';
const body='pub struct Counter{value:u8}impl Counter{pub fn bad()->u8{missing()}pub fn good(v:u8)->u8{v+2}}pub fn run(v:u8)->u8{Counter::good(v)}';
let captureAttempt=0;
function retain(label,value){const folder=process.env.ROUTER_METHOD_TOKEN_GROUP_VECTOR_DIR;if(!folder)return;mkdirSync(folder,{recursive:true});writeJsonGzip(join(folder,label+'.json.gz'),value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);}
function outcome(action){try{return {value:action()};}catch(error){return {error:{name:error.name,message:error.message,reason:error.reason,span:error.span}};}}
function eligible(){return originalMethodValidationIntrinsicsUnchanged()&&originalFlatTokenIntrinsicsUnchanged();}
function fixture(source=shortSource,path=[],profile){
  const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',...(profile?{compilationProfile:profile}:{})}),modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView,...(profile?{compilationProfile:profile}:{})})),context=createMatchesMacroContext({modules,...(profile?{compilationProfile:profile}:{})}),module=modules.find(value=>JSON.stringify(value.path)===JSON.stringify(path));
  const method=extractImplDeclarations(source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView,...(profile?{compilationProfile:profile}:{})}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...module.path,...method.typePath]),transform=createOriginalMethodTokenTransform(context,method,lowered);
  return {source,context,module,method,lowered,transform,tokens:originalMethodParserTokens(transform)};
}
function observed(action,onUpdate){
  const update=get(hashPrototype,'update'),digest=get(hashPrototype,'digest'),calls=[];let result,updates=0;
  const record=value=>Buffer.isBuffer(value)?{bufferBase64:value.toString('base64')}:value;
  try{
    define(hashPrototype,'update',{__proto__:null,...update,value(...args){const row={operation:'update',arguments:args.map(record),types:args.map(value=>typeof value),receiverIsHash:Object.getPrototypeOf(this)===hashPrototype};calls.push(row);const value=apply(update.value,this,args);row.returnedSameReceiver=value===this;onUpdate?.(++updates,args);return value;}});
    define(hashPrototype,'digest',{__proto__:null,...digest,value(...args){const row={operation:'digest',arguments:args.map(record),types:args.map(value=>typeof value),receiverIsHash:Object.getPrototypeOf(this)===hashPrototype};calls.push(row);const value=apply(digest.value,this,args);row.result=record(value);row.resultType=typeof value;return value;}});
    result=outcome(action);
  }finally{define(hashPrototype,'update',{__proto__:null,...update});define(hashPrototype,'digest',{__proto__:null,...digest});}
  return {result,calls};
}
function tokenPair(row){return {old:observed(()=>originalMethodParserTokenFacts(row.tokens)),current:observed(()=>originalMethodParserTokenFactsGrouped(row.tokens))};}
function facts(result){return result.error?result:{value:{source:result.value.source,sourcePath:result.value.sourcePath,modulePath:result.value.modulePath,originalMemberSpan:result.value.originalMemberSpan,originalBodySpan:result.value.originalBodySpan,transform:result.value.transform}};}
function snapshot(value){const seen=new Map();let next=0;function visit(item){if(!item||typeof item!=='object')return typeof item==='function'?{$function:String(item)}:item;if(seen.has(item))return {$reference:seen.get(item)};const id=++next;seen.set(item,id);if(types.isProxy(item))return {$id:id,proxy:true};return {$id:id,array:Array.isArray(item),fields:Reflect.ownKeys(item).map(key=>{const field=get(item,key);return {key:typeof key==='symbol'?{$symbol:String(key)}:key,enumerable:field.enumerable,configurable:field.configurable,...(Object.hasOwn(field,'value')?{writable:field.writable,value:visit(field.value)}:{get:field.get?String(field.get):null,set:field.set?String(field.set):null})};})};}return visit(value);}
function full(row){return {source:row.source,method:copyMetadata(row.method),lowered:copyMetadata(row.lowered),transform:copyMetadata(row.transform),tokens:snapshot(row.tokens)};}
function assertPair(pair,{sameTape=false}={}){assert.deepEqual(facts(pair.current.result),facts(pair.old.result));if(sameTape)assert.deepEqual(pair.current.calls,pair.old.calls);}
function split(tokens){let count=0;for(let index=0;index<tokens.length;index++){const token=tokens[index];if(token.value==='&&'){tokens.splice(index,1,{...token,value:'&',end:token.start+1},{...token,value:'&',start:token.start+1});index++;count++;}}return count;}
function compile(files,options={}){return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],...options});}
function roundTrips(result,sources){for(const row of result.meta.concreteSyntaxMeta){const encoded=serializeConcreteSyntaxMeta(row.document);assert.ok(sources.includes(readRustConcreteSyntaxMeta(encoded).source));}for(const value of [result.meta.checkedSemanticProgram,result.meta.targetSemanticProgram]){const encoded=serializeProgram(parseProgram(JSON.stringify(value)));assert.equal(serializeProgram(parseProgram(encoded)),encoded);}}
function complete(row){return {files:row.files,observations:row.observations,surface:row.surface,association:{path:row.association.path,parentPath:row.association.parentPath,range:row.association.range,digest:row.association.digest},meta:row.result.meta,javascript:row.result.javascript,typescript:row.result.typescript};}
// A test observer retains an ACTUAL project-issued range association. It never
// writes an association or substitutes compiler input. The short-lived set hook
// is installed only after the range-capture digest has run, and restores itself
// at that same genuine capture before the checker or any later proof executes.
function capturedProject(files,{method='bad',...options}={}){
  const attempt=++captureAttempt,update=get(hashPrototype,'update'),weakSet=get(WeakMap.prototype,'set');let armed=false,captured=null;
  const marker='"method":'+JSON.stringify(method),observations=[],linksURL=new URL('../extensions/source-links.mjs',import.meta.url),projectURL=new URL('../project.mjs',import.meta.url);
  const sourceFrame=(frame,name,url)=>{if(typeof frame!=='string')return false;const value=frame.trim(),prefix='at '+name+' (';if(!value.startsWith(prefix)||!value.endsWith(')'))return false;const location=value.slice(prefix.length,-1);return [url.href,fileURLToPath(url)].some(source=>location.startsWith(source+':')&&/^[0-9]+:[0-9]+$/u.test(location.slice(source.length+1)));};
  const directCapture=()=>{const stack=String(new Error().stack),frames=stack.split('\n'),index=frames.findIndex(frame=>sourceFrame(frame,'hash',linksURL));if(index<0)return null;let next=index+1;if(sourceFrame(frames[next],'metadataDigest',linksURL))next++;return sourceFrame(frames[next],'captureDeclarationRange',projectURL)?{stack,hashFrameIndex:index,captureFrameIndex:next}:null;};
  try{
    define(hashPrototype,'update',{...update,value(...args){
      const result=apply(update.value,this,args);
      if(!armed&&!captured&&typeof args[0]==='string'&&args[0].includes(marker)&&args[0].includes('original-method-semantic-source-v1')){
        const selection=directCapture();if(selection){
        observations.push({kind:'selected-direct-project-range-digest',...selection,argument:args[0],sourceLinks:linksURL.href,project:projectURL.href,returnedSameReceiver:result===this});
        armed=true;
        define(WeakMap.prototype,'set',{...weakSet,value(key,value){
          const result=apply(weakSet.value,this,[key,value]);
          if(value&&typeof value==='object'&&!types.isProxy(value)){
            const own=fields(value);
            if(own.parent?.value===key&&own.range&&own.digest&&own.parentPath&&own.path){captured={surface:key,association:value};observations.push({kind:'actual-project-range-capture',range:own.range.value,path:own.path.value,digest:own.digest.value});define(WeakMap.prototype,'set',weakSet);armed=false;}
          }
          return result;
        }});
        }
      }
      return result;
    }});
    const result=compile(files,options);
    if(!captured)retain('capture-missing-'+String(attempt),{files,result:{meta:result.meta,javascript:result.javascript,typescript:result.typescript},observations,armed,method});
    assert.ok(captured,'the genuine project pipeline must issue the requested original method association');
    assert.equal(armed,false);return {...captured,result,files,observations};
  }finally{define(WeakMap.prototype,'set',weakSet);define(hashPrototype,'update',update);}
}

test('genuine token siblings preserve full source facts with explicit independent old and grouped hash schedules',{timeout:60000},async()=>{
  const row=fixture(),prefix=observed(()=>originalMethodTransformFacts(row.transform)),selected=eligible(),pair=tokenPair(row),expected=row.lowered.tokens.length,groups=Math.ceil(expected/256);
  retain('01-complete-genuine',{subject:full(row),selected,prefix,pair,expected,groups,tokenDigestCounts:{old:2*expected,current:2*groups},groupedObservationContract:true});
  assertPair(pair,{sameTape:!selected});assert.equal(pair.current.result.value.proof,row.transform);
  if(selected){assert.deepEqual(pair.current.calls.slice(0,prefix.calls.length),prefix.calls);assert.equal(pair.old.calls.length,prefix.calls.length+4*expected);assert.equal(pair.current.calls.length,prefix.calls.length+4*groups);}
  const source='pub struct Counter{value:u8}impl Counter{pub fn good(v:u8)->u8{v+2}}pub fn run(v:u8)->u8{Counter::good(v)}',result=compile({'src/lib.rs':source});retain('01-checked-language-repository',{source,result});roundTrips(result,[source]);await verifyTypedTargets(result,api=>{assert.equal(api.run(4n),6n);assert.throws(()=>api.run(255n),RangeError);},{childTimeoutMs:20000});
});

test('actual double-reference splits cross finite groups without changing any raw source field',{timeout:60000},()=>{
  const parameters=Array.from({length:110},(_,index)=>'p'+index+':&&u8').join(','),source='struct Counter;impl Counter{fn read('+parameters+')->u8{**p0}}',rows=[];
  for(const mode of ['unsplit','split','undefined-own-field']){
    const row=fixture(source),before=full(row),splits=mode==='unsplit'?0:split(row.tokens);if(mode==='undefined-own-field')row.tokens[0].omitted=undefined;
    const selected=eligible(),prefix=observed(()=>originalMethodTransformFacts(row.transform)),pair=tokenPair(row),expected=row.lowered.tokens.length,groups=Math.ceil(expected/256);
    rows.push({mode,before,after:full(row),splits,selected,prefix,pair,expected,groups});retain('02-'+mode,rows.at(-1));assert.ok(expected>512);assert.equal(row.lowered.tokens[255].value,'&&');assertPair(pair,{sameTape:!selected});assert.ok(pair.current.result.value);
    if(selected){assert.equal(pair.old.calls.length,prefix.calls.length+4*expected+8*splits);assert.equal(pair.current.calls.length,prefix.calls.length+4*groups);}
  }
  const unicode=fixture('struct Counter;impl Counter{fn read()->u8{let text="λ🧪\\n\\t\\\"";0}}'),unicodePair=tokenPair(unicode);retain('02-unicode-and-escapes',{subject:full(unicode),pair:unicodePair});assertPair(unicodePair);assert.ok(unicodePair.current.result.value);
  const parsedRow=fixture('struct Counter;impl Counter{fn read(value:&&u8)->u8{**value}}'),wholeParse=outcome(()=>parseOriginalMethodTransform(parsedRow.transform)),parser=new HostRustParser(parsedRow.tokens);
  configureMatchesMethodParser(parser,parsedRow.context,parsedRow.method);parser.shadowedEffectRoots=new Set(originalMethodParserNamespace(parsedRow.context,parsedRow.method).shadowedEffectRoots);parser.attributes();parser.visibility();const entry=parser.fn([]),actual=parser.cursor.tokens,old=outcome(()=>originalMethodParserTokenFacts(actual)),current=outcome(()=>originalMethodParserTokenFactsGrouped(actual));
  retain('02-actual-host-split',{subject:full(parsedRow),wholeParse,entry,old,current,actualCursorTokens:snapshot(actual),replacementArrayHasNoPrivateIssuer:true,existingHostReplacementRefusalPreserved:true});assert.equal(parser.cursor.atEnd(),true);assert.notEqual(actual,parsedRow.tokens);assert.equal(actual.some(token=>token.value==='&&'),false);assert.match(wholeParse.error?.message??'',/copied|unissued/);assert.deepEqual(current,old);assert.match(current.error?.message??'',/copied|unissued/);
});

test('every token field and malformed descriptor stays refused without getter or proxy execution',{timeout:60000},()=>{
  const mutations=[['raw',tokens=>{tokens[0].raw='forged';}],['kind',tokens=>{tokens[0].kind='forged';}],['value',tokens=>{tokens[0].value='forged';}],['start',tokens=>{tokens[0].start++;}],['end',tokens=>{tokens[0].end++;}],['generated',tokens=>{tokens[0].generated='forged';}],['insert',tokens=>{tokens.push({...tokens[0]});}],['delete',tokens=>{tokens.pop();}],['reorder',tokens=>{[tokens[0],tokens[1]]=[tokens[1],tokens[0]];}],['symbol',tokens=>{tokens[0][Symbol('hidden')]=1;}],['hidden',tokens=>{define(tokens[0],'hidden',{value:1});}],['hole',tokens=>{delete tokens[0];}],['cycle',tokens=>{tokens[0].self=tokens[0];}],['unsafe-number',tokens=>{tokens[0].extra=9007199254740992;}],['wrong-split',tokens=>{const at=tokens.findIndex(token=>token.value==='&&'),token=tokens[at];tokens.splice(at,1,{...token,value:'&',end:token.start+1},{...token,value:'&',start:token.start});}]],rows=[];
  for(const [label,change]of mutations){const row=fixture('struct Counter;impl Counter{fn read(value:&&u8)->u8{**value}}'),before=full(row);change(row.tokens);const pair=tokenPair(row);rows.push({label,before,after:full(row),mutationSource:String(change),pair});retain('03-'+label,rows.at(-1));assertPair(pair);assert.equal(pair.current.result.error?.name,'TypeError');}
  let reads=0;for(const label of ['getter','proxy-record','unissued-copy','proxy-array']){
    const row=fixture(),before=full(row);if(label==='getter')define(row.tokens[0],'extra',{enumerable:true,get(){reads++;throw Error('getter');}});if(label==='proxy-record')row.tokens[0]=new Proxy(row.tokens[0],{get(){reads++;throw Error('proxy');},ownKeys(){reads++;throw Error('proxy keys');}});if(label==='unissued-copy')row.tokens=structuredClone(row.tokens);if(label==='proxy-array')row.tokens=new Proxy(row.tokens,{get(){reads++;throw Error('array proxy');}});
    const pair=tokenPair(row);retain('03-'+label,{before,after:snapshot(row.tokens),pair,reads});assertPair(pair);assert.equal(pair.current.result.error?.name,'TypeError');
  }assert.equal(reads,0);
});

test('private parse semantic namespace and current member chains remain independently mandatory',{timeout:60000},()=>{
  const mutations=[['body',(_row,parsed)=>{parsed.entry.body={k:'lit',value:0n};}],['signature',(_row,parsed)=>{parsed.entry.ret={kind:'bool'};}],['lowering',row=>{row.lowered.tokens[0].value='changed';}],['member',row=>{row.method.source+=' ';}],['namespace',(_row,_parsed,state)=>{state.parser.sourceNamespaceEvidence={changed:true};}],['cursor',(_row,_parsed,state)=>{state.parser.cursor.tokens[0].raw='changed';}]],rows=[];
  for(const [label,change]of mutations){const row=fixture(),parsed=parseOriginalMethodTransform(row.transform),state=originalMethodParsedFacts(parsed),surface=originalMethodSemantic(parsed),before={subject:full(row),parsed:copyMetadata(parsed),surface:copyMetadata(surface)};change(row,parsed,state);const old=outcome(()=>originalMethodRefusalRange(surface,[])),current=outcome(()=>originalMethodRefusalRangeGrouped(surface,[]));rows.push({label,before,mutationSource:String(change),old,current});retain('04-'+label,rows.at(-1));assert.deepEqual(current,old);assert.equal(current.error?.name,'TypeError');}
  const row=fixture(),parsed=parseOriginalMethodTransform(row.transform),surface=originalMethodSemantic(parsed),copied=structuredClone(surface),parseCopy=structuredClone(parsed),other=fixture('mod child{struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}}',['child']);
  const results={copied:outcome(()=>originalMethodSemanticFactsGrouped(copied)),parseCopy:outcome(()=>originalMethodParsedFactsGrouped(parseCopy)),crossContext:outcome(()=>createOriginalMethodTokenTransform(other.context,row.method,row.lowered)),wrongPath:originalMethodRefusalRangeGrouped(surface,['child']),genuine:originalMethodSemanticFactsGrouped(surface)};
  retain('04-private-identities',{subject:full(row),parsed,surface,other:full(other),results:snapshot(results)});assert.equal(results.copied.error?.name,'TypeError');assert.equal(results.parseCopy.error?.name,'TypeError');assert.equal(results.crossContext.error?.name,'TypeError');assert.equal(results.wrongPath,null);assert.equal(results.genuine,originalMethodSemanticFacts(surface));
});

test('whole-array budgets and late planning misses retain the complete original observed fallback',{timeout:60000},()=>{
  const rows=[];
  function check(label,mutate,{copyAccepted=false}={}){const row=fixture(),before=full(row);mutate(row.tokens);const copied=outcome(()=>copyMetadata(row.tokens)),pair=tokenPair(row);rows.push({label,before,after:snapshot(row.tokens),mutationSource:String(mutate),copied:copied.error?copied:{accepted:true},pair});retain('05-'+label,rows.at(-1));assertPair(pair,{sameTape:true});assert.equal(!copied.error,copyAccepted);assert.equal(pair.current.result.error?.name,'TypeError');}
  const base=fixture(),baseCells=1+base.tokens.reduce((sum,token)=>sum+1+Object.keys(token).length,0),baseBytes=base.tokens.reduce((sum,token)=>sum+Object.values(token).reduce((part,value)=>part+(typeof value==='string'?Buffer.byteLength(value):0),0),0);
  check('cells-exact',tokens=>{while(tokens.length<base.tokens.length+200000-baseCells)tokens.push(null);},{copyAccepted:true});
  check('cells-over',tokens=>{while(tokens.length<base.tokens.length+200001-baseCells)tokens.push(null);});
  check('bytes-exact',tokens=>{tokens[0].extra='x'.repeat(4194304-baseBytes);},{copyAccepted:true});check('bytes-over',tokens=>{tokens[0].extra='x'.repeat(4194305-baseBytes);});
  check('depth-exact',tokens=>{let value=null;for(let index=0;index<158;index++)value={next:value};tokens[0].extra=value;},{copyAccepted:true});check('depth-over',tokens=>{let value=null;for(let index=0;index<159;index++)value={next:value};tokens[0].extra=value;});
  const source='struct Counter;impl Counter{fn read()->u8{'+Array.from({length:90},(_,index)=>'let v'+index+'=0;').join('')+'0}}';
  for(const kind of ['nested-last','large-key-last','bigint-last']){const row=fixture(source),before=full(row);if(kind==='nested-last'){const alias={value:'shared'};row.tokens.at(-1).left=alias;row.tokens.at(-1).right=alias;}else if(kind==='large-key-last')row.tokens.at(-1)['k'.repeat(1048577)]=true;else row.tokens.at(-1).extra=1n;const pair=tokenPair(row);retain('05-'+kind,{before,after:snapshot(row.tokens),pair});assert.ok(row.lowered.tokens.length>256);assertPair(pair,{sameTape:true});assert.equal(pair.current.result.error?.name,'TypeError');}
  retain('05-original-whole-limits',{baseCells,baseBytes,rows,limits:{cells:200000,bytes:4194304,depth:160},allGroupsPlannedBeforeAnyNewHash:true});
});

test('initial inherited cold and late native drift preserve old fallback or refuse after grouped observation',{timeout:60000},()=>{
  const row=fixture(),rows=[];
  for(const [owner,key]of [[JSON,'stringify'],[Object,'defineProperty'],[Object,'freeze'],[Array.prototype,'push'],[WeakMap.prototype,'get']]){
    const previous=get(owner,key);let calls=0,left,right,pair,guard;
    try{define(owner,key,{__proto__:null,...previous,value(...args){calls++;return apply(previous.value,this,args);}});guard=eligible();calls=0;const old=observed(()=>originalMethodParserTokenFacts(row.tokens));left=calls;calls=0;const current=observed(()=>originalMethodParserTokenFactsGrouped(row.tokens));right=calls;pair={old,current};}finally{define(owner,key,{__proto__:null,...previous});}
    rows.push({key,guard,left,right,pair});retain('06-native-'+key,rows.at(-1));assert.equal(guard,false);assertPair(pair,{sameTape:true});assert.equal(left,right);
  }
  for(const key of ['get','set','cells','bytes','preserveKeyOrder','127']){
    const previous=get(Object.prototype,key);let reads=0,left,right,pair,guard;
    try{define(Object.prototype,key,{__proto__:null,configurable:true,get(){reads++;return key==='cells'?200000:key==='bytes'?4194304:key==='preserveKeyOrder'?false:undefined;}});guard=eligible();reads=0;const old=observed(()=>originalMethodParserTokenFacts(row.tokens));left=reads;reads=0;const current=observed(()=>originalMethodParserTokenFactsGrouped(row.tokens));right=reads;pair={old,current};}finally{if(previous)define(Object.prototype,key,{__proto__:null,...previous});else delete Object.prototype[key];}
    rows.push({key,guard,left,right,pair});retain('06-inherited-'+key,rows.at(-1));assert.equal(guard,false);assertPair(pair,{sameTape:true});assert.equal(left,right);
  }
  const serializer=get(JSON,'stringify'),prefixDrift=[];
  for(const reader of [originalMethodParserTokenFacts,originalMethodParserTokenFactsGrouped]){let changed=false,result;try{result=observed(()=>reader(row.tokens),()=>{if(!changed){changed=true;define(JSON,'stringify',{__proto__:null,...serializer,value(...args){return apply(serializer.value,this,args);}});}});}finally{define(JSON,'stringify',{__proto__:null,...serializer});}prefixDrift.push({reader:reader.name,changed,result});}
  retain('06-prefix-drift',{subject:full(row),prefixDrift});assert.deepEqual(prefixDrift[1].result,prefixDrift[0].result);
  const selected=eligible(),prefix=observed(()=>originalMethodTransformFacts(row.transform));let changed=false,late;
  try{late=observed(()=>originalMethodParserTokenFactsGrouped(row.tokens),(count)=>{if(selected&&!changed&&count>prefix.calls.filter(call=>call.operation==='update').length){changed=true;define(JSON,'stringify',{__proto__:null,...serializer,value(...args){return apply(serializer.value,this,args);}});}});}finally{define(JSON,'stringify',{__proto__:null,...serializer});}
  retain('06-new-group-drift',{subject:full(row),selected,prefix,late,changed});if(selected){assert.equal(changed,true);assert.match(late.result.error?.message??'',/grouped token validation native operations changed/);assert.equal(late.calls.length,prefix.calls.length+2);}else assert.ok(late.result.value);
  const imports={views:new URL('../source-module-views.mjs',import.meta.url).href,impl:new URL('../impl-resolver.mjs',import.meta.url).href,context:new URL('../matches-macro-context.mjs',import.meta.url).href,transforms:new URL('../source-method-transforms.mjs',import.meta.url).href};
  const code=`const saved=Object.getOwnPropertyDescriptor(JSON,'stringify'),native=saved.value;Object.defineProperty(JSON,'stringify',{...saved,value(...args){return Reflect.apply(native,this,args)}});const rows=[];try{const {captureSourceModuleViews}=await import(${JSON.stringify(imports.views)}),{extractImplDeclarations,lowerSharedMethodTokens}=await import(${JSON.stringify(imports.impl)}),{createMatchesMacroContext}=await import(${JSON.stringify(imports.context)}),api=await import(${JSON.stringify(imports.transforms)});const source=${JSON.stringify(shortSource)},views=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}),modules=views.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView})),context=createMatchesMacroContext({modules}),method=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView:modules[0].sourceView}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...method.typePath]),proof=api.createOriginalMethodTokenTransform(context,method,lowered),tokens=api.originalMethodParserTokens(proof);for(const name of ['originalMethodParserTokenFacts','originalMethodParserTokenFactsGrouped'])try{rows.push({name,source:api[name](tokens).source})}catch(error){rows.push({name,error:{name:error.name,message:error.message}})}}catch(error){rows.push({stage:'original-import-or-issuance',error:{name:error.name,message:error.message}})}finally{Object.defineProperty(JSON,'stringify',saved)}console.log(JSON.stringify({rows}));`;
  let child;try{child={stdout:execFileSync(process.execPath,['--input-type=module','-'],{input:code,encoding:'utf8',timeout:20000,maxBuffer:8388608}),status:0};}catch(error){child={status:error.status,signal:error.signal,stdout:String(error.stdout??''),stderr:String(error.stderr??''),message:error.message};}
  retain('06-cold-original-bootstrap',{code,imports,child,rows});assert.equal(child.status,0);const cold=JSON.parse(child.stdout);assert.ok(cold.rows.length);if(cold.rows.length===2)assert.deepEqual(cold.rows[0].error??cold.rows[0].source,cold.rows[1].error??cold.rows[1].source);else assert.equal(cold.rows[0].stage,'original-import-or-issuance');
});

test('real collectors retain independent fields full paths checked survivors and profile source refusals',{timeout:60000},async()=>{
  const cases=[{'src/lib.rs':body},{'src/lib.rs':'pub mod model;pub fn run(v:u8)->u8{model::Counter::good(v)}','src/model.rs':body.replace('pub fn run(v:u8)->u8{Counter::good(v)}','')},{'src/lib.rs':'pub mod model{'+body.replace('pub fn run(v:u8)->u8{Counter::good(v)}','')+'}pub fn run(v:u8)->u8{model::Counter::good(v)}'}],rows=[];
  for(const files of cases){const row=capturedProject(files),old=observed(()=>originalProjectDeclarationRefusalRanges(row.surface,row.association.path)),current=observed(()=>originalProjectDeclarationRefusalRangesGroupedTokens(row.surface,row.association.path)),state=originalMethodSemanticFactsGrouped(row.surface),oldState=originalMethodSemanticFacts(row.surface);rows.push({subject:complete(row),old,current,fieldEvidencePresent:state.fieldEvidence!==undefined});retain('07-path-'+String(rows.length),rows.at(-1));assert.deepEqual(current.result,old.result);assert.equal(state,oldState);assert.equal(state.fieldEvidence!==undefined,true);assert.deepEqual(current.result.value,{methodRange:row.association.range,projectRange:row.association.range});roundTrips(row.result,Object.values(files));const refusal=row.result.meta.refused.find(value=>value.name===row.surface.name);assert.ok(refusal);assert.equal(refusal.message,'unknown name missing');assert.ok(row.result.meta.checkedMethods.some(value=>value.name==='Counter.good'||value.name.endsWith('.Counter.good')));}
  for(const profile of [null,compilationProfile({flags:{test:false,unix:true,windows:false}}),compilationProfile({flags:{test:false,unix:false,windows:true}})]){const result=compile({'src/lib.rs':body},{compilationProfile:profile});retain('07-profile-'+(profile?.flags.unix?'unix':profile?.flags.windows?'windows':'neutral'),{source:body,profile,result});roundTrips(result,[body]);assert.ok(result.meta.checkedMethods.some(value=>value.name==='Counter.good'));assert.ok(result.meta.refused.some(value=>value.message==='unknown name missing'));}
  const shared='pub struct Counter{value:u64}impl Counter{pub fn read(&self)->u64{self.value}}pub fn owned(value:Counter)->u64{value.read()}pub fn shared(value:&Counter)->u64{value.read()}pub fn make(value:u64)->Counter{Counter{value}}',result=compile({'src/lib.rs':shared});retain('07-shared-fields',{source:shared,result});roundTrips(result,[shared]);await verifyTypedTargets(result,api=>{for(const value of [0n,12n,18446744073709551615n]){const record=api.make(value);assert.equal(api.owned(record),value);assert.equal(api.shared(record),value);}},{childTimeoutMs:20000});
  retain('07-language-repository-boundaries',{rows,lexicalOrPublicMetadataAuthority:false});
});

test('complete actual original derive parents retain every source outcome and independent typed target',{timeout:60000},async()=>{
  const data=associatedOriginalParentInputs('derive-helper-originals.test.mjs'),dependencies=loadDeriveDependencyProof(associatedOriginalDependencyInputs(data)),fixture=JSON.parse(readFileSync(new URL('../fixtures/derive-helper-originals.json',import.meta.url),'utf8')),rows=[];
  for(const path of ['src/provider_acceptance.rs','src/response_affinity.rs']){
    const source=data.source(path),pin=fixture.entries.find(entry=>entry.path===path);assert.equal(createHash('sha256').update(source).digest('hex'),pin.sourceSha256);
    const result=translateProject({entry:path,paths:[path],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});for(const row of result.meta.concreteSyntaxMeta)assert.equal(readRustConcreteSyntaxMeta(serializeConcreteSyntaxMeta(row.document)).source,source);for(const program of [result.meta.checkedSemanticProgram,result.meta.targetSemanticProgram]){const serialized=serializeProgram(parseProgram(JSON.stringify(program)));assert.equal(serializeProgram(parseProgram(serialized)),serialized);}const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=pin.methods.map((method,index)=>{assert.ok(result.meta.checkedMethods.some(entry=>entry.name===method.owner+'.'+method.name));const emitted=[...target.declarations.values()].find(entry=>entry.impl?.method===method.name);assert.ok(emitted);return `${emitted.name} as original${index}`;}),suffix=`\nexport {${aliases.join(',')}};`,exposed={...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix};rows.push({path,source,pin,result,suffix});retain('08-parent-'+String(rows.length),rows.at(-1));
    await verifyTypedTargets(exposed,(_api,_result,module)=>{if(path.endsWith('provider_acceptance.rs')){for(const name of ['InvalidCandidate','CredentialRejected','RateLimited','Unverified','PersistenceUncertain']){const kind=Object.freeze({$:name});assert.strictEqual(module.original0(Object.freeze({$:'ProviderProvisionFailure',kind,message:'fixture'})),kind);}assert.throws(()=>module.original0({$:'ProviderProvisionFailure',kind:{$:'Invented'},message:'fixture'}),TypeError);}else{assert.deepEqual(module.original0('/api/services/openai/v1/responses/🧪'),{$:'Some',field0:{$:'OpenAiResponses'}});assert.deepEqual(module.original0('/api/services/codex/v1/chat/completions?stream=true'),{$:'Some',field0:{$:'CodexChat'}});assert.deepEqual(module.original1('/api/services/qwen/v1/conversations/🧪'),{$:'Some',field0:{$:'Tuple',field0:{$:'QwenConversations'},field1:{$:'QwenConversationItems'}}});assert.deepEqual(module.original0('/v1/responses'),{$:'None'});assert.throws(()=>module.original1(null),TypeError);}},{childTimeoutMs:20000});
  }
  retain('08-original-full-parents',{rows,oldOriginalWholeFileStillDecisive:true,unchangedOriginalBunCaseDeadlineMs:5000,performanceGainClaim:false});
});
