export function showStaffTools(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}
