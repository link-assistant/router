// Native closure for the fixed private parser graph. This does not change the
// existing common guard domains or authenticate public parser class identities.
import {types} from 'node:util';
import fs,{constants,openSync,closeSync,fstatSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,URL as SourceURL} from 'node:url';
import {dirname,join} from 'node:path';
import {independentParserSha256} from './private-parser-sha256.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,
  originalCapturedFunctionSource,throwOriginalCapturedTypeError,originalPrivateParserNumericCommonIntrinsicsUnchanged} from './original-json-intrinsics.mjs';

const initial=originalPrivateParserNumericCommonIntrinsicsUnchanged();
const root=initial?globalThis:null;
const descriptor=initial?Object.getOwnPropertyDescriptor:null,prototype=initial?Object.getPrototypeOf:null;
const keys=initial?Reflect.ownKeys:null,apply=initial?Reflect.apply:null,own=initial?Object.hasOwn:null;
const proxy=initial?types.isProxy:null,literalFunctionPrototype=initial?prototype(function(){}):null;
let state=null;
function fail(reason){throwOriginalCapturedTypeError('Private parser execution: '+reason);}
function native(value,name){
  return typeof value==='function'&&!proxy(value)&&originalCapturedFunctionSource(value)===`function ${name}() { [native code] }`;
}
function same(a,b){return !!a===!!b&&(!a||own(a,'value')===own(b,'value')&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&(own(a,'value')?a.value===b.value&&a.writable===b.writable:a.get===b.get&&a.set===b.set));}
// The fixed graph never reads an inherited multi-character `get` slot. All
// descriptor inputs have null prototypes; accessor descriptors own their get.
// Preserve the original CST's harmless inherited-getter positive without
// relaxing any other prototype key, descriptor, ancestry or hook check.
function featureKeys(owner,ignoreGet){
  const names=keys(owner);if(!ignoreGet)return names;
  const selected=[];for(let at=0;at<names.length;at++)if(names[at]!=='get')selected.push(names[at]);
  return selected;
}
function initialize(){
  if(!initial||!originalPrivateParserNumericCommonIntrinsicsUnchanged())fail('native source operations unavailable');
  const pins=[],families=[],constructorParents=[],g={__proto__:null};
  function pin(owner,key,name){
    if(owner!==root&&(owner===null||typeof owner!=='object'&&typeof owner!=='function'||proxy(owner)))fail('proxy native owner');
    const field=descriptor(owner,key);
    if(!field||!own(field,'value')||!native(field.value,name))fail('unqualified native '+name);
    pins.push({owner,key,field});return field.value;
  }
  const constructorNames=['Object','Array','String','Number','BigInt','Symbol','RegExp','Function','Error','TypeError','Set','Map','WeakMap','WeakSet','Uint8Array'];
  for(let ci=0;ci<constructorNames.length;ci++){
    const name=constructorNames[ci];
    const value=pin(root,name,name),field=descriptor(value,'prototype');
    if(!field||!own(field,'value')||!field.value||proxy(field.value))fail('native constructor prototype changed');
    const parent=prototype(value);
    if(name==='TypeError'){
      if(parent!==g.Error)fail('native error constructor ancestry changed');
    }else if(name==='Uint8Array'){
      if(!native(parent,'TypedArray')||prototype(parent)!==literalFunctionPrototype)fail('native typed constructor ancestry changed');
      const typed=descriptor(parent,'prototype');
      if(!typed||!own(typed,'value')||!typed.value||proxy(typed.value)||prototype(field.value)!==typed.value)fail('native typed prototype ancestry changed');
      pins.push({owner:parent,key:'prototype',field:typed});constructorParents.push({value:parent,parent:literalFunctionPrototype});
    }else if(parent!==literalFunctionPrototype)fail('native constructor ancestry changed');
    constructorParents.push({value,parent});
    Object.defineProperty(g,name,{__proto__:null,value,enumerable:true});pins.push({owner:value,key:'prototype',field});
  }
  if(g.Function.prototype!==literalFunctionPrototype||g.Object.prototype!==prototype({})||g.Array.prototype!==prototype([]))fail('native literal realm changed');
  const namespaces=['Math','JSON'];for(let ni=0;ni<namespaces.length;ni++){const name=namespaces[ni];
    const field=descriptor(root,name);if(!field||!own(field,'value')||!field.value||typeof field.value!=='object'||proxy(field.value))fail('plain native namespace required');
    Object.defineProperty(g,name,{__proto__:null,value:field.value,enumerable:true});pins.push({owner:root,key:name,field});
  }
  pin(g.Math,'min','min');pin(g.JSON,'parse','parse');pin(g.JSON,'stringify','stringify');
  const methods=[[g.Array,'from'],[g.Array,'isArray'],[g.String,'fromCharCode'],[g.String,'fromCodePoint'],[g.Object,'create'],[g.Object,'defineProperty']];
  for(let mi=0;mi<methods.length;mi++){const row=methods[mi];pin(row[0],row[1],row[1]);}
  const symbols={__proto__:null};
  const symbolNames=['iterator','species','hasInstance','toStringTag','toPrimitive'];for(let si=0;si<symbolNames.length;si++){const name=symbolNames[si];
    const field=descriptor(g.Symbol,name);if(!field||!own(field,'value')||typeof field.value!=='symbol')fail('well-known native symbol changed');
    Object.defineProperty(symbols,name,{__proto__:null,value:field.value,enumerable:true});pins.push({owner:g.Symbol,key:name,field});
  }
  const kinds=[
    ['Object',g.Object.prototype,['constructor','__defineGetter__','__defineSetter__','hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf','propertyIsEnumerable','toString','valueOf','__proto__','toLocaleString']],
    ['Function',literalFunctionPrototype,['length','name','arguments','caller','constructor','apply','bind','call','toString',symbols.hasInstance]],
    ['Number',g.Number.prototype,['constructor','toExponential','toFixed','toPrecision','toString','valueOf','toLocaleString']],
    ['BigInt',g.BigInt.prototype,['constructor','toLocaleString','toString','valueOf',symbols.toStringTag]],
    ['Symbol',g.Symbol.prototype,['constructor','toString','valueOf','description',symbols.toPrimitive,symbols.toStringTag]],
    ['Error',g.Error.prototype,['constructor','name','message','toString']],
    ['TypeError',g.TypeError.prototype,['constructor','name','message']],
  ];
  for(let ki=0;ki<kinds.length;ki++){
    const row=kinds[ki],kind=row[0],owner=row[1],allowed=row[2];
    const parent=prototype(owner),names=featureKeys(owner,kind==='Object'),fields=[];
    if(parent!==(kind==='Object'?null:kind==='TypeError'?g.Error.prototype:g.Object.prototype))fail('feature prototype ancestry changed');
    for(let at=0;at<names.length;at++){
      const key=names[at],field=descriptor(owner,key);if(!allowed.includes(key))fail('unknown feature prototype field');
      if(own(field,'value')){
        if(typeof field.value==='function'){
          const name=key==='constructor'?kind:key===symbols.hasInstance?'[Symbol.hasInstance]':key===symbols.toPrimitive?'[Symbol.toPrimitive]':key;
          if(!native(field.value,name))fail('unqualified feature prototype method');
        }else if(key==='length'){
          if(kind!=='Function'||field.value!==0)fail('native function length changed');
        }else if(key==='name'){
          if(typeof field.value!=='string'||field.value!==(kind==='Function'?'':kind)||kind!=='Function'&&(field.writable!==true||field.enumerable!==false||field.configurable!==true))fail('native prototype name changed');
        }else if(key==='message'){
          if(typeof field.value!=='string'||field.value!==''||field.writable!==true||field.enumerable!==false||field.configurable!==true)fail('native prototype message changed');
        }else if(key===symbols.toStringTag){
          if(typeof field.value!=='string'||field.value!==kind)fail('native prototype tag changed');
        }else fail('unqualified feature prototype scalar');
      }else if(kind==='Function'&&['arguments','caller'].includes(key)){
        const node=field.get===field.set&&native(field.get,''),bun=field.get!==field.set&&native(field.get,key)&&native(field.set,key);
        if(field.enumerable||!field.configurable||!node&&!bun)fail('function poison accessor changed');
      }else if(field.get!==undefined&&!native(field.get,'get '+key)&&!native(field.get,key)||field.set!==undefined&&!native(field.set,'set '+key))fail('feature accessor changed');
      fields.push(field);
    }
    families.push({owner,parent,names,fields});
  }
  const prepare=descriptor(g.Error,'prepareStackTrace');
  if(prepare&&(!own(prepare,'value')||prepare.value!==undefined&&(typeof prepare.value!=='function'||proxy(prepare.value))))fail('stack formatter must be unused own data');
  pins.push({owner:g.Error,key:'prepareStackTrace',field:prepare});
  const limit=descriptor(g.Error,'stackTraceLimit');
  if(limit&&(!own(limit,'value')||typeof limit.value!=='number'))fail('stack limit must be numeric own data');
  pins.push({owner:g.Error,key:'stackTraceLimit',field:limit});
  const ancestors=[literalFunctionPrototype,g.Object.prototype];for(let ai=0;ai<ancestors.length;ai++){const owner=ancestors[ai];if(descriptor(owner,'stackTraceLimit')||descriptor(owner,'prepareStackTrace'))fail('inherited diagnostic hook');}
  const typed=g.Uint8Array.prototype,typedParent=prototype(typed),length=descriptor(typedParent,'length');
  if(proxy(typedParent)||!length||own(length,'value')||!native(length.get,'get length')||length.set!==undefined)fail('native byte view length required');
  pins.push({owner:typedParent,key:'length',field:length});
  const view=new g.Uint8Array(1);view[0]=173;if(apply(length.get,view,[])!==1||view[0]!==173)fail('byte receiver differs');
  // Spread, destructuring and IteratorClose reach these exact native owners.
  // Common qualification pins next, but does not exclude a late own return.
  const iterator=apply(descriptor(g.Array.prototype,symbols.iterator).value,[],[]),iteratorOwners=[];
  for(let owner=prototype(iterator);owner!==g.Object.prototype;owner=prototype(owner)){
    if(!owner||proxy(owner)||descriptor(owner,'return'))fail('unqualified iterator close');
    const names=keys(owner),fields=[];
    for(let at=0;at<names.length;at++){
      const key=names[at],field=descriptor(owner,key);if(!field)fail('iterator descriptor missing');
      if(!own(field,'value')){
        // Bun's shared Iterator prototype has these two stock accessors. They
        // are never invoked by the fixed graph; retain exact native identities.
        const name=key==='constructor'?'constructor':key===symbols.toStringTag?'':null;
        if(iteratorOwners.length!==1||prototype(owner)!==g.Object.prototype||name===null||field.enumerable!==false||field.configurable!==true||
          !native(field.get,name)||!native(field.set,name)||prototype(field.get)!==literalFunctionPrototype||prototype(field.set)!==literalFunctionPrototype)fail('iterator accessor');
        constructorParents.push({value:field.get,parent:literalFunctionPrototype},{value:field.set,parent:literalFunctionPrototype});
      }else if((key==='next'||key===symbols.iterator)&&!native(field.value,key===symbols.iterator?'[Symbol.iterator]':'next'))fail('unqualified iterator method');
      fields.push(field);
    }
    iteratorOwners.push(owner);families.push({owner,parent:prototype(owner),names,fields});
    if(iteratorOwners.length>4)fail('iterator ancestry bound');
  }
  // These are qualified brand probes, never caller objects or callbacks.
  if(apply(g.String,undefined,['source'])!=='source'||apply(g.Number,undefined,['1.5'])!==1.5||apply(g.BigInt,undefined,['19'])!==19n||g.String.fromCodePoint(128512)!=='😀'||g.Math.min(3,7)!==3)fail('native scalar receiver differs');
  const key={},map=new g.WeakMap();if(map.set(key,19)!==map||map.get(key)!==19)fail('weak receiver differs');
  state={g,pins,families,constructorParents,typed,typedParent,length:length.get};return state;
}

