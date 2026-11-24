// Source-linked callback arguments into actual builder result meta. This is a
// partial generator program, not handwritten trait output or runtime behavior.
import {createHash} from 'node:crypto';
import {sealBuiltinSourceMeta} from './builtin-source-meta.mjs';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule} from './derive-footprints.mjs';
import {planBuiltinDeriveBangOutput} from './builtin-derive-bang-footprints.mjs';
import {boundedInput} from './serde-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,originalAstDefinition,astStructLiteral} from './builtin-derive-ast-meta.mjs';
import {createBuiltinAstBuilderMetaCompiler,inventoryBuiltinAstCallbackCalls,builtinAstFunctionSourceParameters} from './builtin-ast-builder-meta.mjs';
import {createBuiltinAstCallerEnvironments,assertBuiltinAstCallerEnvironments,splitBuiltinCallerSyntax} from './builtin-ast-caller-environments.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const bridges=new WeakMap();
const ident=node=>node?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(node.text);
const span=nodes=>({start:nodes[0].span.start,end:nodes.at(-1).span.end});
const schemaReference=value=>({source:value.source,sourceSha256:value.sourceSha256,span:value.span,sha256:value.sha256,digest:value.digest,syntaxSha256:value.syntaxSha256});
class PayloadBudgetError extends TypeError {}
export function createBuiltinDeriveAstCallbackBridge({context,certificate,invocation}={}){
  // The original output plan freezes its metadata; snapshot caller input before
  // that boundary so freshness assertions still compare against a stable value.
  if(invocation)invocation=freeze(JSON.parse(JSON.stringify(invocation)));
  const plan=planBuiltinDeriveBangOutput({context,certificate,invocation});
  const original=deriveFootprintOriginalContext(context,certificate),module=deriveFootprintOriginalModule(context,certificate);
  const text=module.source.slice(certificate.span.start,certificate.span.end);
  if(hash(text)!==certificate.itemSha256)throw new TypeError('Callback bridge original declaration bytes changed');
  const input=boundedInput(certificate,text,null),profile=builtinDeriveAstSourceProfile(original.dependencies),compiler=createBuiltinAstBuilderMetaCompiler(profile);
  if(!plan.callbackRecipes.length)throw new TypeError('Original selected output has no callback construction program');
  const diagnostics=[],callbacks=[],recipes=new Map();let nodes=0;
  function budget(depth){if(++nodes>16000||depth>64)throw new PayloadBudgetError('Callback payload node/depth budget exceeded');}
  function callerSource(fragment,syntax){return {source:fragment.source,sourceSha256:fragment.sourceSha256,span:span(syntax),syntax};}
  function argument(fragment,syntax,frame,bindings,depth=0){
    budget(depth);if(!syntax.length)throw new TypeError('Caller payload cannot replace a missing argument');
    const source=callerSource(fragment,syntax);
    if(syntax.length===1&&ident(syntax[0])){
      const binding=bindings.get(syntax[0].text);
      return binding?{tag:'caller-bound-source-slot',bindingId:binding.id,typeSyntax:binding.typeSyntax,...source}:{tag:'unproved-caller-name',name:syntax[0].text,...source};
    }
    if(syntax.length===1&&['number','string','char'].includes(syntax[0].type))return {tag:'caller-literal-token',type:syntax[0].type,spelling:syntax[0].text,...source};
    if(syntax[0].text==='&')return {tag:'caller-reference-syntax',value:argument(fragment,syntax.slice(1),frame,bindings,depth+1),...source};
    const group=syntax.at(-1);
    if(group.kind==='group'&&group.delimiter==='('&&syntax.length>=4&&syntax.at(-3)?.text==='.'&&ident(syntax.at(-2))){
      const receiverSyntax=syntax.slice(0,-3),method=syntax.at(-2).text,args=splitBuiltinCallerSyntax(group.children).map(value=>argument(fragment,value,frame,bindings,depth+1));
      const receiver=receiverSyntax.length===1?bindings.get(receiverSyntax[0].text):null;
      if(receiver?.receiverOwner){
        try{return bind(compiler.compile(method),args,{tag:'caller-context-slot',bindingId:receiver.id,owner:receiver.receiverOwner,...callerSource(fragment,receiverSyntax)},[],depth+1);}
        catch(error){if(error instanceof PayloadBudgetError||/budget exceeded/u.test(String(error.message)))throw error;diagnostics.push({kind:'nested-source-builder',source:source.source,span:source.span,reason:String(error.message)});}
      }
      return {tag:'unproved-caller-method',method,receiver:argument(fragment,receiverSyntax,frame,bindings,depth+1),args,...source};
    }
    if(syntax.length>=3&&syntax.at(-2).text==='.'&&ident(syntax.at(-1)))return {tag:'caller-source-projection',object:argument(fragment,syntax.slice(0,-2),frame,bindings,depth+1),member:syntax.at(-1).text,...source};
    return {tag:'unproved-caller-expression',...source};
  }
  function bind(contract,args,receiver,stack,depth){
    budget(depth);compiler.assert(contract);
    if(stack.includes(contract.digest))return {tag:'unproved-builder-cycle',contractDigest:contract.digest};
    recipes.set(contract.digest,contract);
    const parameters=contract.parameters.filter(value=>!value.receiver);
    if(parameters.length!==args.length)throw new TypeError('Actual caller argument count differs from its source builder');
    const values=new Map(parameters.map((value,index)=>[value.name,args[index]]));
    if(contract.parameters.some(value=>value.receiver)){if(!receiver)throw new TypeError('Actual source builder receiver slot is missing');values.set('self',receiver);}
    const path=[...stack,contract.digest];
    function project(node,level){
      budget(level);
      const origin={source:node.source,sourceSha256:node.sourceSha256,span:node.span};
      switch(node.tag){
        case 'bound-source-slot':{
          const value=node.binding.kind==='local'?project(node.binding.value,level+1):values.get(node.name);
          if(!value)throw new TypeError('Actual builder source parameter remains unbound: '+node.name);
          return {tag:'builder-slot-substitution',sourceBinding:node.binding,argument:value,...origin};
        }
        case 'bound-source-projection':return {tag:'builder-source-projection',object:project(node.object,level+1),member:node.member,...origin};
        case 'source-parentheses':return {tag:'builder-parentheses',value:project(node.value,level+1),...origin};
        case 'positive-ast-enum-constructor':return {tag:'source-built-ast-enum',owner:node.owner,variant:node.variant,schema:node.variantSchema,args:node.args.map(value=>project(value,level+1)),...origin};
        case 'positive-ast-struct-constructor':return {tag:'source-built-ast-record',owner:node.owner,definitionDigest:node.definitionDigest,fields:node.fields.map(value=>({name:value.name,schema:value.fieldSchema,value:project(value.value,level+1)})),...origin};
        case 'original-builder-call':{
          const next=compiler.compileOriginal(contract.recipe.source,node.method);
          return bind(next,node.args.map(value=>project(value,level+1)),values.get('self'),path,level+1);
        }
        case 'unresolved-source-call':{
          const actualArgs=node.args.map(value=>project(value,level+1));
          // A real imported Rust module function can be followed into another
          // pinned original member. No result/name-based output classification.
          const target=node.import?[...node.import.target,...node.path.slice(1)]:null;
          if(target?.[0]?.startsWith('rustc_')&&target.length>2){
            const member='compiler/'+target[0]+'/src/'+target.slice(1,-1).join('/')+'.rs';
            try{return bind(compiler.compileOriginal(member,target.at(-1)),actualArgs,null,path,level+1);}
            catch(error){if(error instanceof PayloadBudgetError||/budget exceeded/u.test(String(error.message)))throw error;diagnostics.push({kind:'transitive-source-function',source:node.source,span:node.span,target,reason:String(error.message)});}
          }
          return {tag:'unproved-source-call',path:node.path,import:node.import,args:actualArgs,...origin};
        }
        default:return {tag:'unproved-builder-value',original:node,...origin};
      }
    }
    let result;
    try{result=project(contract.result,depth+1);}catch(error){if(error instanceof PayloadBudgetError||/budget exceeded/u.test(String(error.message)))throw error;diagnostics.push({kind:'builder-result',source:contract.recipe.source,span:contract.recipe.span,reason:String(error.message)});result={tag:'unproved-builder-result',contractDigest:contract.digest,reason:String(error.message)};}
    return {tag:'source-builder-result',contractDigest:contract.digest,parameterBindings:parameters.map((value,index)=>({parameter:value,argument:args[index]})),receiver,result};
  }
  for(const fragment of plan.callbackRecipes){
    try{
      const inventory=inventoryBuiltinAstCallbackCalls(compiler,fragment),environment=createBuiltinAstCallerEnvironments(compiler,profile,inventory);
      assertBuiltinAstCallerEnvironments(environment,compiler,inventory);
      const declarations=new Map(environment.declarations.map(value=>[value.id,value]));
      const payloads=environment.calls.map(frame=>{
        const receiver=declarations.get(frame.receiverId),bindings=new Map(frame.environment.map(id=>{const value=declarations.get(id);if(!value)throw new TypeError('Caller environment declaration disappeared');return [value.name,value];}));
        const args=frame.argumentsSyntax.map(value=>argument(fragment,value,frame,bindings));
        if(!receiver?.receiverOwner)return {call:frame.call.span,controlPath:frame.controlPath,args,result:{tag:'unproved-caller-receiver',bindingId:frame.receiverId}};
        try{return {call:frame.call.span,controlPath:frame.controlPath,args,result:bind(compiler.compile(frame.call.method),args,{tag:'caller-context-slot',bindingId:receiver.id,owner:receiver.receiverOwner},[],0)};}
        catch(error){if(error instanceof PayloadBudgetError||/budget exceeded/u.test(String(error.message)))throw error;return {call:frame.call.span,controlPath:frame.controlPath,args,result:{tag:'unproved-call-builder',reason:String(error.message)}};}
      });
      callbacks.push({source:fragment.source,span:fragment.span,callbackDigest:fragment.digest,environment,payloads});
    }catch(error){if(error instanceof PayloadBudgetError||/budget exceeded/u.test(String(error.message)))throw error;callbacks.push({source:fragment.source,span:fragment.span,callbackDigest:fragment.digest,unproved:String(error.message)});}
  }
  // Actual generic constructor recipes around the still-open callback bodies.
  // Their fields are retained rather than replaced with handwritten Rust impls.
  const generic='compiler/rustc_builtin_macros/src/deriving/generic/mod.rs';
  const method=originalAstFunction(profile,generic,'create_method'),sink=originalAstFunction(profile,generic,'create_derived_impl');
  const fn=astStructLiteral(profile,method,'Fn'),assoc=astStructLiteral(profile,method,'AssocItem'),impl=astStructLiteral(profile,sink,'Impl');
  const originals=['Fn','Item','Impl'].map(name=>originalAstDefinition(profile,'compiler/rustc_ast/src/ast.rs','struct',name));
  const ast=builtinAstOriginal(profile,'compiler/rustc_ast/src/ast.rs'),aliasText='pub type AssocItem = Item<AssocItemKind>;',aliasAt=ast.source.indexOf(aliasText);
  if(aliasAt<0||ast.source.indexOf(aliasText,aliasAt+1)>=0)throw new TypeError('Original associated item alias is not unique');
  const alias={source:ast.path,sourceSha256:ast.sha256,span:{start:aliasAt,end:aliasAt+aliasText.length},text:aliasText,sha256:hash(aliasText)};
  const methodParameters=builtinAstFunctionSourceParameters(profile,method);
  const evidence={schema:'original-builtin-callback-payload-bridge-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,planDigest:plan.digest,profileDigest:profile.digest,compilationProfile:certificate.compilationProfile,
    originalInput:input,originalEntry:plan.entry,conditionalSourcePlans:plan.conditionalOutputs,callbacks,builderContracts:[...recipes.values()],methodBodyMeta:{sourceConstructor:method,parameters:methodParameters,record:fn,associatedRecord:assoc,associatedAlias:alias,callbackBodyInputs:callbacks.map(value=>value.callbackDigest),bindingStatus:'actual callback-to-BlockOrExpr body/control join remains unproved'},implementationMeta:{sourceConstructor:sink,record:impl,schemas:originals.map(schemaReference),bindingStatus:'actual generic method/associated-list flow remains unproved'},diagnostics,
    selectedOwnerBangComplete:false,generatedImplBehavior:false,allocationPhaseBehavior:false,featureCompleteness:false,
    obligations:['actual caller field expression/loop/pattern domains remain independent requirements','all original conditional outcomes are retained without selecting Copy/fmt configuration','Option/prelude and empty attribute/container owners remain open','method body control joins and implementation lists are not replaced with placeholders']};
  const result=sealBuiltinSourceMeta(evidence);bridges.set(result,{context,certificate,invocation:freeze(JSON.parse(JSON.stringify(invocation)))});return result;
}
export function assertBuiltinDeriveAstCallbackBridge(value,context,certificate,invocation){const state=bridges.get(value);if(!state||state.context!==context||state.certificate!==certificate||JSON.stringify(state.invocation)!==JSON.stringify(invocation))throw new TypeError('Callback bridge requires its original source invocation');return value;}
export const isBuiltinDeriveAstCallbackBridge=value=>!!value&&bridges.has(value);
