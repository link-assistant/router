// Generic original Rust control syntax -> private serialized symbolic IR.
// This lifts control/dataflow, not ExtCtxt, AST builders, traits or effects.
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {declarativeExpansionLineage} from './declarative-token-macros.mjs';
import {isFormatCallbackDataflow} from './format-builtin-dataflow.mjs';
const states=new WeakMap(),hash=text=>createHash('sha256').update(text).digest('hex');
const word=node=>node?.kind==='token'?node.text:null;
const name=node=>node?.kind==='token'&&node.type==='ident'&&/^(?:r#)?[\p{L}_][\p{L}\p{N}_]*$/u.test(node.text);
// Original BinOpKind::precedence/fixity separates bitwise groups and gives
// every comparison one non-associative precedence (pinned ast.rs).
const precedence={'||':1,'&&':2,'==':3,'!=':3,'<':3,'<=':3,'>':3,'>=':3,'|':4,'^':5,'&':6,'<<':7,'>>':7,'+':8,'-':8,'*':9,'/':9,'%':9};
const comparison=operation=>['==','!=','<','<=','>','>='].includes(operation);
const flags={compilerHandlerOwnerResolved:false,sourceSemanticClosureVerified:false,typedCompilerIRChecked:false,rustGrammarValidated:false,executable:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false};
const transparent=node=>node?.kind==='fragment'&&['ident','lifetime','tt'].includes(node.fragment)&&node.trees.length===1?transparent(node.trees[0]):node;
const range=nodes=>({start:nodes[0]?.span.start??0,end:nodes.at(-1)?.span.end??0});
function expandedLocation(nodes){
  const origins=[],seen=new Set();let remaining=32000;
  function visit(node){if(--remaining<0)throw new TypeError('Expanded source origin cell bound exhausted');const reference=node.sourceSyntax??(node.sourceSha256&&node.span?{sourceSha256:node.sourceSha256,span:node.span}:null);if(reference){const key=JSON.stringify(reference);if(!seen.has(key)){seen.add(key);origins.push(reference);}}if(node.kind==='fragment')node.trees.forEach(visit);if(node.kind==='group')node.children.forEach(visit);}
  nodes.forEach(visit);return {sourceSpan:null,sourceOrigins:origins};
}
function split(nodes,separator=',') {
  if(!nodes.length)return [];
  const rows=[];let start=0;
  for(let at=0;at<=nodes.length;at++)if(at===nodes.length||word(nodes[at])===separator){const row=nodes.slice(start,at);if(!row.length){if(at===nodes.length&&start===at)break;throw new TypeError('Source control has an empty separated operand');}rows.push(row);start=at+1;}
  return rows;
}
// TT punctuation remains original. Rejoin only adjacent source punctuators
// needed by this expression grammar; never expose opaque macro fragments.
function expressionTokens(nodes) {
  const result=[];
  for(let at=0;at<nodes.length;at++){const first=nodes[at],second=nodes[at+1];
    if(first?.kind==='token'&&second?.kind==='token'&&first.type==='punct'&&second.type==='punct'&&first.sourceSha256===second.sourceSha256&&first.span.end===second.span.start&&(word(first)==='>'&&word(second)==='>'||word(first)==='.'&&word(second)==='.')){result.push({...first,text:word(first)+word(second),span:{start:first.span.start,end:second.span.end},originalPunctuation:[first,second]});at++;}else result.push(first);
  }
  return result;
}
class ControlParser {
  constructor(nodes,budget,depth=0,expanded=false){if(depth>64)throw new TypeError('Source control depth exceeds its finite bound');this.expanded=expanded;this.nodes=expressionTokens(expanded?nodes.map(transparent):nodes);this.at=0;this.budget=budget;this.depth=depth;this.records=true;}
  current(){return this.nodes[this.at];}
  take(value){if(word(this.current())===value){this.at++;return true;}return false;}
  need(value){if(!this.take(value))throw new TypeError('Source control requires original '+value);}
  group(delimiter){const node=this.nodes[this.at++];if(node?.kind!=='group'||node.delimiter!==delimiter)throw new TypeError('Source control requires original '+delimiter+' group');return node;}
  child(nodes){return new ControlParser(nodes,this.budget,this.depth+1,this.expanded);}
  location(nodes){return this.expanded?expandedLocation(nodes):{sourceSpan:range(nodes)};}
  groupLocation(group){return this.expanded?expandedLocation([group]):{sourceSpan:group.span};}
  blockGroup(group=this.group('{')){return {...this.child(group.children).block(),...this.groupLocation(group)};}
  node(kind,start,fields={}){if(--this.budget.cells<0)throw new TypeError('Source control cell bound exhausted');return {kind,...fields,...this.location(this.nodes.slice(start,this.at))};}
  expressionAll(nodes){const parser=this.child(nodes),result=parser.expression();if(parser.at!==parser.nodes.length)throw new TypeError('Source control expression leaves original tokens at '+(parser.current()?.span??parser.current()?.sourceSyntax?.span)?.start+' ('+String(word(parser.current())).slice(0,64)+')');return result;}
  condition(){const before=this.records;this.records=false;try{return this.expression();}finally{this.records=before;}}
  genericArguments(){
    this.need('::');this.need('<');const arguments_=[];let begin=this.at,depth=1;
    const append=end=>{const tokens=this.nodes.slice(begin,end);if(!tokens.length||arguments_.length>=64)throw new TypeError('Source control generic argument list is empty or exceeds its finite bound');arguments_.push({kind:'original-generic-argument-obligation',tokens,...this.location(tokens),typeOwnerResolved:false,constEffectsVerified:false});};
    for(;this.at<this.nodes.length;this.at++){
      const node=this.current();
      // expressionTokens rejoins original adjacent > punctuators for shifts.
      // A turbofish consumes their exact original TT boundaries instead.
      if(word(node)==='>>'&&node.originalPunctuation?.length===2){this.nodes.splice(this.at,1,...node.originalPunctuation);}
      // The structural lexer also fuses the JavaScript-only >>> spelling.
      // Project its exact three source characters only in this generic
      // obligation, retaining the entire original compound token as backing.
      else if(word(node)==='>>>'&&node.kind==='token'&&node.type==='punct'){this.nodes.splice(this.at,1,...[0,1,2].map(offset=>({...node,text:'>',span:{start:node.span.start+offset,end:node.span.start+offset+1},originalCompoundToken:node})));}
      const token=word(this.current());
      if(token==='<'){if(++depth>64)throw new TypeError('Source control generic nesting exceeds its finite bound');}
      else if(token==='>'){if(!--depth){if(this.at>begin)append(this.at);else if(!arguments_.length||word(this.nodes[this.at-1])!==',')throw new TypeError('Source control generic argument list is empty');this.at++;return arguments_;}}
      else if(token===','&&depth===1){append(this.at);begin=this.at+1;}
      else if([';','=>','=','+=','-=','*=','/='].includes(token))throw new TypeError('Source control generic argument requires separately proved original grammar');
    }
    throw new TypeError('Source control generic arguments lack their original closing delimiter');
  }
  pattern(nodes){if(!nodes.length)throw new TypeError('Source control pattern is empty');return {kind:'original-pattern-obligation',tokens:nodes,...this.location(nodes),bindingSemanticsVerified:false,constructorOwnerResolved:false};}
  conditional(start){if(++this.budget.conditionals>64){this.budget.conditionals--;throw new TypeError('Source control conditional depth exceeds its finite bound');}
    try{const condition=this.condition(),then=this.blockGroup();let otherwise=null;
      if(this.take('else'))otherwise=this.take('if')?this.conditional(this.at-1):this.blockGroup();
      return this.node('if',start,{condition,then,otherwise,branchBindingVerified:false});
    }finally{this.budget.conditionals--;}
  }
  matching(start){const subject=this.condition(),group=this.group('{'),arms=[];
    const parser=this.child(group.children);
    while(parser.at<parser.nodes.length){
      const begin=parser.at;let arrow=begin;
      while(arrow<parser.nodes.length&&word(parser.nodes[arrow])!=='=>')arrow++;
      if(arrow===begin||arrow===parser.nodes.length)throw new TypeError('Source match arm lacks its original pattern/arrow');
      const pattern=parser.nodes.slice(begin,arrow),guardAt=pattern.findIndex(token=>word(token)==='if');parser.at=arrow+1;
      const value=parser.expression(),end=parser.at;
      if(!parser.take(',')&&parser.at<parser.nodes.length&&!['block-expression','if','match'].includes(value.kind))throw new TypeError('Source match arm requires its original comma');
      arms.push({pattern:this.pattern(guardAt<0?pattern:pattern.slice(0,guardAt)),guard:guardAt<0?null:this.expressionAll(pattern.slice(guardAt+1)),value,...parser.location(parser.nodes.slice(begin,end))});
    }
    if(!arms.length)throw new TypeError('Source control match has no original arms');return this.node('match',start,{subject,arms,armBindingVerified:false,exhaustivenessVerified:false});
  }
  expression(minimum=0){if(++this.budget.expressions>64){this.budget.expressions--;throw new TypeError('Source control expression depth exceeds its finite bound');}
    try{const start=this.at;let value=this.primary();
      for(;;){const operation=word(this.current()),level=precedence[operation];if(level===undefined||level<minimum)break;
        if(comparison(operation)&&value.kind==='binary'&&comparison(value.operation))throw new TypeError('Source control comparisons require original parentheses rather than a comparison chain');
        const operatorToken=this.nodes[this.at++],right=this.expression(level+1),lazy=operation==='&&'||operation==='||';
        value=this.node('binary',start,{operation,operatorToken,left:value,right,operatorOwnerResolved:false,evaluationOrderVerified:false,...(lazy?{rightEvaluation:operation==='&&'?'conditional-on-left-true':'conditional-on-left-false',shortCircuitSemanticsVerified:false}:{})});
      }
      return value;
    }finally{this.budget.expressions--;}
  }
  primary(){const start=this.at,node=this.nodes[this.at++],raw=word(node);let value;
    if(['unsafe','async','move','yield','await','const','ref'].includes(raw))throw new TypeError('Source control modifier requires additional source grammar: '+raw);
    if(raw==='if')value=this.conditional(start);
    else if(raw==='match')value=this.matching(start);
    else if(raw==='while'){const condition=this.condition(),body=this.blockGroup();value=this.node('while',start,{condition,body,terminationVerified:false});}
    else if(raw==='loop')value=this.node('loop',start,{body:this.blockGroup(),terminationVerified:false});
    else if(raw==='for'){const beginning=this.at;while(this.at<this.nodes.length&&word(this.current())!=='in')this.at++;const pattern=this.pattern(this.nodes.slice(beginning,this.at));this.need('in');const iterable=this.condition(),body=this.blockGroup();value=this.node('for',start,{pattern,iterable,body,iteratorOwnerResolved:false});}
    else if(raw==='let'){const beginning=this.at;while(this.at<this.nodes.length&&word(this.current())!=='=')this.at++;const pattern=this.pattern(this.nodes.slice(beginning,this.at));this.need('=');value=this.node('condition-let',start,{pattern,value:this.expression(3),chainBindingVerified:false});}
    else if(['return','break','continue'].includes(raw)){const empty=this.at===this.nodes.length||[',',';'].includes(word(this.current()));
      if(raw==='continue'&&!empty)throw new TypeError('Source control continue labels/values require additional original grammar');
      value=this.node(raw,start,{value:empty?null:this.expression(),exitScopeVerified:false});
    }
    else if(['!','-','*','&'].includes(raw)){const mutable=raw==='&'&&this.take('mut');value=this.node('unary',start,{operation:raw,mutable,value:this.expression(10),operatorOwnerResolved:false});}
    else if(raw==='|'||raw==='||'){const beginning=this.at;if(raw==='|'){while(this.at<this.nodes.length&&word(this.current())!=='|')this.at++;this.need('|');}const parameters=raw==='||'?[]:this.nodes.slice(beginning,this.at-1);value=this.node('closure',start,{parameterTokens:parameters,body:this.expression(),captureSemanticsVerified:false});}
    else if(node?.kind==='group'&&node.delimiter==='{')value=this.node('block-expression',start,{body:this.blockGroup(node)});
    else if(node?.kind==='group'&&node.delimiter==='('){const parts=split(this.expanded?node.children.map(transparent):node.children),trailingComma=word(node.children.at(-1))===',';value=parts.length===1&&!trailingComma?this.node('parenthesized',start,{value:this.expressionAll(parts[0])}):this.node('tuple',start,{items:parts.map(part=>this.expressionAll(part)),trailingComma});}
    else if(node?.kind==='group'&&node.delimiter==='[')value=this.node('array',start,{items:split(node.children).map(part=>this.expressionAll(part)),allocationVerified:false});
    else if(raw==='true'||raw==='false'||['string','char','number'].includes(node?.type))value=this.node('literal',start,{sourceLiteralKind:raw==='true'||raw==='false'?'bool':node.type,raw,sourceLiteral:node});
    else if(name(node)||node?.kind==='owner'){const path=node.kind==='owner'?[...node.target]:[raw];while(word(this.current())==='::'&&word(this.nodes[this.at+1])!=='<'){this.at++;if(!name(this.current()))throw new TypeError('Source control qualified type arguments require additional source grammar');path.push(word(this.nodes[this.at++]));}
      value=this.node('written-path',start,{path,ownerResolved:false,...(node.kind==='owner'?{definitionSiteOwner:node}:{})});
      if(this.take('!')){const arguments_=this.nodes[this.at++];if(arguments_?.kind!=='group')throw new TypeError('Source macro requires its original delimiter');value=this.node('opaque-macro',start,{path,arguments:arguments_,macroOwnerResolved:false,expansionVerified:false});}
      else if(this.records&&this.current()?.delimiter==='{'){const group=this.group('{'),parts=split(expressionTokens(this.expanded?group.children.map(transparent):group.children)),fields=parts.map((tokens,index)=>{
        if(tokens.length===1&&name(tokens[0]))return {kind:'shorthand',name:word(tokens[0]),tokens};
        if(name(tokens[0])&&word(tokens[1])===':')return {kind:'field',name:word(tokens[0]),value:this.expressionAll(tokens.slice(2)),tokens};
        if(word(tokens[0])==='..'){if(index!==parts.length-1||tokens.length===1)throw new TypeError('Source record update requires its one final original base');return {kind:'update',value:this.expressionAll(tokens.slice(1)),tokens,...this.location(tokens),baseLayoutOwnerResolved:false,moveSemanticsVerified:false};}
        throw new TypeError('Source record field/update/attribute requires additional source grammar');
      });value=this.node('record',start,{path,fields,layoutOwnerResolved:false});}
    }else throw new TypeError('Source control prefix requires additional source grammar: '+String(raw));
    for(;;){
      if(word(this.current())==='::'&&word(this.nodes[this.at+1])==='<')value=this.node('generic-application',start,{callee:value,arguments:this.genericArguments(),genericOwnerResolved:false,typeArgumentsChecked:false});
      else if(this.current()?.delimiter==='('){const group=this.group('(');value=this.node('call',start,{callee:value,arguments:split(this.expanded?group.children.map(transparent):group.children).map(tokens=>this.expressionAll(tokens)),calleeOwnerResolved:false});}
      else if(this.current()?.delimiter==='['){const group=this.group('[');value=this.node('index',start,{object:value,index:this.expressionAll(group.children),indexContractVerified:false});}
      else if(this.take('.')){const field=this.nodes[this.at++];if(!name(field)&&!/^[0-9]+$/u.test(word(field)??''))throw new TypeError('Source control member requires an original field identifier');value=this.node('field',start,{object:value,name:word(field),fieldOwnerResolved:false});}
      else if(this.take('?'))value=this.node('try',start,{value,residualOwnerResolved:false,exitScopeVerified:false});
      else break;
    }
    return value;
  }
  block(){const statements=[];let tail=null;
    while(this.at<this.nodes.length){const start=this.at;
      if(this.take('let')){
        const beginning=this.at;while(this.at<this.nodes.length&&!['=',';'].includes(word(this.current())))this.at++;
        const pattern=this.pattern(this.nodes.slice(beginning,this.at));this.need('=');const initializer=this.expression();let otherwise=null;
        if(this.take('else'))otherwise=this.blockGroup();this.need(';');statements.push(this.node('let',start,{pattern,initializer,otherwise,initializerBeforeBinding:true,bindingSemanticsVerified:false,divergenceVerified:false}));continue;
      }
      const value=this.expression();
      if(['=','+=','-=','*=','/=','%=','|=','&=','^='].includes(word(this.current()))){const operation=word(this.nodes[this.at++]),right=this.expression();this.need(';');statements.push(this.node('assign',start,{target:value,operation,value:right,placeOwnerResolved:false,evaluationOrderVerified:false}));}
      else if(this.take(';'))statements.push(this.node('expression-statement',start,{value}));
      else if(this.at===this.nodes.length){tail=value;break;}
      else if(['if','match','while','for','loop','block-expression'].includes(value.kind))statements.push(this.node('expression-statement',start,{value}));
      else throw new TypeError('Source control expression is not followed by its original statement delimiter');
    }
    return {kind:'control-block',statements,tail,lexicalScopeVerified:false};
  }
}
function projectBody(bodyTree,expanded=false) {
  const budget={cells:32000,expressions:0,conditionals:0};let ir=null,diagnostics=[];
  try{ir={...new ControlParser(bodyTree.children,budget,0,expanded).block(),...(expanded?expandedLocation([bodyTree]):{sourceSpan:bodyTree.span})};}
  catch(error){if(!(error instanceof TypeError))throw error;diagnostics=[{code:'ERR_BUILTIN_SOURCE_CONTROL_UNSUPPORTED',reason:error.message,...(expanded?expandedLocation([bodyTree]):{sourceSpan:bodyTree.span})}];}
  return {ir,diagnostics};
}
function issue(value,privateFacts) {
  const text=JSON.stringify(copyMetadata(value)),reparsed=JSON.parse(text);
  if(metadataDigest(value)!==metadataDigest(reparsed))throw new TypeError('Original source control metadata roundtrip changed');
  const result=freezeMacroTree({...reparsed,privateMetaRoundtrip:true,checkedMetaSha256:hash(text)});states.set(result,Object.freeze(privateFacts));return result;
}
export function compileSymbolicControlSyntax(source) {
  const trees=originalMacroTrees(source);if(trees.length!==1||trees[0].delimiter!=='{')throw new TypeError('Source control input must be one complete original body');
  const body=trees[0],projected=projectBody(body);
  return issue({schema:'original-symbolic-control-syntax-v1',sourceSha256:hash(source),source,bodyTree:body,...projected,controlSyntaxProjected:projected.ir!==null,pinnedCompilerFunctionVerified:false,...flags},{inputKind:'caller-source-syntax',source});
}
export function compileBuiltinSourceControl(dataflow) {
  if(!isFormatCallbackDataflow(dataflow))throw new TypeError('Builtin source control requires a private pinned original compiler function');
  const {function:fn,bodyTree}=dataflow;
  if(bodyTree.sourceSha256!==fn.bodySha256||bodyTree.span.start!==fn.bodySpan.start||bodyTree.span.end!==fn.bodySpan.end)throw new TypeError('Builtin source control body differs from its original function');
  const projected=projectBody(bodyTree);
  return issue({schema:'original-builtin-source-control-v1',sourcePath:dataflow.sourcePath,sourceSha256:dataflow.sourceSha256,function:{name:fn.name,span:fn.span,sha256:fn.sha256,signatureTokens:fn.signatureTokens,bodySpan:fn.bodySpan,bodySha256:fn.bodySha256},enclosingOriginalItem:dataflow.enclosingOriginalItem,bodyTree,...projected,controlSyntaxProjected:projected.ir!==null,pinnedCompilerFunctionVerified:true,...flags},{inputKind:'pinned-source-function',dataflow});
}
export const isBuiltinSourceControl=value=>!!value&&states.has(value)&&value.schema==='original-builtin-source-control-v1';
export function builtinSourceControlFacts(value) {
  const facts=states.get(value);if(!facts)throw new TypeError('Original source control is copied, unsealed or caller fabricated');return facts;
}

// Exact privately expanded TT enters directly: no rendered/reparsed Rust source
// and no contiguous span over mixed macro-definition/invocation coordinates.
export function compileExpandedControlSyntax(expansion,bodyPath){
  const lineage=declarativeExpansionLineage(expansion);
  if(!Array.isArray(bodyPath)||bodyPath.length>64||bodyPath.some(index=>!Number.isSafeInteger(index)||index<0))throw new TypeError('Expanded control requires an exact bounded body path');
  let trees=expansion.trees,body;for(const index of bodyPath){body=trees[index];if(body?.kind!=='group')throw new TypeError('Expanded control body path must retain genuine group boundaries');trees=body.children;}
  if(!body||body.delimiter!=='{')throw new TypeError('Expanded control requires a complete genuine body group');
  const projected=projectBody(body,true);return issue({schema:'original-expanded-symbolic-control-v1',expansionDigest:expansion.digest,definitionDigest:lineage.definition.digest,bodyPath:[...bodyPath],spanDomain:'mixed exact original definition and invocation ranges',bodyTree:body,...projected,controlSyntaxProjected:projected.ir!==null,pinnedCompilerFunctionVerified:false,...flags},{inputKind:'private-expanded-source-syntax',expansion,bodyPath:[...bodyPath],body,lineage});
}

// The entire expansion must be one expression. Unlike a selected body path,
// this entry cannot omit output items surrounding a convenient nested block.
export function compileExpandedControlExpression(expansion){
  const lineage=declarativeExpansionLineage(expansion),budget={cells:32000,expressions:0,conditionals:0};
  let ir=null,diagnostics=[];
  try{const parser=new ControlParser(expansion.trees,budget,0,true);ir=parser.expressionAll(parser.nodes);}
  catch(error){if(!(error instanceof TypeError))throw error;diagnostics=[{code:'ERR_BUILTIN_SOURCE_CONTROL_UNSUPPORTED',reason:error.message,...expandedLocation(expansion.trees)}];}
  return issue({schema:'original-expanded-control-expression-v1',expansionDigest:expansion.digest,definitionDigest:lineage.definition.digest,spanDomain:'mixed exact original definition and invocation ranges',trees:expansion.trees,ir,diagnostics,controlSyntaxProjected:ir!==null,pinnedCompilerFunctionVerified:false,...flags},{inputKind:'private-expanded-source-expression',expansion,lineage});
}