function checked(){
  if(!initial||!originalPrivateParserNumericCommonIntrinsicsUnchanged())fail('native source operations changed');
  const current=state??initialize();
  for(let pi=0;pi<current.pins.length;pi++){const pin=current.pins[pi];if(!same(descriptor(pin.owner,pin.key),pin.field))fail('live native operation changed');}
  for(let fi=0;fi<current.families.length;fi++){const family=current.families[fi];
    if(proxy(family.owner)||prototype(family.owner)!==family.parent)fail('live feature ancestry changed');
    const names=featureKeys(family.owner,family.owner===current.g.Object.prototype);if(names.length!==family.names.length)fail('live feature shape changed');
    for(let at=0;at<names.length;at++)if(names[at]!==family.names[at]||!same(descriptor(family.owner,names[at]),family.fields[at]))fail('live feature descriptor changed');
  }
  for(let ci=0;ci<current.constructorParents.length;ci++){const item=current.constructorParents[ci];if(prototype(item.value)!==item.parent)fail('live constructor ancestry changed');}
  if(prototype(current.typed)!==current.typedParent||prototype(current.g.Function)!==literalFunctionPrototype)fail('live byte/function ancestry changed');
  return current;
}

const manifestSha256='2b90cfff14c38668a1159dfe41c05928e98f2ab363156fb3c3e77b7195f61d19';
let paths=null,compiled=null,compiledSources=null,active=false;
function statIdentity(value){
  if(!value||typeof value!=='object'||proxy(value))fail('own primitive source stat required');
  const names=['dev','ino','size','mode','mtimeMs','ctimeMs'],result={__proto__:null};
  for(let at=0;at<names.length;at++){
    const name=names[at],field=descriptor(value,name);
    if(!field||!own(field,'value')||typeof field.value!=='number'||!(field.value>-9007199254740992&&field.value<9007199254740992))fail('own finite source stat required');
    Object.defineProperty(result,name,{__proto__:null,value:field.value,enumerable:true});
  }
  return result;
}
const sameIdentity=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mode===b.mode&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
// Directory entry churn does not change the identity of an authenticated path.
const sameDirectoryIdentity=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode;
function regular(stat){return (stat.mode&0o170000)===0o100000;}
function observedRead(fd,bytes,offset,length,position){
  // Bun does not rebind a named readSync import after syncBuiltinESMExports.
  // Observe the actual current own-data operation at every read, without a
  // property lookup that could invoke an accessor or proxy trap.
  if(!fs||typeof fs!=='object'||proxy(fs))fail('nonproxy source filesystem required');
  const field=descriptor(fs,'readSync');
  if(!field||!own(field,'value')||typeof field.value!=='function'||proxy(field.value))fail('own-data source read function required');
  return apply(field.value,undefined,[fd,bytes,offset,length,position]);
}
function readOriginal(path,limit,records,ancestors){
  checked();
  for(let parent=dirname(path);parent!==dirname(parent);parent=dirname(parent)){
    if(ancestors.some(row=>row.path===parent))continue;
    const value=lstatSync(parent);checked();const stat=statIdentity(value);if((stat.mode&0o170000)!==0o040000)fail('linked source ancestor');
    ancestors.push({path:parent,identity:stat});
  }
  const beforeValue=lstatSync(path);checked();const before=statIdentity(beforeValue);
  if(!regular(before)||before.size<0||before.size>limit)fail('bounded regular source required');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  if(typeof fd!=='number'||fd<0||fd%1!==0||fd>2147483647)fail('primitive source fd required');
  try{
    checked();
    const openedValue=fstatSync(fd);checked();const opened=statIdentity(openedValue);if(!sameIdentity(before,opened))fail('source fd differs');
    const bytes=new state.g.Uint8Array(opened.size);let at=0;
    while(at<opened.size){const count=observedRead(fd,bytes,at,opened.size-at,at);checked();if(typeof count!=='number'||count%1!==0||count<=0||count>opened.size-at)fail('invalid or truncated source read');at+=count;}
    const extra=new state.g.Uint8Array(1),tail=observedRead(fd,extra,0,1,at);checked();
    const after=fstatSync(fd);checked();const named=lstatSync(path);checked();
    if(tail!==0||!sameIdentity(opened,statIdentity(after))||!sameIdentity(opened,statIdentity(named)))fail('source changed during read');
    records.push({path,identity:opened});return bytes;
  }finally{closeSync(fd);checked();}
}
function hash(value){
  const engine=createHash('sha256');checked();
  const updated=engine.update(value);checked();
  const result=updated.digest('hex');checked();
  if(typeof result!=='string')fail('primitive source hash required');return result;
}
function decoded(bytes){
  // Canonical UTF8 decoding uses only qualified primitive operations. Decoder
  // globals and Buffer.toString cannot supply executable or manifest text.
  const size=apply(state.length,bytes,[]),pieces=[];let chunk='';
  for(let at=0;at<size;){
    const first=bytes[at++];let code=first,needed=0,min=0;
    if(first>=194&&first<=223){code=first&31;needed=1;min=128;}
    else if(first>=224&&first<=239){code=first&15;needed=2;min=2048;}
    else if(first>=240&&first<=244){code=first&7;needed=3;min=65536;}
    else if(first>127)fail('invalid original UTF8');
    for(let left=needed;left>0;left--){if(at>=size||bytes[at]<128||bytes[at]>191)fail('invalid original UTF8 continuation');code=code*64+(bytes[at++]&63);}
    if(code<min||code>1114111||code>=55296&&code<=57343)fail('noncanonical original UTF8');
    const point=state.g.String.fromCodePoint(code);
    // Whole scalar points keep chunks <=4096 UTF16 units, without a per-point
    // array cell or an unbounded intermediate concatenation chain.
    if(chunk.length+point.length>4096){pieces.push(chunk);chunk='';}
    chunk+=point;
  }
  if(chunk)pieces.push(chunk);return pieces.join('');
}
function sameUtf8(source,bytes){
  let at=0;const size=apply(state.length,bytes,[]);
  function byte(value){if(at>=size||bytes[at++]!==value)fail('current original UTF8 bytes differ');}
  for(let index=0;index<source.length;index++){
    let code=source.charCodeAt(index);
    if(code>=55296&&code<=56319){if(++index>=source.length)fail('original UTF16 changed');const low=source.charCodeAt(index);if(low<56320||low>57343)fail('original UTF16 changed');code=65536+(code-55296)*1024+low-56320;}
    else if(code>=56320&&code<=57343)fail('original UTF16 changed');
    if(code<128)byte(code);
    else if(code<2048){byte(192|(code>>>6));byte(128|(code&63));}
    else if(code<65536){byte(224|(code>>>12));byte(128|((code>>>6)&63));byte(128|(code&63));}
    else{byte(240|(code>>>18));byte(128|((code>>>12)&63));byte(128|((code>>>6)&63));byte(128|(code&63));}
  }
  if(at!==size)fail('original UTF8 length changed');
}
function originalRow(row,records,ancestors){
  if(typeof row.path!=='string'||row.path.length>240||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').some(part=>!part||part==='.'||part==='..'))fail('source path escapes registry');
  const bytes=readOriginal(join(paths.base,row.path),100000,records,ancestors),size=apply(state.length,bytes,[]);
  if(size!==row.bytes||hash(bytes)!==row.sha256)fail('complete source bytes changed');
  const source=decoded(bytes);checked();if(hash(source)!==row.sha256)fail('complete decoded source changed');
  if(independentParserSha256(source)!==row.sha256)fail('independent complete source digest differs');checked();sameUtf8(source,bytes);return source;
}
function authenticate(){
  checked();
  if(!paths){
    const base=fileURLToPath(new SourceURL('./',import.meta.url));checked();
    const manifest=join(base,'source-profiles/private-parser-execution/manifest.json');checked();paths={base,manifest};
  }
  const records=[],ancestors=[],raw=readOriginal(paths.manifest,32768,records,ancestors);
  if(hash(raw)!==manifestSha256)fail('complete parser manifest changed');
  const text=decoded(raw);checked();if(hash(text)!==manifestSha256)fail('decoded parser manifest changed');
  if(independentParserSha256(text)!==manifestSha256)fail('independent parser manifest digest differs');checked();sameUtf8(text,raw);
  checked();const manifest=state.g.JSON.parse(text);checked();
  if(manifest.schema!=='private-registered-parser-execution-v1'||manifest.sources.length!==7)fail('complete parser registry required');
  const sources={__proto__:null};let total=0;
  for(let ri=0;ri<manifest.sources.length;ri++){const row=manifest.sources[ri];total+=row.bytes;const source=originalRow(row,records,ancestors);Object.defineProperty(sources,row.id,{__proto__:null,value:source,enumerable:true});}
  for(let ri=0;ri<manifest.licenses.length;ri++)originalRow(manifest.licenses[ri],records,ancestors);
  for(let ri=0;ri<manifest.notices.length;ri++)originalRow(manifest.notices[ri],records,ancestors);
  for(let ri=0;ri<manifest.hostInputs.length;ri++)originalRow(manifest.hostInputs[ri],records,ancestors);
  if(total!==74444)fail('complete source census differs');
  return {manifest,sources,records,ancestors,text};
}
function finalIdentities(records,ancestors){
  for(let ai=0;ai<ancestors.length;ai++){const record=ancestors[ai],value=lstatSync(record.path);checked();const now=statIdentity(value);if((now.mode&0o170000)!==0o040000||!sameDirectoryIdentity(now,record.identity))fail('source ancestor changed');}
  for(let ri=0;ri<records.length;ri++){const record=records[ri],value=lstatSync(record.path);checked();const now=statIdentity(value);if(!regular(now)||!sameIdentity(now,record.identity))fail('source identity changed');}
}
function rewrite(source,row){
  const pieces=[],reverse=[];let at=0,position=0;
  for(let ei=0;ei<row.edits.length;ei++){const edit=row.edits[ei];
    if(edit.phase!=='language'||typeof edit.replacement!=='string'||edit.start<at||source.slice(edit.start,edit.end)!==edit.expected)fail('exact language source boundary differs');
    const part=source.slice(at,edit.start);pieces.push(part);position+=part.length;
    reverse.push({position,expected:edit.expected,replacement:edit.replacement});pieces.push(edit.replacement);position+=edit.replacement.length;at=edit.end;
  }
  pieces.push(source.slice(at));const rewritten=pieces.join(''),restored=[];at=0;
  for(let ei=0;ei<reverse.length;ei++){const edit=reverse[ei];if(rewritten.slice(edit.position,edit.position+edit.replacement.length)!==edit.replacement)fail('exact reverse replacement differs');restored.push(rewritten.slice(at,edit.position),edit.expected);at=edit.position+edit.replacement.length;}
  restored.push(rewritten.slice(at));if(restored.join('')!==source)fail('complete source reverse equality differs');return rewritten;
}
const workflow=`
function originalNativeWhitespace(text){
 let result='';for(let at=0;at<text.length;at++){
  const code=text.charCodeAt(at);
  if(code===9||code===10||code===11||code===12||code===13||code===32||code===160||code===5760||code>=8192&&code<=8202||code===8232||code===8233||code===8239||code===8287||code===12288||code===65279)continue;
  result+=text[at];
 }return result;
}
function originalIdentityTransport(input,language,serializedInput){
 checked();let first,wire;
 if(serializedInput){
  text(input,SERIAL_LIMIT,'serialized CST');serializedPreflight(input);
  let parsed;try{parsed=parse(input);}catch{fail('invalid serialized JSON');}
  first=validated(parsed);wire=stringify(first);if(wire!==input)fail('noncanonical serialized CST');
 }else{
  text(input,SOURCE_LIMIT,'source');languageName(language);first=build(input,language);wire=stringify(first);
 }
 if(wire.length>SERIAL_LIMIT)fail('serialized budget exceeded');
 serializedPreflight(wire);let parsed;try{parsed=parse(wire);}catch{fail('invalid serialized JSON');}
 const document=validated(parsed);if(stringify(document)!==wire)fail('noncanonical serialized CST');
 const pieces=[];for(let at=1;at<document.nodes.length;at++){const node=document.nodes[at];if(node[0]!=='group')pieces.push(document.source.slice(node[2],node[3]));}
 const source=pieces.join('');if(source!==document.source||source!==first.source)fail('leaf partition does not reconstruct source');
 const trace=[{phase:'language',rules:[]},{phase:'repository',rules:[]}];checked();return {source,document,meta:wire,trace};
}
`;
function fixedPhases(input,phases){
  const trace=[];let value=input;
  if(phases.length!==2||phases[0].phase!=='language'||phases[1].phase!=='repository')fail('fixed language/repository order required');
  for(let pi=0;pi<phases.length;pi++){const phase=phases[pi];for(let ri=0;ri<phase.rules.length;ri++){const rule=phase.rules[ri];value=rule.apply(value);trace.push({phase:phase.phase,id:rule.id});}}
  return {value,trace};
}
function compile(packet){
  const cache={__proto__:null},recipes=[],g=state.g;
  const hosts={__proto__:null,'host:util':{types:{isProxy:proxy}},'host:common':{originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource,throwOriginalCapturedTypeError}};
  const globals=['Object','Array','String','Number','BigInt','Symbol','RegExp','Function','Error','TypeError','Set','Map','WeakMap','WeakSet','Uint8Array','Math','JSON'];
  for(let ri=0;ri<packet.manifest.sources.length;ri++){const row=packet.manifest.sources[ri];
    const original=packet.sources[row.id],suffix=row.id==='concrete'?workflow+'\n'+standaloneParsedWorkflow:'';
    const declarations=[{phase:'language',rules:[
      {id:'exact-private-source-substitutions',apply(value){return {...value,rewritten:rewrite(value.original,row)};}},
      {id:'explicit-strict-wrapper',apply(value){
        const exports=row.exports.map(name=>name+':'+name);if(row.id==='concrete')exports.push('originalIdentityTransport:originalIdentityTransport','originalStandaloneSourceTransport:originalStandaloneSourceTransport');
        return {...value,body:'"use strict";\n'+value.rewritten+'\n'+suffix+'\nreturn {'+exports.join(',')+'};'};
      }},
    ]},{phase:'repository',rules:[
      {id:'closed-registered-import-bindings',apply(value){
        const names=[],values=[];
        for(let di=0;di<row.imports.length;di++){const dependency=row.imports[di];
          const module=own(hosts,dependency.module)?hosts[dependency.module]:cache[dependency.module];
          if(!module)fail('unregistered module order');
          for(let bi=0;bi<dependency.names.length;bi++){const name=dependency.names[bi];if(!own(module,name))fail('unregistered module binding');names.push(name);values.push(module[name]);}
        }
        for(let gi=0;gi<globals.length;gi++){const name=globals[gi];names.push(name);values.push(g[name]);}
        names.push('globalThis');values.push(root);return {...value,names,values};
      }},
      {id:'instantiate-registered-module',apply(value){
        checked();const factory=apply(g.Function,undefined,[...value.names,value.body]);checked();
        const module=apply(factory,undefined,value.values);checked();return {...value,module};
      }},
    ]}];
    for(let at=0;at<2;at++){
      const expected=packet.manifest.rules[at],actual=declarations[at];
      if(expected.phase!==actual.phase||expected.rules.length!==actual.rules.length||expected.rules.some((id,index)=>id!==actual.rules[index].id))fail('registered executed rule order differs');
    }
    const result=fixedPhases({original},declarations);
    Object.defineProperty(cache,row.id,{__proto__:null,value:result.value.module,enumerable:true});
    recipes.push({id:row.id,original,rewritten:result.value.rewritten,body:result.value.body,edits:row.edits,trace:result.trace});
  }
  return {modules:cache,recipes};
}

// Raw lexical output can precede the CST's 200000-node opacity decision. The
// 2Mi UTF16 source ceiling bounds these fixed token/part shapes below 16Mi
// cells; do not replace a genuine node-budget opaque document with lex failure.
function data(value,depth=0,budget={cells:16777216}){
  if(--budget.cells<0||depth>256)fail('private output data budget');
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'||typeof value==='bigint'||value===undefined)return value;
  if(typeof value!=='object'||proxy(value))fail('private executable result cannot escape');
  const array=Array.isArray(value),parent=prototype(value);if(parent!==(array?Array.prototype:Object.prototype)&&parent!==null)fail('private class cannot escape');
  const names=keys(value),result=array?[]:parent===null?Object.create(null):{};
  for(let at=0;at<names.length;at++){
    const key=names[at];if(typeof key!=='string')fail('private symbol cannot escape');if(array&&key==='length')continue;
    const field=descriptor(value,key);if(!field||!own(field,'value')||field.enumerable!==true)fail('private nondata result cannot escape');
    Object.defineProperty(result,key,{__proto__:null,value:data(field.value,depth+1,budget),enumerable:true,writable:true,configurable:true});
  }
  return result;
}
function execute(input,language,operation){
  checked();if(active)fail('recursive source transaction');
  if(typeof input!=='string'||input.length>(operation==='serialized'?33554432:2097152))fail('bounded primitive source required');
  if(language!=='Rust'&&language!=='JavaScript'&&language!=='TypeScript')fail('unsupported language');
  active=true;
  try{
    const before=authenticate();checked();
    if(!compiled){compiled=compile(before);compiledSources=before.sources;}
    for(let ri=0;ri<before.manifest.sources.length;ri++){const row=before.manifest.sources[ri];if(compiledSources[row.id]!==before.sources[row.id])fail('compiled complete source changed');}
    const selected=compiled,selectedSources=compiledSources,modules=selected.modules;
    const rust=modules.rust.rustTokens,javascript=modules.javascript.tokenize,transport=operation==='source'?modules.concrete.originalStandaloneSourceTransport:modules.concrete.originalIdentityTransport;
    let result;
    try{
      if(operation==='recipes')result=data(selected.recipes);
      else if(operation==='tokens')result=data(language==='Rust'?rust(input):javascript(input,'JavaScript'));
      else result=transport(input,language,operation==='serialized');
    }catch(error){
      checked();const message=error!==null&&typeof error==='object'&&!proxy(error)?descriptor(error,'message'):null;
      // Never inspect stack or return a private Error/class/constructor.
      throwOriginalCapturedTypeError(message&&own(message,'value')&&typeof message.value==='string'?message.value:'Private original grammar refused');
    }
    checked();const after=authenticate();
    if(before.text!==after.text)fail('current manifest differs');
    for(let ri=0;ri<before.manifest.sources.length;ri++){const row=before.manifest.sources[ri];if(before.sources[row.id]!==after.sources[row.id])fail('current complete source differs');}
    finalIdentities(before.records,before.ancestors);finalIdentities(after.records,after.ancestors);checked();
    // Only private immutable executable identities and primitive input remain;
    // no hash, decode or caller callback follows this final association.
    if(compiled!==selected||compiledSources!==selectedSources||selected.modules!==modules||modules.rust.rustTokens!==rust||modules.javascript.tokenize!==javascript||(operation==='source'?modules.concrete.originalStandaloneSourceTransport:modules.concrete.originalIdentityTransport)!==transport)fail('source transaction association changed');
    for(let ri=0;ri<before.manifest.sources.length;ri++){const row=before.manifest.sources[ri];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled source association changed');}
    return result;
  }finally{active=false;}
}

export function assertPrivateParserExecution(){checked();}
/** Qualification only; never a source/type/owner admission flag. */
export function privateParserHostAvailable(){try{checked();return true;}catch{return false;}}
/** Complete data-only execution recipes; no private functions or classes. */
export function originalPrivateParserSourceInputs(){return execute('','Rust','recipes');}
/** Syntax data only: this is not an original module/owner/type proof. */
export function lexPrivateConcreteSource(source,language){return execute(source,language,'tokens');}
/** Fixed identity language/repository phases; no caller callback or permit. */
export function transportPrivateConcreteSource(source,language){return execute(source,language,'source');}
/** Canonical edited CST receives fresh independent builds, never old authority. */
export function transportPrivateConcreteMeta(serialized){return execute(serialized,'Rust','serialized');}

// A separately named data-only batch contract. Single execute() above retains
// its complete source and callback schedule. No callback/permit is accepted.
const BATCH_ROWS=256,BATCH_SOURCE=2097152,BATCH_UTF8=8388608,BATCH_NODES=200000,BATCH_SERIAL=33554432;
function batchSnapshot(input,current){
  const snapshots=[];
  function shape(value,expected,expectedNames){
    if(!value||typeof value!=='object'||proxy(value))fail('batch own-data input required');
    const parent=prototype(value),names=keys(value);
    // Reject unknown keys (including native lazy stack) before any field read.
    if(names.length!==expectedNames.length)fail('batch exact own-field shape required');
    for(let at=0;at<names.length;at++)if(names[at]!==expectedNames[at])fail('batch exact own-field names required');
    if(parent!==expected&&!(expected===current.g.Object.prototype&&parent===null))fail('batch input prototype differs');
    const fields=[];for(let at=0;at<names.length;at++){
      const field=descriptor(value,names[at]);if(!field||!own(field,'value'))fail('batch own-data fields required');
      fields.push(field);
    }
    snapshots.push({value,parent,names,fields});return {names,fields};
  }
  if(!input||typeof input!=='object'||proxy(input)||!current.g.Array.isArray(input))fail('batch dense array required');
  const length=descriptor(input,'length');
  if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<1||length.value>BATCH_ROWS||length.value%1)fail('batch row budget');
  const positions=[];for(let at=0;at<length.value;at++)positions.push(''+at);positions.push('length');
  const outer=shape(input,current.g.Array.prototype,positions);
  if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<1||length.value>BATCH_ROWS||length.value%1||outer.names.length!==length.value+1||outer.names[length.value]!=='length')fail('batch row budget or dense shape');
  const rows=[];let units=0,bytes=0;
  for(let at=0;at<length.value;at++){
    if(outer.names[at]!==''+at||outer.fields[at].enumerable!==true)fail('batch positional data required');
    const value=outer.fields[at].value,row=shape(value,current.g.Object.prototype,['source','language']);
    if(row.names.length!==2||row.names[0]!=='source'||row.names[1]!=='language'||row.fields[0].enumerable!==true||row.fields[1].enumerable!==true)fail('batch source/language row required');
    const source=row.fields[0].value,language=row.fields[1].value;
    if(typeof source!=='string'||source.length>BATCH_SOURCE||language!=='Rust'&&language!=='JavaScript'&&language!=='TypeScript')fail('batch primitive source/language required');
    units+=source.length;if(units>BATCH_SOURCE)fail('batch aggregate source budget');
    for(let index=0;index<source.length;index++){
      const code=source.charCodeAt(index);
      if(code>=55296&&code<=56319&&index+1<source.length){const low=source.charCodeAt(index+1);if(low>=56320&&low<=57343){bytes+=4;index++;continue;}}
      bytes+=code<128?1:code<2048?2:3;
    }
    if(bytes>BATCH_UTF8)fail('batch aggregate UTF8 budget');rows.push({source,language});
  }
  return {rows,snapshots,units,bytes};
}
function batchInputCurrent(snapshots){
  for(let at=0;at<snapshots.length;at++){
    const row=snapshots[at];if(prototype(row.value)!==row.parent)fail('batch input ancestry changed');
    const names=keys(row.value);if(names.length!==row.names.length)fail('batch input own shape changed');
    for(let index=0;index<names.length;index++)if(names[index]!==row.names[index])fail('batch input own names changed');
    for(let index=0;index<names.length;index++)if(!same(descriptor(row.value,names[index]),row.fields[index]))fail('batch input descriptor/value changed');
  }
}
/** Fixed ordered CST batch. All throws abort the whole batch; no row classifier. */
export function transportPrivateConcreteSources(input){
  const current=checked();if(active)fail('recursive source transaction');
  const request=batchSnapshot(input,current);active=true;
  try{
    const before=authenticate();checked();
    if(!compiled){compiled=compile(before);compiledSources=before.sources;}
    const selected=compiled,selectedSources=compiledSources,modules=selected.modules,transport=modules.concrete.originalIdentityTransport;
    for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled complete source changed');}
    const rows=[];let nodes=0,canonicalUnits=0;
    for(let at=0;at<request.rows.length;at++){
      checked();const row=request.rows[at];let result;
      try{result=transport(row.source,row.language,false);}catch(error){
        checked();const message=error!==null&&typeof error==='object'&&!proxy(error)?descriptor(error,'message'):null;
        throwOriginalCapturedTypeError(message&&own(message,'value')&&typeof message.value==='string'?message.value:'Private original grammar refused');
      }
      checked();
      if(result.source!==row.source||result.document.language!==row.language)fail('batch source association differs');
      nodes+=result.document.nodes.length;canonicalUnits+=result.meta.length;
      if(nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL)fail('batch aggregate node/canonical budget');
      rows.push(result);
    }
    const result={rows,totals:{rows:rows.length,sourceCodeUnits:request.units,utf8Bytes:request.bytes,nodes,canonicalCodeUnits:canonicalUnits}};
    const after=authenticate();checked();if(before.text!==after.text)fail('current manifest differs');
    for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(before.sources[row.id]!==after.sources[row.id])fail('current complete source differs');}
    finalIdentities(before.records,before.ancestors);finalIdentities(after.records,after.ancestors);checked();
    if(compiled!==selected||compiledSources!==selectedSources||selected.modules!==modules||modules.concrete.originalIdentityTransport!==transport)fail('batch source transaction association changed');
    for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled source association changed');}
    // Captured native reflection only: no callbacks/hash/IO follow this join.
    batchInputCurrent(request.snapshots);return result;
  }finally{active=false;}
}


