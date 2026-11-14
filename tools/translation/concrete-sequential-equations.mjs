// Separate source-only adapter over the complete sequential named transaction.
// The original concrete-phased-equations API and observer schedule stay exact.
import {types} from 'node:util';
import {assertPrivateParserExecution} from './private-parser-sequential-phases.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-sequential-phases.mjs';

const fail=message=>{throw TypeError('Sequential concrete equations: '+message);};
function data(value,names,snapshots,array=false){
 if(value===null||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))fail('ordinary own data required');
 const keys=Reflect.ownKeys(value);if(keys.length!==names.length||keys.some((key,at)=>key!==names[at]))fail('complete ordered own fields required');
 const fields=names.map(key=>{
  const field=Object.getOwnPropertyDescriptor(value,key);
  if(!field||!Object.hasOwn(field,'value')||key!=='length'&&field.enumerable!==true)fail('enumerable own data required');return field;
 });
 snapshots.push({value,names,fields,array});return fields.map(field=>field.value);
}
export function transportConcreteSourcePhases(input){
 assertPrivateParserExecution();const snapshots=[];
 if(input===null||typeof input!=='object'||types.isProxy(input)||!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype)fail('dense phase array required');
 const size=Object.getOwnPropertyDescriptor(input,'length');
 if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<1||size.value>85)fail('bounded phase count required');
 const rows=data(input,[...Array.from({length:size.value},(_,at)=>String(at)),'length'],snapshots,true).slice(0,-1).map(value=>{
  const [before,middle,after,language]=data(value,['before','middle','after','language'],snapshots);
  if(typeof before!=='string'||typeof middle!=='string'||typeof after!=='string'||!['Rust','JavaScript','TypeScript'].includes(language))fail('primitive complete sources and supported language required');
  return {before,middle,after,language,rules:['source-phases:complete-language-edit','source-phases:complete-repository-edit','source-phases:complete-language-inverse','source-phases:complete-repository-inverse']};
 });
 const equations=transportConcreteNamedSourcePhases(rows);assertPrivateParserExecution();
 for(const row of snapshots){
  const current=[];data(row.value,row.names,current,row.array);
  for(let at=0;at<row.fields.length;at++){
   const before=row.fields[at],after=current[0].fields[at];
   if(before.value!==after.value||before.enumerable!==after.enumerable||before.writable!==after.writable||before.configurable!==after.configurable)fail('complete input changed during transaction');
  }
 }
 return equations;
}
