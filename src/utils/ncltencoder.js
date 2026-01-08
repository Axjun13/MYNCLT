export function enc(value) {
  if (value === undefined || value === null) return "";
  return Buffer.from(String(value)).toString("base64");
}