// A separate corpus contract: <=3 independently authenticated256-row chunks.
// The complete old executor and all old single/batch APIs above stay unchanged.
function chunkSnapshot(input,current){
  if(!input||typeof input!=='object'||proxy(input)||!current.g.Array.isArray(input)||prototype(input)!==current.g.Array.prototype)fail('corpus dense chunk array required');
  const length=descriptor(input,'length');
  if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<1||length.value>3||length.value%1)fail('corpus chunk budget');
  const names=keys(input),expected=[];for(let at=0;at<length.value;at++)expected.push(''+at);expected.push('length');
  if(names.length!==expected.length)fail('corpus exact chunk shape required');
  for(let at=0;at<names.length;at++)if(names[at]!==expected[at])fail('corpus exact chunk names required');
  const fields=[];for(let at=0;at<names.length;at++){const field=descriptor(input,names[at]);if(!field||!own(field,'value')||at<length.value&&field.enumerable!==true)fail('corpus own-data chunks required');fields.push(field);}
  const snapshots=[{value:input,parent:current.g.Array.prototype,names,fields}],chunks=[];let units=0,bytes=0,rows=0;
  for(let at=0;at<length.value;at++){
    const request=batchSnapshot(fields[at].value,current);units+=request.units;bytes+=request.bytes;rows+=request.rows.length;
    if(units>BATCH_SOURCE||bytes>BATCH_UTF8)fail('corpus aggregate source/UTF8 budget');
    for(let index=0;index<request.snapshots.length;index++)snapshots.push(request.snapshots[index]);chunks.push(request);
  }
  return {chunks,snapshots,units,bytes,rows};
}
/** Data-only chunked fidelity transport. No caller callback or reusable epoch. */
export function transportPrivateConcreteChunks(input){
  const current=checked();if(active)fail('recursive source transaction');
  const request=chunkSnapshot(input,current);active=true;
  try{
    const chunks=[],joins=[];let nodes=0,canonicalUnits=0;
    for(let ci=0;ci<request.chunks.length;ci++){
      const chunk=request.chunks[ci],before=authenticate();checked();
      if(!compiled){compiled=compile(before);compiledSources=before.sources;}
      const selected=compiled,selectedSources=compiledSources,modules=selected.modules,transport=modules.concrete.originalIdentityTransport;
      for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled complete source changed');}
      const rows=[];let chunkNodes=0,chunkCanonical=0;
      for(let at=0;at<chunk.rows.length;at++){
        checked();const row=chunk.rows[at];let result;
        try{result=transport(row.source,row.language,false);}catch(error){
          checked();const message=error!==null&&typeof error==='object'&&!proxy(error)?descriptor(error,'message'):null;
          throwOriginalCapturedTypeError(message&&own(message,'value')&&typeof message.value==='string'?message.value:'Private original grammar refused');
        }
        checked();if(result.source!==row.source||result.document.language!==row.language)fail('corpus source association differs');
        nodes+=result.document.nodes.length;canonicalUnits+=result.meta.length;chunkNodes+=result.document.nodes.length;chunkCanonical+=result.meta.length;
        if(nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL)fail('corpus aggregate node/canonical budget');
        rows.push(result);
      }
      const after=authenticate();checked();if(before.text!==after.text)fail('current manifest differs');
      for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(before.sources[row.id]!==after.sources[row.id])fail('current complete source differs');}
      finalIdentities(before.records,before.ancestors);finalIdentities(after.records,after.ancestors);checked();
      joins.push({before,after,selected,selectedSources,modules,transport});
      chunks.push({rows,totals:{rows:rows.length,sourceCodeUnits:chunk.units,utf8Bytes:chunk.bytes,nodes:chunkNodes,canonicalCodeUnits:chunkCanonical}});
    }
    // Later chunk callbacks may invalidate an earlier chunk's paths or inputs.
    for(let ci=0;ci<joins.length;ci++){const join=joins[ci];finalIdentities(join.before.records,join.before.ancestors);finalIdentities(join.after.records,join.after.ancestors);}checked();
    const result={chunks,totals:{chunks:chunks.length,rows:request.rows,sourceCodeUnits:request.units,utf8Bytes:request.bytes,nodes,canonicalCodeUnits:canonicalUnits}};
    for(let ci=0;ci<joins.length;ci++){
      const join=joins[ci];if(compiled!==join.selected||compiledSources!==join.selectedSources||join.selected.modules!==join.modules||join.modules.concrete.originalIdentityTransport!==join.transport||join.before.text!==join.after.text)fail('corpus final source transaction association changed');
      for(let at=0;at<join.before.manifest.sources.length;at++){const row=join.before.manifest.sources[at];if(join.selectedSources[row.id]!==join.before.sources[row.id]||join.before.sources[row.id]!==join.after.sources[row.id])fail('corpus final complete source association changed');}
    }
    batchInputCurrent(request.snapshots);return result;
  }finally{active=false;}
}

