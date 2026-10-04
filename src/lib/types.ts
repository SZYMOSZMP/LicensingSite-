export type Marketplace = "none" | "builtbybit" | "polymart" | "tebex";
export const MARKETPLACES: Marketplace[] = ["none", "builtbybit", "polymart", "tebex"];
export const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  none: "None (manual keys)",
  builtbybit: "BuiltByBit",
  polymart: "Polymart (Voxel Shop)",
  tebex: "Tebex",
};

export type LicenseSource = "manual" | "api" | "builtbybit" | "polymart" | "tebex";

export interface Plugin {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  marketplace: Marketplace;
  marketplace_id: string | null;
  marketplace_url: string | null;
  default_max_ips: number;
  default_duration_days: number;
  created_at: number;
}

export interface PluginWithStats extends Plugin {
  license_count: number;
  active_servers: number;
}

export interface License {
  key: string;
  plugin_id: string;
  user: string | null;
  note: string | null;
  max_ips: number;
  expires_at: number | null;
  enabled: number;
  source: LicenseSource;
  source_ref: string | null;
  created_at: number;
  last_validated_at: number | null;
}

export interface LicenseWithStats extends License {
  plugin_name: string;
  active_servers: number;
}

export interface BlacklistEntry {
  id: string;
  ip: string;
  reason: string | null;
  created_at: number;
}

export type ValidationStatus =
  | "valid"
  | "invalid_format"
  | "not_found"
  | "expired"
  | "max_ips"
  | "blacklisted"
  | "disabled"
  | "invalid_polymart"
  | "rate_limited"
  | "server_error";

export const STATUS_MESSAGES: Record<ValidationStatus, string> = {
  valid: "License is valid",
  invalid_format: "License key or plugin ID is in an invalid format",
  not_found: "License not found for this plugin",
  expired: "License has expired",
  max_ips: "License is already in use on the maximum number of servers",
  blacklisted: "This server's IP address is blacklisted",
  disabled: "License has been disabled",
  invalid_polymart: "Polymart purchase could not be verified",
  rate_limited: "Too many requests, try again in a minute",
  server_error: "Internal server error",
};

/** A server counts as active if it sent a heartbeat within this window. */
export const SESSION_TIMEOUT_MS = 90_000;

export class UserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
