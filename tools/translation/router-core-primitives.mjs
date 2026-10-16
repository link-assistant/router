// Owned compatibility type binding. The Rust alias remains ordinary `str`;
// its library internals are intentionally outside translation. This adapter
// creates the existing borrowed-text type only for the genuine qualified edge.
import {STRING} from './checked-types.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from './router-core-formatting.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';

export const ROUTER_CORE_PRIMITIVES_SOURCE="//! Primitive types in the owned Rust/JavaScript compatibility interface.\n\n/// A borrowed UTF-8 string slice, with ordinary Rust reference lifetimes.\n///\n/// The alias allocates no storage and does not transfer ownership. The checked\n/// translation binds qualified references to its existing borrowed-text domain;\n/// it does not translate the standard library implementation of `str`.\npub type Str = ::std::primitive::str;\n";
export const ROUTER_CORE_PRIMITIVES_SHA256="e917e86de845ebe981094dad72260b2425da7e2a223a83de63033fa6e932e4c0";
const fail=()=>{throw new TypeError('Router borrowed text requires its actual owned primitive alias and qualified source binding');};
const range=(first,last)=>({start:first.start,end:last.end});
const tokenCopy=token=>({kind:token.kind,value:token.value,span:range(token,token)});
function contract(run,location){
  try{return run();}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('Router compatibility borrowed text',error.message,location);}
}
function originalLeaf(state){
  const leaves=state.facts.modules.filter(module=>module.path.length===2&&module.path[0]==='translation_core'&&module.path[1]==='primitives');
  if(leaves.length!==1)fail();
  const leaf=leaves[0];
  if(leaf.file!=='src/translation_core/primitives.rs'||leaf.configurationCondition!=='active'||leaf.source!==ROUTER_CORE_PRIMITIVES_SOURCE||!Object.hasOwn(leaf,'sourceView'))fail();
  originalSourceModuleItems(leaf);
  return leaf;
}

// This consumes the complete reference. A bare STRING pointee would instead
// enter the ordinary shared-String path and lose the str lifetime semantics.
// Named binders are a separate parser capability; this first domain keeps
// elided and explicit static references only, without guessing binder names.
export function parseRouterCoreStrReference(parser){
  const c=parser.cursor;
  if(!c.is('&'))return null;
  const start=c.index,first=c.peek(),explicitLifetime=c.is("'",1);let offset=1,lifetime='elided';
  if(explicitLifetime){offset+=2;lifetime=c.peek(offset-1).value;}
  const words=['crate','::','translation_core','::','Str'];
  if(!words.every((word,index)=>c.is(word,offset+index)))return null;
  if([0,2,4].some(index=>c.peek(offset+index).kind!=='identifier'))return null;
  const count=offset+words.length,last=c.peek(count-1),location=range(first,last);
  if(explicitLifetime&&(lifetime!=='static'||c.peek(2).kind!=='identifier'||c.peek(1).end!==c.peek(2).start))throw unsupported('Router borrowed text lifetime','requires an elided or contiguous static reference; named binder integration remains separate',location);
  if(c.is('<',count)||c.is('::',count))throw unsupported('Router borrowed text type','requires the complete nongeneric owned Str alias',location);
  const before=contract(()=>matchesParserFacts(parser),location),tokens=c.tokens;
  const proof=contract(()=>requireRouterCoreFacade(parser),location);
  const leaf=contract(()=>originalLeaf(before),location),view=leaf.sourceView,source=leaf.source;
  const actual=tokens.slice(start,start+count),copies=actual.map(tokenCopy);
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'compatibility-str:lossless-owned-alias',apply:()=>{
      const stage=transportConcreteSyntaxSource(source,{language:'Rust'});
      if(stage.source!==ROUTER_CORE_PRIMITIVES_SOURCE)fail();return stage;
    }}]},
    {phase:'repository',rules:[{id:'router-core:qualified-borrowed-text-reference',apply:()=>({...STRING,rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'},rustBorrowLifetime:{kind:lifetime,source:'borrowed-str-type',span:location,tokens:copies}})}]},
  ]);
  const output=contract(()=>pipeline.run(null),location);
  contract(()=>{
    // All callback-capable source/CST work precedes the final genuine issuer
    // checks. The following reference/index/token associations remain exact.
    if(originalLeaf(before)!==leaf)fail();
    requireRouterCoreFacadeCurrent(parser,proof);
    if(matchesParserFacts(parser)!==before||parser.cursor!==c||c.tokens!==tokens||c.index!==start||leaf.sourceView!==view||leaf.source!==source||actual.some((token,index)=>tokens[start+index]!==token))fail();
  },location);
  c.index=start+count;return output.value;
}