/** Storage only: never accepted as a source, grammar, owner or skip permit. */
export function capturePrivateParserCorpusSources(input,options){
  const current=checked(),records=[];
  function shape(value,expected,namesExpected){
    if(!value||typeof value!=='object'||proxy(value))fail('corpus module own data required');
    const parent=prototype(value);if(parent!==expected&&!(expected===current.g.Object.prototype&&parent===null))fail('corpus module ancestry differs');
    const names=keys(value);if(names.length!==namesExpected.length)fail('corpus module exact own shape required');
    for(let at=0;at<names.length;at++)if(names[at]!==namesExpected[at])fail('corpus module exact own names required');
    const fields=[];for(let at=0;at<names.length;at++){const field=descriptor(value,names[at]);if(!field||!own(field,'value')||names[at]!=='length'&&field.enumerable!==true)fail('corpus module own data fields required');fields.push(field);}
    records.push({value,parent,names,fields});return fields;
  }
  if(!input||typeof input!=='object'||proxy(input)||!current.g.Array.isArray(input))fail('corpus module array required');
  const length=descriptor(input,'length');if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<1||length.value>256||length.value%1)fail('corpus module count');
  const positions=[];for(let at=0;at<length.value;at++)positions.push(''+at);positions.push('length');const outer=shape(input,current.g.Array.prototype,positions),sources=[];let units=0,pathUnits=0;
  for(let at=0;at<length.value;at++){
    const row=shape(outer[at].value,current.g.Object.prototype,['path','source']),path=row[0].value,source=row[1].value;
    if(typeof path!=='string'||typeof source!=='string')fail('corpus module primitive path/source required');
    units+=source.length;pathUnits+=path.length;if(units>BATCH_SOURCE)fail('corpus module source budget');if(pathUnits>BATCH_SOURCE)fail('corpus module path budget');sources.push({path,source});
  }
  let constructorGraph;
  if(options!==undefined){const fields=shape(options,current.g.Object.prototype,['constructorGraph']);constructorGraph=fields[0].value;}
  return {sources,constructorGraph,requireCurrent(){checked();batchInputCurrent(records);}};
}


