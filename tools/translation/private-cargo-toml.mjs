// Execute only the copied, pinned CJS parser graph in a private module cache.
// Public require caches/classes never enter this lane. Host infrastructure and
// source hashing keep the existing trusted-bootstrap boundary; feature globals
// are descriptor-acquired, native-qualified and checked live before execution.
import {constants,openSync,closeSync,readSync,fstatSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {types} from 'node:util';
import {originalStaticSourceIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
const descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf,own=Object.hasOwn,keys=Reflect.ownKeys,apply=Reflect.apply,isProxy=types.isProxy;
const functionPrototype=prototype(function(){}),Failure=descriptor(globalThis,'TypeError')?.value;
const failurePrototype=typeof Failure==='function'&&!isProxy(Failure)?descriptor(Failure,'prototype')?.value:null;
const base=fileURLToPath(new URL('./vendor/iarna-toml/',import.meta.url));
const profilePath=fileURLToPath(new URL('./source-profiles/external-dependency-defaults/manifest.json',import.meta.url));
const profileHash='d6b391594e58f0639235fbd2b7008e189d8b65ae2f76e1b43a8b176168cffba5';
const dependencies={
  'parse-string.js':['./lib/toml-parser.js','./parse-pretty-error.js'],
  'lib/toml-parser.js':['./parser.js','./create-datetime.js','./create-datetime-float.js','./create-date.js','./create-time.js','util'],
  'lib/create-date.js':['./format-num.js'],'lib/create-time.js':['./format-num.js'],'lib/create-datetime-float.js':['./format-num.js'],
  'lib/create-datetime.js':[],'lib/format-num.js':[],'lib/parser.js':[],'parse-pretty-error.js':[],
};
const hash=value=>createHash('sha256').update(value).digest('hex');
// Refusal itself must not call a native Error constructor while an Error
// stack-limit accessor is being rejected. The own diagnostic data preserves
// the captured TypeError ancestry; no native stack-text equivalence is claimed.
const fail=message=>{const text='Private original Cargo TOML: '+message;if(native(Failure,'TypeError'))throw {__proto__:failurePrototype,name:'TypeError',message:text};throw text;};
const native=(value,name)=>typeof value==='function'&&!isProxy(value)&&originalCapturedFunctionSource(value)===`function ${name}() { [native code] }`;
const same=(left,right)=>left&&right&&own(left,'value')===own(right,'value')&&left.value===right.value&&left.get===right.get&&left.set===right.set&&left.writable===right.writable&&left.enumerable===right.enumerable&&left.configurable===right.configurable;
let guard=null,compiled=null,compiledSources=null;
function initialize(){
  if(!originalStaticSourceIntrinsicsUnchanged())fail('native source operations unavailable');
  const pins=[],families=[],create=descriptor(Object,'create');
  if(!create||!own(create,'value')||!native(create.value,'create'))fail('qualified private record allocation required');
  const globals=apply(create.value,Object,[null]);
  function pin(owner,key,name){
    if(!owner||isProxy(owner))fail('proxy host operation');
    const field=descriptor(owner,key);if(!field||!own(field,'value')||!native(field.value,name))fail('unqualified native '+name);
    pins.push({owner,key,field});return field.value;
  }
  for(const name of ['Object','Array','String','Number','BigInt','Symbol','Date','RegExp','Function','Error','TypeError','Uint8Array','WeakMap'])globals[name]=pin(globalThis,name,name);
  for(const name of ['Object','Array','String','Number','BigInt','Symbol','Date','RegExp','Function','Error','TypeError','Uint8Array','WeakMap']){const field=descriptor(globals[name],'prototype');if(!field||!own(field,'value')||isProxy(field.value))fail('plain native constructor prototype required');pins.push({owner:globals[name],key:'prototype',field});}
  if(globals.TypeError!==Failure)fail('diagnostic constructor changed since trusted bootstrap');
  const functionRealm=descriptor(globals.Function,'prototype');if(!functionRealm||!own(functionRealm,'value')||functionRealm.value!==functionPrototype)fail('source constructor must use the qualified literal realm');pins.push({owner:globals.Function,key:'prototype',field:functionRealm});
  for(const name of ['parseInt','isNaN','eval'])globals[name]=pin(globalThis,name,name);
  const math=descriptor(globalThis,'Math');if(!math||!own(math,'value')||isProxy(math.value))fail('plain Math required');pins.push({owner:globalThis,key:'Math',field:math});globals.Math=math.value;
  const json=descriptor(globalThis,'JSON');if(!json||!own(json,'value')||isProxy(json.value))fail('plain JSON required');pins.push({owner:globalThis,key:'JSON',field:json});globals.parseJSON=pin(json.value,'parse','parse');
  pin(globals.Math,'min','min');pin(globals.Math,'max','max');
  for(const [owner,key]of [[globals.Object,'defineProperty'],[globals.Object,'defineProperties'],[globals.Object,'create'],[globals.Object,'freeze'],[globals.Object,'setPrototypeOf'],[globals.Object,'is'],[globals.Number,'isSafeInteger'],[globals.String,'fromCodePoint'],[globals.String,'fromCharCode'],[globals.BigInt,'asIntN']])pin(owner,key,key);
  const symbols={};for(const name of ['iterator','hasInstance','toPrimitive','toStringTag']){const field=descriptor(globals.Symbol,name);if(!field||!own(field,'value')||typeof field.value!=='symbol')fail('well-known symbol required');pins.push({owner:globals.Symbol,key:name,field});symbols[name]=field.value;}
  const objectPrototype=prototype({}),arrayPrototype=prototype([]);
  const hasOwnProperty=pin(objectPrototype,'hasOwnProperty','hasOwnProperty');
  if(prototype(hasOwnProperty)!==functionPrototype||descriptor(hasOwnProperty,'call'))fail('own property receiver call changed');
  const weakPrototype=descriptor(globals.WeakMap,'prototype')?.value;
  if(!weakPrototype||isProxy(weakPrototype))fail('proxy weak prototype');
  for(const name of ['get','set','has'])pin(weakPrototype,name,name);
  const weak=new globals.WeakMap(),weakKey={};if(weak.set(weakKey,weakKey)!==weak||weak.get(weakKey)!==weakKey||weak.has(weakKey)!==true)fail('weak receiver family differs');
  const kinds=[
    ['Object',objectPrototype,['constructor','__defineGetter__','__defineSetter__','hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf','propertyIsEnumerable','toString','valueOf','__proto__','toLocaleString']],
    ['Function',functionPrototype,['length','name','arguments','caller','constructor','apply','bind','call','toString',symbols.hasInstance]],
    ['Number',descriptor(globals.Number,'prototype')?.value,['constructor','toExponential','toFixed','toPrecision','toString','valueOf','toLocaleString']],
    ['BigInt',descriptor(globals.BigInt,'prototype')?.value,['constructor','toLocaleString','toString','valueOf',symbols.toStringTag]],
    ['Symbol',descriptor(globals.Symbol,'prototype')?.value,['constructor','toString','valueOf','description',symbols.toPrimitive,symbols.toStringTag]],
    ['Error',descriptor(globals.Error,'prototype')?.value,['constructor','name','message','toString']],
    ['TypeError',descriptor(globals.TypeError,'prototype')?.value,['constructor','name','message']],
    ['Date',descriptor(globals.Date,'prototype')?.value,['constructor','toString','toDateString','toTimeString','toISOString','toUTCString','toGMTString','getDate','setDate','getDay','getFullYear','setFullYear','getHours','setHours','getMilliseconds','setMilliseconds','getMinutes','setMinutes','getMonth','setMonth','getSeconds','setSeconds','getTime','setTime','getTimezoneOffset','getUTCDate','setUTCDate','getUTCDay','getUTCFullYear','setUTCFullYear','getUTCHours','setUTCHours','getUTCMilliseconds','setUTCMilliseconds','getUTCMinutes','setUTCMinutes','getUTCMonth','setUTCMonth','getUTCSeconds','setUTCSeconds','valueOf','getYear','setYear','toJSON','toLocaleString','toLocaleDateString','toLocaleTimeString',symbols.toPrimitive]],
  ];
  for(const [kind,owner,allowed]of kinds){
    if(!owner||isProxy(owner))fail('proxy feature prototype');
    const before=Object.getOwnPropertyDescriptors(owner),names=keys(before),parent=prototype(owner);
    if(kind==='Object'?parent!==null:kind==='TypeError'?parent!==descriptor(globals.Error,'prototype').value:parent!==objectPrototype)fail('unexpected feature ancestry');
    for(let at=0;at<names.length;at++){
      const key=names[at],field=before[key];if(!allowed.includes(key))fail('unknown feature prototype property');
      if(own(field,'value')){
        if(typeof field.value==='function'){
          const name=key==='constructor'?kind:key===symbols.hasInstance?'[Symbol.hasInstance]':key===symbols.toPrimitive?'[Symbol.toPrimitive]':key==='toGMTString'?'toUTCString':key;
          if(!native(field.value,name))fail('unqualified feature prototype method');
        }else if(!['length','name','message'].includes(key)&&key!==symbols.toStringTag)fail('unknown feature scalar');
      }else if(kind==='Function'&&['arguments','caller'].includes(key)){
        // These fixed poison accessors are never called by the copied graph.
        if(field.get!==field.set||typeof field.get!=='function'||isProxy(field.get)||originalCapturedFunctionSource(field.get)!=='function () { [native code] }')fail('function poison accessors changed');
      }else if(field.get!==undefined&&!native(field.get,'get '+key)||field.set!==undefined&&!native(field.set,'set '+key))fail('unqualified feature getter');
    }
    families.push({owner,before,names,parent});
  }
  // Array/RegExp/String whole prototypes are qualified by the existing shared
  // source guard. Extra operations used by this exact parser are explicit.
  pin(arrayPrototype,'pop','pop');pin(arrayPrototype,'push','push');
  const stringPrototype=descriptor(globals.String,'prototype').value;
  pin(stringPrototype,'codePointAt','codePointAt');pin(stringPrototype,'split','split');globals.charCodeAt=pin(stringPrototype,'charCodeAt','charCodeAt');globals.fromCharCode=descriptor(globals.String,'fromCharCode').value;
  const typedPrototype=descriptor(globals.Uint8Array,'prototype')?.value;
  if(!typedPrototype||isProxy(typedPrototype))fail('proxy byte prototype');
  const typedParent=prototype(typedPrototype);if(!typedParent||isProxy(typedParent))fail('proxy byte parent');
  const lengthField=descriptor(typedParent,'length');if(!lengthField||own(lengthField,'value')||!native(lengthField.get,'get length')||lengthField.set!==undefined)fail('native byte length required');
  pins.push({owner:typedParent,key:'length',field:lengthField});
  const length=value=>apply(lengthField.get,value,[]);
  const view=new globals.Uint8Array(1);if(length(view)!==1)fail('byte brand differs');view[0]=231;if(view[0]!==231)fail('byte data differs');
  const capture=descriptor(globals.Error,'captureStackTrace');
  if(capture&&(!own(capture,'value')||!native(capture.value,'captureStackTrace')))fail('stack constructor hook changed');pins.push({owner:globals.Error,key:'captureStackTrace',field:capture??null});
  const prepare=descriptor(globals.Error,'prepareStackTrace');if(prepare&&(!own(prepare,'value')||prepare.value!==undefined))fail('stack formatter hook present');
  pins.push({owner:globals.Error,key:'prepareStackTrace',field:prepare??null});
  const stackLimit=descriptor(globals.Error,'stackTraceLimit');if(stackLimit&&(!own(stackLimit,'value')||typeof stackLimit.value!=='number'))fail('stack limit accessor present');
  pins.push({owner:globals.Error,key:'stackTraceLimit',field:stackLimit??null});
  // Same-named natives need receiver/semantic probes on private values only.
  const number=apply(globals.Object,undefined,[255]);Object.setPrototypeOf(number,null);
  const numberPrototype=descriptor(globals.Number,'prototype').value;
  const numberText=pin(numberPrototype,'toString','toString'),numberValue=pin(numberPrototype,'valueOf','valueOf');
  if(apply(numberText,number,[16])!=='ff'||apply(numberValue,number,[])!==255||apply(globals.String,undefined,['feature'])!=='feature'||apply(globals.Number,undefined,['123'])!==123||apply(globals.isNaN,undefined,['not a number'])!==true||apply(globals.parseInt,undefined,['41',16])!==65)fail('native scalar family differs');
  // The existing shared guard proves the actual native Array iterator/next.
  // Prototype structure and every pin are rechecked before each source read.
  guard={pins,families,globals,prepare,length,typedPrototype,typedParent};return guard;
}
function checked(){
  const state=guard??initialize();if(!originalStaticSourceIntrinsicsUnchanged())fail('live source operations changed');
  const hasOwnProperty=descriptor(prototype({}),'hasOwnProperty')?.value;if(prototype(hasOwnProperty)!==functionPrototype||descriptor(hasOwnProperty,'call'))fail('live own property receiver call changed');
  if(prototype(state.typedPrototype)!==state.typedParent)fail('live byte ancestry changed');
  for(const pin of state.pins){const now=descriptor(pin.owner,pin.key);if(pin.field===null?now!==undefined:!same(now,pin.field))fail('live native operation changed');}
  for(const family of state.families){if(isProxy(family.owner)||prototype(family.owner)!==family.parent)fail('live feature ancestry changed');const names=keys(family.owner);if(names.length!==family.names.length)fail('live feature shape changed');for(let at=0;at<names.length;at++)if(names[at]!==family.names[at]||!same(descriptor(family.owner,names[at]),family.before[names[at]]))fail('live feature descriptor changed');}
  return state;
}
const identity=stat=>({dev:stat.dev,ino:stat.ino,size:stat.size,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs,mode:stat.mode});
const equalIdentity=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs&&a.mode===b.mode;
function original(path,limit,records){
  let parent=dirname(path);while(parent!==dirname(parent)){const stat=lstatSync(parent);if(!stat.isDirectory()||stat.isSymbolicLink())fail('linked source directory');parent=dirname(parent);}
  const before=lstatSync(path);if(!before.isFile()||before.isSymbolicLink()||before.size>limit)fail('bounded regular parser source required');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const opened=fstatSync(fd);if(!equalIdentity(identity(before),identity(opened)))fail('parser source fd differs');const bytes=new guard.globals.Uint8Array(opened.size);let at=0;while(at<opened.size){const count=readSync(fd,bytes,at,opened.size-at,at);if(!count)fail('parser source truncated');at+=count;}const extra=new guard.globals.Uint8Array(1);if(readSync(fd,extra,0,1,at)||!equalIdentity(identity(opened),identity(fstatSync(fd)))||!equalIdentity(identity(opened),identity(lstatSync(path))))fail('parser source changed');records.push({path,identity:identity(opened)});return bytes;}finally{closeSync(fd);}
}
function ascii(bytes){let text='';const length=guard.length(bytes);for(let at=0;at<length;at++){const byte=bytes[at];if(byte>127)fail('registered executable source is not ASCII');text+=apply(guard.globals.fromCharCode,undefined,[byte]);}return text;}
function utf8Size(value){let bytes=0;for(let at=0;at<value.length;at++){const code=apply(guard.globals.charCodeAt,value,[at]);if(code<128)bytes++;else if(code<2048)bytes+=2;else if(code>=55296&&code<=56319&&at+1<value.length){const next=apply(guard.globals.charCodeAt,value,[at+1]);if(next>=56320&&next<=57343){bytes+=4;at++;}else bytes+=3;}else bytes+=3;}return bytes;}
function sourceHash(bytes){const length=guard.length(bytes),copy=new guard.globals.Uint8Array(length);for(let at=0;at<length;at++)copy[at]=bytes[at];const result=hash(copy);checked();return result;}
function sources(){
  const records=[],bytes=original(profilePath,32768,records);if(sourceHash(bytes)!==profileHash)fail('parser registry changed');const profile=apply(guard.globals.parseJSON,undefined,[ascii(bytes)]),files=new Map();let total=0;
  if(profile.parser.files.length!==20)fail('complete copied parser census differs');
  for(const row of profile.parser.files){if(typeof row.path!=='string'||!row.path||row.path.startsWith('/')||row.path.split('/').some(part=>!part||part==='.'||part==='..'))fail('parser source path escapes');const raw=original(join(base,row.path),100000,records),length=guard.length(raw);total+=length;if(length!==row.bytes||sourceHash(raw)!==row.sha256||total>100000)fail('parser source differs');files.set(row.path,raw);}
  if(total!==99960||files.size!==20)fail('complete parser source total differs');return {files,records,profile};
}
function unchanged(records){for(const record of records){const now=lstatSync(record.path);if(!now.isFile()||now.isSymbolicLink()||!equalIdentity(identity(now),record.identity))fail('complete parser source identity changed');}}
function execute(files,state){
  const cache=new Map(),g=state.globals,host={Buffer:undefined,BigInt:g.BigInt,Date:g.Date};
  Object.freeze(host);
  const names=['require','module','exports','global','Object','Array','String','Number','BigInt','Symbol','Date','RegExp','Error','TypeError','Math','JSON','parseInt','isNaN','eval'];
  function load(path){
    if(cache.has(path))return cache.get(path).exports;
    if(!files.has(path)||!path.endsWith('.js'))fail('unregistered parser module');
    const module={exports:{}};cache.set(path,module);
    const require=request=>{
      if(!own(dependencies,path)||!dependencies[path].includes(request))fail('unregistered static parser import');
      // Upstream explicitly catches unavailable util inspection in bundled
      // environments. This private lane selects that branch; no inspector or
      // public require cache is executed, and debug inspection equivalence is
      // not claimed. Actual TOML data parsing remains the full original code.
      if(request==='util')throw new Failure('Optional inspection unavailable in private parser');
      if(typeof request!=='string'||!request.startsWith('./')||request.includes('\\'))fail('only closed static relative parser modules');
      const slash=path.lastIndexOf('/'),target=(slash<0?'':path.slice(0,slash+1))+request.slice(2);if(!files.has(target))fail('parser module escapes copied graph');return load(target);
    };
    // The outer wrapper is non-strict so it can bind native eval. Original
    // source directives remain inside the returned function, unchanged.
    const outer=apply(g.Function,undefined,[...names,'return (function(){\n'+ascii(files.get(path))+'\n});']);
    const code=apply(outer,undefined,[require,module,module.exports,host,g.Object,g.Array,g.String,g.Number,g.BigInt,g.Symbol,g.Date,g.RegExp,g.Error,g.TypeError,g.Math,JSON,g.parseInt,g.isNaN,g.eval]);apply(code,undefined,[]);return module.exports;
  }
  return load('parse-string.js');
}
function cargoData(parsed){
  let cells=32768,characters=262144;
  function data(value,depth=0){
    if(--cells<0||depth>64)fail('Cargo data bound');
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='string'){characters-=utf8Size(value);if(characters<0)fail('Cargo string bound');return value;}
    if(typeof value==='number'&&Number.isSafeInteger(value))return value;
    if(!value||typeof value!=='object'||isProxy(value))fail('plain closed Cargo data required');
    const array=Array.isArray(value),parent=prototype(value);if(parent!==(array?Array.prototype:Object.prototype))fail('non-Cargo TOML value');
    const fields=Object.getOwnPropertyDescriptors(value),result=array?[]:Object.create(null);
    for(const key of keys(fields)){const field=fields[key];if(!own(field,'value'))fail('non-data parser result');if(typeof key==='symbol'){if(!['symbol','boolean'].includes(typeof field.value))fail('unknown parser bookkeeping');continue;}if(array&&key==='length')continue;if(!field.enumerable||array&&key!==''+result.length)fail('incomplete Cargo data');characters-=utf8Size(key);if(characters<0)fail('Cargo key bound');Object.defineProperty(result,key,{value:data(field.value,depth+1),enumerable:true,writable:true,configurable:true});}
    if(array&&result.length!==value.length)fail('incomplete Cargo array');return result;
  }return data(parsed);
}
export function parsePrivateOriginalCargoToml(source,options){
  const state=checked();if(typeof source!=='string'||utf8Size(source)>262144)fail('bounded primitive Cargo source required');
  if(!options||typeof options!=='object'||isProxy(options)||keys(options).length!==2)fail('exact genuine Cargo source inputs required');
  const dependency=descriptor(options,'dependencies'),capture=descriptor(options,'packageToken');
  if(!dependency||!own(dependency,'value')||!capture||!own(capture,'value'))fail('own genuine Cargo source inputs required');
  const originals=deriveDependencyOriginalInputs(dependency.value),originalPackage=originalExternalTraitPackageInputs(capture.value),manifests=originalPackage.sources.filter(row=>row.path==='Cargo.toml');
  if(manifests.length!==1||source!==originals.manifest&&source!==manifests[0].source)fail('exact complete source from private dependency/package capture required');
  const {files,records,profile}=sources();checked();unchanged(records);
  for(const [name,value]of [['Cargo.toml',originals.manifest],['Cargo.lock',originals.lock]])if(utf8Size(value)!==profile.projectSource[name].bytes||hash(value)!==profile.projectSource[name].sha256)fail('complete registered project source differs');
  const pins=profile.packages.filter(row=>row.name===originalPackage.dependency.package&&row.version===originalPackage.dependency.version);
  if(pins.length!==1||utf8Size(manifests[0].source)!==pins[0].manifestBytes||hash(manifests[0].source)!==pins[0].manifestSha256)fail('complete registered package source differs');
  checked();unchanged(records);
  if(!compiled){compiled=execute(files,state);compiledSources=files;}else for(const [path,bytes]of files){const prior=compiledSources.get(path),length=guard.length(bytes);if(!prior||guard.length(prior)!==length)fail('compiled private parser source changed');for(let at=0;at<length;at++)if(bytes[at]!==prior[at])fail('compiled private parser source changed');}
  let result;
  try{result=cargoData(apply(compiled,undefined,[source]));}catch(error){throw new Failure('Private original Cargo TOML refused: '+(typeof error?.message==='string'?error.message:'unavailable parsed data'));}
  checked();unchanged(records);return result;
}
export function assertPrivateOriginalCargoTomlExecution(){checked();}
