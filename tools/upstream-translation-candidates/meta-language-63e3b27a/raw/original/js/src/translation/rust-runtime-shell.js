// Closed whole-artifact interpretation. Every represented runtime operation is
// parsed from the complete lexer-owned sequence and retained as inspectable data.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {typeError,unsupported} from './diagnostics.js';
import {checkProgram} from './check.js';
import {withParts} from './emit-common.js';
import {parseRustRuntimeShell,readRustRuntimeShellSyntax} from './rust-runtime-shell-parser.js';
import {acceptSourceSpanOffset} from '../source-span-rules.js';
export const RUST_RUNTIME_SHELL_POLICY=readRuntimeProjectData(new URL('./data/rust-runtime-shell.lino',import.meta.url));
const policy=RUST_RUNTIME_SHELL_POLICY;
const fail=detail=>{throw typeError('Rust runtime shell proof: '+detail);};
const own=(value,name)=>Object.hasOwn(value,name);
function data(root){
 const active=new WeakSet(),seen=new WeakSet();let visits=0;
 function visit(value,depth=0){
  if(value===null||typeof value!=='object'){if(['function','symbol','undefined'].includes(typeof value))fail('the complete owned graph contains a non-data value');return;}
  if(active.has(value))fail('the complete owned graph contains a structural cycle');if(seen.has(value))return;
  if(depth>256||++visits>100_000)fail('the complete owned graph exceeds its traversal limit');seen.add(value);active.add(value);
  const keys=Reflect.ownKeys(value);
  if(value instanceof Map){if(Object.getPrototypeOf(value)!==Map.prototype||keys.length)fail('an owned declaration Map has unrepresented fields');for(const [key,child]of Map.prototype.entries.call(value)){visit(key,depth+1);visit(child,depth+1);}}
  else if(Array.isArray(value)){
   const length=Object.getOwnPropertyDescriptor(value,'length')?.value;
   if(Object.getPrototypeOf(value)!==Array.prototype||!Number.isSafeInteger(length)||keys.length!==length+1||keys.some(key=>{const d=Object.getOwnPropertyDescriptor(value,key);return typeof key!=='string'||!own(d,'value')||key!=='length'&&(!d.enumerable||!/^(?:0|[1-9][0-9]*)$/u.test(key)||String(Number(key))!==key||Number(key)>=length);}))fail('an owned ordered container has sparse or unrepresented fields');
   for(let index=0;index<length;index++)visit(Object.getOwnPropertyDescriptor(value,String(index)).value,depth+1);
  }else{
   if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)fail('an owned record has an unrepresented prototype');
   for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!d.enumerable||!own(d,'value'))fail('an owned record has unrepresented fields');visit(d.value,depth+1);}
  }
  active.delete(value);
 }
 visit(root);
}
function fields(value,names,exact=true){if(!value||typeof value!=='object'||Array.isArray(value)||value instanceof Map||Reflect.ownKeys(value).some(key=>typeof key!=='string'||!names.includes(key))||exact&&Object.keys(value).length!==names.length)fail('unrecognized or missing owned fields');}
function interval(value,empty=false){fields(value,['start','end']);if(!acceptSourceSpanOffset(value.start,Object.is(value.start,-0))||!acceptSourceSpanOffset(value.end,Object.is(value.end,-0))||(empty?value.end<value.start:value.end<=value.start))fail('an actual owned source interval is malformed');}
function compare(left,right,identity=new Set()){
 if(Object.is(left,right))return true;if(identity.has(right))return false;
 if(!left||!right||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return Object.is(left,right);
 if(left instanceof Map||right instanceof Map){if(!(left instanceof Map&&right instanceof Map)||left.size!==right.size)return false;return [...right].every(([key,value])=>left.has(key)&&compare(left.get(key),value,identity));}
 const a=Object.keys(left),b=Object.keys(right);return a.length===b.length&&b.every(key=>own(left,key)&&compare(left[key],right[key],identity));
}
function assumptions(parsed){return policy.assumptions.map(assumption=>({id:assumption.id,meaning:assumption.meaning,operationNode:parsed.single(assumption.operation)}));}
function tokenValue(token){return token.declaration?token.declaration.name:token.binding?token.binding.value:token.value;}
function validateTokens(proof,program){
 if(!Array.isArray(proof.tokens)||!proof.tokens.length||proof.tokens.length>100_000)fail('the whole artifact requires its ordered complete source tokens');
 const tokenSet=new Set(proof.tokens);if(tokenSet.size!==proof.tokens.length)fail('each actual source occurrence must have its distinct token identity');
 let previous=0,previousToken=null;
 for(const [index,token]of proof.tokens.entries()){
  const reference=own(token,'declaration')?'declaration':own(token,'binding')?'binding':null;
  if(!['identifier','number','string','punct','eof'].includes(token.kind)||reference&&token.kind!=='identifier')fail('an owned token has an unrecognized lexical role');
  fields(token,reference?['kind',reference,'alias','span']:token.kind==='number'?['kind','value','suffix','floating','span']:['kind','value','span']);
  interval(token.span,token.kind==='eof');if(token.span.start<previous||token.span.end>proof.span.end)fail('source tokens are overlapping or escape the complete artifact');previous=token.span.end;
  if(reference){
   if(typeof token.alias!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(token.alias)||token.span.end-token.span.start!==token.alias.length)fail('a bound occurrence lost its actual source alias interval');
   if(reference==='declaration'){
    const entry=token.declaration;if(!entry||program.declarations.get(entry.fullName)!==entry)fail('a source occurrence references an unowned declaration');
   }else if(!tokenSet.has(token.binding)||token.binding.kind!=='identifier'||!own(token.binding,'value'))fail('a source occurrence references an unowned lexical binder');
  }else if(typeof token.value!=='string'||token.kind==='number'&&(typeof token.suffix!=='string'||typeof token.floating!=='boolean'))fail('the actual token scalar has a different lexical domain');
  if(['identifier','punct','number'].includes(token.kind)&&!reference&&token.span.end-token.span.start!==(token.value+(token.kind==='number'?token.suffix:'')).length)fail('a lexical token does not own its actual source interval');
  if(token.kind==='string'&&token.span.end-token.span.start<token.value.length+2)fail('an actual fixed ASCII string must own its scalar contents and both delimiters');
  if(previousToken&&previousToken.span.end===token.span.start&&['identifier','number'].includes(previousToken.kind)&&['identifier','number'].includes(token.kind))fail('distinct source word tokens require an actual lexical separator');
  previousToken=token;
  if(token.kind==='eof'&&(index!==proof.tokens.length-1||token.value!==''||token.span.start!==proof.span.end||token.span.end!==proof.span.end))fail('the complete artifact has a malformed final lexical boundary');
 }
 if(proof.tokens.at(-1).kind!=='eof')fail('the complete artifact has no final lexical boundary');
 return tokenSet;
}
function compatibleCore(program,expected){
 fields(program,policy.fields.program,false);
 if(program.schemaVersion!==1||program.sourceLanguage!=='Rust'||!(program.declarations instanceof Map)||!Array.isArray(program.items)||['imports','externals'].some(field=>own(program,field)&&(!Array.isArray(program[field])||program[field].length))||['outputThreaded','abortsThreaded','referenceSemantics','utf16Strings'].some(field=>own(program,field)&&program[field]!==false))fail('the complete runtime requires a closed pure Rust program');
 for(const entry of program.declarations.values()){
  fields(entry,policy.fields.declaration,false);
  if(own(entry,'mutual')&&entry.mutual!==false||own(entry,'generated')&&entry.generated!==false)fail('a source helper acquired an unproved generated or recursive context');
 }
 fields(program.main,policy.fields.main);
 for(const effect of program.main.effects)fields(effect,policy.fields.effect);
 const neutral=new Set(['imports','externals','outputThreaded','abortsThreaded','referenceSemantics','utf16Strings','sourceRuntimeShell']);
 const actual=Object.fromEntries(Object.entries(program).filter(([key])=>!neutral.has(key)));
 const normalized=structuredClone(actual);delete normalized.main.sourceRuntimeWorker;for(const entry of normalized.declarations.values()){if(entry.mutual===false)delete entry.mutual;if(entry.generated===false)delete entry.generated;}
 if(!compare(normalized,expected))fail('the checked Unit program differs from its complete owned runtime syntax or bindings');
 if(program.items.length!==program.declarations.size||new Set(program.items).size!==program.items.length||program.items.some(entry=>program.declarations.get(entry.fullName)!==entry))fail('the ordered helper items do not own their actual declarations');
}
export function checkRustRuntimeShellContainers(value){
 if(!value||typeof value!=='object')return false;
 const main=Object.getOwnPropertyDescriptor(value,'main')?.value,marked=main&&typeof main==='object'&&own(main,'sourceRuntimeWorker'),rooted=own(value,'sourceRuntimeShell');
 if(!rooted&&!marked)return false;data(value);if(!rooted)fail('the owned runtime worker lost its complete source interpretation');return true;
}
export function checkRustRuntimeShell(program){
 if(!checkRustRuntimeShellContainers(program))return null;
 const proof=program.sourceRuntimeShell;fields(proof,policy.fields.proof);interval(proof.span,true);
 if(proof.model!==policy.model||proof.language!==policy.language||proof.observationModel!==policy.observationModel||proof.span.start!==0)fail('the complete runtime interpretation is unknown or inconsistent');
 if(!(program.declarations instanceof Map))fail('the runtime helpers require actual declaration identities');
 const identity=validateTokens(proof,program),parsed=readRustRuntimeShellSyntax(proof.tokens,policy,{bound:true});
 if(!compare(proof.operations,parsed.operations,identity))fail('the represented operation graph does not belong to the actual whole-artifact syntax');
 const ownedOperations=new Map();
 const collect=node=>{if(node.kind==='source operation'){const rows=ownedOperations.get(node.op)??[];rows.push(node);ownedOperations.set(node.op,rows);node.parts.forEach(collect);}};collect(proof.operations);
 const expectedAssumptions=policy.assumptions.map(assumption=>({id:assumption.id,meaning:assumption.meaning,operationNode:ownedOperations.get(assumption.operation)?.[0]}));
 if(!compare(proof.assumptions,expectedAssumptions,new Set([...identity,...expectedAssumptions.map(assumption=>assumption.operationNode)])))fail('the conditional runtime assumptions do not cover the actual owned operations');
 // Reuse the real checker on the interpretation of this complete source AST.
 // It receives no cached source, selected substring or runtime facet.
 const expected=checkProgram(parsed.surface);
 fields(program.main?.sourceRuntimeWorker,policy.fields.workerContext);
 const context=program.main.sourceRuntimeWorker;
 if(context.model!==policy.model||context.observationModel!==policy.observationModel||!compare(context.span,parsed.surface.main.span))fail('the owned worker context differs from its complete runtime interpretation');
 compatibleCore(program,expected);
 for(const row of parsed.helperRows){if(row.name.declaration.span.start!==row.node.span.start||row.name.declaration.span.end!==row.node.span.end)fail('a helper header references a different actual declaration site');}
 return parsed;
}
export function captureRustRuntimeShell(program,sourceProof){
 data(sourceProof);
 const proof=structuredClone(sourceProof),parsed=readRustRuntimeShellSyntax(proof.tokens,policy);
 const bindDeclaration=(token,entry)=>{const alias=token.value;delete token.value;token.alias=alias;token.declaration=entry;};
 for(const row of parsed.helperRows)bindDeclaration(row.name,program.declarations.get(row.name.value));
 for(const use of parsed.helperUses)bindDeclaration(use.token,use.target.declaration);
 for(const use of parsed.localUses){const alias=use.token.value;delete use.token.value;use.token.alias=alias;use.token.binding=use.target;}
 const prepared=readRustRuntimeShellSyntax(proof.tokens,policy,{bound:true});
 proof.operations=prepared.operations;proof.assumptions=assumptions(prepared);
 program.sourceRuntimeShell=proof;program.main.sourceRuntimeWorker={model:policy.model,observationModel:policy.observationModel,span:program.main.span};checkRustRuntimeShell(program);return proof;
}
export function readRustRuntimeShellSource(source){return parseRustRuntimeShell(source,policy);}
export function recordRustRuntimeShellAssumptions(state,parsed){
 if(!parsed)return;
 for(const assumption of assumptions(parsed))state.assume({id:assumption.id,statement:assumption.meaning},'source operation '+assumption.operationNode.op+' at '+assumption.operationNode.span.start+'..'+assumption.operationNode.span.end);
 state.encode('closed-pure-rust-runtime-shell','the complete represented source runtime is interpreted under '+policy.observationModel+'; only ordered pure Unit helper calls, empty output and normal completion are projected, with all source runtime operations retained as links');
}
function renderTokens(node){
 const tokens=[];const visit=value=>{if(value.kind==='source operation')value.parts.forEach(visit);else if(value.kind!=='eof')tokens.push(value);};visit(node);
 let result='';for(const [index,token]of tokens.entries()){
  if(index&&(tokens[index-1].span.end!==token.span.start||['identifier','number'].includes(tokens[index-1].kind)&&['identifier','number'].includes(token.kind)))result+=' ';
  result+=token.kind==='string'?JSON.stringify(token.value):tokenValue(token);
 }
 return result;
}
export function emitRustRuntimeShell(program,parsed){
 const helpers=parsed.helperRows.map(row=>renderTokens(row.node)),attribute=renderTokens(parsed.single('inert runtime lint attribute'));
 const worker=renderTokens(parsed.single('owned Unit worker definition')),entry=renderTokens(parsed.single('complete standard runtime entry'));
 return withParts({language:'Rust',text:[attribute,...helpers,worker,entry].join('\n\n')+'\n',entry:'main',mappings:[...program.declarations.values()].map(entry=>({kind:'function',source:entry.fullName,target:entry.name,sourceSpan:{...entry.span}})),assumptions:assumptions(parsed).map(assumption=>({id:assumption.id,statement:assumption.meaning,details:['source operation '+assumption.operationNode.op+' at '+assumption.operationNode.span.start+'..'+assumption.operationNode.span.end]})),encodings:[{id:'closed-pure-rust-runtime-shell',statement:'the actual complete owned operation graph is rendered; failure branches and resource arguments remain represented'}],theorems:[]},[attribute],helpers);
}
export function refuseRustRuntimeShellComposition(detail){throw unsupported('closed Rust runtime shell',detail);}
