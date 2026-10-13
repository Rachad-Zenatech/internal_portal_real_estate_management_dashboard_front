// Universal environment variable reader for Vite and Metro / React Native

export function getEnv(key: string, defaultValue = ""): string {
  try {
    // 1. Check Vite's import.meta.env
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    if (metaEnv && key in metaEnv) {
      const val = metaEnv[key];
      if (val !== undefined && val !== null) return String(val);
    }
  } catch {
    // Ignore error in non-module environments
  }

  try {
    // 2. Check Node / Metro process.env
    const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, unknown> } })?.process;
    if (globalProcess?.env && key in globalProcess.env) {
      const val = globalProcess.env[key];
      if (val !== undefined && val !== null) return String(val);
    }
  } catch {
    // Ignore error
  }

  return defaultValue;
}

function getNativeApiBaseUrl(): string {
  try {
    const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, unknown> } })?.process;
    const val = globalProcess?.env?.EXPO_PUBLIC_API_BASE_URL;
    return val ? String(val) : "";
  } catch {
    return "";
  }
}

export function getApiBaseUrl(): string {
  const envUrl = getNativeApiBaseUrl() || getEnv("VITE_API_BASE_URL", "");
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  // In production browser environments, use window.location.origin
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.origin &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.includes("127.0.0.1")
  ) {
    return window.location.origin;
  }
  return "http://localhost:8900";
}
