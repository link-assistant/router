// Compile the complete original callback, retaining its private source join.
// Syntax projection cannot issue mutation, callback, output or target authority.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {compileSymbolicControlSyntax,compileExpandedControlSyntax,builtinSourceControlFacts} from './builtin-source-control.mjs';
import {requireAsyncTraitEffectPlan,originalAsyncTraitFunction,requireAsyncTraitFunction} from './async-trait-source-effects.mjs';
import {originalAsyncTraitSynGeneratedCallbackEvidence} from './async-trait-output-confinement.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Original async-trait control: '+message);};
export function compileOriginalAsyncTraitControl(plan,selection){
 requireAsyncTraitEffectPlan(plan);const record=originalAsyncTraitFunction(plan,selection);requireAsyncTraitFunction(plan,record);
 const offset=record.bodySpan.start-record.span.start,source=record.original.slice(offset,record.bodySpan.end-record.span.start),control=compileSymbolicControlSyntax(source);
 const result=Object.freeze({schema:'original-async-trait-control-v1',sourceFunction:Object.freeze({package:record.package,path:record.path,sourceSha256:record.sourceSha256,span:record.span,bodySpan:record.bodySpan,sha256:record.sha256}),bodySha256:hash(source),syntaxOffset:record.bodySpan.start,control,fullOriginalCallbackRetained:true,sourceMembershipVerified:true,sourceGrammarProjected:control.controlSyntaxProjected,typedPlacesChecked:false,callbackEffectsClosed:false,outputConfinement:false,headerTargetAuthority:false,namespaceAuthority:false,runtimeParity:false});
 issued.set(result,{plan,record,source,control,digest:metadataDigest(result)});return result;
}
export function originalAsyncTraitControlFacts(result){
 const state=types.isProxy(result)?null:issued.get(result);if(!state)fail('copied, foreign or proxy control');requireAsyncTraitFunction(state.plan,state.record);
 const facts=builtinSourceControlFacts(state.control);if(facts.inputKind!=='caller-source-syntax'||facts.source!==state.source||result.control!==state.control||metadataDigest(result)!==state.digest)fail('complete original callback or control changed');
 return Object.freeze({record:state.record,source:state.source,control:state.control,syntaxOffset:state.record.bodySpan.start});
}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
// A partial control interpretation: source formal-root candidates flow
// through the real IR. Unknown calls, branch alias joins, macros and typing
// remain obligations. Observed places are not a complete may-write summary.
export function interpretOriginalAsyncTraitPlaces(result){
 const facts=originalAsyncTraitControlFacts(result);if(!facts.control.controlSyntaxProjected)fail('complete original callback control is unsupported');
 const writes=[],loans=[],calls=[],obligations=[],trace=[];let remaining=16000;
 const paths=value=>value??[],union=(...values)=>[...new Map(values.flat().map(path=>[JSON.stringify(path),path])).values()];
 const env=new Map(),tokens=facts.record.parameters;let begin=0,depth=0;
 for(let at=0;at<=tokens.length;at++){
  const text=tokens[at]?.text;if(text==='<')depth++;if(text==='>')depth--;
  if(at===tokens.length||text===','&&!depth){const row=tokens.slice(begin,at),colon=row.findIndex(token=>token.text===':'),self=row.some(token=>token.text==='self'),name=self?'self':row[colon>0&&row[0].text==='mut'?1:0]?.text;
   if(row.length){if(!name||!self&&colon<1)fail('original simple formal-root binding remains unsupported');env.set(name,[{root:name,fields:[]}]);}begin=at+1;
  }
 }
 function obligation(kind,node,details={}){obligations.push({kind,sourceSpan:node.sourceSpan??null,...details});}
 function bind(pattern,value,scope){
  // Keep constructor/field/pattern ownership as an explicit obligation. This
  // broad candidate binding over-approximates roots; it does not certify Rust
  // match ergonomics, destructuring, aliasing or lifetime semantics.
  const candidates=[];
  function visit(nodes){for(let at=0;at<nodes.length;at++){const token=nodes[at];if(token.kind==='group'){visit(token.children);continue;}if(token.type==='ident'&&!['mut','ref','_'].includes(token.text)&&nodes[at-1]?.text!=='::'&&nodes[at+1]?.text!=='::'&&nodes[at+1]?.text!==':')candidates.push(token.text);}}
  visit(pattern.tokens);for(const name of candidates)scope.set(name,value);obligation('original-pattern-binding-and-constructor-owner',pattern,{candidates});
 }
 function run(node,scope){
  if(--remaining<0)fail('original abstract place steps exceed the finite bound');trace.push({kind:node.kind,sourceSpan:node.sourceSpan??null});
  const child=value=>run(value,scope),all=()=>union(...scope.values());
  switch(node.kind){
   case 'control-block':{const inner=new Map(scope);for(const statement of node.statements)run(statement,inner);return node.tail?run(node.tail,inner):[];}
   case 'literal':return [];
   case 'written-path':if(node.path.length===1&&scope.has(node.path[0]))return paths(scope.get(node.path[0]));obligation('original-source-name-owner',node,{path:node.path});return [];
   case 'field':return child(node.object).map(path=>({...path,fields:[...path.fields,node.name]}));
   case 'parenthesized':case 'try':case 'expression-statement':return child(node.value);
   case 'return':case 'break':case 'continue':if(node.value)child(node.value);obligation('original-control-exit-scope',node);return [];
   case 'unary':{const value=child(node.value);if(node.operation==='&'){loans.push({sourceSpan:node.sourceSpan,mutable:node.mutable,roots:value,loanSemanticsChecked:false});return value;}if(node.operation==='*'){obligation('original-dereference-type-and-alias',node);return value;}return value;}
   case 'let':{const value=child(node.initializer);bind(node.pattern,value,scope);if(node.otherwise)run(node.otherwise,new Map(scope));return [];}
   case 'assign':{const target=child(node.target),value=child(node.value);writes.push({sourceSpan:node.sourceSpan,operation:node.operation,targets:target,placeTypesChecked:false});if(node.target.kind==='written-path'&&node.target.path.length===1&&node.operation==='=')scope.set(node.target.path[0],value);return [];}
   case 'binary':{const left=child(node.left),right=child(node.right);obligation('original-operator-domain',node,{operation:node.operation});return union(left,right);}
   case 'if':child(node.condition);obligation('original-conditional-branch-alias-join',node);return union(run(node.then,new Map(scope)),node.otherwise?run(node.otherwise,new Map(scope)):[]);
   case 'condition-let':{const value=child(node.value);bind(node.pattern,value,scope);return value;}
   case 'match':{const subject=child(node.subject),values=[];for(const arm of node.arms){const inner=new Map(scope);bind(arm.pattern,subject,inner);if(arm.guard)run(arm.guard,inner);values.push(run(arm.value,inner));}obligation('original-match-exhaustiveness',node);return union(...values);}
   case 'for':{const iterable=child(node.iterable),inner=new Map(scope),elements=iterable.map(path=>({...path,fields:[...path.fields,'*']}));bind(node.pattern,elements,inner);run(node.body,inner);obligation('original-iterator-and-loop-fixed-point',node);return [];}
   case 'while':child(node.condition);run(node.body,new Map(scope));obligation('original-loop-fixed-point',node);return [];
   case 'loop':run(node.body,new Map(scope));obligation('original-loop-fixed-point',node);return [];
   case 'block-expression':return child(node.body);
   case 'tuple':case 'array':return union(...node.items.map(child));
   case 'record':{const values=node.fields.map(field=>field.kind==='shorthand'?paths(scope.get(field.name)):child(field.value));obligation('original-record-layout-and-field-alias',node,{path:node.path});return union(...values);}
   case 'generic-application':obligation('original-generic-owner-and-arguments',node);return child(node.callee);
   case 'call':{const receiver=child(node.callee),arguments_=node.arguments.map(child),reachable=union(receiver,...arguments_);calls.push({sourceSpan:node.sourceSpan,callee:node.callee,reachableRoots:reachable,calleeEffectsChecked:false});obligation('original-callee-global-return-and-write-effects',node);return reachable;}
   case 'index':{const object=child(node.object);child(node.index);obligation('original-index-type-and-alias',node);return object.map(path=>({...path,fields:[...path.fields,'*']}));}
   case 'opaque-macro':obligation('original-macro-owner-output-and-effects',node,{path:node.path});return all();
   case 'closure':obligation('original-closure-capture-and-call',node);return all();
   default:obligation('original-control-rule',node,{kind:node.kind});return all();
  }
 }
 run(facts.control.ir,env);return freeze({schema:'original-async-trait-abstract-places-v1',sourceFunction:result.sourceFunction,bodySha256:result.bodySha256,syntaxOffset:result.syntaxOffset,trace,writes,loans,calls,obligations,originalSourceControlInterpreted:true,partialPlaceInterpretation:true,completeMayWriteSet:false,typedPlacesChecked:false,callbackEffectsClosed:false,completeOutputConfinement:false,headerTargetAuthority:false,namespaceAuthority:false,runtimeParity:false});
}

