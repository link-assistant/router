import {checkedOptionNominal} from './option-nominal-proof.mjs';
// Source array borrows have two different static-origin rules. Constant-tail
// lifetime extension permits Drop layouts; ordinary promotion does not.
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';

export const ARRAY_BORROW_PROFILE=Object.freeze({version:1,
  extension:'https://doc.rust-lang.org/reference/destructors.html#r-destructors.scope.lifetime-extension.static',
  borrows:'https://doc.rust-lang.org/reference/const_eval.html#r-const-eval.const-expr.borrows'});
const fail=(feature,span)=>{throw unsupported(feature,'requires a closed, pure immutable source array initializer and checked static-origin rule',span);};
const children=node=>Object.entries(node).flatMap(([name,value])=>['type','span','sourceArrayBorrow','arrayBorrowProof','contract'].includes(name)?[]:value?.k?[value]:Array.isArray(value)?value.filter(item=>item?.k):[]);

// Only actual extending syntax inherits the constant initializer context.
// Calls, method arguments, closures and let initializers deliberately stop it.
function extending(node,evidence,map,path=[]) {
  if(!node)return;
  if(node.k==='routerSharedArrayLiteral') {map.set(node,{...evidence,path,span:node.span});extending(node.value,evidence,map,[...path,'borrow']);}
  else if(node.k==='array')node.items.forEach((item,index)=>extending(item.value,evidence,map,[...path,'array',index]));
  else if(node.k==='routerRecord')node.fields.forEach(field=>extending(field.value,evidence,map,[...path,'field',field.name]));
  else if(node.k==='routerTuple')node.items.forEach((item,index)=>extending(item,evidence,map,[...path,'tuple',index]));
  else if(['let','routerDiscard'].includes(node.k))extending(node.body,evidence,map,[...path,'tail']);
  else if(node.k==='if'){extending(node.then,evidence,map,[...path,'then']);extending(node.else,evidence,map,[...path,'else']);}
  else if(node.k==='match')node.cases.forEach((arm,index)=>extending(arm.body,evidence,map,[...path,'arm',index]));
}

// An actual checked layout proves absence of owned interior-mutable fields.
// References themselves are immutable values; their pointees are not moved.
function immutable(type,checker,span,nominal,active=new Set()) {
  if(!type||type.rustGenericIdentityUnresolved)fail('array borrow erased type',span);
  if(type.rustReference){if(type.rustReference.kind!=='shared'||!type.rustReference.pointee)fail('array borrow reference',span);return;}
  if(type.rustOwnership?.kind==='owned')fail('array borrow owned allocation',span);
  if(['fixed','bool','unit'].includes(type.kind))return;
  if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return;
  if(type.kind==='array') {immutable(type.element,checker,span,nominal,active);return;}
  const entry=type.kind==='data'?checker.items.get(type.name):null;
  if(!entry||active.has(type.name))fail('array borrow unknown or recursive layout',span);
  if(!entry.tuple&&!['Option','Result'].includes(entry.standardGeneric?.kind)&&(!nominal||entry.generated||!entry.ctors.every(ctor=>ctor.ctorStyle&&ctor.fields.every(field=>field.rustTypeSyntax)))){try{checkedOptionNominal(checker,type,span);}catch{fail('array borrow nominal promotion',span);}}
  active.add(type.name);
  for(const ctor of entry.ctors)for(const field of ctor.fields)immutable(checker.resolveType(field.type,entry.modulePath,span),checker,span,nominal,active);
  active.delete(type.name);
}