// Source-origin specialization only. The native-parsed tree is private,
// unexposed, and created from the first complete build's canonical wire.
const corpusParsedWorkflow=`
function originalCorpusParsedSourceTransport(input,language){
 checked();text(input,SOURCE_LIMIT,'source');languageName(language);
 const first=build(input,language),wire=stringify(first);
 if(wire.length>SERIAL_LIMIT)fail('serialized budget exceeded');
 serializedPreflight(wire);let parsed;try{parsed=parse(wire);}catch{fail('invalid serialized JSON');}
 if(parsed.source!==input||parsed.language!==language)fail('native-parsed source association differs');
 const document=build(parsed.source,parsed.language);
 if(stringify(document)!==wire)fail('noncanonical serialized CST');
 const pieces=[];for(let at=1;at<document.nodes.length;at++){const node=document.nodes[at];if(node[0]!=='group')pieces.push(document.source.slice(node[2],node[3]));}
 const source=pieces.join('');if(source!==document.source||source!==first.source||source!==input)fail('leaf partition does not reconstruct source');
 const trace=[{phase:'language',rules:[]},{phase:'repository',rules:[]}];checked();return {source,document,meta:wire,trace};
}
`;
// Standalone source provenance retains the legacy validated-wrapper checkpoint
// and all four captured stringify calls. Untrusted documents keep workflow.
const standaloneParsedWorkflow=`
function originalStandaloneSourceTransport(input,language){
 checked();text(input,SOURCE_LIMIT,'source');languageName(language);
 const first=build(input,language),wire=stringify(first);
 if(wire.length>SERIAL_LIMIT)fail('serialized budget exceeded');
 serializedPreflight(wire);let parsed;try{parsed=parse(wire);}catch{fail('invalid serialized JSON');}
 if(prototype(parsed)!==Object.prototype)fail('document has foreign prototype');
 if(parsed.source!==input||parsed.language!==language)fail('native-parsed source association differs');
 const document=build(parsed.source,parsed.language);
 if(stringify(parsed)!==stringify(document))fail('concrete source partition or classification changed');
 checked();
 if(stringify(document)!==wire)fail('noncanonical serialized CST');
 const pieces=[];for(let at=1;at<document.nodes.length;at++){const node=document.nodes[at];if(node[0]!=='group')pieces.push(document.source.slice(node[2],node[3]));}
 const source=pieces.join('');if(source!==document.source||source!==first.source||source!==input)fail('leaf partition does not reconstruct source');
 const trace=[{phase:'language',rules:[]},{phase:'repository',rules:[]}];checked();return {source,document,meta:wire,trace};
}
`;
let corpusParsedCompiled=null,corpusParsedSources=null;

