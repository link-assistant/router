const lineLimit = 256 * 1024;
const queueLimit = 64;
const maximumTokenLength = 116;
const decoder = new TextDecoder('utf-8',{fatal:true});

// The same event can carry several independent text outputs. Keep fragments
// separate even when the provider interleaves their events.
function visitDeltas(event,visit) {
  switch (event.type) {
    case 'response.output_text.delta':
    case 'response.text.delta':
      visit(event,'delta',['response',event.response_id,event.item_id,event.output_index,event.content_index]);
      return;
    case 'content_block_delta':
      if (event.delta?.type === 'text_delta') visit(event.delta,'text',['anthropic',event.index]);
      return;
  }
  if (Array.isArray(event.choices)) {
    event.choices.forEach((choice,index) => {
      if (choice?.delta) visit(choice.delta,'content',['choices',event.id,choice.index ?? index]);
    });
  }
  if (Array.isArray(event.candidates)) {
    event.candidates.forEach((candidate,index) => {
      if (Array.isArray(candidate?.content?.parts)) {
        candidate.content.parts.forEach((part,partIndex) => visit(part,'text',['candidates',candidate.index ?? index,partIndex]));
      }
    });
  }
}

function trailingPrefix(text,tokens) {
  const start = Math.max(0,text.length - maximumTokenLength + 1);
  for (let at = text.indexOf('[',start); at !== -1; at = text.indexOf('[',at + 1)) {
    const tail = text.slice(at);
    if (tokens.some(token => token.length > tail.length && token.startsWith(tail))) return tail;
  }
  return '';
}

// Hold a bounded group only while a delta ends in a prefix of a known token.
// If interrupted, relay every original record so an incomplete match cannot
// remove ordinary provider text. The byte-level restorer runs afterward.
export function joinSensitiveDataDeltas(body,replacements) {
  const tokens = [...replacements.keys()];
  const pending = new Map();
  const queue = [];
  let queueBytes = 0;
  let line = Buffer.alloc(0);
  let skipLine = false;
  function drain(controller,changed) {
    for (const entry of queue) controller.enqueue(changed ? entry.joined : entry.original);
    queue.length = 0;
    queueBytes = 0;
    pending.clear();
  }
  function eventLine(original,controller) {
    let joined = original;
    let terminal = false;
    if (original.subarray(0,5).toString('latin1') === 'data:') {
      try {
        const text = decoder.decode(original);
        const payload = text.slice(5).trim();
        terminal = payload === '[DONE]';
        if (!terminal) {
          const event = JSON.parse(payload);
          if (event && typeof event === 'object' && !Array.isArray(event)) {
            terminal = /^(?:response\.(?:completed|done|failed|incomplete)|message_stop)$/.test(event.type);
            let changed = false;
            visitDeltas(event,(field,key,lane) => {
              if (typeof field?.[key] !== 'string' || lane.some(part => part != null &&
                !(typeof part === 'string' && part.length <= 256) && !Number.isSafeInteger(part))) return;
              const id = JSON.stringify(lane);
              const text = (pending.get(id) ?? '') + field[key];
              const tail = trailingPrefix(text,tokens);
              if (tail) pending.set(id,tail);
              else pending.delete(id);
              const output = text.slice(0,text.length - tail.length);
              if (output !== field[key]) { field[key] = output; changed = true; }
            });
            if (changed) joined = Buffer.from(`data: ${JSON.stringify(event)}${text.endsWith('\r\n') ? '\r\n' : '\n'}`);
          }
        }
      } catch {
        // Malformed or opaque data lines retain their original bytes.
      }
    }
    queue.push({original,joined});
    queueBytes += original.length;
    if (terminal || queue.length >= queueLimit || queueBytes > lineLimit || pending.size > queueLimit) drain(controller,false);
    else if (!pending.size) drain(controller,true);
  }
  return body.pipeThrough(new TransformStream({
    transform(chunk,controller) {
      const input = Buffer.from(chunk);
      for (let start = 0; start < input.length;) {
        const newline = input.indexOf(10,start);
        const end = newline < 0 ? input.length : newline + 1;
        const next = input.subarray(start,end);
        if (skipLine || line.length + next.length > lineLimit) {
          drain(controller,false);
          if (line.length) controller.enqueue(line);
          controller.enqueue(next);
          line = Buffer.alloc(0);
          skipLine = newline < 0;
        } else {
          line = line.length ? Buffer.concat([line,next]) : next;
          if (newline >= 0) {
            eventLine(line,controller);
            line = Buffer.alloc(0);
          }
        }
        start = end;
      }
    },
    flush(controller) {
      drain(controller,false);
      if (line.length) controller.enqueue(line);
    },
  }));
}
