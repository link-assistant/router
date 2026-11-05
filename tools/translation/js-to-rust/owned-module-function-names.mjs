// Identifier proposals are formatting DATA. Every proposed declaration is
// selected again by its actual native symbol and checked as a whole program.
import {types} from 'node:util';
const fail=message=>{throw new TypeError('Owned module identifier proposal: '+message);};
const identifier=value=>typeof value==='string'&&/^[a-z][A-Za-z0-9_]*$/u.test(value)&&!value.startsWith('__ro');
function own(object,key){if(!object||typeof object!=='object'||types.isProxy(object))fail('ordinary own proposal fields required');const row=Object.getOwnPropertyDescriptor(object,key);if(!row||!Object.hasOwn(row,'value'))fail('own proposal data required');return row.value;}
export function ownedModuleFunctionNames(value=[]){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary proposal array required');const length=own(value,'length');if(length>4096||Reflect.ownKeys(value).length!==length+1)fail('bounded dense proposal array required');const rows=new Map(),names=new Set(),used=new Set();
 for(let at=0;at<length;at++){const row=own(value,String(at)),path=own(row,'path'),name=own(row,'name'),linked=own(row,'linked');if(typeof path!=='string'||path.length>240||path.startsWith('/')||path.includes('\\')||/[\0\r\n:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..')||!identifier(name)||!identifier(linked))fail('ordinary source declaration/name proposal required');const key=path+'\0'+name;if(rows.has(key)||names.has(linked))fail('unique source and linked names required');rows.set(key,linked);names.add(linked);}
 return {names,select(path,name,fallback){const key=path+'\0'+name;if(!rows.has(key))return fallback;used.add(key);return rows.get(key);},finish(){if(used.size!==rows.size)fail('every proposed name must select a complete actual function declaration');}};
}
