# Shared HTTP value compatibility core source draft

Twelve matching native/JS operations draft header normalization, repeated header
lookup, append/set/remove, request/response values, status/success and base64,
strict UTF8 and exact JSON body access. Headers use ordered name/base64-value
pairs: names normalize to ASCII lowercase, repeated values retain order and
binary values remain bytes. Setting a header replaces all its old values at the
first old position. Empty values, empty bodies and JSON null remain distinct.

Requests and responses are ordinary checked JSON values, not privileged network
capabilities. This library does not execute a transport. Methods and HTTP(S)
URLs validate explicitly; URL credentials and fragments remain outside this
interface. Status accepts the actual 100–999 domain and success means 200–299.
Strict UTF8 retains an initial BOM. JSON uses the existing exact parser instead
of JavaScript number parsing, preserving full unsigned integers.

The interface bounds names to 256 ASCII bytes, headers to 128 entries and
65,536 decoded bytes, URLs to 8,192 ASCII bytes, methods to 32 bytes and encoded
bodies to one MiB. New header values reject size/control errors before building
a replacement JSON value. Text reads decode base64 once. These API bounds do
not change original CI commands, resource bounds or case deadlines.

The catalog generates declarations. Complete native root/producer source copies
retain full CST/inverse histories and the ordered language/repository sequences.
Independent JS and Rust oracle source covers duplicate/binary headers, invalid
controls, base64 padding, size limits, URL edge cases, empty variants, UTF8 and
JSON number/null boundaries. Nothing has executed. Actual caller/loan checking,
both translation directions/interpreters, dependency/source qualification,
assets/export closure, network transport, cancellation/stream integration,
production use and all other incomplete requirements remain open.
