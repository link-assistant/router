// Generated declarations are emitted at crate root, even when their source use
// occurs in an inline or out-of-line module. Permission comes from the parser's
// actual declaration table, never a Router* spelling or a prefix heuristic.
import {typeError} from '../vendor/meta-language/translation/diagnostics.js';
const GENERATED=new Set(['router-monomorphic-algebraic-type','router-tuple-type']);
export function normalizeGeneratedTypeOwner(parser,type,scope=parser.modulePath,span=type.span) {
  let result=type;
  if(type.kind==='array')result={...result,element:normalizeGeneratedTypeOwner(parser,type.element,scope,span)};
  if(type.rustReference?.pointee)result={...result,rustReference:{...type.rustReference,pointee:normalizeGeneratedTypeOwner(parser,type.rustReference.pointee,scope,span)}};
  if(type.rustStandardGeneric)result={...result,rustStandardGeneric:{...type.rustStandardGeneric,arguments:type.rustStandardGeneric.arguments.map(argument=>normalizeGeneratedTypeOwner(parser,argument,scope,span))}};
  if(type.rustTupleLifetimeFields)result={...result,rustTupleLifetimeFields:type.rustTupleLifetimeFields.map(field=>normalizeGeneratedTypeOwner(parser,field,scope,span))};
  if(type.kind!=='named')return result;
  const original=type.path,name=original.at(-1),entry=parser.genericTypes?.get(name);
  const owner=type.rustGeneratedTypeOwner;
  if(owner?.name===name&&owner.generated===entry?.generated&&(original.length===1||original.length===2&&original[0]==='crate')&&entry?.k==='data'&&entry.name===name&&GENERATED.has(entry.generated))return {...result,path:['crate',name]};
  let path=parser.resolve(original,scope);
  if(path[0]==='self')path=['crate',...scope,...path.slice(1)];
  else if(path[0]==='super') {
    let up=0;while(path[up]==='super')up++;
    if(up>scope.length)throw typeError('super beyond crate root',span);
    path=['crate',...scope.slice(0,scope.length-up),...path.slice(up)];
  } else if(!['crate','std','serde_json'].includes(path[0]))path=['crate',...scope,...path];
  return {...result,path};
}
