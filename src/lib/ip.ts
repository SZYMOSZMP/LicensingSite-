const IP_HEADER = "x-xkl-client-ip";

export function clientIp(headers: Headers): string {
  return headers.get(IP_HEADER) || "unknown";
}

export const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
export const IP_RE = new RegExp(`${IPV4_RE.source}|^[0-9a-fA-F:]{2,39}$`);
