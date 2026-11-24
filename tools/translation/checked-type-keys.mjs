// Dependency-free registry for native checked-type keys. Each native kind is
// minted only by its own native-types module, which registers its key here at
// evaluation. checked-types.mjs therefore needs no static edge into those large
// module graphs (that edge formed evaluation cycles through host contracts,
// JSON contracts and monomorphic naming). Reserved kinds refuse until their
// owner registers, so a forged node never falls through to portable keys.
const RESERVED=Object.freeze(['routerBorrowedJsonTool','routerStandardTextMap','routerOrderedTextMap']);
const handlers=new Map();
export function registerCheckedTypeKey(kind,key){
  if(!RESERVED.includes(kind)||typeof key!=='function')throw new TypeError('Unsupported native checked-type key registration');
  if(handlers.has(kind)&&handlers.get(kind)!==key)throw new TypeError(`Native checked-type key already registered: ${kind}`);
  handlers.set(kind,key);
}
export function nativeCheckedTypeKey(type){
  const kind=type?.kind;if(typeof kind!=='string'||!RESERVED.includes(kind))return null;
  const key=handlers.get(kind);if(!key)throw new TypeError(`Native checked-type key is not registered: ${kind}`);
  const result=key(type);if(typeof result!=='string')throw new TypeError(`Native checked-type key refused: ${kind}`);
  return result;
}
