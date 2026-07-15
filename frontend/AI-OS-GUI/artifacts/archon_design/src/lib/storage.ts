export const safeStorage = {
  local: {
    getItem(key: string, fallback: string = ""): string {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch (e) {
        console.warn(`Failed to read from localStorage: ${key}`, e);
        return fallback;
      }
    },
    setItem(key: string, value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn(`Failed to write to localStorage: ${key}`, e);
      }
    },
    removeItem(key: string): void {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove from localStorage: ${key}`, e);
      }
    }
  },
  session: {
    getItem(key: string, fallback: string = ""): string {
      try {
        return sessionStorage.getItem(key) ?? fallback;
      } catch (e) {
        console.warn(`Failed to read from sessionStorage: ${key}`, e);
        return fallback;
      }
    },
    setItem(key: string, value: string): void {
      try {
        sessionStorage.setItem(key, value);
      } catch (e) {
        console.warn(`Failed to write to sessionStorage: ${key}`, e);
      }
    },
    removeItem(key: string): void {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove from sessionStorage: ${key}`, e);
      }
    }
  }
};

export interface ConnectionDetails {
  wsUrl: string;
  httpUrl: string;
}

export function getDaemonConnectionDetails(): ConnectionDetails {
  const host = safeStorage.local.getItem("archon_daemon_host") || window.location.hostname || "localhost";
  const port = safeStorage.local.getItem("archon_daemon_port") || "8765";
  const isSecure = window.location.protocol === "https:";
  
  // Check if host ends with .replit.dev, .replit.app, or .replit.co
  const isReplit = host.endsWith(".replit.dev") || host.endsWith(".replit.app") || host.endsWith(".replit.co");
  
  if (isReplit) {
    // Replit maps ports as subdomain prefixes: wss://8765-repl-name.user.replit.dev
    const cleanHost = host.startsWith(`${port}-`) ? host : `${port}-${host}`;
    return {
      wsUrl: `wss://${cleanHost}`,
      httpUrl: `https://${cleanHost}`
    };
  } else {
    // Normal connection
    const wsProtocol = isSecure ? "wss" : "ws";
    const httpProtocol = isSecure ? "https" : "http";
    return {
      wsUrl: `${wsProtocol}://${host}:${port}`,
      httpUrl: `${httpProtocol}://${host}:${port}`
    };
  }
}


export function persist<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to persist "${key}":`, e);
  }
}
