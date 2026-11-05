// ASCII token runs are source DATA, local to one string evaluation.
// No source/checker/owner/verdict cache, authority or runtime limit change.
const token=code=>code>=48&&code<=57||code>=65&&code<=90||code>=97&&code<=122||code===46||code===45||code===95;
function bearerAt(text,at){
 if(at+7>text.length||text.charCodeAt(at+6)!==32)return false;
 const expected='bearer';
 for(let offset=0;offset<6;offset++){let code=text.charCodeAt(at+offset);if(code>=65&&code<=90)code+=32;if(code!==expected.charCodeAt(offset))return false;}return true;
}
export function redactCredentialTokenRuns(text){
 if(typeof text!=='string'||/\p{Surrogate}/u.test(text))throw new TypeError('Actual scalar-valid Rust text required');
 let runStart=-1,runEnd=-1,countedFrom=-1,dots=0,copied=0,position=0;const parts=[];
 function suffix(start){
  if(start<runStart||start>runEnd||start<countedFrom){
   runStart=start;runEnd=start;countedFrom=start;dots=0;
   while(runEnd<text.length&&token(text.charCodeAt(runEnd))){if(text.charCodeAt(runEnd)===46)dots++;runEnd++;}
  }else{
   while(countedFrom<start){if(text.charCodeAt(countedFrom)===46)dots--;countedFrom++;}
  }
 }
 while(position<text.length){
  const at=position,code=text.charCodeAt(position);position+=code>=0xd800&&code<=0xdbff?2:1;
  if(at<copied){position=copied;continue;}
  const bearer=bearerAt(text,at);
  if(!bearer&&!text.startsWith('eyJ',at))continue;
  const start=at+(bearer?7:0);suffix(start);
  if(runEnd>start&&(bearer||dots===2)){
   parts.push(text.slice(copied,start),'[redacted]');copied=runEnd;position=runEnd;
  }
 }
 parts.push(text.slice(copied));return parts.join('');
}
