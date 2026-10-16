// Constructor-proof-only adapter of encodeWord in ./lino.mjs, under the same
// repository/package license. The ordinary IR encoder and upstream file stay
// unchanged. This private BARE has its own identity: callbacks on the fallback
// receive this instance, not the upstream encoder's inaccessible instance.
import {types} from 'node:util';

const BARE=/^[A-Za-z0-9._~*/<>=!&|+-]$/u;
const HEX='0123456789ABCDEF',ASCII='\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f'+
  '\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f'+
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u007f';
const ENCODED_BYTES=["%00","%01","%02","%03","%04","%05","%06","%07","%08","%09","%0A","%0B","%0C","%0D","%0E","%0F","%10","%11","%12","%13","%14","%15","%16","%17","%18","%19","%1A","%1B","%1C","%1D","%1E","%1F","%20","!","%22","%23","%24","%25","&","%27","%28","%29","*","+","%2C","-",".","/","0","1","2","3","4","5","6","7","8","9","%3A","%3B","<","=",">","%3F","%40","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","%5B","%5C","%5D","%5E","_","%60","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","%7B","|","%7D","~","%7F","%80","%81","%82","%83","%84","%85","%86","%87","%88","%89","%8A","%8B","%8C","%8D","%8E","%8F","%90","%91","%92","%93","%94","%95","%96","%97","%98","%99","%9A","%9B","%9C","%9D","%9E","%9F","%A0","%A1","%A2","%A3","%A4","%A5","%A6","%A7","%A8","%A9","%AA","%AB","%AC","%AD","%AE","%AF","%B0","%B1","%B2","%B3","%B4","%B5","%B6","%B7","%B8","%B9","%BA","%BB","%BC","%BD","%BE","%BF","%C0","%C1","%C2","%C3","%C4","%C5","%C6","%C7","%C8","%C9","%CA","%CB","%CC","%CD","%CE","%CF","%D0","%D1","%D2","%D3","%D4","%D5","%D6","%D7","%D8","%D9","%DA","%DB","%DC","%DD","%DE","%DF","%E0","%E1","%E2","%E3","%E4","%E5","%E6","%E7","%E8","%E9","%EA","%EB","%EC","%ED","%EE","%EF","%F0","%F1","%F2","%F3","%F4","%F5","%F6","%F7","%F8","%F9","%FA","%FB","%FC","%FD","%FE","%FF"];
// Trusted initial descriptor/apply/function-source infrastructure, as in the
// existing private source helpers. No feature globals or probes run on import.
const globalRoot=globalThis;
const descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf,keys=Reflect.ownKeys;
const apply=Reflect.apply,proxy=types.isProxy,own=Object.hasOwn,define=Object.defineProperty,setPrototype=Object.setPrototypeOf;
const functionPrototype=prototype(()=>{}),functionField=descriptor(functionPrototype,'toString');
const functionText=functionField&&own(functionField,'value')?functionField.value:undefined;
const objectConstructor=Object,reflectObject=Reflect;
let guard;
function initializeGuard() {
  // Feature globals and private native probes are lazy. Stable initial host
  // infrastructure above prevents late/mid-Buffer wrappers from qualifying
  // themselves or being called merely to decide the same-bytes fallback.
  let numberConstructor,byteConstructor,stringConstructor,numberPrototype,stringPrototype,regexpPrototype;
  let originalTypedPrototype,iteratorSymbol,tagSymbol,bareSource;
  const native=(fn,name)=>typeof fn==='function'&&apply(functionText,fn,[])===`function ${name}() { [native code] }`;
  const data=(object,key)=>{
    const field=descriptor(object,key);
    return field&&own(field,'value')?field.value:undefined;
  };
  const getter=(object,key)=>{
    const field=descriptor(object,key);
    return field&&!own(field,'value')?field.get:undefined;
  };
  let numberString,upper,pad,fromCharCode,test,exec,source,length,buffer,tag,values,arrayBufferLength;
  let arrayBufferPrototype;
  const flagNames=['hasIndices','global','ignoreCase','multiline','dotAll','unicode','unicodeSets','sticky'];
  const flagGetters=[undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined];
  let iteratorPrototype,iteratorParent,iteratorRoot,next,iteratorSelf,enabled=false;

  // Qualification runs only on private fresh receivers. Same-name native methods
  // from another builtin family must not acquire authority from source spelling.
  try {
    let valid=native(descriptor,'getOwnPropertyDescriptor')&&native(prototype,'getPrototypeOf')&&native(keys,'ownKeys')
      &&native(apply,'apply')&&native(functionText,'toString')&&native(proxy,'isProxy')&&native(own,'hasOwn')
      &&native(define,'defineProperty')&&native(setPrototype,'setPrototypeOf');
    // This is the trusted initial HOST global, not a public/caller root. Bun
    // classifies its genuine host wrapper as a proxy. Public/derived proxies
    // below are still rejected before any descriptor or native brand probe.
    if(valid) {
      numberConstructor=data(globalRoot,'Number');byteConstructor=data(globalRoot,'Uint8Array');stringConstructor=data(globalRoot,'String');
      const symbolConstructor=data(globalRoot,'Symbol');
      valid=native(numberConstructor,'Number')&&native(byteConstructor,'Uint8Array')&&native(stringConstructor,'String')&&native(symbolConstructor,'Symbol');
      if(valid) {iteratorSymbol=data(symbolConstructor,'iterator');tagSymbol=data(symbolConstructor,'toStringTag');valid=typeof iteratorSymbol==='symbol'&&typeof tagSymbol==='symbol';}
    }
    if(valid) {
      const bytePrototype=data(byteConstructor,'prototype');if(proxy(bytePrototype))return ()=>-1;
      originalTypedPrototype=prototype(bytePrototype);if(proxy(originalTypedPrototype))return ()=>-1;
      numberPrototype=prototype(0);stringPrototype=prototype('');regexpPrototype=prototype(BARE);
      if(proxy(numberPrototype)||proxy(stringPrototype)||proxy(regexpPrototype))return ()=>-1;
      numberString=data(numberPrototype,'toString');upper=data(stringPrototype,'toUpperCase');pad=data(stringPrototype,'padStart');
      fromCharCode=data(stringConstructor,'fromCharCode');test=data(regexpPrototype,'test');exec=data(regexpPrototype,'exec');
      source=getter(regexpPrototype,'source');length=getter(originalTypedPrototype,'length');
      buffer=getter(originalTypedPrototype,'buffer');tag=getter(originalTypedPrototype,tagSymbol);
      values=data(originalTypedPrototype,iteratorSymbol);
      valid=native(numberString,'toString')&&native(upper,'toUpperCase')&&native(pad,'padStart')
        &&native(fromCharCode,'fromCharCode')&&native(test,'test')&&native(exec,'exec')&&native(source,'get source')
        &&native(length,'get length')&&native(buffer,'get buffer')&&native(tag,'get [Symbol.toStringTag]')
        &&native(values,'values');
      if(valid) {
        const view=new byteConstructor(1);arrayBufferPrototype=prototype(apply(buffer,view,[]));
        if(proxy(arrayBufferPrototype))return ()=>-1;arrayBufferLength=getter(arrayBufferPrototype,'byteLength');
        valid=native(arrayBufferLength,'get byteLength');bareSource=apply(source,BARE,[]);
      }
    }
    for(let index=0;valid&&index<flagNames.length;index++) {
      const name=flagNames[index],fn=getter(regexpPrototype,name);
      if(!native(fn,'get '+name))valid=false;
      flagGetters[index]=fn;
    }
    if(valid) {
      const boxed=new numberConstructor(255);setPrototype(boxed,null);
      valid=apply(numberString,boxed,[16])==='ff'&&apply(upper,'af',[])==='AF'&&apply(pad,'F',[2,'0'])==='0F'
        &&apply(fromCharCode,undefined,[65])==='A';
    }
    if(valid) {
      // TypedArray.values rejects a non-view at CALL time. Array.values can
      // create its iterator first (and next also recognizes real typed arrays),
      // so an own-length-only probe is not a family authentication control.
      let rejectsNonView=false;
      try{apply(values,{__proto__:null},[]);}catch{rejectsNonView=true;}
      valid=rejectsNonView;
    }
    if(valid) {
      // The positive iterator must use the internal typed length, not own data.
      const view=new byteConstructor(1);define(view,'length',{value:0});
      const iterator=apply(values,view,[]);
      iteratorPrototype=prototype(iterator);
      if(proxy(iteratorPrototype))return ()=>-1;
      iteratorParent=prototype(iteratorPrototype);if(proxy(iteratorParent))return ()=>-1;iteratorRoot=prototype(iteratorParent);
      next=data(iteratorPrototype,'next');iteratorSelf=data(iteratorParent,iteratorSymbol);
      valid=native(next,'next')&&native(iteratorSelf,'[Symbol.iterator]');
      if(valid) {
        const first=apply(next,iterator,[]),last=apply(next,iterator,[]);
        valid=data(first,'value')===0&&data(first,'done')===false&&data(last,'done')===true
          &&apply(iteratorSelf,iterator,[])===iterator;
      }
    }
    enabled=valid;
  } catch { enabled=false; }

  return function eligible(bytes) {
    if(!enabled)return -1;
    try {
      // Use captured native descriptor operations. No public byte getter or
      // iterator executes merely to select the fallback. Buffer.from above may
      // itself have replaced any of these properties; check after it returns.
      if(data(globalRoot,'String')!==stringConstructor||data(objectConstructor,'getOwnPropertyDescriptor')!==descriptor||data(objectConstructor,'getPrototypeOf')!==prototype
        ||data(objectConstructor,'hasOwn')!==own||data(reflectObject,'ownKeys')!==keys||data(reflectObject,'apply')!==apply
        ||data(functionPrototype,'toString')!==functionText||data(types,'isProxy')!==proxy
        ||data(numberPrototype,'toString')!==numberString||data(stringPrototype,'toUpperCase')!==upper
        ||data(stringPrototype,'padStart')!==pad||data(stringConstructor,'fromCharCode')!==fromCharCode
        ||data(regexpPrototype,'test')!==test||data(regexpPrototype,'exec')!==exec
        ||getter(regexpPrototype,'source')!==source||getter(originalTypedPrototype,'length')!==length
        ||getter(originalTypedPrototype,'buffer')!==buffer||getter(originalTypedPrototype,tagSymbol)!==tag
        ||data(originalTypedPrototype,iteratorSymbol)!==values||getter(arrayBufferPrototype,'byteLength')!==arrayBufferLength)return -1;
      if(prototype(BARE)!==regexpPrototype)return -1;
      const bareKeys=keys(BARE),lastIndex=descriptor(BARE,'lastIndex');
      if(bareKeys.length!==1||bareKeys[0]!=='lastIndex'||!lastIndex||!own(lastIndex,'value')||lastIndex.value!==0
        ||apply(source,BARE,[])!==bareSource)return -1;
      for(let index=0;index<flagNames.length;index++) {
        const fn=flagGetters[index];
        if(getter(regexpPrototype,flagNames[index])!==fn||apply(fn,BARE,[])!==(flagNames[index]==='unicode'))return -1;
      }
      if(bytes===null||typeof bytes!=='object'||proxy(bytes)||apply(tag,bytes,[])!=='Uint8Array')return -1;
      const backing=apply(buffer,bytes,[]);
      // ArrayBuffer's genuine getter rejects SharedArrayBuffer; no shared bytes
      // can change concurrently while the native-only fast loop is running.
      apply(arrayBufferLength,backing,[]);
      let owner=bytes,found=false;
      for(let depth=0;owner!==null&&depth<8;depth++) {
        if(proxy(owner))return -1;
        const field=descriptor(owner,iteratorSymbol);
        if(field){if(!own(field,'value')||field.value!==values)return -1;found=true;break;}
        owner=prototype(owner);
      }
      if(!found||data(iteratorPrototype,'next')!==next||prototype(iteratorPrototype)!==iteratorParent
        ||prototype(iteratorParent)!==iteratorRoot||data(iteratorParent,iteratorSymbol)!==iteratorSelf)return -1;
      const iterator=apply(values,bytes,[]); // genuine native: validates detachment
      if(prototype(iterator)!==iteratorPrototype)return -1;
      return apply(length,bytes,[]);
    } catch { return -1; }
  };
}

/** Same percent bytes, with callback-free byte work only after qualification. */
export function encodeConstructorProofWord(text) {
  if(text==='')return '%';
  if(guard===undefined){try{guard=initializeGuard();}catch{guard=()=>-1;}}
  const bytes=Buffer.from(text,'utf8'); // never skipped, replayed or purity-assumed
  const count=guard(bytes);
  let out='';
  if(count>=0) {
    for(let index=0;index<count;index++)out+=ENCODED_BYTES[bytes[index]];
    return out;
  }
  // Byte-for-byte copied original loop, using this adapter's private BARE and
  // the already-created bytes. Ineligible iterators/coercions retain their
  // original calls, throws, order and IteratorClose behavior.
  for(const byte of bytes) {
    const char=String.fromCharCode(byte);
    out+=byte<0x80&&BARE.test(char)?char:`%${byte.toString(16).toUpperCase().padStart(2,'0')}`;
  }
  return out;
}