function compileCorpusParsed(packet){
  const cache={__proto__:null},recipes=[],g=state.g;
  const hosts={__proto__:null,'host:util':{types:{isProxy:proxy}},'host:common':{originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource,throwOriginalCapturedTypeError}};
  const globals=['Object','Array','String','Number','BigInt','Symbol','RegExp','Function','Error','TypeError','Set','Map','WeakMap','WeakSet','Uint8Array','Math','JSON'];
  for(let ri=0;ri<packet.manifest.sources.length;ri++){const row=packet.manifest.sources[ri];
    const original=packet.sources[row.id],suffix=row.id==='concrete'?workflow+'\n'+corpusParsedWorkflow:'';
    const declarations=[{phase:'language',rules:[
      {id:'exact-private-source-substitutions',apply(value){return {...value,rewritten:rewrite(value.original,row)};}},
      {id:'explicit-strict-wrapper',apply(value){
        const exports=row.exports.map(name=>name+':'+name);if(row.id==='concrete')exports.push('originalIdentityTransport:originalIdentityTransport','originalCorpusParsedSourceTransport:originalCorpusParsedSourceTransport');
        return {...value,body:'"use strict";\n'+value.rewritten+'\n'+suffix+'\nreturn {'+exports.join(',')+'};'};
      }},
    ]},{phase:'repository',rules:[
      {id:'closed-registered-import-bindings',apply(value){
        const names=[],values=[];
        for(let di=0;di<row.imports.length;di++){const dependency=row.imports[di];
          const module=own(hosts,dependency.module)?hosts[dependency.module]:cache[dependency.module];
          if(!module)fail('unregistered module order');
          for(let bi=0;bi<dependency.names.length;bi++){const name=dependency.names[bi];if(!own(module,name))fail('unregistered module binding');names.push(name);values.push(module[name]);}
        }
        for(let gi=0;gi<globals.length;gi++){const name=globals[gi];names.push(name);values.push(g[name]);}
        names.push('globalThis');values.push(root);return {...value,names,values};
      }},
      {id:'instantiate-registered-module',apply(value){
        checked();const factory=apply(g.Function,undefined,[...value.names,value.body]);checked();
        const module=apply(factory,undefined,value.values);checked();return {...value,module};
      }},
    ]}];
    for(let at=0;at<2;at++){
      const expected=packet.manifest.rules[at],actual=declarations[at];
      if(expected.phase!==actual.phase||expected.rules.length!==actual.rules.length||expected.rules.some((id,index)=>id!==actual.rules[index].id))fail('registered executed rule order differs');
    }
    const result=fixedPhases({original},declarations);
    Object.defineProperty(cache,row.id,{__proto__:null,value:result.value.module,enumerable:true});
    recipes.push({id:row.id,original,rewritten:result.value.rewritten,body:result.value.body,edits:row.edits,trace:result.trace});
  }
  return {modules:cache,recipes};
}

