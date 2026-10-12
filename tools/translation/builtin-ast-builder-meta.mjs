// Lift original compiler builder expressions to source-bearing structured meta.
// Constructor identity comes from the pinned AST schema, never a return type.
// External calls and source-stage macros remain explicit open obligations.
import {createHash} from 'node:crypto';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {builtinAstOriginal,isBuiltinDeriveAstProfile,originalAstFunction,assertOriginalAstFunction,originalAstDefinition,astEnumVariant,astSyntaxText} from './builtin-derive-ast-meta.mjs';
const build='compiler/rustc_expand/src/build.rs',schema='compiler/rustc_ast/src/ast.rs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const compilers=new WeakMap(),contracts=new WeakMap(),callbackInventories=new WeakMap();
const ident=node=>node?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(node.text);
const bounds=Object.freeze({nodes:16000,depth:64,serializedBytes:524288,functions:128});
// Full original schema bytes remain in the sealed source profile. A recipe
// references their complete syntax digest and retains its actual selected
// constructor/field syntax, avoiding repeated whole ExprKind inventories.
const schemaReference=value=>({source:value.source,sourceSha256:value.sourceSha256,span:value.span,sha256:value.sha256,digest:value.digest,syntaxSha256:value.syntaxSha256,semanticSyntaxRoundTrip:value.semanticSyntaxRoundTrip});
function split(nodes,separator=','){
  const result=[];let start=0,angle=0;
  for(let at=0;at<=nodes.length;at++){
    const token=nodes[at]?.text;if(token==='<')angle++;if(token==='>')angle--;
    if(angle<0)throw new TypeError('Original builder generic syntax is unbalanced');
    if(at===nodes.length||token===separator&&!angle){if(at>start)result.push(nodes.slice(start,at));start=at+1;}
  }
  if(angle)throw new TypeError('Original builder generic syntax is unbalanced');return result;
}
function span(nodes){return {start:nodes[0].span.start,end:nodes.at(-1).span.end};}
function parameters(fragment){
  const fn=fragment.syntax.findIndex(node=>node.text==='fn'),args=fragment.syntax.slice(fn+2).find(node=>node.kind==='group'&&node.delimiter==='(');
  if(!args)throw new TypeError('Original builder parameter syntax is missing');
  return split(args.children).map(nodes=>{
    if(astSyntaxText(nodes)==='& self')return {name:'self',span:span(nodes),syntax:nodes,receiver:true};
    const colon=nodes.findIndex(node=>node.text===':');
    const names=nodes.slice(0,colon).filter(ident).filter(node=>node.text!=='mut');
    if(colon<1||names.length!==1)throw new TypeError('Builder parameter binding pattern remains unproved');
    const name=names[0].text;
    return {name,span:span(nodes),syntax:nodes,typeSyntax:nodes.slice(colon+1),mutable:nodes.slice(0,colon).some(node=>node.text==='mut')};
  });
}
function actualImports(profile,path){
  const origin=builtinAstOriginal(profile,path),roots=originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}),result=new Map();
  for(let at=0;at<roots.length;at++){
    if(roots[at].text==='impl')break;
    if(roots[at].text!=='use')continue;
    let end=at+1;while(end<roots.length&&roots[end].text!==';')end++;
    const nodes=roots.slice(at+1,end);
    const group=nodes.at(-1),prefix=group?.kind==='group'?nodes.slice(0,-1):nodes;
    if(prefix.every((node,index)=>index%2===0?ident(node):node.text==='::')){
      const target=prefix.filter(node=>node.text!=='::').map(node=>node.text);
      if(group?.kind==='group'&&group.delimiter==='{')for(const row of split(group.children)){
        if(row.length===3&&row[0].text==='self'&&row[1].text==='as'&&ident(row[2]))result.set(row[2].text,{target,syntax:nodes,span:span(nodes)});
        else if(row.length===1&&ident(row[0]))result.set(row[0].text,{target:[...target,row[0].text],syntax:nodes,span:span(nodes)});
        // Unknown import forms are not projected into constructor ownership.
      }
      else if(group?.kind!=='group'&&target.length>1)result.set(target.at(-1),{target,syntax:nodes,span:span(nodes)});
    }
    at=end;
  }
  if(path===build&&!result.has('ast'))throw new TypeError('Actual original AST namespace alias is unavailable');return result;
}
function schemaFields(definition){
  const nameAt=definition.syntax.findIndex(node=>node.text==='struct'),body=definition.syntax.slice(nameAt+2).find(node=>node.kind==='group'&&node.delimiter==='{');
  if(!body)throw new TypeError('AST builder requires a named original struct schema');
  return split(body.children).map(row=>{
    let at=0;while(row[at]?.text==='#'&&row[at+1]?.kind==='group'&&row[at+1].delimiter==='[')at+=2;
    if(row[at]?.text==='pub'){at++;if(row[at]?.kind==='group'&&row[at].delimiter==='(')at++;}
    if(!ident(row[at])||row[at+1]?.text!==':')throw new TypeError('Original AST schema field remains unproved');
    return {name:row[at].text,span:span(row),typeSyntax:row.slice(at+2)};
  });
}
export function createBuiltinAstBuilderMetaCompiler(profile){
  if(!isBuiltinDeriveAstProfile(profile))throw new TypeError('Builder meta requires its sealed original source profile');
  const state={profile,cache:new Map()};
  const compiler=Object.freeze({compile:name=>compile(state,name,build),compileOriginal:(source,name)=>compile(state,name,source),assert:contract=>assertContract(compiler,contract)});
  compilers.set(compiler,state);state.compiler=compiler;return compiler;
}
function assertContract(compiler,contract){if(contracts.get(contract)?.compiler!==compiler)throw new TypeError('Builder meta contract belongs to its original compiler');return contract;}
export const isBuiltinAstBuilderMetaContract=value=>!!value&&contracts.has(value);
// This mapping records actual callback construction calls. It cannot close an
// invocation: argument/branch/receiver lexical dataflow remains independently
// checked, including source closure parameters that reuse the receiver name.
export function inventoryBuiltinAstCallbackCalls(compiler,fragment){
  const state=compilers.get(compiler);if(!state)throw new TypeError('Original callback inventory requires its private builder compiler');
  assertOriginalAstFunction(state.profile,fragment);
  const parametersActual=parameters(fragment),receivers=parametersActual.filter(value=>astSyntaxText(value.typeSyntax??[]).replace(/\s/gu,'')==="&ExtCtxt<'_>");
  const source=builtinAstOriginal(state.profile,fragment.source),trees=originalMacroTrees(source.source,{maxBytes:256000,maxTokens:32000,maxDepth:64});
  const imports=[];
  for(let at=0;at<trees.length;at++)if(trees[at].text==='use'){
    let end=at+1;while(end<trees.length&&trees[end].text!==';')end++;
    const row=trees.slice(at+1,end),group=row.at(-1);
    if(astSyntaxText(row.slice(0,-1))==='rustc_expand :: base ::'&&group?.delimiter==='{'&&split(group.children).some(member=>member.length===1&&member[0].text==='ExtCtxt'))imports.push({source:fragment.source,sourceSha256:fragment.sourceSha256,span:span(row),syntax:row,target:['rustc_expand','base','ExtCtxt']});
    at=end;
  }
  if(receivers.length!==1||imports.length!==1)throw new TypeError('Original callback ExtCtxt receiver ownership remains unproved');
  const receiver=receivers[0],calls=[],shadowSites=[];let nodesVisited=0;
  function visit(nodes,depth=0){
    if(depth>bounds.depth)throw new TypeError('Original callback depth budget exceeded');
    for(let at=0;at<nodes.length;at++){
      if(++nodesVisited>bounds.nodes)throw new TypeError('Original callback node budget exceeded');
      const node=nodes[at];
      if(node.text===receiver.name&&(nodes[at-1]?.text==='let'||nodes[at+1]?.text===':'))shadowSites.push(node.span);
      if(node.text===receiver.name&&nodes[at+1]?.text==='.'&&ident(nodes[at+2])&&nodes[at+3]?.kind==='group'&&nodes[at+3].delimiter==='('){
        const method=nodes[at+2].text,syntax=nodes.slice(at,at+4);let contract=null,refusal=null;
        try{contract=compiler.compile(method);}catch(error){refusal=String(error.message);}
        calls.push({source:fragment.source,sourceSha256:fragment.sourceSha256,span:span(syntax),syntax,method,contractDigest:contract?.digest??null,contract,refusal});
      }
      if(node.kind==='group')visit(node.children,depth+1);
    }
  }
  // The function signature itself declares the genuine receiver; shadow checks
  // apply only to the actual body and do not reject that original declaration.
  visit(fragment.syntax.at(-1).children);
  const evidence={schema:'original-builtin-callback-builder-map-v1',profileDigest:state.profile.digest,callback:fragment,receiver:{parameter:receiver,import:imports[0]},calls,shadowSites,receiverLexicalClosure:shadowSites.length===0,sourceSyntaxRoundTrip:true,selectedOwnerBangComplete:false,generatedImplBehavior:false,obligations:['caller values and every selected branch need checked slot/statement closure','closure/local receiver shadows require actual lexical binding proof','unsupported builder recipes remain explicit; no callback substitution']};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>bounds.serializedBytes)throw new TypeError('Original callback metadata byte budget exceeded');
  const roundTrip=JSON.parse(encoded);if(JSON.stringify(roundTrip)!==encoded)throw new TypeError('Original callback mapping roundtrip changed');
  const inventory=freeze({...roundTrip,digest:hash(encoded)});callbackInventories.set(inventory,{compiler,fragment});return inventory;
}
export const isBuiltinAstCallbackBuilderInventory=value=>!!value&&callbackInventories.has(value);
export function builtinAstCallbackInventoryOriginal(compiler,inventory){
  const state=callbackInventories.get(inventory);if(!state||state.compiler!==compiler)throw new TypeError('Caller environment requires its original private callback inventory');return state.fragment;
}
export function builtinAstFunctionSourceParameters(profile,fragment){assertOriginalAstFunction(profile,fragment);return freeze(parameters(fragment));}
function compile(state,name,sourcePath){
  if(typeof name!=='string'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(name))throw new TypeError('Actual builder function identifier is required');
  if(typeof sourcePath!=='string')throw new TypeError('Actual original builder source member is required');
  builtinAstOriginal(state.profile,sourcePath);const key=sourcePath+'::'+name;
  if(state.cache.has(key))return state.cache.get(key);
  if(state.cache.size>=bounds.functions)throw new TypeError('Original builder function budget exceeded');
  const imports=actualImports(state.profile,sourcePath),recipe=originalAstFunction(state.profile,sourcePath,name),params=parameters(recipe),environment=new Map(params.map(value=>[value.name,{kind:'parameter',parameter:value}]));
  const body=recipe.syntax.at(-1);if(body?.kind!=='group'||body.delimiter!=='{')throw new TypeError('Original builder body is unavailable');
  const counter={nodes:0},obligations=[],schemas=new Map();
  const provenance=nodes=>({source:recipe.source,sourceSha256:recipe.sourceSha256,span:span(nodes),syntax:nodes});
  function count(depth){if(++counter.nodes>bounds.nodes||depth>bounds.depth)throw new TypeError('Original builder expression budget exceeded');}
  function astOwner(path){
    const imported=imports.get(path[0]);if(!imported)return null;
    const full=[...imported.target,...path.slice(1)];
    if(full[0]==='rustc_ast'&&full.length>=2)return {path:full.slice(1),imported,source:schema};
    if(full[0]==='rustc_span'&&full[1]==='source_map'&&full.length>=3)return {path:full.slice(2),imported,source:'compiler/rustc_span/src/source_map.rs'};
    return null;
  }
  function schemaFor(kind,name,path=schema){
    const key=path+'::'+kind+'::'+name;if(schemas.has(key))return schemas.get(key);
    const original=originalAstDefinition(state.profile,path,kind,name);schemas.set(key,original);return original;
  }
  function expression(nodes,depth=0){
    count(depth);if(!nodes.length)throw new TypeError('Original builder expression is empty');
    const source=provenance(nodes);
    if(nodes.length===1&&ident(nodes[0])){
      const binding=environment.get(nodes[0].text);
      if(binding)return {tag:'bound-source-slot',name:nodes[0].text,binding,...source};
      if(['true','false'].includes(nodes[0].text))return {tag:'source-literal',value:nodes[0].text,...source};
      obligations.push({kind:'unresolved-value-slot',name:nodes[0].text,span:source.span});return {tag:'unresolved-source-value',name:nodes[0].text,...source};
    }
    if(nodes.length===1&&nodes[0].type==='number')return {tag:'source-numeric-token',spelling:nodes[0].text,...source};
    if(nodes.length===1&&nodes[0].kind==='group'&&nodes[0].delimiter==='(')return {tag:'source-parentheses',value:expression(nodes[0].children,depth+1),...source};
    const terminal=nodes.at(-1);
    if(terminal.kind==='group'&&terminal.delimiter==='('){
      const head=nodes.slice(0,-1),parts=head.filter(node=>node.text!=='::').map(node=>node.text);
      if(head.every((node,at)=>at%2===0?ident(node):node.text==='::')){
        const owner=astOwner(parts),args=split(terminal.children).map(value=>expression(value,depth+1));
        if(owner?.path.length===2){
          let definition=null;
          try{definition=schemaFor('enum',owner.path[0],owner.source);}catch(error){obligations.push({kind:'unresolved-constructor-owner',path:parts,span:source.span,reason:String(error.message)});}
          if(definition){
            const variant=astEnumVariant(state.profile,definition,owner.path[1]);
            if(args.length!==variant.arity)throw new TypeError('Original AST constructor arity disagrees with its schema');
            return {tag:'positive-ast-enum-constructor',owner:owner.path[0],variant:variant.name,variantSchema:variant,import:owner.imported,args,...source};
          }
        }
        obligations.push({kind:'external-source-call',path:parts,span:source.span});return {tag:'unresolved-source-call',path:parts,import:imports.get(parts[0])??null,args,...source};
      }
      if(head.length===3&&head[0].text==='self'&&head[1].text==='.'&&ident(head[2]))return {tag:'original-builder-call',method:head[2].text,receiver:environment.get('self'),args:split(terminal.children).map(value=>expression(value,depth+1)),...source};
      throw new TypeError('Original builder call syntax remains unproved: '+astSyntaxText(head));
    }
    if(terminal.kind==='group'&&terminal.delimiter==='{'){
      const head=nodes.slice(0,-1),parts=head.filter(node=>node.text!=='::').map(node=>node.text),owner=astOwner(parts);
      if(!head.every((node,at)=>at%2===0?ident(node):node.text==='::')||owner?.path.length!==1)throw new TypeError('Original builder record owner remains unproved');
      const definition=schemaFor('struct',owner.path[0],owner.source),fields=schemaFields(definition),values=split(terminal.children).map(row=>{
        if(!ident(row[0]))throw new TypeError('Original builder record field is unavailable');
        const shorthand=row.length===1;if(!shorthand&&row[1]?.text!==':')throw new TypeError('Original builder record field expression remains unproved');
        const field=fields.find(field=>field.name===row[0].text);if(!field)throw new TypeError('Original builder field does not belong to its actual schema');
        return {name:field.name,fieldSchema:field,value:expression(shorthand?row:row.slice(2),depth+1)};
      });
      if(values.length!==fields.length||new Set(values.map(field=>field.name)).size!==fields.length)throw new TypeError('Original builder record does not construct all schema fields exactly once');
      return {tag:'positive-ast-struct-constructor',owner:owner.path[0],definitionDigest:definition.digest,fields:values,import:owner.imported,...source};
    }
    if(nodes.length===3&&ident(nodes[0])&&nodes[1].text==='.'&&ident(nodes[2])&&environment.has(nodes[0].text))return {tag:'bound-source-projection',object:expression([nodes[0]],depth+1),member:nodes[2].text,...source};
    if(nodes.every((node,at)=>at%2===0?ident(node):node.text==='::')){
      const path=nodes.filter(node=>node.text!=='::').map(node=>node.text),owner=astOwner(path);
      if(owner?.path.length===2){
        const definition=schemaFor('enum',owner.path[0],owner.source),variant=astEnumVariant(state.profile,definition,owner.path[1]);
        if(variant.arity!==0)throw new TypeError('Original nonunit AST constructor requires arguments');
        return {tag:'positive-ast-enum-constructor',owner:owner.path[0],variant:variant.name,variantSchema:variant,import:owner.imported,args:[],...source};
      }
      obligations.push({kind:'unresolved-path-value',path,span:source.span});return {tag:'unresolved-source-path',path,...source};
    }
    throw new TypeError('Original builder expression syntax remains unproved: '+astSyntaxText(nodes));
  }
  const statements=[];let from=0;
  for(let at=0;at<body.children.length;at++)if(body.children[at].text===';'){
    const row=body.children.slice(from,at);from=at+1;
    if(row[0]?.text!=='let'||!ident(row[1])||row[2]?.text!=='=')throw new TypeError('Original builder statement requires a simple actual local binding');
    const value=expression(row.slice(3)),binding={kind:'local',source:provenance(row),value};
    statements.push({tag:'source-local-binding',name:row[1].text,binding});environment.set(row[1].text,binding);
  }
  const result=expression(body.children.slice(from));
  const evidence={schema:'original-ast-builder-contract-meta-v1',profileDigest:state.profile.digest,recipe,parameters:params,statements,result,positiveSchemas:[...schemas.values()].map(schemaReference),unresolved:obligations,sourceExpressionRoundTrip:true,selectedOwnerBangComplete:false,generatedImplBehavior:false,obligations:['actual caller slot categories and transitive builder recipes require independent closure','external source calls/macros cannot be inferred from result types or builder names']};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>bounds.serializedBytes)throw new TypeError('Original builder metadata byte budget exceeded');
  const roundTrip=JSON.parse(encoded);if(JSON.stringify(roundTrip)!==encoded)throw new TypeError('Original builder structured meta roundtrip changed');
  const contract=freeze({...roundTrip,digest:hash(encoded)});contracts.set(contract,{compiler:state.compiler,profile:state.profile});state.cache.set(key,contract);return contract;
}
