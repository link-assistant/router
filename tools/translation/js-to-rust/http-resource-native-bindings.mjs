// Alpha-renaming DATA from complete original syntax. The receiving translator
// must independently check the entire normalized source and emitted behavior.
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {HttpResourceBindingRustReader} from './http-resource-binding-rust-syntax.mjs';
import {httpResourceCallerName} from './http-resource-caller-flow.mjs';
import {transportConcreteSyntaxSource,serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
const fail=message=>{throw new TypeError('Original native lexical bindings: '+message);};
const nonBindings=new Set('_ Some None Ok Err Box as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final gen macro override priv typeof unsized virtual yield try'.split(' '));
export function normalizeHttpResourceRustBindings(source){
 if(typeof source!=='string'||source.length>2097152)fail('bounded complete original native source required');
 const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('original serialized and reparsed CST differs');
 const items=sourceItems(source).filter(row=>row.term!=='comment');if(!items.length||items.length>4096||items.some(row=>row.term!=='fn'))fail('complete ordinary native function module required');
 const used=new Set(),moduleNames=new Set(),edits=[],selections=[],annotations=[],controls=[];let cells=0,sequence=0;
 const tick=(depth=0)=>{if(++cells>100000||depth>160)fail('complete native binding walk bound');};
 for(const token of rustTokens(source)){tick();if(token.type==='ident')used.add(token.text);}
 for(const item of items){if(moduleNames.has(item.name))fail('unique actual native function name required');httpResourceCallerName(item.name);moduleNames.add(item.name);}
 function spanEdit(item,span,expected,replacement,kind){
  tick();if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end<=span.start||span.end>item.end-item.start)fail('actual original binding token span required');
  const selected=[item.start+span.start,item.start+span.end];if(source.slice(...selected)!==expected)fail('exact original binding token changed');
  if(expected!==replacement)edits.push({span:selected,expected,replacement});selections.push({kind,name:expected,target:replacement,span:selected});
 }
 function fresh(original,scope,force=false){
  let portable=true;try{httpResourceCallerName(original);}catch(error){if(!(error instanceof TypeError))throw error;portable=false;}
  if(!force&&portable&&!scope.has(original)&&!moduleNames.has(original))return original;
  let value;do{tick();value='router_shadow_'+sequence++;}while(used.has(value));used.add(value);return value;
 }
 function insertControl(item,at,replacement,priority,kind){
  tick();if(!Number.isSafeInteger(at)||at<0||at>item.end-item.start)fail('actual original control boundary required');controls.push({at:item.start+at,replacement,priority,kind});
 }
 function declare(item,binding,scope,kind){
  if(nonBindings.has(binding.name))fail('an original Rust keyword or discard pattern is not an ordinary value binding');
  const typed=kind==='let'&&binding.type!==null&&binding.type!==undefined,target=fresh(binding.name,scope,typed);spanEdit(item,binding.nameSpan,binding.name,target,kind);scope.set(binding.name,target);if(typed){const span=binding.typeSpan;if(!span||span.start<binding.nameSpan.end||span.end>item.end-item.start)fail('complete original type annotation span required');const selected=[item.start+span.start,item.start+span.end],expected=source.slice(...selected);edits.push({span:selected,expected,replacement:''});annotations.push({function:item.name,target,type:binding.type,span:selected,original:expected});}
 }
 function value(item,node,scope,depth=0){
  tick(depth);if(!node||typeof node!=='object')fail('complete original native expression required');
  if(['boolean','string','integer','unit','json-null','bytes-literal'].includes(node.kind))return;
  if(node.kind==='name'){const target=scope.get(node.name);if(target!==undefined)spanEdit(item,node.nameSpan,node.name,target,'reference');return;}
  if(node.kind==='temporary')fail('compiler temporary lineage needs the unchanged canonical lane');
  if(['borrow','dereference','not','effect-try','field'].includes(node.kind)){value(item,node.value,scope,depth+1);return;}
  if(node.kind==='binary'){value(item,node.left,scope,depth+1);value(item,node.right,scope,depth+1);return;}
  if(['json-list-literal','json-array'].includes(node.kind)){for(const element of node.elements)value(item,element,scope,depth+1);return;}
  if(node.kind==='json-scalar'){value(item,node.value,scope,depth+1);return;}
  if(node.kind==='call'){
   if(scope.has(node.path))fail('a bare call resolves to an actual local value rather than an imported or checked function');
   for(const argument of node.args)value(item,argument,scope,depth+1);return;
  }
  if(node.kind==='match'){
   if(scope.has('Some')||scope.has('None')||moduleNames.has('Some')||moduleNames.has('None')||node.arms.length!==2)fail('complete unshadowed original Option match required');
   const some=node.arms.find(arm=>/^Some\(([A-Za-z_][A-Za-z0-9_]*)\)$/u.test(arm.pattern)),none=node.arms.find(arm=>arm.pattern==='None');if(!some||!none||some.patternTokens.length!==4||some.patternTokens[0].type!=='ident'||some.patternTokens[2].type!=='ident'||none.patternTokens.length!==1||none.patternTokens[0].type!=='ident')fail('one actual Some binder and one actual None arm required');
   const binder=some.patternTokens[2].text,success=some.value.kind==='block'&&!some.value.statements.length?some.value.tail:some.value,failure=none.value.kind==='block'&&!none.value.tail&&none.value.statements.length===1&&none.value.statements[0].kind==='return'?none.value.statements[0].value:none.value.kind==='return-expression'?none.value.value:null;
   if(nonBindings.has(binder)||success?.kind!=='name'||success.name!==binder||failure?.kind!=='name'||failure.name!=='None')fail('original successful arm must retain its one value and absent arm must only return None');
   value(item,node.value,scope,depth+1);const full=node.matchSpan,input=node.inputSpan;if(!full||!input||full.start>=input.start||input.end>=full.end||full.end>item.end-item.start)fail('complete original match and initializer spans required');for(const [span,replacement,kind]of [[[item.start+full.start,item.start+input.start],'','option-match-prefix'],[[item.start+input.end,item.start+full.end],'?','option-match-arms']]){const expected=source.slice(...span);edits.push({span,expected,replacement});selections.push({kind,span,source:expected,replacement});}return;
  }
  if(node.kind==='choose'){value(item,node.condition,scope,depth+1);block(item,node.yes,scope,depth+1);block(item,node.no,scope,depth+1);return;}
  if(node.kind==='block'){block(item,node,scope,depth+1);return;}
  if(['typed-lambda','typed-async-lambda'].includes(node.kind)){
   const inner=new Map(scope),parameters=new Set();for(const parameter of node.parameters){if(parameters.has(parameter.name))fail('unique actual native callback parameter required');parameters.add(parameter.name);declare(item,parameter,inner,'callback-parameter');}block(item,node.body,inner,depth+1,true,node.body.statements.length===0&&!node.body.tail);return;
  }
  fail('this original expression needs an independent complete lexical binding rule: '+node.kind);
 }
 function block(item,node,outer,depth=0,returnsHere=false,unitTail=false){
  tick(depth);if(node?.kind!=='block'||!Array.isArray(node.statements)||node.statements.length>4096)fail('complete bounded original block required');const scope=new Map(outer),addedUnit=unitTail&&!node.tail&&node.statements.at(-1)?.kind!=='return';if(addedUnit){const at=node.span?.end-1;if(!Number.isSafeInteger(at)||source[item.start+at]!=='}')fail('actual original unit body closing token required');insertControl(item,at,' () ',2,'unit-body-tail');}
  for(let index=0;index<node.statements.length;index++){
   const statement=node.statements[index],tailPosition=returnsHere&&!addedUnit&&index===node.statements.length-1&&!node.tail;tick(depth+1);
   if(statement.kind==='let-option-else'){
    if(statement.mutable)fail('mutable extracted Option payload requires a separate checked local-mutation rule');
    if(scope.has('Some')||scope.has('None')||moduleNames.has('Some')||moduleNames.has('None'))fail('original Option constructor namespace is shadowed');
    const fallback=statement.otherwise;if(fallback.tail||fallback.statements.length!==1||fallback.statements[0].kind!=='return'||fallback.statements[0].value?.kind!=='name'||fallback.statements[0].value.name!=='None')fail('one actual original None return with no other fallback effect required');
    value(item,statement.value,scope,depth+1);spanEdit(item,statement.constructorSpan,'Some','','option-constructor');spanEdit(item,statement.openSpan,'(','','option-pattern-open');spanEdit(item,statement.closeSpan,')','','option-pattern-close');const span=statement.alternativeSpan;if(!span||span.start<statement.closeSpan.end||span.end>item.end-item.start)fail('complete original let-else alternative span required');const selected=[item.start+span.start,item.start+span.end];edits.push({span:selected,expected:source.slice(...selected),replacement:'?;'});selections.push({kind:'option-none-alternative',span:selected,source:source.slice(...selected),replacement:'?;'});declare(item,statement,scope,'let');continue;
   }
   if(statement.kind==='let'){value(item,statement.value,scope,depth+1);declare(item,statement,scope,'let');continue;}
   if(statement.kind==='let-tuple'){value(item,statement.value,scope,depth+1);const names=new Set();for(const binding of statement.bindings){if(names.has(binding.name))fail('unique native tuple binders required');names.add(binding.name);declare(item,binding,scope,'tuple-let');}continue;}
   if(statement.kind==='assign'){const target=scope.get(statement.name);if(target===undefined)fail('assignment must select an actual original local');spanEdit(item,statement.nameSpan,statement.name,target,'assignment');value(item,statement.value,scope,depth+1);continue;}
   if(['effect','return'].includes(statement.kind)){value(item,statement.value,scope,depth+1);if(statement.kind==='return'){if(statement.bareReturn){spanEdit(item,statement.returnSpan,'return',tailPosition?'()':'return ()','unit-return-keyword');if(tailPosition)spanEdit(item,statement.semicolonSpan,';','','tail-return-semicolon');}else if(tailPosition){spanEdit(item,statement.returnSpan,'return','','tail-return-keyword');spanEdit(item,statement.semicolonSpan,';','','tail-return-semicolon');}}continue;}
   if(statement.kind==='if'){if(statement.missingElseAt!==null&&statement.missingElseAt!==undefined){if(source[item.start+statement.missingElseAt-1]!=='}')fail('actual original missing-else body boundary required');insertControl(item,statement.missingElseAt,' else {}',0,'empty-else');}if(statement.elseIf){if(source.slice(item.start+statement.elseIf.start,item.start+statement.elseIf.start+2)!=='if'||source[item.start+statement.elseIf.end-1]!=='}')fail('actual original else-if boundaries required');insertControl(item,statement.elseIf.start,'{ ',0,'else-if-open');insertControl(item,statement.elseIf.end,' }',1,'else-if-close');}value(item,statement.condition,scope,depth+1);block(item,statement.yes,scope,depth+1,tailPosition);block(item,statement.no,scope,depth+1,tailPosition);continue;}
   if(statement.kind==='while'){value(item,statement.condition,scope,depth+1);block(item,statement.body,scope,depth+1);continue;}
   if(['loop','lexical-scope'].includes(statement.kind)){block(item,statement.body,scope,depth+1,statement.kind==='lexical-scope'&&tailPosition);continue;}
   if(statement.kind==='for-shared-json'){value(item,statement.iterable,scope,depth+1);const inner=new Map(scope);declare(item,statement,inner,'for-element');block(item,statement.body,inner,depth+1);continue;}
   if(['break','continue'].includes(statement.kind))continue;
   fail('this original statement needs a complete lexical binding rule: '+statement.kind);
  }
  if(node.tail)value(item,node.tail,scope,depth+1);
 }
 for(const item of items){
  const reader=new HttpResourceBindingRustReader(rustTokens(source.slice(item.start,item.end))),fn=reader.function(),scope=new Map(),names=new Set();
  if(fn.name!==item.name)fail('actual original function owner differs');for(const parameter of fn.parameters){if(names.has(parameter.name))fail('unique original function parameter required');names.add(parameter.name);declare(item,parameter,scope,'parameter');}if(fn.unitReturnInsertionAt!==null&&fn.unitReturnInsertionAt!==undefined){if(source[item.start+fn.unitReturnInsertionAt]!=='{')fail('actual original omitted unit signature boundary required');insertControl(item,fn.unitReturnInsertionAt,' -> () ',0,'unit-function-signature');}block(item,fn.body,scope,0,true,fn.returns==='()');
 }
 const groupedControls=new Map();for(const control of controls){if(!groupedControls.has(control.at))groupedControls.set(control.at,[]);groupedControls.get(control.at).push(control);}for(const [at,rows]of groupedControls)edits.push({span:[at,at],expected:'',replacement:rows.sort((left,right)=>left.priority-right.priority).map(row=>row.replacement).join('')});
 edits.sort((left,right)=>left.span[0]-right.span[0]);for(let index=1;index<edits.length;index++)if(edits[index-1].span[1]>edits[index].span[0])fail('original binding edit overlap');
 const substituted=applyConcreteSyntaxSubstitutions(concrete.document,{languageRules:[{id:'rust:normalize-actual-lexical-bindings-local-types-and-control-spellings',edits}],repositoryRules:[{id:'router:retain-portable-collision-free-local-names',edits:[]}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(substituted.value)).source,equation=transportConcreteSourceEquations([{before:source,after,language:'Rust'}])[0];
 if(equation.inverse!==source)fail('complete original binding source inverse differs');
 return {schema:'router-http-resource-native-lexical-bindings-v1',before:source,after,edits,selections,annotations,controls,equation,trace:substituted.trace,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,rustExecuted:false,receivingExecuted:false,crossInvocationCache:false};
}
