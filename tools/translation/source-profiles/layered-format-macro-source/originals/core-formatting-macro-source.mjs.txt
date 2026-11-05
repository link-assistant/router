// Canonical existing core format! source result candidate only. Its complete
// source/native binding and every real argument still require independent checks.
import {readQualifiedSourceMacroTokens} from './qualified-source-call-tokens.mjs';
export function readCoreFormattingMacroSource(rows){
 if(!Array.isArray(rows)||rows.length<8||rows.length>256||rows[0]?.text!=='crate'||rows[1]?.text!=='::'||rows[2]?.text!=='translation_core'||rows[3]?.text!=='::'||rows[4]?.text!=='format'||rows[5]?.text!=='!')return null;
 const macro=readQualifiedSourceMacroTokens(rows);if(!macro||macro.path.length!==3||macro.path[0]!=='crate'||macro.path[1]!=='translation_core'||macro.path[2]!=='format'||macro.body[0]?.type!=='string'||!/^(?:"|r#{0,255}")/u.test(macro.body[0].text)||macro.body.length>1&&macro.body[1].text!==',')return null;
 return {kind:'payload',domain:'text-owned',binding:null,bridge:'complete-canonical-format-macro-source',macro,macroOwnerProved:false,formatArgumentsChecked:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
