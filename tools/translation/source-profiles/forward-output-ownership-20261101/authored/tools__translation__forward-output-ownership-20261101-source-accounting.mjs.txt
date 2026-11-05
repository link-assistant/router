// Occurrence accounting for full source/CST/proposal DATA, never authority.
// No new aggregate cap/deadline is selected here. Original caller bounds (for
// example native --emit64MiB) remain its responsibility. Standalone aggregate
// retained DATA/RSS/duration remains OPEN wherever the original API had none.
import {types} from 'node:util';
const need=(yes,message)=>{if(!yes)throw TypeError('Forward complete source DATA accounting: '+message);};
function quotedBytes(value){let total=2;for(let at=0;at<value.length;at++){const code=value.charCodeAt(at);if(code===34||code===92){total+=2;continue;}if(code<32){total+=[8,9,10,12,13].includes(code)?2:6;continue;}if(code>=0xd800&&code<=0xdbff){const next=value.charCodeAt(at+1);if(next>=0xdc00&&next<=0xdfff){total+=4;at++;}else total+=6;continue;}if(code>=0xdc00&&code<=0xdfff){total+=6;continue;}total+=code<128?1:code<2048?2:3;}return total;}
export function accountForwardSourceProposalData(input){
 const active=new Set(),stack=[{kind:'value',value:input,wire:true}],totals={occurrenceCells:0,utf16Units:0,utf8Bytes:0,jsonUtf8Bytes:0};
 const add=(key,value)=>{need(Number.isSafeInteger(value)&&value>=0&&Number.isSafeInteger(totals[key]+value),'exact representable complete DATA count required');totals[key]+=value;};
 const text=value=>{add('utf16Units',value.length);add('utf8Bytes',Buffer.byteLength(value));};
 while(stack.length){const task=stack.pop();if(task.kind==='exit'){active.delete(task.value);continue;}if(task.kind==='wire'){add('jsonUtf8Bytes',task.bytes);continue;}const value=task.value,wire=task.wire;add('occurrenceCells',1);
  if(typeof value==='string'){text(value);if(wire)add('jsonUtf8Bytes',quotedBytes(value));continue;}
  if(value===null||typeof value==='boolean'||typeof value==='number'||value===undefined){if(typeof value==='number')need(Number.isFinite(value),'finite ordinary source DATA number required');const string=value===null?'null':value===undefined?'undefined':typeof value==='number'&&Object.is(value,-0)?'0':String(value);text(string);if(wire)add('jsonUtf8Bytes',value===undefined?4:Buffer.byteLength(string));continue;}
  need(value&&typeof value==='object'&&!types.isProxy(value),'ordinary source DATA required');const array=Array.isArray(value),parent=Object.getPrototypeOf(value);need(array?parent===Array.prototype:parent===Object.prototype||parent===null,'ordinary source DATA prototype required');need(!active.has(value),'cyclic source DATA forbidden');const keys=Reflect.ownKeys(value);active.add(value);stack.push({kind:'exit',value});let wireFields=0;
  if(array){const size=Object.getOwnPropertyDescriptor(value,'length');need(size&&Object.hasOwn(size,'value')&&keys.length===size.value+1,'dense original source DATA array required');for(let at=0;at<size.value;at++)need(Object.hasOwn(value,String(at)),'source DATA array hole');wireFields=size.value;}
  for(let at=keys.length-1;at>=0;at--){const key=keys[at];need(typeof key==='string','string DATA key required');const field=Object.getOwnPropertyDescriptor(value,key);need(field&&Object.hasOwn(field,'value'),'own source DATA fields without accessors required');add('occurrenceCells',1);text(key);const fieldWire=wire&&(array?key!=='length':field.enumerable&&field.value!==undefined);
   if(!array&&fieldWire){wireFields++;add('jsonUtf8Bytes',quotedBytes(key)+1);}stack.push({kind:'value',value:field.value,wire:fieldWire});
  }
  if(wire)add('jsonUtf8Bytes',2+Math.max(0,wireFields-1));
 }
 // Aliases deliberately traverse and count again. These are occurrence/wire
 // payload totals, not a claim about V8 object residency or maximum RSS.
 return {...totals,aliasesCountEveryOccurrence:true,wireEncoding:'ordinary-JSON-UTF8',aggregateCapSelected:false,sourceAuthority:false};
}
export function retainForwardSourceProposalAccounting(value){
 const field='completeSourceDataAccounting';need(value&&typeof value==='object'&&!Object.hasOwn(value,field),'one new complete accounting result required');let prior=accountForwardSourceProposalData(value);Object.defineProperty(value,field,{value:prior,enumerable:true,writable:true,configurable:true});
 // The small accounting row is part of the payload too. Exact digit lengths
 // converge without serializing any complete source or excluding an alias.
 for(let at=0;at<32;at++){const next=accountForwardSourceProposalData(value);if(Object.keys(next).every(key=>next[key]===prior[key]))return value;value[field]=prior=next;}throw TypeError('Forward source accounting did not reach an exact self-inclusive size');
}