// Whitelist checked const operations. No execution, macro substitution or
// assumption that a pure host operation is const-eligible is involved.
function pure(node,checker,span,scope=new Set(),calls=new Set(),depth=0) {
  if(!node||depth>256)fail('array borrow initializer bound',span);
  if(node.k==='var'){if(!scope.has(node.name))fail('array borrow runtime capture',span);return;}
  if(node.k==='lit')return;
  if(node.k==='routerSharedArrayLiteral'){if(!node.arrayBorrowProof?.verified)fail('nested array borrow evidence',span);return;}
  if(node.k==='let') {
    if(node.mutable)fail('array borrow mutable initializer',span);
    // A discarded local can run Drop even in an otherwise pure expression.
    immutable(node.value.type,checker,span,false);pure(node.value,checker,span,scope,calls,depth+1);
    pure(node.body,checker,span,new Set([...scope,node.name]),calls,depth+1);return;
  }
  if(node.k==='call') {
    const entry=checker.items.get(node.fn);
    if(!entry?.body||!entry.constant&&!entry.constFunction||entry.async||calls.has(node.fn))fail('array borrow const call',span);
    for(const arg of node.args)pure(arg,checker,span,scope,calls,depth+1);
    for(const param of entry.params)immutable(param.type,checker,span,false);
    pure(entry.body,checker,span,new Set(entry.params.map(param=>param.name)),new Set([...calls,node.fn]),depth+1);return;
  }
  // Arithmetic and const host calls also need a no-panic constant evaluator;
  // const eligibility alone cannot prove a successfully promoted value.
  if(!['array','ctor','if','match'].includes(node.k))fail('array borrow unproved const operation '+node.k,span);
  for(const child of children(node))pure(child,checker,span,scope,calls,depth+1);
}

export function withSharedArrayBorrowChecker(Base) {
  return class extends Base {
    program(surface) {
      this.arrayExtensions=new WeakMap();
      const collect=items=>{for(const item of items)if(item.k==='module')collect(item.items);else if(item.k==='fn'&&item.constant)extending(item.body,{kind:'constant-initializer-extension',declaration:item.name,declarationSpan:item.span},this.arrayExtensions);};
      collect(surface.items);
      const program=super.program(surface);
      const visited=new WeakSet();
      const verify=node=>{
        if(!node||visited.has(node))return;visited.add(node);
        for(const child of children(node))verify(child);
        if(node.k==='call')verify(this.items.get(node.fn)?.body);
        if(node.k!=='routerSharedArrayLiteral')return;
        const extension=node.sourceArrayBorrow.extension;
        immutable(node.value.type.element,this,node.span,Boolean(extension));
        pure(node.value,this,node.span);
        node.arrayBorrowProof={schemaVersion:1,verified:true,rule:extension?'constant-initializer-extension':'rvalue-promotion',profile:ARRAY_BORROW_PROFILE,...(extension?{extension}:{}),source:node.sourceArrayBorrow,length:node.value.items.length};
      };
      for(const entry of program.declarations.values())if(entry.k==='fn')verify(entry.body);
      const extended=node=>Boolean(node&&(node.k==='routerSharedArrayLiteral'&&node.sourceArrayBorrow.extension||children(node).some(extended)));
      // The borrowed operand alone does not prove the enclosing initializer:
      // an earlier arithmetic failure, effect or destructor can prevent it
      // from yielding any constant value at all.
      for(const entry of program.declarations.values())if(entry.k==='fn'&&entry.constant&&extended(entry.body))pure(entry.body,this,entry.span);
      return program;
    }
    sharedArrayBorrow(node,env,path,expected) {
      if(node.value.k!=='array'||node.value.sourceRustOwnership||node.value.items.some(item=>item.spread))fail('source array borrow syntax',node.span);
      if(expected&&(expected.kind!=='array'||expected.rustReference?.kind!=='shared'||expected.rustOwnership?.source!=='slice'))throw typeError('array literal borrow requires an actual shared slice boundary',node.span);
      const hint={kind:'array',...(expected?{element:expected.rustReference.pointee.element}:{}),rustArrayBorrowStorage:true};
      const value=this.expr(node.value,env,path,hint);
      if(value.k!=='array')fail('array literal borrow checked shape',node.span);
      const pointee={...value.type,rustOwnership:{kind:'borrowed',source:'slice'}};
      const type={...pointee,rustSourceType:true,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee,span:node.span,tokens:node.sourceArrayBorrow.tokens}};
      return {...node,value,type,sourceArrayBorrow:{...node.sourceArrayBorrow,...(this.arrayExtensions.get(node)?{extension:this.arrayExtensions.get(node)}:{})}};
    }
  };
}
