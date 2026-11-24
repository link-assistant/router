// Independent original terminal-switch SOURCE. All cases remain unrun drafts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceSwitchSources} from '../../prepare-http-resource-switch-sources.mjs';
const limits={timeout:60000};
const imports="import {router_text_replace as replace} from './runtime/text-runtime.mjs';\n";
const source=imports+`export function dispatch(input:string){switch(input){case 'GET':case 'HEAD':return 1n;case 'POST':return 2n;case 'é😀':return 3n;default:return 0n;}}
export function boolean(input:boolean){switch(input){case true:return 'yes';default:return 'no';}}
export function owned(){const input=replace('x','x','GET');switch(input){case 'GET':return input;default:return replace('x','x','no');}}
export function groupedDefault(input:string){switch(input){case 'GET':default:return true;}}
export function onlyDefault(){switch(true){default:return true;}}
export function lexical(input:string){switch(input){case 'GET':{const value=1n;return value;}default:{const value=2n;return value;}}}
export function nested(input:string){switch(input){case 'GET':switch(false){case true:return 1n;default:return 2n;}default:return 3n;}}
export function looping(){while(true){switch('GET'){case 'GET':return 1n;default:return 2n;}}return 0n;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual terminal switches preserve scalar cases stacked labels defaults nested scopes and function returns',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{for(const [value,expected]of [['GET',1n],['HEAD',1n],['POST',2n],['é😀',3n],['other',0n]])assert.equal(api.dispatch(value),expected);assert.equal(api.boolean(true),'yes');assert.equal(api.boolean(false),'no');assert.equal(api.owned(),'GET');assert.equal(api.groupedDefault('GET'),true);assert.equal(api.groupedDefault('other'),true);assert.equal(api.onlyDefault(),true);assert.equal(api.lexical('GET'),1n);assert.equal(api.lexical('other'),2n);assert.equal(api.nested('GET'),2n);assert.equal(api.nested('other'),3n);assert.equal(api.looping(),1n);});
 assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete canonical scoped native case trees reproduce every original syntax token',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('case source cannot hide side effects change domains fall through escape shared lexical TDZ or break an enclosing loop',limits,()=>{
 for(const body of [
  'export function bad(input:string){switch(input){case "GET":return true;}}',
  'export function bad(input:string){switch(input){case "GET":break;default:return false;}}',
  'export function bad(input:string){switch(input){case "GET":const value=true;default:return false;}}',
  'export function bad(input:string){switch(input){case "GET":return true;default:return 1n;}}',
  'export function bad(input:string){switch(input){default:return true;case "GET":return false;}}',
  'export function bad(){switch(replace("x","x","GET")){case "GET":return true;default:return false;}}',
  'export function bad(input:string){switch(input){case replace("x","x","GET"):default:return true;}}',
  'export function bad(input:string){switch(input){case "GET":const value=true;return value;default:const value=false;return value;}}',
  'export function bad(input:string){switch(input){case "GET":return value;default:const value=false;return value;}}',
  'export function bad(){while(true){switch(true){case true:break;default:return false;}}return true;}',
  'export function bad(input:string){switch(input){case 1n:return true;default:return false;}}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='dispatch').flow.tail.cases.reverse();assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('bounded many stacked labels retain complete source grammar and balanced comparison trees',limits,()=>{
 const value=imports+'export function labels(input:string){switch(input){'+Array.from({length:200},(_,index)=>'case "value'+index+'":').join('')+'return true;default:return false;}}';const result=translateHttpResourceCallerTypeScript(value,input(value));assert.equal(result.typescript,value);assert.equal(result.rustExecuted,false);
});
test('complete original switch substitutions retain both ordered source inverses',limits,()=>{
 const plan=prepareHttpResourceSwitchSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
