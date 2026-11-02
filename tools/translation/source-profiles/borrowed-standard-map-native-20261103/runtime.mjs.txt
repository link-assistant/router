// Standard Map read-only predicate. No opaque bounded-map conversion or scan.
import {types} from 'node:util';
const apply=Reflect.apply,get=Map.prototype.get,has=Map.prototype.has;
export const BORROWED_MAP_LITERAL_LIMIT=64;
function scalar(value){
 if(typeof value!=='string')throw TypeError('Borrowed map primitive scalar string required');
 for(let at=0;at<value.length;at++){
  const unit=value.charCodeAt(at);if(unit>=0xd800&&unit<=0xdbff){const low=value.charCodeAt(++at);if(!(low>=0xdc00&&low<=0xdfff))throw TypeError('Borrowed map unpaired surrogate');}
  else if(unit>=0xdc00&&unit<=0xdfff)throw TypeError('Borrowed map unpaired surrogate');
 }return value;
}
export function router_borrowed_text_map_matches_literals(map,key,literals){
 if(types.isProxy(map)||!types.isMap(map))throw TypeError('Borrowed map genuine native Map required');
 scalar(key);
 if(!Array.isArray(literals)||types.isProxy(literals)||Object.getPrototypeOf(literals)!==Array.prototype||literals.length>BORROWED_MAP_LITERAL_LIMIT)throw TypeError('Borrowed map bounded ordinary literal array required');
 const fields=Object.getOwnPropertyDescriptors(literals);
 if(Reflect.ownKeys(fields).length!==literals.length+1)throw TypeError('Borrowed map dense own literal data required');
 const choices=[];for(let at=0;at<literals.length;at++){
  const field=fields[at];if(!field||!Object.hasOwn(field,'value')||!field.enumerable)throw TypeError('Borrowed map literal accessor/hole refused');choices.push(scalar(field.value));
 }
 const value=apply(get,map,[key]);
 if(value===undefined&&!apply(has,map,[key]))return false;
 if(typeof value!=='string')throw TypeError('Borrowed map observed value is not text');
 // Only equality against checked scalar literals is observable. A nonmatching
 // value is never traversed or returned as a supposedly qualified Rust str.
 for(const choice of choices)if(value===choice)return true;return false;
}
