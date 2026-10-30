// Closed nonbinding match arm source bounds. No pattern type, value, owner,
// exhaustiveness, availability or executable permission is inferred here.
const identifier=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
function closedPattern(rows,tick,close,depth=0){
 if(!rows.length||rows.length>128||depth>64)return false;tick();const parts=[];let from=rows[0].text==='|'?1:0;if(from===rows.length)return false;
 for(let at=from;at<rows.length;at++){tick();const word=rows[at].text;if(['(','[','{'].includes(word)){const end=close(rows,at);if(end<at||end>=rows.length)return false;at=end;}else if(word==='|'){if(at===from)return false;parts.push(rows.slice(from,at));from=at+1;}else if([')',']','}'].includes(word))return false;}
 if(from===rows.length)return false;parts.push(rows.slice(from));
 const path=part=>{if(!part.length)return false;let at=part[0].text==='::'?1:0,segments=0;while(at<part.length){tick();if(!identifier(part[at++]))return false;segments++;if(at===part.length)break;if(part[at++].text!=='::'||at===part.length)return false;}return segments>0;};
 const scalar=part=>part.length===1&&(['_','true','false'].includes(part[0].text)||['number','string','char'].includes(part[0].type))||part.length===2&&part[0].text==='-'&&part[1].type==='number'||path(part)&&(part[0].text==='::'||part.some(row=>row.text==='::'));
 function fields(part,record){
  const entries=[];let start=0;for(let at=0;at<part.length;at++){tick();const word=part[at].text;if(['(','[','{'].includes(word)){const end=close(part,at);if(end<at||end>=part.length)return false;at=end;}else if(word===','){if(at===start)return false;entries.push(part.slice(start,at));start=at+1;}else if([')',']','}'].includes(word))return false;}if(start<part.length)entries.push(part.slice(start));let rests=0;
  for(let at=0;at<entries.length;at++){tick();const entry=entries[at];if(entry.length===1&&entry[0].text==='..'){if(++rests>1||record&&at!==entries.length-1)return false;continue;}const child=record?entry.slice(2):entry;if(record&&(!identifier(entry[0])||entry[0].text==='_'||entry[1]?.text!==':'))return false;if(!closedPattern(child,tick,close,depth+1))return false;}return true;
 }
 return parts.every(part=>{
  tick();if(!part.length)return false;if(scalar(part))return true;
  if(part[0].text==='&'){const start=part[1]?.text==='mut'?2:1;return start<part.length&&closedPattern(part.slice(start),tick,close,depth+1);}
  if(['(','['].includes(part[0].text)&&close(part,0)===part.length-1)return fields(part.slice(1,-1),false);
  for(let at=0;at<part.length;at++){tick();if(['(','[','{'].includes(part[at].text)){const end=close(part,at);if(end<at||end>=part.length)return false;at=end;}else if(['..','..='].includes(part[at].text)){const endpoint=value=>scalar(value)&&!(value.length===1&&['_','true','false'].includes(value[0].text));return at>0&&at<part.length-1&&endpoint(part.slice(0,at))&&endpoint(part.slice(at+1));}}
  let open=part.findIndex(row=>row.text==='('||row.text==='{');if(open<=0||!path(part.slice(0,open))||close(part,open)!==part.length-1)return false;return fields(part.slice(open+1,-1),part[open].text==='{');
 });
}
export function readClosedMatchArmSourceBounds(tokens,start,end,{close}){
 if(!Array.isArray(tokens)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>tokens.length||end-start>200000||tokens[start]?.text!=='match'||tokens[end-1]?.text!=='}')return null;let work=0;const tick=()=>{if(++work>200000)throw new RangeError('Complete closed match source-cell bound');};let open=start+1;
 for(;open<end&&tokens[open].text!=='{';open++){tick();if(['(','['].includes(tokens[open].text)){const last=close(tokens,open);if(last<open||last>=end)return null;open=last;}}
 if(open<=start+1||close(tokens,open)!==end-1)return null;const arms=[];let cursor=open+1;
 while(cursor<end-1){tick();if(arms.length>=512)throw new RangeError('Complete closed match source arm bound');const patternStart=cursor;let arrow=-1;
  for(;cursor<end-1;cursor++){tick();if(tokens[cursor].text==='=>'){arrow=cursor;break;}if(['(','[','{'].includes(tokens[cursor].text)){const last=close(tokens,cursor);if(last<cursor||last>=end-1)return null;work+=last-cursor;tick();cursor=last;continue;}if([')',']','}',',',';','if','@','!'].includes(tokens[cursor].text)||tokens[cursor].text.endsWith('!'))return null;}
  if(arrow<0||!closedPattern(tokens.slice(patternStart,arrow),tick,close))return null;const expressionStart=arrow+1;cursor=expressionStart;if(cursor>=end-1)return null;
  // A complete standalone block arm may omit its separating comma in Rust.
  if(tokens[cursor].text==='{'){const last=close(tokens,cursor);if(last<cursor||last>=end-1)return null;cursor=last+1;if(cursor<end-1&&tokens[cursor].text!==','){arms.push({patternStart,patternEnd:arrow,expressionStart,expressionEnd:cursor,sourceAuthority:false,semanticAuthority:false});continue;}}
  for(;cursor<end-1&&tokens[cursor].text!==',';cursor++){tick();if(['(','[','{'].includes(tokens[cursor].text)){const last=close(tokens,cursor);if(last<cursor||last>=end-1)return null;cursor=last;}else if([')',']','}',';','=>'].includes(tokens[cursor].text))return null;}
  if(cursor===expressionStart)return null;arms.push({patternStart,patternEnd:arrow,expressionStart,expressionEnd:cursor,sourceAuthority:false,semanticAuthority:false});if(tokens[cursor]?.text===',')cursor++;
 }
 return arms.length?{schema:'closed-match-arm-source-bounds-v1',arms,visited:work,patternTypesProved:false,exhaustivenessProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}

// Fresh nonbinding match source inventory only. No AST/type/owner verdict is
// cached or issued, and opaque callbacks keep their own separate scope.
export function collectClosedMatchPatternSource(input,{opaqueRegions=[]}={}){
 if(!Array.isArray(input)||input.length>200000)throw new TypeError('Complete bounded closed match source tokens required');const tokens=outsideOpaqueSourceTokens(input,opaqueRegions),positions=new Set(),matches=[],refusals=[];let visited=0;const tick=(count=1)=>{visited+=count;if(visited>200000)throw new RangeError('Complete nonbinding match source work bound');};
 const group=(rows,start)=>{const pairs={'(':')','[':']','{':'}'},stack=[];if(!pairs[rows[start]?.text])return -1;for(let at=start;at<rows.length;at++){tick();if(rows[at].type!=='punct')continue;const word=rows[at].text;if(pairs[word]){if(stack.length>=64)return -1;stack.push(pairs[word]);}else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;};
 for(let at=0;at<tokens.length;at++){
  tick();if(tokens[at].text!=='match')continue;if(matches.length+refusals.length>=512)throw new RangeError('Complete nonbinding match source record bound');let open=at+1;for(;open<tokens.length&&tokens[open].text!=='{';open++){tick();if(['(','['].includes(tokens[open].text)){const end=group(tokens,open);if(end<open)break;open=end;}else if([';',')',']','}'].includes(tokens[open].text))break;}
  const end=tokens[open]?.text==='{'?group(tokens,open):-1,selected=end>=open?readClosedMatchArmSourceBounds(tokens,at,end+1,{close:group}):null;if(!selected){refusals.push({sourceStart:tokens[at].start,reason:'complete closed original nonbinding match arms required',sourceAuthority:false,semanticAuthority:false});continue;}
  tick(selected.visited);const pipes=[];for(const arm of selected.arms)for(let cursor=arm.patternStart;cursor<arm.patternEnd;cursor++){tick();if(tokens[cursor].text==='|'){positions.add(tokens[cursor].start);pipes.push(tokens[cursor].start);}}matches.push({span:{start:tokens[at].start,end:tokens[end].end},patternPipePositions:pipes,armCount:selected.arms.length,patternBindingsIntroduced:false,patternTypesProved:false,exhaustivenessProved:false,sourceAuthority:false,semanticAuthority:false});
 }
 return {schema:'closed-match-pattern-source-inventory-v1',positions,matches,refusals,visited,callerScopeProved:false,patternTypesProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false,crossInvocationCache:false};
}
import {outsideOpaqueSourceTokens} from './opaque-source-token-regions.mjs';
