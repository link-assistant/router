// GENERATED: node scripts/regenerate-js-first.mjs
// Independently checked top-level bodies from js/src/response-contracts.mjs; source sha256=09feb4c2763d15abcd6c7a630ca7bb708dc13150469d0106a20d40ad91b9d40e; IR sha256=7bafac23e281281c357cb010bad372a757a6679720074b0022249045d5c47124.
// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.
export {};
export function responseNotFound(): Response {
    return Response.json({"error": {"message": "Response not found", "type": "invalid_request_error", "param": null, "code": "response_not_found"}}, {"status": 404});
}

export function responseReferenceMissing(): Response {
    return Response.json({"error": {"type": "not_found_error", "message": "the referenced response resource is unavailable"}}, {"status": 404});
}

export function responseReferenceConflict(): Response {
    return Response.json({"error": {"type": "invalid_request_error", "message": "the referenced response resources do not share one provider account"}}, {"status": 409});
}

export function conversationUnsupported(): Response {
    return Response.json({"error": {"type": "invalid_request_error", "message": "the selected service does not support native Conversations resources"}}, {"status": 400});
}

export function conversationMethodNotAllowed(): Response {
    return Response.json({"error": {"type": "invalid_request_error", "message": "the requested Conversations operation is not supported"}}, {"status": 405});
}

export function validConversationId(id?: unknown): boolean {
    return (((((typeof id) === "string") && (id.length > 0)) && (Buffer.byteLength(id) <= 256)) && (!/[\u{2f}\u{0}-\u{1f}\u{7f}-\u{9f}]/u.test(id)));
}
