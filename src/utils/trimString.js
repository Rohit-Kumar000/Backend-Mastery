// Returns a trimmed string, or "" when the value is not a string (guards against object/array payloads)
const trimString = (value) => (typeof value === "string" ? value.trim() : "");

export { trimString };