/** Same raw chunk contract; only private native-parse provenance differs. */
export function transportPrivateConcreteParsedChunks(input){
  const current=checked();if(active)fail('recursive source transaction');
  const request=chunkSnapshot(input,current);active=true;
  try{
    const chunks=[],joins=[];let nodes=0,canonicalUnits=0;
    for(let ci=0;ci<request.chunks.length;ci++){
      const chunk=request.chunks[ci],before=authenticate();checked();
      if(!corpusParsedCompiled){corpusParsedCompiled=compileCorpusParsed(before);corpusParsedSources=before.sources;}
      const selected=corpusParsedCompiled,selectedSources=corpusParsedSources,modules=selected.modules,transport=modules.concrete.originalCorpusParsedSourceTransport;
      for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled complete source changed');}
      const rows=[];let chunkNodes=0,chunkCanonical=0;
      for(let at=0;at<chunk.rows.length;at++){
        checked();const row=chunk.rows[at];let result;
        try{result=transport(row.source,row.language,false);}catch(error){
          checked();const message=error!==null&&typeof error==='object'&&!proxy(error)?descriptor(error,'message'):null;
          throwOriginalCapturedTypeError(message&&own(message,'value')&&typeof message.value==='string'?message.value:'Private original grammar refused');
        }
        checked();if(result.source!==row.source||result.document.language!==row.language)fail('corpus source association differs');
        nodes+=result.document.nodes.length;canonicalUnits+=result.meta.length;chunkNodes+=result.document.nodes.length;chunkCanonical+=result.meta.length;
        if(nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL)fail('corpus aggregate node/canonical budget');
        rows.push(result);
      }
      const after=authenticate();checked();if(before.text!==after.text)fail('current manifest differs');
      for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(before.sources[row.id]!==after.sources[row.id])fail('current complete source differs');}
      finalIdentities(before.records,before.ancestors);finalIdentities(after.records,after.ancestors);checked();
      joins.push({before,after,selected,selectedSources,modules,transport});
      chunks.push({rows,totals:{rows:rows.length,sourceCodeUnits:chunk.units,utf8Bytes:chunk.bytes,nodes:chunkNodes,canonicalCodeUnits:chunkCanonical}});
    }
    // Later chunk callbacks may invalidate an earlier chunk's paths or inputs.
    for(let ci=0;ci<joins.length;ci++){const join=joins[ci];finalIdentities(join.before.records,join.before.ancestors);finalIdentities(join.after.records,join.after.ancestors);}checked();
    const result={chunks,totals:{chunks:chunks.length,rows:request.rows,sourceCodeUnits:request.units,utf8Bytes:request.bytes,nodes,canonicalCodeUnits:canonicalUnits}};
    for(let ci=0;ci<joins.length;ci++){
      const join=joins[ci];if(corpusParsedCompiled!==join.selected||corpusParsedSources!==join.selectedSources||join.selected.modules!==join.modules||join.modules.concrete.originalCorpusParsedSourceTransport!==join.transport||join.before.text!==join.after.text)fail('corpus final source transaction association changed');
      for(let at=0;at<join.before.manifest.sources.length;at++){const row=join.before.manifest.sources[at];if(join.selectedSources[row.id]!==join.before.sources[row.id]||join.before.sources[row.id]!==join.after.sources[row.id])fail('corpus final complete source association changed');}
    }
    batchInputCurrent(request.snapshots);return result;
  }finally{active=false;}
}

