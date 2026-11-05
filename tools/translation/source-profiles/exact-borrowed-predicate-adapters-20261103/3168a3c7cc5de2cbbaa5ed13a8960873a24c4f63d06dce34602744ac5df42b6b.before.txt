// Native source proposals only; original JS/TS owner/checker guards still apply.
import {BORROWED_STANDARD_MAP_LITERAL_PREDICATE as CONTRACT} from './borrowed-standard-map-20261103-contracts.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Borrowed standard-map reverse source: '+message);};
function rustText(value){
 if(typeof value!=='string')fail('primitive scalar literal required');let result='"';
 for(const point of value){const code=point.codePointAt(0);if(code>=0xd800&&code<=0xdfff)fail('unpaired surrogate literal refused');
  if(point==='"')result+='\\"';else if(point==='\\')result+='\\\\';else if(point==='\n')result+='\\n';else if(point==='\r')result+='\\r';else if(point==='\t')result+='\\t';else if(code<32||code===127)result+='\\x'+code.toString(16).padStart(2,'0');else result+=point;
 }return result+'"';
}
export function borrowedStandardMapReverseOperation(name){
 if(name!==CONTRACT.javascriptName)return null;
 return {id:CONTRACT.id,javascriptName:name,rustPath:CONTRACT.rustPath,parameters:['standard-text-map-input','str','literal-str-slice'],returns:'bool',shared:[0,1,2],consumed:[],returnedLoan:false,maxLiterals:64,containerEntryLimit:null,valueByteLimit:null,sourceAuthority:false,semanticAuthority:false};
}
/** Native operands must already be hygienic once-evaluated private temporaries. */
export function borrowedStandardMapReverseRustCall(name,arguments_,literals){
 if(name!==CONTRACT.javascriptName)fail('fixed original runtime operation required');
 const input={arguments:arguments_,literals};account(input);const data=copyMetadata(input);
 if(!Array.isArray(data.arguments)||data.arguments.length!==2||data.arguments.some(value=>typeof value!=='string'||!/^__ro_arg_[0-9]+$/u.test(value)))fail('two actual hygienic native operands required');
 if(!Array.isArray(data.literals)||data.literals.length>64)fail('bounded complete scalar literal array required');
 return CONTRACT.rustPath+'('+data.arguments.join(', ')+', &['+data.literals.map(rustText).join(', ')+'])';
}
export function borrowedStandardMapReverseTypeWitness(role){
 if(role==='standard-text-map-input')return {name:CONTRACT.javascriptName,kind:'parameter',index:0};
 if(role==='str')return {name:CONTRACT.javascriptName,kind:'parameter',index:1};
 if(role==='bool')return {name:CONTRACT.javascriptName,kind:'return'};return null;
}
