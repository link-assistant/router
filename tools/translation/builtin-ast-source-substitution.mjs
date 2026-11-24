// Original generator expressions -> lexical meta -> source slot substitution.
// This executes the bounded substitution stage, never the Rust generator, and
// cannot close mutation/control/container/hygiene or trait behavior obligations.
import {createHash} from 'node:crypto';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {builtinAstOriginal,assertOriginalAstFunction,originalAstDefinition,astEnumVariant,astSyntaxText,requireCompilerOutputAstSourceAccess} from './builtin-derive-ast-meta.mjs';
import {createBuiltinAstBuilderMetaCompiler,builtinAstSourceImports,builtinAstFunctionSourceParameters,compilerOutputAstSourceImports,compilerOutputAstSourceParameters} from './builtin-ast-builder-meta.mjs';
import {splitBuiltinCallerSyntax} from './builtin-ast-caller-environments.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const stages=new WeakMap(),programs=new WeakMap(),results=new WeakMap(),applications=new WeakMap();
const limits=Object.freeze({nodes:16000,depth:64,bytes:524288,contracts:128});
const ident=node=>node?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(node.text);
const sourceOf=(fragment,nodes)=>({source:fragment.source,sourceSha256:fragment.sourceSha256,span:{start:nodes[0].span.start,end:nodes.at(-1).span.end},syntax:nodes});
const reference=value=>({source:value.source,sourceSha256:value.sourceSha256,span:value.span,digest:value.digest,syntaxSha256:value.syntaxSha256});
function seal(value){const encoded=JSON.stringify(value);if(Buffer.byteLength(encoded)>limits.bytes)throw new TypeError('Original AST substitution metadata byte budget exceeded');const copy=JSON.parse(encoded);if(JSON.stringify(copy)!==encoded)throw new TypeError('Original AST substitution roundtrip changed');return freeze({...copy,digest:hash(encoded)});}
function fieldsOf(definition){
  const at=definition.syntax.findIndex(value=>value.text==='struct'),body=definition.syntax.slice(at+2).find(value=>value.delimiter==='{');
  if(!body)throw new TypeError('Original source record schema is unavailable');
  return splitBuiltinCallerSyntax(body.children).map(row=>{
    let at=0;while(row[at]?.text==='#'&&row[at+1]?.delimiter==='[')at+=2;
    if(row[at]?.text==='pub'){at++;if(row[at]?.delimiter==='(')at++;}
    if(!ident(row[at])||row[at+1]?.text!==':')throw new TypeError('Original source schema field is unproved');
    return {name:row[at].text,typeSyntax:row.slice(at+2),span:{start:row[0].span.start,end:row.at(-1).span.end}};
  });
}
export function createBuiltinAstSourceSubstitution(profile){
  // Lookup validates the sealed profile before any source expression is used.
  builtinAstOriginal(profile,'compiler/rustc_ast/src/ast.rs');
  const state={profile,compiler:createBuiltinAstBuilderMetaCompiler(profile),cache:new Map()};
  const stage=Object.freeze({compile:fragment=>compile(stage,state,fragment),substitute:program=>substitute(stage,state,program),applyClosure:(caller,callee,callStart)=>applyClosure(stage,state,caller,callee,callStart),assert:value=>assertBuiltinAstSourceSubstitution(value,stage)});
  stages.set(stage,state);return stage;
}
// Opt-in syntax flow only. No existing factory accepts the private access token.
export function createCompilerOutputAstSourceSubstitution(profile,access){
  builtinAstOriginal(profile,'compiler/rustc_ast/src/ast.rs');requireCompilerOutputAstSourceAccess(access,profile);
  const state={profile,access,compiler:createBuiltinAstBuilderMetaCompiler(profile),cache:new Map()};
  const stage=Object.freeze({compile:fragment=>compile(stage,state,fragment),substitute:program=>substitute(stage,state,program),assert:value=>assertCompilerOutputSourceResult(value,stage)});
  stages.set(stage,state);return stage;
}
function assertCompilerOutputSourceResult(value,stage){if(results.get(value)?.stage!==stage||!stages.get(stage)?.access)throw new TypeError('Compiler output substitution requires its original private source stage');return value;}
export function assertBuiltinAstSourceSubstitution(value,stage){if(results.get(value)?.stage!==stage||stages.get(stage)?.access)throw new TypeError('Substitution requires its original private source stage');return value;}
export const isBuiltinAstSourceSubstitution=value=>!!value&&results.has(value)&&!stages.get(results.get(value).stage)?.access;
function compile(stage,state,fragment){
  if(state.access)state.access.assert(fragment);else assertOriginalAstFunction(state.profile,fragment);
  if(fragment.schema!=='original-ast-function-meta-v1')throw new TypeError('Substitution requires original function syntax');
  if(state.cache.has(fragment))return state.cache.get(fragment);
  if(state.cache.size>=limits.contracts)throw new TypeError('Original substitution function budget exceeded');
  const imports=new Map((state.access?compilerOutputAstSourceImports(state.access,fragment.source):builtinAstSourceImports(state.profile,fragment.source)).map(value=>[value.name,value]));
  const parameters=state.access?compilerOutputAstSourceParameters(state.access,fragment):builtinAstFunctionSourceParameters(state.profile,fragment),slots=[],schemas=new Map(),builderContracts=new Map(),obligations=[];let visited=0;
  function count(depth){if(++visited>limits.nodes||depth>limits.depth)throw new TypeError('Original substitution node/depth budget exceeded');}
  function binding(name,syntax,kind,typeSyntax=[],value=null,mutable=false){
    const slot={id:fragment.digest+':'+syntax[0].span.start+':'+slots.length,name,kind,typeSyntax,value,mutable,...sourceOf(fragment,syntax)};
    slots.push(slot);return slot;
  }
  const environment=new Map(parameters.map(param=>[param.name,binding(param.name,param.syntax,'parameter',param.typeSyntax??[],null,param.mutable)]));
  function schema(kind,name,path){const key=path+'::'+kind+'::'+name;if(!schemas.has(key))schemas.set(key,state.access?state.access.definition(path,kind,name):originalAstDefinition(state.profile,path,kind,name));return schemas.get(key);}
  function owner(path){
    const imported=imports.get(path[0]),target=imported?[...imported.target,...path.slice(1)]:null;
    if(target?.[0]==='rustc_ast')return {path:target.slice(1),source:'compiler/rustc_ast/src/ast.rs',import:imported};
    // Unqualified records are resolved positively in the actual original member,
    // then shadowed local values below prevent them becoming constructors.
    if(path.length===1)return {path,source:fragment.source,import:null};
    return null;
  }
  function unknown(kind,nodes,detail={}){const value={tag:'open-source-expression',kind,...detail,...sourceOf(fragment,nodes)};obligations.push({kind,source:value.source,span:value.span});return value;}
  function expression(nodes,env,depth){
    count(depth);if(!nodes.length)throw new TypeError('Source substitution does not manufacture missing expressions');
    const source=sourceOf(fragment,nodes);
    if(state.access&&nodes[0].text==='loop'){
      if(nodes.length!==2||nodes[1].delimiter!=='{')return unknown('source-loop-grammar',nodes);
      obligations.push({kind:'source-loop-control-and-effects',source:fragment.source,span:source.span});
      return {tag:'original-loop-source-control',body:block(nodes[1].children,new Map(env),depth+1,sourceOf(fragment,[nodes[1]])),iterationSemanticsEstablished:false,...source};
    }
    if(state.access&&['break','continue'].includes(nodes[0].text)){
      if(nodes[0].text==='continue'&&nodes.length!==1||nodes[1]?.type==='char')return unknown('source-jump-grammar',nodes);
      obligations.push({kind:'source-jump-target-and-effects',source:fragment.source,span:source.span});
      return {tag:'original-source-jump',operation:nodes[0].text,value:nodes.length>1?expression(nodes.slice(1),env,depth+1):null,targetAndEffectsEstablished:false,...source};
    }
    if(nodes.length===1&&ident(nodes[0])){
      const slot=env.get(nodes[0].text);if(slot)return {tag:'lexical-slot',slotId:slot.id,...source};
      if(['true','false'].includes(nodes[0].text))return {tag:'original-literal',spelling:nodes[0].text,...source};
      return unknown('unbound-source-name',nodes,{name:nodes[0].text});
    }
    if(nodes.length===1&&['number','string','char'].includes(nodes[0].type))return {tag:'original-literal',spelling:nodes[0].text,...source};
    if(nodes.length===1&&nodes[0].kind==='group'){
      if(nodes[0].delimiter==='{')return block(nodes[0].children,new Map(env),depth+1,source);
      if(nodes[0].delimiter==='('){const rows=splitBuiltinCallerSyntax(nodes[0].children);return rows.length===1?{tag:'source-parentheses',value:expression(rows[0],env,depth+1),...source}:unknown('tuple-source-value',nodes);}
      if(state.access&&nodes[0].delimiter==='['){
        const parts=splitBuiltinCallerSyntax(nodes[0].children);
        if(nodes[0].children.some(node=>node.text===';'))return unknown('array-repeat-source-domain',nodes);
        obligations.push({kind:'array-value-type-and-evaluation',source:fragment.source,span:source.span});
        return {tag:'original-array-source-construction',elements:parts.map(row=>expression(row,env,depth+1)),valueDomainEstablished:false,...source};
      }
      return unknown('container-source-value',nodes);
    }
    if(state.access&&nodes[0].text==='if'){
      const body=nodes.findIndex((node,at)=>at>0&&node.delimiter==='{');
      if(body<2||nodes[body+1]?.text!=='else'||nodes[body+2]?.delimiter!=='{'||body+3!==nodes.length)return unknown('source-if-expression-grammar',nodes);
      obligations.push({kind:'source-condition-and-branch-selection',source:fragment.source,span:source.span});
      return {tag:'original-if-expression',condition:expression(nodes.slice(1,body),env,depth+1),thenBody:block(nodes[body].children,new Map(env),depth+1,sourceOf(fragment,[nodes[body]])),elseBody:block(nodes[body+2].children,new Map(env),depth+1,sourceOf(fragment,[nodes[body+2]])),selectionEstablished:false,...source};
    }
    if(nodes[0].text==='&')return {tag:'source-reference',value:expression(nodes.slice(1),env,depth+1),...source};
    if(nodes[0].text==='||')return {tag:'source-closure',parameters:[],capturedSlots:[...env.values()].map(value=>value.id),body:expression(nodes.slice(1),new Map(env),depth+1),...source};
    const firstBar=nodes.findIndex(value=>value.text==='|');
    if(firstBar===0){
      const lastBar=nodes.findIndex((value,at)=>at>0&&value.text==='|');
      if(lastBar<0)return unknown('closure-header',nodes);
      const child=new Map(env),params=[];
      for(const row of splitBuiltinCallerSyntax(nodes.slice(1,lastBar))){
        const colon=row.findIndex(value=>value.text===':'),names=(colon<0?row:row.slice(0,colon)).filter(ident).filter(value=>value.text!=='mut');
        if(row.length===1&&row[0].delimiter==='('){
          const members=splitBuiltinCallerSyntax(row[0].children);
          if(!members.every(value=>value.length===1&&ident(value[0])))return unknown('closure-binding-pattern',nodes);
          for(const member of members){const slot=binding(member[0].text,member,'open-closure-pattern-binding');params.push(slot.id);child.set(slot.name,slot);}
          obligations.push({kind:'closure-pattern-input-domain',source:fragment.source,span:row[0].span});continue;
        }
        const header=colon<0?row:row.slice(0,colon),simpleHeader=header.length===1&&ident(header[0])||header.length===2&&header[0].text==='mut'&&ident(header[1]);
        if(state.access&&colon<0&&header.length===2&&header[0].text==='&'&&ident(header[1])){
          const slot=binding(header[1].text,row,'open-shared-closure-pattern-binding');params.push(slot.id);child.set(slot.name,slot);
          obligations.push({kind:'shared-reference-pattern-copy-and-input-domain',source:fragment.source,span:slot.span});continue;
        }
        if(names.length!==1||!simpleHeader||row.some(value=>value.kind==='group'))return unknown('closure-binding-pattern',nodes);
        const slot=binding(names[0].text,row,'closure-parameter',colon<0?[]:row.slice(colon+1),null,row.some(value=>value.text==='mut'));params.push(slot.id);child.set(slot.name,slot);
      }
      return {tag:'source-closure',parameters:params,capturedSlots:[...env.values()].map(value=>value.id),body:expression(nodes.slice(lastBar+1),child,depth+1),...source};
    }
    const tail=nodes.at(-1);
    if(tail.text==='?')return {tag:'original-source-try',value:expression(nodes.slice(0,-1),env,depth+1),...source,tryOwnerEstablished:false};
    if(tail.delimiter==='('){
      const head=nodes.slice(0,-1),args=splitBuiltinCallerSyntax(tail.children).map(row=>expression(row,env,depth+1));
      if(head.length>=3&&head.at(-2).text==='.'&&ident(head.at(-1))){
        const receiverNodes=head.slice(0,-2),receiver=expression(receiverNodes,env,depth+1),slot=receiverNodes.length===1?env.get(receiverNodes[0].text):null;
        const actualType=astSyntaxText(slot?.typeSyntax??[]).replace(/\s/gu,''),imported=imports.get('ExtCtxt');
        if(slot&&!slot.mutable&&actualType==="&ExtCtxt<'_>"&&imported?.target.join('::')==='rustc_expand::base::ExtCtxt'){
          let contract;
          try{contract=state.compiler.compile(head.at(-1).text);}catch(error){if(/budget exceeded/u.test(String(error.message)))throw error;return unknown('original-builder-recipe',nodes,{receiver,args,reason:String(error.message)});}
          builderContracts.set(contract.digest,contract);
          return {tag:'original-ast-builder-invocation',receiver,args,contractDigest:contract.digest,recipe:reference(contract.recipe),...source};
        }
        return unknown('source-method-call',nodes,{receiver,method:head.at(-1).text,args});
      }
      if(head.every((value,at)=>at%2===0?ident(value):value.text==='::')){
        const path=head.filter(value=>value.text!=='::').map(value=>value.text),resolved=owner(path);
        if(path.length===1&&env.has(path[0]))return unknown('source-callable-slot',nodes,{callee:expression(head,env,depth+1),args});
        if(!env.has(path[0])&&resolved?.path.length===2&&resolved.source==='compiler/rustc_ast/src/ast.rs'){
          let definition;
          try{definition=schema('enum',resolved.path[0],resolved.source);}catch(error){
            if(/budget exceeded/u.test(String(error.message)))throw error;
            // A source module path such as ptr::P is not an enum merely because
            // its written path has two segments. Keep actual import/call inputs.
            return unknown('source-function-call',nodes,{path,args,import:resolved.import,ownerReason:String(error.message)});
          }
          const variant=state.access?state.access.variant(definition,resolved.path[1]):astEnumVariant(state.profile,definition,resolved.path[1]);
          if(args.length!==variant.arity)throw new TypeError('Original AST constructor arity mismatch');
          return {tag:'original-positive-enum',schema:variant,args,import:resolved.import,...source};
        }
        return unknown('source-function-call',nodes,{path,args,import:imports.get(path[0])??null});
      }
      return unknown('callable-source-expression',nodes,{callee:expression(head,env,depth+1),args});
    }
    if(tail.delimiter==='{'){
      const head=nodes.slice(0,-1);
      if(head.every((value,at)=>at%2===0?ident(value):value.text==='::')){
        const path=head.filter(value=>value.text!=='::').map(value=>value.text),resolved=owner(path);
        if(!env.has(path[0])&&resolved?.path.length===1){
          let definition;try{definition=schema('struct',resolved.path[0],resolved.source);}catch(error){
            if(/budget exceeded/u.test(String(error.message)))throw error;
            const fields=splitBuiltinCallerSyntax(tail.children).map(row=>{
              if(!ident(row[0])||row.length>1&&row[1]?.text!==':')throw new TypeError('Unresolved original record field syntax remains open');
              return {name:row[0].text,span:row[0].span,value:expression(row.length===1?row:row.slice(2),env,depth+1)};
            });
            if(new Set(fields.map(value=>value.name)).size!==fields.length)throw new TypeError('Unresolved original record repeats source fields');
            return unknown('record-source-owner',nodes,{name:resolved.path[0],fields,reason:String(error.message)});
          }
          const fields=fieldsOf(definition),values=splitBuiltinCallerSyntax(tail.children).map(row=>{
            const actual=fields.find(value=>value.name===row[0]?.text);if(!actual)throw new TypeError('Original source constructor field absent from actual schema');
            if(row.length>1&&row[1]?.text!==':')throw new TypeError('Original source constructor initializer unsupported');
            return {schema:actual,value:expression(row.length===1?row:row.slice(2),env,depth+1)};
          });
          if(values.length!==fields.length||new Set(values.map(value=>value.schema.name)).size!==fields.length)throw new TypeError('Original source constructor must initialize every field once');
          return {tag:'original-positive-record',schema:reference(definition),name:resolved.path[0],fields:values,...source};
        }
      }
    }
    if(state.access&&nodes.length>1&&nodes.every((node,at)=>at%2===0?ident(node):node.text==='::'))return unknown('qualified-source-value',nodes,{path:nodes.filter(node=>node.text!=='::').map(node=>node.text),import:imports.get(nodes[0].text)??null,ownerEstablished:false});
    if(nodes.length>=3&&nodes.at(-2).text==='.'&&ident(nodes.at(-1)))return {tag:'lexical-projection',object:expression(nodes.slice(0,-2),env,depth+1),member:nodes.at(-1).text,...source};
    return unknown('source-expression-grammar',nodes);
  }
  function block(nodes,env,depth,source){
    count(depth);const statements=[];let begin=0;
    for(let at=0;at<nodes.length;at++){
      if(nodes[at].text==='if'&&at===begin){
        let body=at+1;while(body<nodes.length&&nodes[body]?.delimiter!=='{')body++;
        if(!nodes[body])return unknown('source-control-header',nodes);
        const condition=expression(nodes.slice(at+1,body),env,depth+1),thenEnv=new Map(env),thenBody=block(nodes[body].children,thenEnv,depth+1,sourceOf(fragment,[nodes[body]]));
        let end=body+1,elseBody=null;const elseEnv=new Map(env);
        if(nodes[end]?.text==='else'){
          if(nodes[end+1]?.delimiter!=='{')return unknown('source-control-alternative',nodes);
          elseBody=block(nodes[end+1].children,elseEnv,depth+1,sourceOf(fragment,[nodes[end+1]]));end+=2;
        }
        for(const [name,slot] of env){
          const yes=thenEnv.get(name),no=elseEnv.get(name);
          if(yes?.id!==slot.id||no?.id!==slot.id){
            const joined=binding(name,nodes.slice(at,end),'open-control-join',slot.typeSyntax,{tag:'unselected-source-join',condition,thenSlot:yes?.id??slot.id,elseSlot:no?.id??slot.id},slot.mutable);env.set(name,joined);
          }
        }
        statements.push({tag:'original-if',condition,thenBody,elseBody,selectionEstablished:false,...sourceOf(fragment,nodes.slice(at,end))});at=end-1;begin=end;continue;
      }
      if(nodes[at].text!==';')continue;
      const row=nodes.slice(begin,at);begin=at+1;if(!row.length)continue;
      if(row[0].text==='let'){
        const equal=row.findIndex(value=>value.text==='='),left=row.slice(1,equal),colon=left.findIndex(value=>value.text===':'),names=(colon<0?left:left.slice(0,colon)).filter(ident).filter(value=>value.text!=='mut');
        if(equal<2||names.length!==1||left.some(value=>value.kind==='group')){statements.push(unknown('source-let-pattern',row));continue;}
        const value=expression(row.slice(equal+1),env,depth+1),slot=binding(names[0].text,row,'local',colon<0?[]:left.slice(colon+1),value,left.some(value=>value.text==='mut'));
        env.set(slot.name,slot);statements.push({tag:'original-let',slotId:slot.id,...sourceOf(fragment,row)});continue;
      }
      if(ident(row[0])&&row[1]?.text==='='&&env.has(row[0].text)){
        const previous=env.get(row[0].text),value=expression(row.slice(2),env,depth+1);
        const slot=binding(previous.name,row,'open-mutation',previous.typeSyntax,value,previous.mutable);env.set(slot.name,slot);
        obligations.push({kind:'source-mutation',source:fragment.source,span:slot.span});statements.push({tag:'original-assignment',previousSlot:previous.id,slotId:slot.id,...sourceOf(fragment,row)});continue;
      }
      statements.push({tag:'original-expression-statement',value:expression(row,env,depth+1),...sourceOf(fragment,row)});
    }
    return {tag:'original-block',statements,result:begin<nodes.length?expression(nodes.slice(begin),env,depth+1):{tag:'original-empty-block-tail',...source},...source};
  }
  const body=fragment.syntax.at(-1),tree=block(body.children,environment,0,sourceOf(fragment,[body]));
  const program=seal({schema:'original-source-lexical-substitution-program-v1',fragment:reference(fragment),parameters,slots,tree,positiveSchemas:[...schemas.values()].map(reference),obligations,sourceSyntaxRoundTrip:true,selectedOwnerBangComplete:false,generatedImplBehavior:false});
  programs.set(program,{stage,fragment,builderContracts});state.cache.set(fragment,program);return program;
}
function substitute(stage,state,program,{root=program.tree,overrides=new Map()}={}){
  const privateProgram=programs.get(program);if(privateProgram?.stage!==stage)throw new TypeError('Substitution program requires its original private source stage');
  const slots=new Map(program.slots.map(value=>[value.id,value]));let count=0;
  function visit(node,stack=[],depth=0){
    if(++count>limits.nodes||depth>limits.depth)throw new TypeError('AST substitution result node/depth budget exceeded');
    if(!node||typeof node!=='object')return node;
    if(Array.isArray(node))return node.map(value=>visit(value,stack,depth+1));
    if(node.tag==='lexical-slot'){
      if(overrides.has(node.slotId)){
        const bound=overrides.get(node.slotId);
        return {tag:'applied-original-closure-slot',slotId:node.slotId,source:node.source,sourceSha256:node.sourceSha256,span:node.span,declaredTypeSyntax:bound.declaredTypeSyntax,value:visit(bound.value,stack,depth+1),typeResolutionEstablished:false};
      }
      const slot=slots.get(node.slotId);if(!slot)throw new TypeError('Original substitution lexical slot disappeared');
      if(stack.includes(slot.id))throw new TypeError('Original substitution lexical cycle');
      return {tag:'source-slot-substitution',slotId:slot.id,kind:slot.kind,typeSyntax:slot.typeSyntax,source:node.source,sourceSha256:node.sourceSha256,span:node.span,value:slot.value?visit(slot.value,[...stack,slot.id],depth+1):{tag:'original-caller-input-slot',slotId:slot.id,source:slot.source,span:slot.span,syntax:slot.syntax}};
    }
    if(node.tag==='original-let'||node.tag==='original-assignment'){
      const slot=slots.get(node.slotId);if(!slot?.value)throw new TypeError('Original statement substitution initializer disappeared');
      return {...node,value:visit(slot.value,stack,depth+1),mutationEstablished:node.tag==='original-assignment'?false:undefined};
    }
    if(node.tag==='unselected-source-join'){
      const yes=slots.get(node.thenSlot),no=slots.get(node.elseSlot);if(!yes||!no)throw new TypeError('Original control join slot disappeared');
      const operand=slot=>visit({tag:'lexical-slot',slotId:slot.id,source:slot.source,sourceSha256:slot.sourceSha256,span:slot.span},stack,depth+1);
      return {...node,condition:visit(node.condition,stack,depth+1),thenValue:operand(yes),elseValue:operand(no),selectionEstablished:false};
    }
    if(node.tag==='original-ast-builder-invocation'){
      const args=node.args.map(value=>visit(value,stack,depth+1));const contract=privateProgram.builderContracts.get(node.contractDigest);if(!contract)throw new TypeError('Original substitution builder contract disappeared');return builder(contract,args,visit(node.receiver,stack,depth+1),[],depth+1,node);
    }
    const output={};for(const [key,value]of Object.entries(node))output[key]=['syntax','schema','import','contract','typeSyntax'].includes(key)?value:visit(value,stack,depth+1);return output;
  }
  function builder(contract,args,receiver,path,depth,source){
    if(++count>limits.nodes||depth>limits.depth)throw new TypeError('AST builder substitution node/depth budget exceeded');
    state.compiler.assert(contract);if(path.includes(contract.digest))return {tag:'open-original-builder-cycle',contractDigest:contract.digest};
    const params=contract.parameters.filter(value=>!value.receiver);if(params.length!==args.length)throw new TypeError('Original builder substitution arity differs');
    const values=new Map(params.map((value,at)=>[value.name,args[at]]));values.set('self',receiver);
    function project(node,level){
      if(++count>limits.nodes||level>limits.depth)throw new TypeError('AST builder payload substitution budget exceeded');
      const origin={source:node.source,sourceSha256:node.sourceSha256,span:node.span};
      if(node.tag==='bound-source-slot'){
        const value=node.binding.kind==='local'?project(node.binding.value,level+1):values.get(node.name);if(!value)throw new TypeError('Original builder substitution missing bound value');
        return {tag:'source-builder-slot-substitution',sourceBinding:node.binding,...origin,value};
      }
      if(node.tag==='positive-ast-enum-constructor')return {tag:'source-built-ast-enum',schema:node.variantSchema,...origin,args:node.args.map(value=>project(value,level+1))};
      if(node.tag==='positive-ast-struct-constructor')return {tag:'source-built-ast-record',owner:node.owner,definitionDigest:node.definitionDigest,...origin,fields:node.fields.map(value=>({schema:value.fieldSchema,value:project(value.value,level+1)}))};
      if(node.tag==='original-builder-call')return builder(state.compiler.compileOriginal(contract.recipe.source,node.method),node.args.map(value=>project(value,level+1)),receiver,[...path,contract.digest],level+1,origin);
      if(node.tag==='bound-source-projection')return {tag:'source-builder-projection',object:project(node.object,level+1),member:node.member,...origin};
      if(node.tag==='source-parentheses')return {tag:'source-builder-parentheses',value:project(node.value,level+1),...origin};
      if(node.tag==='unresolved-source-call')return {tag:'open-original-source-call',path:node.path,import:node.import,args:node.args.map(value=>project(value,level+1)),...origin};
      return {tag:'open-original-builder-expression',original:node,...origin};
    }
    return {tag:'source-substituted-builder-result',contractDigest:contract.digest,source:source.source,span:source.span,result:project(contract.result,depth+1)};
  }
  const tree=visit(root),result=seal({schema:'original-source-ast-substitution-result-v1',programDigest:program.digest,fragment:program.fragment,tree,selectedOwnerBangComplete:false,generatedImplBehavior:false,mutationControlEstablished:false,optionOwnerEstablished:false,allocationPhaseBehavior:false});results.set(result,{stage,program});return result;
}

