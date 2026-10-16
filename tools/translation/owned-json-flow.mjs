// A deliberately closed linear-use analysis for source-authenticated owned JSON
// operations. This runs on one whole checked function before that declaration
// leaves the ordinary refusal collector. It is neither a Rust borrow checker
// for unrelated programs nor a public checked-IR/ownership capability.
import {JSON_CONTRACTS} from './extensions/json-contracts.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
const linear=kind=>kind==='json'||kind==='linear';
export function validateOwnedJsonFlow(checker,entry,{genuine}) {
 const refuse=(detail,node)=>{throw unsupported('owned JSON flow',detail,node?.span??entry.span);};
 let cells=100000;
 const domain=(type,node,active=new Set())=>{
  if(!type||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)refuse('requires resolved source types',node);
  if(type.rustReference){if(type.rustReference.kind!=='shared'||!type.rustReference.pointee)refuse('mutable or unresolved reference',node);const inner=domain(type.rustReference.pointee,node,active);if(inner==='json')return 'borrow';if(inner==='copy')return 'copy';refuse('aggregate reference requires a separate loan proof',node);}
  if(type.kind==='data'){
   const owner=checker.items.get(type.name);
   if(owner?.hostTypePath?.join('::')==='serde_json::Value'){
    if(type.rustOwnership||type.patternOwnershipRefusal)refuse('a borrowed pointee cannot become an owned JSON value',node);
    return 'json';
   }
   if(active.has(type.name))refuse('recursive or unknown aggregate Drop',node);
   const generic=type.rustStandardGeneric??owner?.standardGeneric;
   if(!['Option','Result'].includes(owner?.standardGeneric?.kind)||generic?.kind!==owner.standardGeneric.kind)refuse('unknown aggregate Drop or ownership',node);
   const inner=new Set(active).add(type.name),arguments_=generic.arguments.map(argument=>domain(checker.resolveType(argument,owner.modulePath,node?.span??entry.span),node,inner));
   if(arguments_.some(kind=>kind==='borrow'))refuse('stored JSON loans remain outside this flow contract',node);
   return arguments_.some(linear)?'linear':'copy';
  }
  if(type.kind==='string'){
   if(type.rustOwnership&&!(type.rustOwnership.kind==='borrowed'&&type.rustOwnership.source==='str')||type.patternOwnershipRefusal)refuse('owned text or unknown Drop',node);
   return 'copy';
  }
  if(['unit','bool','char','fixed','int','nat','float','literal'].includes(type.kind))return 'copy';
  refuse('unknown aggregate, array, closure or effect domain',node);
 };
 const retainsLoan=(type,active=new Set())=>{
  if(type.rustReference||type.rustOwnership?.kind==='borrowed')return true;
  const owner=type.kind==='data'?checker.items.get(type.name):null,generic=type.rustStandardGeneric??owner?.standardGeneric;
  if(!generic||active.has(type.name))return false;const inner=new Set(active).add(type.name);
  return generic.arguments.some(argument=>retainsLoan(checker.resolveType(argument,owner.modulePath,entry.span),inner));
 };
 const clone=state=>({names:new Map(state.names),available:new Map(state.available),alive:state.alive});
 const state={names:new Map(),available:new Map(),alive:true};
 const bind=(state,name,type,mutable,node)=>{const slot={name,kind:domain(type,node),mutable};state.names.set(name,slot);state.available.set(slot,true);return slot;};
 for(const param of entry.params)bind(state,param.name,param.type,false,entry);
 // Unknown parameter/local payloads are rejected even when a particular branch
 // happens not to inspect them: this domain makes no arbitrary Drop theorem.
 const merge=(target,left,right)=>{
  target.alive=left.alive||right.alive;
  for(const slot of target.available.keys())target.available.set(slot,left.alive&&right.alive?left.available.get(slot)===true&&right.available.get(slot)===true:left.alive?left.available.get(slot)===true:right.alive?right.available.get(slot)===true:false);
 };
 const variable=(node,state,mode)=>{
  const slot=state.names.get(node.name);if(!slot)refuse('unbound lexical variable',node);
  if(state.available.get(slot)!==true)refuse('use after move or possibly moved value: '+slot.name,node);
  if(mode==='borrow')return;
  if(slot.kind==='borrow')refuse('moving a shared JSON pointee or escaping its loan',node);
  if(linear(slot.kind))state.available.set(slot,false);
 };
 const visit=(node,state,mode='move',depth=0)=>{
  if(--cells<0||depth>160)refuse('whole-function flow bound',node);
  if(!node||typeof node!=='object')refuse('missing checked expression',entry);
  const read=(value,how='move')=>visit(value,state,how,depth+1);
  const kind=domain(node.type,node);
  if(node.k==='var'){variable(node,state,mode);return;}
  if(['lit','unit'].includes(node.k)){if(linear(kind)||kind==='borrow')refuse('unproved JSON literal ownership',node);return;}
  if(node.k==='let'){
   read(node.value);const valueKind=domain(node.value.type,node.value);
   if(valueKind==='borrow')refuse('retained JSON aliases require an explicit loan analysis',node);
   const previous=state.names.get(node.name),slot=bind(state,node.name,node.value.type,node.mutable===true,node);
   read(node.body);state.available.delete(slot);if(previous)state.names.set(node.name,previous);else state.names.delete(node.name);return;
  }
  if(node.k==='routerSet'){
   if(node.target.k!=='var')refuse('only direct local reinitialization is supported',node);
   const slot=state.names.get(node.target.name);
   if(!slot?.mutable||slot.kind!=='json'||domain(node.value.type,node.value)!=='json')refuse('assignment needs its actual mutable canonical JSON binding',node);
   // Rust evaluates the complete RHS before selecting/replacing the local.
   // The RHS may move this exact binding, then the assignment reinitializes it.
   read(node.value);state.available.set(slot,true);read(node.body);return;
  }
  if(node.k==='if'||node.k==='routerIf'){
   read(node.cond);const left=clone(state),right=clone(state);
   visit(node.then,left,'move',depth+1);visit(node.else,right,'move',depth+1);merge(state,left,right);
   if(node.k==='routerIf')read(node.body);return;
  }
  if(node.k==='routerReturn'){
   read(node.value);const unreachable=clone(state);visit(node.body,unreachable,'move',depth+1);state.alive=false;return;
  }
  if(node.k==='routerDiscard'){read(node.value);read(node.body);return;}
  if(node.k==='routerTry'){
   // The failure exits this function through its already checked Option/Result
   // boundary. Only the successful path reaches subsequent source operations.
   read(node.value);return;
  }
  if(node.k==='routerJsonMacro'){
   if(kind!=='json')refuse('JSON construction requires its actual canonical result',node);
   // A direct local is a borrowable place. Composite expressions still move
   // their operands before the macro borrows the resulting temporary.
   for(const argument of node.args){const value=argument.value;if(!value?.k)refuse('missing checked JSON interpolation',node);read(value,value.k==='var'?'borrow':'move');}return;
  }
  if(node.k==='routerHostCall'){
   if(['router_core_json_copy','router_core_json_with_field'].includes(node.id)){
    if(!genuine(node))refuse('new operation has no private checked source receipt',node);
    if(node.id==='router_core_json_copy'){if(node.args.length!==1)refuse('copy arity',node);read(node.args[0],'borrow');}
    else{if(node.args.length!==3)refuse('update arity',node);read(node.args[0]);read(node.args[1],'borrow');read(node.args[2]);}
    if(kind!=='json')refuse('new operation result is not canonical JSON',node);return;
   }
   // No method-name trust: existing registered canonical JSON reader contracts
   // have shared receiver semantics. New APIs cannot turn their loans into
   // owned payloads; stored loans/projections and unknown contracts refuse.
   const contract=JSON_CONTRACTS.find(row=>row.id===node.id);
   if(contract?.kind==='method'&&contract.receiver?.path?.join('::')==='serde_json::Value'){
    if(linear(kind)||kind==='borrow'||retainsLoan(node.type))refuse('reader projection needs a separate owned/loan proof',node);
    for(const argument of node.args)read(argument,'borrow');return;
   }
   refuse('unknown host ownership or effect contract',node);
  }
  if(node.k==='ctor'){
   const declaration=checker.items.get(node.data),ctor=declaration?.ctors.find(row=>row.name===node.ctor);
   if(!ctor||ctor.fields.length!==node.args.length)refuse('unknown constructor source layout',node);
   if(kind==='json'){if(node.ctor!=='Null'||node.args.length)refuse('direct JSON constructors require the checked literal operation',node);return;}
   if(!['Option','Result'].includes(declaration.standardGeneric?.kind))refuse('unknown aggregate constructor Drop',node);
   for(const argument of node.args)read(argument);return;
  }
  if(node.k==='call'){
   const target=checker.items.get(node.fn);
   if(!target?.params||target.params.length!==node.args.length||linear(kind)||kind==='borrow')refuse('source call needs a separate JSON transfer/return proof',node);
   if(node.args.some(argument=>domain(argument.type,argument)!=='copy')||target.params.some(param=>domain(param.type,node)!=='copy'))refuse('source call cannot transfer or retain JSON in this contract',node);
   for(const argument of node.args)read(argument);return;
  }
  if(node.k==='routerTextReference'){
   // Only the private json_copy checker strips its direct written borrow.
   // Any retained/general reference remains explicit rather than disappearing.
   refuse('retained or escaped JSON aliases are not supported',node);
  }
  if(['unary','binary','cast','routerConstObligation','routerBuiltinConversion','routerPrimitiveDereference','routerStandardSharedReceiver'].includes(node.k)){
   if(kind!=='copy')refuse('aggregate projection or coercion needs a transfer proof',node);
   for(const key of ['arg','left','right','value','object'])if(node[key]){if(domain(node[key].type,node[key])!=='copy')refuse('an unproved scalar projection cannot hide a JSON move',node);read(node[key]);}return;
  }
  // In particular no recursion into arbitrary callbacks/loop frames, matches,
  // fields or opaque wrappers: each needs its own lexical/control transfer rule.
  refuse('unsupported control/escape node '+node.k,node);
 };
 visit(entry.body,state);
}
