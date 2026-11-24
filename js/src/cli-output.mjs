/** CLI presentation shared by local and selected-remote operation results. */
const columns=(values,widths)=>values.map((value,index)=>String(value ?? '').padEnd(widths[index] ?? 0)).join('  ');
export function tokenTable(records) {
  const widths=[36,10,10,8,13,15,9,8,6,0],rows=[columns(['id','issued_at','expires_at','revoked','requests','tokens','reserved','rpm','scope','label'],widths)];
  for (const record of records) {
    const number=key=>Number.isSafeInteger(record[key]) && record[key]>=0 ? record[key] : null;
    const usage=(used,max)=>`${number(used) ?? 0}/${number(max) ?? '-'}`;
    rows.push(columns([record.id ?? '',number('issued_at') ?? 0,number('expires_at') ?? 0,record.revoked ?? false,usage('used_requests','max_requests'),usage('used_tokens','max_tokens'),number('reserved_tokens') ?? 0,number('rate_limit_per_minute') ?? '-',record.scope || 'client',record.label ?? ''],widths));
  }
  return rows.join('\n');
}
export function renderNativeHuman(result) {
  const {operation,data}=result;
  if (Array.isArray(data?.output)) return data.output.join('\n');
  if (!result.success) return '';
  if (operation==='version') return `router ${data.version} (${data.source_commit})`;
  if (['tokens.issue','tokens.rotate'].includes(operation)) return data.token;
  if (operation==='tokens.list') return tokenTable(data);
  if (operation==='clients.list') return [columns(['client','installed','ownership','dialect','config'],[12,9,16,19,0]),...data.map(row=>columns([row.client,row.installed,row.unreadable ? 'unreadable' : row.ownership_state,row.dialect,row.config_path],[12,9,16,19,0]))].join('\n');
  return JSON.stringify(data,null,2);
}
