// Source contract: src/token_reservation.rs; UTF-8 byte lengths match Rust str.len().
const totalStrings=value=>typeof value==='string'?Buffer.byteLength(value):value && typeof value==='object'?Object.values(value).reduce((sum,child)=>Math.min(Number.MAX_SAFE_INTEGER,sum+totalStrings(child)),0):0;
export function estimateRequestBudget(body) {
  let characters=0;for(const field of ['messages','input','contents','system','prompt','tools'])characters=Math.min(Number.MAX_SAFE_INTEGER,characters+totalStrings(body?.[field]));
  const caps=[body?.max_output_tokens,body?.max_completion_tokens,body?.max_tokens,body?.generationConfig?.maxOutputTokens];
  const output=caps.find(value=>Number.isSafeInteger(value) && value>=0) ?? 4096,input=Math.ceil(characters/4);
  return {input,output,total:Math.min(Number.MAX_SAFE_INTEGER,input+output)};
}
