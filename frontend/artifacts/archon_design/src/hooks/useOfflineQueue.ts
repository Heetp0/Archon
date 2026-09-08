import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  payload: any;
  status: "queued" | "synced" | "failed";
  retries: number;
  timestamp: string;
}

export default function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<QueuedRequest[]>([]);

  // Load queue on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("offlineQueue");
      if (stored) {
        try {
          setQueue(JSON.parse(stored));
        } catch (e) {
          setQueue([]);
        }
      }
    }
  }, []);

  // Save queue helper
  const saveQueue = (newQueue: QueuedRequest[]) => {
    setQueue(newQueue);
    if (typeof window !== "undefined") {
      localStorage.setItem("offlineQueue", JSON.stringify(newQueue));
    }
  };

  // Sync logic
  const syncRequests = async (activeQueue: QueuedRequest[]) => {
    const toSync = activeQueue.filter((r) => r.status === "queued" || r.status === "failed");
    if (toSync.length === 0) return;

    toast({
      title: "Connection restored",
      description: `Synchronizing ${toSync.length} offline request(s)...`,
    });

    try {
      // Get the stored auth token
      const token = localStorage.getItem("token") || "";
      
      const response = await fetch("/api/offline/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ requests: toSync }),
      });

      if (!response.ok) {
        throw new Error(`Sync HTTP error ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      // Update queue statuses
      const updated = activeQueue.map((req) => {
        const match = results.find((res: any) => res.id === req.id);
        if (match) {
          const isSuccess = match.status === "synced";
          return {
            ...req,
            status: match.status as "synced" | "failed",
            retries: isSuccess ? req.retries : req.retries + 1,
          };
        }
        return req;
      });

      // Prune requests older than 7 days
      const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const pruned = updated.filter((req) => {
        const ts = new Date(req.timestamp).getTime();
        return req.status !== "synced" || ts > limit;
      });

      saveQueue(pruned);

      const syncedCount = results.filter((res: any) => res.status === "synced").length;
      if (syncedCount > 0) {
        toast({
          title: "Synchronization complete",
          description: `Successfully synced ${syncedCount} request(s).`,
        });
      }
    } catch (err) {
      console.error("Offline sync failed:", err);
      toast({
        title: "Sync failed",
        description: "Failed to upload offline queue. Will retry later.",
        variant: "destructive",
      });
    }
  };

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const stored = localStorage.getItem("offlineQueue");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as QueuedRequest[];
          syncRequests(parsed);
        } catch (e) {}
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You are offline",
        description: "Your actions will be queued and synchronized when online.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const queueRequest = async (endpoint: string, method: string, payload: any) => {
    const id = "req-" + Math.random().toString(36).substring(2, 15);
    const newReq: QueuedRequest = {
      id,
      endpoint,
      method,
      payload,
      status: "queued",
      retries: 0,
      timestamp: new Date().toISOString(),
    };

    const updated = [...queue, newReq];
    saveQueue(updated);

    toast({
      title: "Saved offline",
      description: "Action added to offline sync queue.",
    });

    return { id, status: "queued", message: "offline_queued" };
  };

  const retryRequest = async (id: string) => {
    const target = queue.find((r) => r.id === id);
    if (!target) return;
    
    const updated = queue.map((r) => (r.id === id ? { ...r, status: "queued" as const } : r));
    saveQueue(updated);
    if (isOnline) {
      await syncRequests(updated);
    }
  };

  const clearQueue = () => {
    saveQueue([]);
  };

  return {
    isOnline,
    queue,
    queueRequest,
    retryRequest,
    clearQueue,
    queuedCount: queue.filter((r) => r.status === "queued").length,
  };
}
