import type { Marketplace } from "./types";

/**
 * Accepts either a raw ID or a marketplace URL and returns the numeric resource ID.
 *   https://builtbybit.com/resources/my-plugin.12345/  -> 12345
 *   https://polymart.org/resource/my-plugin.1234       -> 1234
 *   https://voxel.shop/product/1234/my-plugin          -> 1234
 *   https://store.example.com/package/5232113          -> 5232113
 */
export function parseMarketplaceId(type: Marketplace, input: string): string | null {
  const value = input.trim();
  if (!value || type === "none") return null;
  if (/^\d+$/.test(value)) return value;
  let m: RegExpMatchArray | null = null;
  if (type === "builtbybit" || type === "polymart") {
    m = value.match(/\.(\d+)\/?(?:[?#].*)?$/) || value.match(/\/(?:resources?|products?)\/(\d+)/);
  } else if (type === "tebex") {
    m = value.match(/\/package\/(\d+)/) || value.match(/(\d+)\/?(?:[?#].*)?$/);
  }
  return m ? m[1] : null;
}

export function marketplaceIdLabel(type: Marketplace): string {
  switch (type) {
    case "builtbybit":
      return "BuiltByBit resource URL or ID";
    case "polymart":
      return "Polymart resource URL or ID";
    case "tebex":
      return "Tebex package ID";
    default:
      return "";
  }
}
