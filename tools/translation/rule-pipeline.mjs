// Ordered compiler operations, followed by repository output conventions.
// Rules carry no source, namespace or semantic admission authority of their own.
import {types} from 'node:util';

export const RULE_PHASES=Object.freeze(['language','repository']);
const fail=message=>{throw new TypeError('Translation rule pipeline: '+message);};
function data(object,key){
  if(!object||types.isProxy(object))fail('declarations require ordinary own data fields');
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('declarations require ordinary own data fields');
  return descriptor.value;
}
function list(value){
  if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('declarations require ordinary dense arrays');
  const length=data(value,'length'),keys=Reflect.ownKeys(value);
  if(keys.length!==length+1)fail('declarations require ordinary dense arrays');
  return Array.from({length},(_,index)=>data(value,String(index)));
}
function synchronous(value){
  if(value===null||typeof value!=='object'&&typeof value!=='function')return value;
  if(types.isPromise(value))fail('asynchronous rules are unsupported');
  // The runner never awaits/assimilates a result. Inspect only its own field:
  // inherited `then` must stay opaque, including ambient prototype getters.
  if(types.isProxy(value))fail('rule results cannot be proxy thenables');
  const descriptor=Object.getOwnPropertyDescriptor(value,'then');
  if(descriptor&&(!Object.hasOwn(descriptor,'value')||typeof descriptor.value==='function'))fail('asynchronous rules are unsupported');
  return value;
}

export function createRulePipeline(declarations){
  const phases=list(declarations);
  if(phases.length!==RULE_PHASES.length)fail('exactly language then repository phases are required');
  const names=new Set(),rules=[],description=[];
  for(let index=0;index<RULE_PHASES.length;index++){
    const phase=data(phases[index],'phase');
    if(phase!==RULE_PHASES[index])fail('exactly language then repository phases are required');
    const phaseRules=list(data(phases[index],'rules')),ids=[];
    for(const declaration of phaseRules){
      const id=data(declaration,'id'),apply=data(declaration,'apply');
      if(typeof id!=='string'||!id.length||id.length>160||names.has(id))fail('rule IDs must be unique nonempty bounded strings');
      if(typeof apply!=='function'||types.isProxy(apply)||types.isAsyncFunction(apply))fail('rules must be synchronous functions');
      names.add(id);ids.push(id);rules.push(Object.freeze({phase,id,apply}));
    }
    description.push(Object.freeze({phase,rules:Object.freeze(ids)}));
  }
  Object.freeze(rules);Object.freeze(description);
  return Object.freeze({
    description,
    run(input,context){
      let value=input;const trace=[];
      for(const rule of rules){
        value=synchronous(rule.apply(value,context));
        trace.push(Object.freeze({phase:rule.phase,id:rule.id}));
      }
      return Object.freeze({value,trace:Object.freeze(trace)});
    },
  });
}

export function exactSubstitutionRule(id,before,after,message){
  if(typeof before!=='string'||!before.length||typeof after!=='string'||typeof message!=='string')fail('exact substitutions require nonempty text anchors and an error message');
  return Object.freeze({id,apply(source){
    if(source.split(before).length!==2)throw new Error(message);
    return source.replace(before,after);
  }});
}