// Canonical metadata is untrusted input. This separate stored-CST contract
// deliberately uses the original full inspected/dense two-build workflow,
// never the source-origin-only native-parse optimization.
function canonicalChunkSnapshot(input,current){
  const snapshots=[];
  function array(value,max,label){
    if(!value||typeof value!=='object'||proxy(value)||!current.g.Array.isArray(value)||prototype(value)!==current.g.Array.prototype)fail('canonical '+label+' dense array required');
    const length=descriptor(value,'length');
    if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<1||length.value>max||length.value%1)fail('canonical '+label+' count');
    const names=keys(value),expected=[];for(let at=0;at<length.value;at++)expected.push(''+at);expected.push('length');
    if(names.length!==expected.length)fail('canonical exact '+label+' shape required');
    for(let at=0;at<names.length;at++)if(names[at]!==expected[at])fail('canonical exact '+label+' names required');
    const fields=[];for(let at=0;at<names.length;at++){const field=descriptor(value,names[at]);if(!field||!own(field,'value')||at<length.value&&field.enumerable!==true)fail('canonical own-data '+label+' required');fields.push(field);}
    snapshots.push({value,parent:current.g.Array.prototype,names,fields});return {length:length.value,fields};
  }
  const outer=array(input,3,'chunks'),chunks=[];let canonicalUnits=0,rows=0;
  for(let ci=0;ci<outer.length;ci++){
    const chunk=array(outer.fields[ci].value,BATCH_ROWS,'rows'),metas=[];let units=0;
    for(let at=0;at<chunk.length;at++){
      const meta=chunk.fields[at].value;if(typeof meta!=='string'||meta.length>BATCH_SERIAL)fail('canonical bounded primitive metadata required');
      units+=meta.length;canonicalUnits+=meta.length;rows++;
      if(canonicalUnits>BATCH_SERIAL)fail('canonical aggregate input budget');metas.push(meta);
    }
    chunks.push({metas,canonicalUnits:units});
  }
  return {chunks,snapshots,canonicalUnits,rows};
}
/** Stored/edited CST import only; each row rebuilds and reconstructs in full. */
export function transportPrivateConcreteMetaChunks(input){
  const current=checked();if(active)fail('recursive source transaction');
  const request=canonicalChunkSnapshot(input,current);active=true;
  try{
    const chunks=[],joins=[];let nodes=0,canonicalUnits=0,units=0,bytes=0;
    for(let ci=0;ci<request.chunks.length;ci++){
      const chunk=request.chunks[ci],before=authenticate();checked();
      if(!compiled){compiled=compile(before);compiledSources=before.sources;}
      const selected=compiled,selectedSources=compiledSources,modules=selected.modules,transport=modules.concrete.originalIdentityTransport;
      for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled complete source changed');}
      const rows=[];let chunkNodes=0,chunkCanonical=0,chunkUnits=0,chunkBytes=0;
      for(let at=0;at<chunk.metas.length;at++){
        checked();const meta=chunk.metas[at];let result;
        try{result=transport(meta,'Rust',true);}catch(error){
          checked();const message=error!==null&&typeof error==='object'&&!proxy(error)?descriptor(error,'message'):null;
          throwOriginalCapturedTypeError(message&&own(message,'value')&&typeof message.value==='string'?message.value:'Private original grammar refused');
        }
        checked();if(result.meta!==meta)fail('canonical input association differs');
        // Both independent builds already recomputed and checked the complete
        // sourceEncoding, not a caller-supplied byte count or a source flag.
        const count=result.document.nodes.length,serial=result.meta.length,source=result.source.length,utf8=result.document.sourceEncoding.utf8Bytes;
        nodes+=count;canonicalUnits+=serial;units+=source;bytes+=utf8;
        chunkNodes+=count;chunkCanonical+=serial;chunkUnits+=source;chunkBytes+=utf8;
        if(units>BATCH_SOURCE||bytes>BATCH_UTF8)fail('canonical aggregate source/UTF8 budget');
        if(nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL)fail('canonical aggregate node/canonical budget');
        rows.push(result);
      }
      const after=authenticate();checked();if(before.text!==after.text)fail('current manifest differs');
      for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(before.sources[row.id]!==after.sources[row.id])fail('current complete source differs');}
      finalIdentities(before.records,before.ancestors);finalIdentities(after.records,after.ancestors);checked();
      joins.push({before,after,selected,selectedSources,modules,transport});
      chunks.push({rows,totals:{rows:rows.length,inputCanonicalCodeUnits:chunk.canonicalUnits,sourceCodeUnits:chunkUnits,utf8Bytes:chunkBytes,nodes:chunkNodes,canonicalCodeUnits:chunkCanonical}});
    }
    for(let ci=0;ci<joins.length;ci++){const join=joins[ci];finalIdentities(join.before.records,join.before.ancestors);finalIdentities(join.after.records,join.after.ancestors);}checked();
    const result={chunks,totals:{chunks:chunks.length,rows:request.rows,inputCanonicalCodeUnits:request.canonicalUnits,sourceCodeUnits:units,utf8Bytes:bytes,nodes,canonicalCodeUnits:canonicalUnits}};
    for(let ci=0;ci<joins.length;ci++){
      const join=joins[ci];if(compiled!==join.selected||compiledSources!==join.selectedSources||join.selected.modules!==join.modules||join.modules.concrete.originalIdentityTransport!==join.transport||join.before.text!==join.after.text)fail('canonical final source transaction association changed');
      for(let at=0;at<join.before.manifest.sources.length;at++){const row=join.before.manifest.sources[at];if(join.selectedSources[row.id]!==join.before.sources[row.id]||join.before.sources[row.id]!==join.after.sources[row.id])fail('canonical final complete source association changed');}
    }
    batchInputCurrent(request.snapshots);return result;
  }finally{active=false;}
}


// Explicit data-only token batch. This is a new authentication transaction;
// the old single and serialized/reparsed CST operations above are unchanged.
export function lexPrivateConcreteSources(input){
  const current=checked();if(active)fail('recursive source transaction');
  const request=batchSnapshot(input,current);active=true;
  try{
    const before=authenticate();checked();
    if(!compiled){compiled=compile(before);compiledSources=before.sources;}
    const selected=compiled,selectedSources=compiledSources,modules=selected.modules,rust=modules.rust.rustTokens,javascript=modules.javascript.tokenize;
    for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled complete source changed');}
    const rows=[];let tokens=0;
    for(let at=0;at<request.rows.length;at++){
      checked();const row=request.rows[at];let result;
      try{
        const value=row.language==='Rust'?rust(row.source):javascript(row.source,'JavaScript');
        tokens+=row.language==='Rust'?value.length:value.tokens.length+value.comments.length;
        if(tokens>BATCH_NODES)fail('batch aggregate token budget');
        result=data(value);
      }catch(error){
        checked();const message=error!==null&&typeof error==='object'&&!proxy(error)?descriptor(error,'message'):null;
        throwOriginalCapturedTypeError(message&&own(message,'value')&&typeof message.value==='string'?message.value:'Private original grammar refused');
      }
      checked();
      rows.push({source:row.source,language:row.language,tokens:result});
    }
    const result={rows,totals:{rows:rows.length,sourceCodeUnits:request.units,utf8Bytes:request.bytes,tokens}};
    const after=authenticate();checked();if(before.text!==after.text)fail('current manifest differs');
    for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(before.sources[row.id]!==after.sources[row.id])fail('current complete source differs');}
    finalIdentities(before.records,before.ancestors);finalIdentities(after.records,after.ancestors);checked();
    if(compiled!==selected||compiledSources!==selectedSources||selected.modules!==modules||modules.rust.rustTokens!==rust||modules.javascript.tokenize!==javascript)fail('batch token transaction association changed');
    for(let at=0;at<before.manifest.sources.length;at++){const row=before.manifest.sources[at];if(selectedSources[row.id]!==before.sources[row.id])fail('compiled source association changed');}
    batchInputCurrent(request.snapshots);return result;
  }finally{active=false;}
}
