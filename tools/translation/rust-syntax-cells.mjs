// Invocation-local concrete comparison; no digest or encoded-result cache.
import {rustTokens} from './rust-structure.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
export function rustSyntaxCells(source){
 assertReverseConcreteSourceHost();if(typeof source!=='string'||source.length>2097152)throw new TypeError('Bounded complete Rust source required');
 const tokens=rustTokens(source),cells=[];
 for(let index=0;index<tokens.length;index++){const token=tokens[index];if(token.type==='comment')continue;if(cells.length>=200000)throw new TypeError('Complete Rust syntax cell budget exceeded');cells[cells.length]=[token.type,token.text];}
 assertReverseConcreteSourceHost();return cells;
}
export function equalRustSyntaxCells(left,right){
 assertReverseConcreteSourceHost();if(left.length!==right.length)return false;
 for(let index=0;index<left.length;index++)if(left[index][0]!==right[index][0]||left[index][1]!==right[index][1])return false;
 assertReverseConcreteSourceHost();return true;
}
export function sameRustSourceSyntax(left,right){return equalRustSyntaxCells(rustSyntaxCells(left),rustSyntaxCells(right));}
