// Source preprocessing only. The original compiler independently checks the
// reconstructed Rust; lexical expansion issues no type or namespace permit.
import {createHash} from 'node:crypto';
import {createLocalDeclarativeMacroEngine} from './local-declarative-macro-engine.mjs';
import {originalMacroLiteralGrammar} from './macro-literal-source.mjs';
import {originalMacroTrees,originalTopLevelMacroInvocations} from './macro-token-trees.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from './source-module-views.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const need=(value,message)=>{if(!value)throw new TypeError('Local declarative source: '+message);};
const inertTerms=new Set(['fn','struct','enum','union','impl','trait','mod','use','type','const','static']);
const documentation=source=>/\/\/[!\/]|\/\*[*!]/u.test(source);
const attributes=item=>item.tokens.find(token=>token.type!=='comment')?.text==='#';
const innerAttribute=item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!';
const span=item=>({start:item.start,end:item.end});
function rootKind(item){
 const tokens=item.tokens.filter(token=>token.type!=='comment');let at=0;
 if(tokens[at]?.text==='pub'){at++;if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(depth&&at<tokens.length);if(depth)return null;}}
 while(['unsafe','async'].includes(tokens[at]?.text))at++;
 if(tokens[at]?.text==='extern'){at++;if(tokens[at]?.type==='string')at++;}
 if(tokens[at]?.text==='const'&&tokens[at+1]?.text==='fn')at++;
 return tokens[at]?.text;
}

export function proposeLocalDeclarativeSource({source,sourcePath,compilationProfile=null}={}){
 need(typeof source==='string'&&Buffer.byteLength(source)<=8388608&&!/\p{Surrogate}/u.test(source),'bounded complete well-formed original Rust required');
 let before,items,engine,edits=[],definitions=[],refusals=[],after,rootCalls=0,renderedBytes=0,renderedCells=0;
 const refuse=(item,kind,message)=>refusals.push({kind,span:span(item),source:before.slice(item.start,item.end),message,sourceAuthority:false,semanticAuthority:false});
 const result=createRulePipeline([
  {phase:'language',rules:[
   {id:'local-declarative:serialize-and-reparse-complete-original-cst',apply:()=>{
    const concrete=transportConcreteSourceEquations([{before:source,after:source,language:'Rust'}])[0];need(concrete.inverse===source,'complete original CST inverse differs');before=source;
    const captured=captureSourceModuleViews({source:before,sourcePath,compilationProfile});items=originalModuleViewItems(captured.views[0],before);
    return captured;
   }},
   {id:'local-declarative:select-actual-prior-textual-definitions-and-private-inputs',apply:()=>{
    // An inner attribute may rewrite the whole crate. No spelling is presumed
    // inert, and a textual definition cannot discharge that enclosing effect.
    if(items.some(innerAttribute)){for(const item of items)refuse(item,'enclosing-attribute','Whole-crate attributes need an independent owner/effect rule');return [];}
    const visible=new Map();let previous=0;
    for(const item of items){
     const fragment=before.slice(item.start,item.end),hasDocumentation=documentation(before.slice(previous,item.start)),kind=rootKind(item);previous=item.end;
     if(['macro_rules!','macro_rules','macro'].includes(kind)){
      try{
       need(!hasDocumentation&&!attributes(item),'Macro declaration attributes remain unresolved');
       const trees=originalMacroTrees(fragment),name=trees[2]?.text;need(trees[0]?.text==='macro_rules'&&trees[1]?.text==='!'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''),'plain original macro_rules declaration required');
       engine??=createLocalDeclarativeMacroEngine(null,originalMacroLiteralGrammar());const definition=engine.compileDeclarativeMacro(fragment,{name,owner:['crate']}),header=engine.declarativeDefinitionHeader(definition);
       need(header.kind==='macro_rules'&&header.visibility===null&&header.attributes.length===0&&header.span.start===trees[0].span.start,'complete plain original macro declaration header required');
       need(header.span.end===trees.at(-1)?.span.end||trees.at(-1)?.text===';'&&header.span.end===trees.at(-2)?.span.end,'unresolved source outside the macro declaration');
       visible.set(name,definition);definitions.push({name,span:span(item),source:fragment,sourceSha256:hash(fragment),definition,header,ownerVerified:false,semanticAuthority:false});
      }catch(error){if(!(error instanceof TypeError))throw error;visible.clear();refuse(item,'definition',error.message);}
      continue;
     }
     if(attributes(item)||hasDocumentation){visible.clear();refuse(item,'attribute-producer','An unresolved attributed source item can change later textual bindings');continue;}
     // A plain ordinary item does not introduce an enclosing textual macro.
     // Its body and inline modules remain intact and receive no local expansion.
     if(inertTerms.has(kind))continue;
     if(fragment.trim()===';')continue;
     try{
      const invocations=originalTopLevelMacroInvocations(fragment);need(invocations.length===1,'one complete original root invocation required');const invocation=invocations[0];
      need(invocation.path.length===1&&fragment.slice(0,invocation.sourceSpan.start).trim()===''&&['',';'].includes(fragment.slice(invocation.sourceSpan.end).trim()),'plain unqualified root invocation required');
      const definition=visible.get(invocation.path[0]);need(definition,'no preceding unambiguous original textual definition');
      need(++rootCalls<=128,'whole-file root expansion count budget');const proof=engine.expandDeclarativeMacro(definition,invocation.trees);engine.declarativeExpansionOriginalInput(proof,invocation.trees);
      const rendered=engine.renderLocalDeclarativeExpansion(proof,name=>visible.get(name)??null);
      renderedBytes+=rendered.renderedRawBytes;renderedCells+=rendered.renderCells;need(renderedBytes<=8388608&&renderedCells<=200000,'whole-file rendered raw-source and tree-cell budgets');
      // Resolve generated items while still inside the same source transaction.
      // All original definitions stay in place for unexpanded ordinary bodies.
      const replacement=fragment.slice(0,invocation.sourceSpan.start)+rendered.source+fragment.slice(invocation.sourceSpan.end);
      edits.push({span:span(item),before:fragment,after:replacement,name:invocation.path[0],definitionDigest:definition.digest,originalInput:invocation,expansion:rendered,sourceAuthority:false,semanticAuthority:false});
     }catch(error){if(!(error instanceof TypeError))throw error;visible.clear();refuse(item,'invocation',error.message);}
    }
    return edits;
   }},
   {id:'local-declarative:substitute-only-complete-actual-root-call-spans',apply:()=>{
    after=before;let end=0;for(const edit of edits){need(edit.span.start>=end&&before.slice(edit.span.start,edit.span.end)===edit.before,'overlapping or stale original invocation');end=edit.span.end;}
    for(const edit of [...edits].reverse())after=after.slice(0,edit.span.start)+edit.after+after.slice(edit.span.end);need(Buffer.byteLength(after)<=8388608,'complete expanded source byte budget');return after;
   }},
  ]},
  {phase:'repository',rules:[{id:'router:retain-complete-original-expanded-cst-and-refusals',apply:()=>{
   const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];need(history.inverse===source,'complete expansion source inverse differs');
   return {schema:'local-declarative-source-proposal-v1',sourcePath,before,after,history,definitions,edits,refusals,status:refusals.length?'partial-source-proposal':'source-proposal',scope:'plain-root-textual-macro_rules-with-disjoint-identifier-hygiene',sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false,receivingExecuted:false};
  }}]},
 ]).run(null);return {...result.value,ruleTrace:result.trace};
}
