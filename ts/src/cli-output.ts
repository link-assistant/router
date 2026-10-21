// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=8fed68fafc86d913a47a359ef4bcaeda167629825bfc4e0873e7488936895761; dynamic any annotations are explicit draft gaps.
const columns: any = (values?: any, widths?: any): any => ((values.map as any)((value?: any, index?: any): string => String(value ?? '').padEnd((widths as any)[index] ?? 0)).join as any)('  ');
export function tokenTable(records?: any): string {
    const widths: Array<number> = [36, 10, 10, 8, 13, 15, 9, 8, 6, 0], rows: any = [columns(['id', 'issued_at', 'expires_at', 'revoked', 'requests', 'tokens', 'reserved', 'rpm', 'scope', 'label'], widths)];
    for (const record of records as any) {
        const number: any = (key?: any): any => (Number as any).isSafeInteger((record as any)[key]) && (record as any)[key] >= 0 ? (record as any)[key] : null;
        const usage: any = (used?: any, max?: any): string => `${number(used) ?? 0}/${number(max) ?? '-'}`;
        rows.push(columns([record.id ?? '', number('issued_at') ?? 0, number('expires_at') ?? 0, record.revoked ?? false, usage('used_requests', 'max_requests'), usage('used_tokens', 'max_tokens'), number('reserved_tokens') ?? 0, number('rate_limit_per_minute') ?? '-', record.scope || 'client', record.label ?? ''], widths));
    }
    return rows.join('\n');
}
export function renderNativeHuman(result?: any): any {
    const { operation, data }: any = result;
    if ((Array as any).isArray(data?.output))
        return (data.output.join as any)('\n');
    if (!result.success)
        return '';
    if (operation === 'version')
        return `router ${data.version} (${data.source_commit})`;
    if (['tokens.issue', 'tokens.rotate'].includes(operation))
        return data.token;
    if (operation === 'tokens.list')
        return tokenTable(data);
    if (operation === 'clients.list')
        return [columns(['client', 'installed', 'ownership', 'dialect', 'config'], [12, 9, 16, 19, 0]), ...(data.map as any)((row?: any): any => columns([row.client, row.installed, row.unreadable ? 'unreadable' : row.ownership_state, row.dialect, row.config_path], [12, 9, 16, 19, 0]))].join('\n');
    return (JSON as any).stringify(data, null, 2);
}
