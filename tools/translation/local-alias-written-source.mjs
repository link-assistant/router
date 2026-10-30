// Bounded ordinary declaration/source DATA. Written types cannot infer values.
import {localAliasDeclaration} from './local-alias-binding-source.mjs';
export function readLocalAliasInitializer(rows,at,readWrittenDomain){
 const binding=localAliasDeclaration(rows,at);if(!binding||binding.mutable)return null;if(binding.initializerStart!==null)return {start:binding.initializerStart,domain:null};let end=binding.next+1;
 const groups=[];while(end<rows.length&&end-binding.next<=65){const word=rows[end].text;if(!groups.length&&(word==='='||/^>{1,3}=$/u.test(word)))break;if(['{','}'].includes(word)||word===';'&&groups.at(-1)!==']')return null;if(word==='['||word==='(')groups.push(word==='['?']':')');else if(word===']'||word===')'){if(groups.pop()!==word)return null;}end++;}if(groups.length||end-binding.next>65||!rows[end+1]||!(rows[end]?.text==='='||/^>{1,3}=$/u.test(rows[end]?.text??'')))return null;const written=rows.slice(binding.next+1,end);if(rows[end].text!=='=')written.push({...rows[end],text:rows[end].text.slice(0,-1),end:rows[end].end-1});const domain=readWrittenDomain(written);if(typeof domain!=='string'||!domain||domain.length>160)return null;return {start:end+1,domain};
}
// This closure is new for each complete function source operation. Family
// rules select their written domains and still require concrete initializers.
export function createWrittenLocalAliasRules({readWrittenDomain,readOperand,acceptResult}){
 const annotations=new Map();return {
  initializerStart(at,rows){const selected=readLocalAliasInitializer(rows,at,readWrittenDomain);if(!selected)return null;if(selected.domain!==null)annotations.set(rows[selected.start].start,selected.domain);return selected.start;},
  readOperand(operand,bindings){const declared=annotations.get(operand[0]?.start)??null,value=readOperand(operand,bindings,declared);return value&&(!declared||value.kind===declared)?value:null;},
  acceptResult(event){const declared=annotations.get(event.span[0])??null,actual=acceptResult(event);return typeof actual==='string'&&(!declared||declared===actual)?actual:null;},
 };
}