// Closure application is constructed from two authentic source programs and
// their actual call site. No user-provided value/substitution map is accepted.
function applyClosure(stage,state,caller,callee,callStart){
  const callerState=programs.get(caller),calleeState=programs.get(callee);
  if(callerState?.stage!==stage||calleeState?.stage!==stage)throw new TypeError('Closure application requires privately paired original source programs');
  if(!Number.isSafeInteger(callStart)||callStart<0)throw new TypeError('Closure application requires its exact original call span');
  const nameAt=calleeState.fragment.syntax.findIndex(value=>value.text==='fn'),name=calleeState.fragment.syntax[nameAt+1]?.text;
  const sites=nodesMatching(caller.tree,value=>value.tag==='open-source-expression'&&value.kind==='source-method-call'&&value.method===name&&value.span.start===callStart);
  if(sites.length!==1)throw new TypeError('Original method closure call site is absent or ambiguous');
  const site=sites[0],callerOwner=sourceImplOwner(state.profile,callerState.fragment),calleeOwner=sourceImplOwner(state.profile,calleeState.fragment);
  if(callerOwner.source!==calleeOwner.source||callerOwner.span.start!==calleeOwner.span.start||callerOwner.span.end!==calleeOwner.span.end)throw new TypeError('Original closure caller/callee do not share their actual source impl');
  if(site.receiver.tag!=='lexical-slot')throw new TypeError('Original closure method receiver is not its lexical self slot');
  const receiver=caller.slots.find(value=>value.id===site.receiver.slotId);
  if(receiver?.name!=='self'||receiver.kind!=='parameter')throw new TypeError('Original closure method receiver is not source self');
  const params=callee.parameters.filter(value=>!value.receiver);
  if(params.length!==site.args.length)throw new TypeError('Original closure method source argument count differs');
  const candidates=site.args.map((value,index)=>({value,index})).filter(row=>row.value.tag==='source-closure');
  if(candidates.length!==1)throw new TypeError('Original method call requires one actual closure argument');
  const {value:closure,index}=candidates[0],parameter=params[index];
  if(parameter.typeSyntax.length!==1||!ident(parameter.typeSyntax[0]))throw new TypeError('Original callback parameter requires a direct source generic bound');
  const bound=sourceFnBound(calleeState.fragment,parameter.typeSyntax[0].text),parameterSlot=callee.slots.find(value=>value.kind==='parameter'&&value.name===parameter.name);
  if(!parameterSlot)throw new TypeError('Original callback source parameter slot disappeared');
  const invocations=nodesMatching({tree:callee.tree,initializers:callee.slots.map(value=>value.value).filter(Boolean)},value=>value.tag==='open-source-expression'&&value.kind==='source-callable-slot'&&value.callee?.tag==='lexical-slot'&&value.callee.slotId===parameterSlot.id);
  if(invocations.length!==1)throw new TypeError('Original callback application source is absent or ambiguous');
  const invoke=invocations[0];
  if(invoke.args.length!==bound.arguments.length||closure.parameters.length!==bound.arguments.length)throw new TypeError('Original callback/closure/Fn bound arity differs');
  const callerSlots=new Map(caller.slots.map(value=>[value.id,value])),overrides=new Map(),bindings=[];
  for(let at=0;at<closure.parameters.length;at++){
    const slot=callerSlots.get(closure.parameters[at]);
    if(slot?.kind!=='closure-parameter'||slot.mutable)throw new TypeError('Original callback closure binding pattern/mutation remains open');
    const argument=substitute(stage,state,callee,{root:invoke.args[at]});
    overrides.set(slot.id,{value:argument.tree,declaredTypeSyntax:bound.arguments[at]});
    bindings.push({closureSlot:slot.id,closureSource:reference(slot),sourceArgument:invoke.args[at],argument,declaredTypeSyntax:bound.arguments[at],typeResolutionEstablished:false});
  }
  const captures=closure.capturedSlots.map(id=>{
    const slot=callerSlots.get(id);if(!slot)throw new TypeError('Original closure capture disappeared');
    return {slotId:id,kind:slot.kind,source:slot.source,span:slot.span,mutable:slot.mutable,captureModeEstablished:false};
  });
  const body=substitute(stage,state,caller,{root:closure.body,overrides});
  const result=seal({schema:'original-source-closure-application-meta-v1',callerProgramDigest:caller.digest,calleeProgramDigest:callee.digest,sourceCall:{source:site.source,sourceSha256:site.sourceSha256,span:site.span},sourceOwner:callerOwner,
    callbackParameter:{name:parameter.name,span:parameter.span,typeSyntax:parameter.typeSyntax},callbackBound:bound,sourceApplication:{source:invoke.source,span:invoke.span},bindings,captures,declaredReturnBodyMeta:body,
    selectedOwnerBangComplete:false,generatedImplBehavior:false,sourceMethodOwnershipEstablished:false,fnTraitOwnerEstablished:false,typeResolutionEstablished:false,mutationControlEstablished:false,
    obligations:['method and Fn trait resolution remain source-owner obligations','closure argument field/Span/Ident types retain their actual source expected syntax, not resolved AST values','captured mutation, local functions, source control selection and returned container domains remain open']});
  applications.set(result,{stage,caller,callee});return result;
}
function nodesMatching(root,predicate){
  const matches=[];let cells=0;
  function visit(value,depth=0){
    if(++cells>limits.nodes||depth>limits.depth)throw new TypeError('Original closure source traversal budget exceeded');
    if(!value||typeof value!=='object')return;if(predicate(value))matches.push(value);
    for(const [key,child]of Object.entries(value))if(!['syntax','schema','recipe','import','typeSyntax','sourceBinding','original'].includes(key))if(Array.isArray(child))child.forEach(value=>visit(value,depth+1));else visit(child,depth+1);
  }
  visit(root);return matches;
}
function sourceImplOwner(profile,fragment){
  // Read the exact sealed original member using the existing lexical source
  // trees. This identifies containment, not an emitted impl/type permission.
  const source=builtinAstOriginal(profile,fragment.source),owners=[];
  function visit(nodes){for(let at=0;at<nodes.length;at++){
    if(nodes[at].text==='impl'){
      let end=at+1;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;
      if(nodes[end]?.delimiter==='{'&&nodes[end].span.start<fragment.span.start&&nodes[end].span.end>=fragment.span.end)owners.push({source:fragment.source,sourceSha256:source.sha256,span:{start:nodes[at].span.start,end:nodes[end].span.end},header:nodes.slice(at,end)});
    }
    if(nodes[at].kind==='group')visit(nodes[at].children);
  }}
  visit(originalMacroTrees(source.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}));
  if(owners.length!==1)throw new TypeError('Original function impl containment is not unique');return freeze(owners[0]);
}
function sourceFnBound(fragment,name){
  const nodes=fragment.syntax,where=nodes.findIndex(value=>value.text==='where'),matches=[];
  if(where<0)throw new TypeError('Original callback Fn bound is missing');
  for(let at=where+1;at<nodes.length;at++)if(nodes[at].text===name&&nodes[at+1]?.text===':'&&nodes[at+2]?.text==='Fn'&&nodes[at+3]?.delimiter==='('){
    let end=at+4,angle=0;
    if(nodes[end]?.text!=='->')throw new TypeError('Original callback declared return syntax is missing');end++;
    const start=end;
    for(;end<nodes.length;end++){
      if(nodes[end].text==='<')angle++;if(nodes[end].text==='>')angle--;
      if(angle<0)throw new TypeError('Original callback return type delimiter differs');
      if(!angle&&(nodes[end].text===','||nodes[end].delimiter==='{'))break;
    }
    if(angle||end===start)throw new TypeError('Original callback declared return type remains open');
    matches.push({source:fragment.source,sourceSha256:fragment.sourceSha256,span:{start:nodes[at].span.start,end:nodes[end-1].span.end},syntax:nodes.slice(at,end),arguments:splitBuiltinCallerSyntax(nodes[at+3].children),returnTypeSyntax:nodes.slice(start,end)});
  }
  if(matches.length!==1)throw new TypeError('Original callback Fn bound is absent or ambiguous');return freeze(matches[0]);
}
export function assertBuiltinAstClosureApplication(value,stage,caller,callee){const state=applications.get(value);if(!state||state.stage!==stage||state.caller!==caller||state.callee!==callee)throw new TypeError('Closure application requires its original source programs');return value;}
export const isBuiltinAstClosureApplication=value=>!!value&&applications.has(value);