const generatedControls=new WeakMap();
export function compileOriginalAsyncTraitGeneratedControl(callback){
 const backing=originalAsyncTraitSynGeneratedCallbackEvidence(callback),control=compileExpandedControlSyntax(backing.expansion,backing.bodyPath);
 const value=freeze({schema:'original-async-trait-generated-control-v1',callbackDigest:callback.digest,schemaDigest:backing.schema.digest,control,originalFunctionDeclaration:false,sourceGrammarProjected:control.controlSyntaxProjected,typedPlacesChecked:false,callbackEffectsClosed:false,completeOutputConfinement:false,headerTargetAuthority:false,namespaceAuthority:false,runtimeParity:false});generatedControls.set(value,{callback,control,digest:metadataDigest(value)});return value;
}
export function originalAsyncTraitGeneratedControlFacts(value){
 const state=types.isProxy(value)?null:generatedControls.get(value);if(!state)fail('copied, foreign or proxy generated control');
 const backing=originalAsyncTraitSynGeneratedCallbackEvidence(state.callback),facts=builtinSourceControlFacts(state.control);if(facts.inputKind!=='private-expanded-source-syntax'||facts.expansion!==backing.expansion||metadataDigest(value)!==state.digest)fail('original generated callback/control lineage changed');return Object.freeze({callback:state.callback,backing,control:state.control});
}
