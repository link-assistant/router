// Diagnostic callbacks receive bounded flat data only. No original source, AST, scope
// text or private proof is exposed, and progress never enters generated artifacts.
import {types} from 'node:util';
const stages=new Set(['corpus','project','project-graph','namespace','module-parse','method-parse','semantic-check','semantic-refusal','target-emit','project-serialize','standalone','fingerprint','plan','profile']);
const states=new Set(['start','advance','end']);
const strings=new Set(['stage','state','entry','source','profile','declaration','phase']);
const integers=new Set(['completed','total','attempt','remaining','outputs','bytes']);
export function translationProgressReporter(callback){
  if(callback===null||callback===undefined)return ()=>{};
  if(typeof callback!=='function')throw new TypeError('Translation progress requires a callback');
  return event=>{
    if(!event||typeof event!=='object'||types.isProxy(event)||![Object.prototype,null].includes(Object.getPrototypeOf(event)))throw new TypeError('Translation progress requires flat data');
    const keys=Reflect.ownKeys(event);
    if(keys.length>strings.size+integers.size)throw new TypeError('Translation progress field budget exhausted');
    const record={schema:'rust-meta-translation-progress-v1'};
    for(const key of keys){
      const descriptor=Object.getOwnPropertyDescriptor(event,key);
      if(typeof key!=='string'||!descriptor.enumerable||!('value'in descriptor)||!strings.has(key)&&!integers.has(key))throw new TypeError('Translation progress has unproved fields');
      const value=descriptor.value;
      if(strings.has(key)?typeof value!=='string'||!value||Buffer.byteLength(value)>4096:!Number.isSafeInteger(value)||value<0)throw new TypeError('Translation progress requires bounded scalar values');
      record[key]=value;
    }
    if(!stages.has(record.stage)||!states.has(record.state))throw new TypeError('Translation progress has an unknown stage or state');
    callback(Object.freeze(record));
  };
}
