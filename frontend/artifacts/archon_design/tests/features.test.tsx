import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeStorage, getDaemonConnectionDetails } from "../src/lib/storage";

describe("Features - safeStorage & getDaemonConnectionDetails", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should retrieve fallback value when storage throws or is empty", () => {
    expect(safeStorage.local.getItem("nonexistent", "default")).toBe("default");
    
    safeStorage.local.setItem("test_key", "test_value");
    expect(safeStorage.local.getItem("test_key", "default")).toBe("test_value");
    
    safeStorage.local.removeItem("test_key");
    expect(safeStorage.local.getItem("test_key", "default")).toBe("default");
  });

  it("should handle Replit proxies subdomain routing correctly", () => {
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      hostname: "localhost",
      protocol: "http:",
    });
    
    localStorage.setItem("archon_daemon_host", "localhost");
    localStorage.setItem("archon_daemon_port", "8765");
    
    let details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe("ws://localhost:8765");
    expect(details.httpUrl).toBe("http://localhost:8765");
    
    localStorage.setItem("archon_daemon_host", "workspace.replit.dev");
    
    details = getDaemonConnectionDetails();
    expect(details.wsUrl).toBe("wss://8765-workspace.replit.dev");
    expect(details.httpUrl).toBe("https://8765-workspace.replit.dev");
    
    vi.restoreAllMocks();
  });
});
