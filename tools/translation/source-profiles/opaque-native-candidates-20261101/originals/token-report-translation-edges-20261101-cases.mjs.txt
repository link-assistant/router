// Independent caller expectations, SOURCE / UNRUN. This helper is not compiler
// or coverage authority. Its future caller must supply the ACTUAL compiled
// whole-module row export; a handwritten callback is not receiving evidence.
import assert from 'node:assert/strict';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
function expectedColumns(fields){
 const widths=[36,10,10,8,13,15,9,8,6];
 return widths.map((width,index)=>fields[index]+' '.repeat(Math.max(0,width-Array.from(fields[index]).length))+'  ').join('')+fields[9];
}
const defaults=['','0','0','false','0/-','0/-','0','-','client',''];
export const TOKEN_REPORT_TRANSLATION_EDGE_CASES=Object.freeze([
 ...['null','true','[]','{}'].map((input,index)=>Object.freeze({id:'nonobject-or-empty-'+index,input,expected:expectedColumns(defaults)})),
 Object.freeze({id:'wrong-kinds',input:'{"id":[],"issued_at":null,"expires_at":"3","revoked":"true","used_requests":-1,"max_requests":1.5,"used_tokens":false,"max_tokens":null,"reserved_tokens":[],"rate_limit_per_minute":{},"scope":"","label":7}',expected:expectedColumns(defaults)}),
 Object.freeze({id:'zero-float-and-whitespace',input:'{"id":"zero","issued_at":1.0,"expires_at":0,"revoked":true,"used_requests":0,"max_requests":0,"used_tokens":-1,"max_tokens":0.0,"reserved_tokens":0,"rate_limit_per_minute":0,"scope":" ","label":""}',expected:expectedColumns(['zero','0','0','true','0/0','0/-','0','0',' ',''])}),
 Object.freeze({id:'unsigned-precision',input:'{"id":"large","issued_at":9007199254740993,"expires_at":18446744073709551615,"revoked":false,"used_requests":18446744073709551615,"max_requests":9007199254740993,"used_tokens":9007199254740993,"max_tokens":18446744073709551615,"reserved_tokens":18446744073709551615,"rate_limit_per_minute":9007199254740993,"scope":"admin","label":"max"}',expected:expectedColumns(['large','9007199254740993','18446744073709551615','false','18446744073709551615/9007199254740993','9007199254740993/18446744073709551615','18446744073709551615','9007199254740993','admin','max'])}),
 Object.freeze({id:'unicode-width-and-label',input:'{"id":"é😀","scope":"🧱","label":"λ{}\\n  tail"}',expected:expectedColumns(['é😀','0','0','false','0/-','0/-','0','-','🧱','λ{}\n  tail'])}),
 Object.freeze({id:'no-truncation',input:'{"id":"'+ 'x'.repeat(72)+'","scope":"unbounded","label":"  "}',expected:expectedColumns(['x'.repeat(72),'0','0','false','0/-','0/-','0','-','unbounded','  '])}),
]);
export function assertTokenReportTranslationEdgeCases(actualWholeModuleRow){
 assert.equal(typeof actualWholeModuleRow,'function');
 for(const row of TOKEN_REPORT_TRANSLATION_EDGE_CASES){
  const input=serde_json_from_str(row.input);assert.equal(input.$,'Ok',row.id);
  const actual=actualWholeModuleRow(input.field0);assert.equal(typeof actual,'string',row.id);
  assert.equal(actual,row.expected,row.id);
 }
 return Object.freeze({cases:TOKEN_REPORT_TRANSLATION_EDGE_CASES.length,caller:'token_report::row',assertionsCompleted:true,nativeParityQualified:false,semanticAuthority:false,coverageAuthority:false});
}
