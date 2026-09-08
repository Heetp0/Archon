import React, { useState, useEffect } from "react";
import { RefreshCw, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";

interface NewsItem {
  title: string;
  url: string;
  source: string;
  score: number;
  published_at: string;
  summary: string;
}

function timeAgo(isoString: string): string {
  try {
    const past = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    if (isNaN(diffMs)) return "";
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch (e) {
    return "";
  }
}

export default function NewsWidget() {
  const [category, setCategory] = useState<string>("all");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.fetch(`/api/news?category=${cat}&limit=10`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch`);
      }
      const data = await response.json();
      setNews(data);
    } catch (err: any) {
      setError(err.message || "Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(category);
  }, [category]);

  const handleRefresh = () => {
    fetchNews(category);
  };

  const getSourceBadgeStyles = (source: string) => {
    switch (source) {
      case "HackerNews":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "ArXiv":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "ProductHunt":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="w-full bg-panel-bg/40 border border-border-core rounded-xl p-4 flex flex-col h-full shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-border-core pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 className="text-sm font-mono font-medium text-text-primary tracking-tight">Live Intelligence Feed</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg border border-border-core bg-panel-bg text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 flex-shrink-0 scrollbar-thin">
        {[
          { id: "all", label: "All" },
          { id: "hackernews", label: "HackerNews" },
          { id: "arxiv", label: "arXiv cs.AI" },
          { id: "producthunt", label: "ProductHunt" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategory(tab.id)}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors flex-shrink-0 ${
              category === tab.id
                ? "bg-text-primary text-panel-bg border-text-primary font-medium"
                : "border-border-core text-text-secondary hover:text-text-primary hover:bg-panel-bg"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-text-secondary">
            <Loader2 className="w-6 h-6 animate-spin text-text-primary" />
            <span className="text-xs font-mono">Aggregating sources...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 border border-red-500/10 bg-red-500/5 rounded-xl gap-2.5 text-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-xs font-mono text-text-secondary leading-relaxed">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12 text-xs font-mono text-text-secondary">
            No active intelligence found in category.
          </div>
        ) : (
          news.slice(0, 5).map((item, idx) => (
            <div
              key={idx}
              className="group border border-border-core hover:border-text-secondary bg-panel-bg/30 p-3.5 rounded-xl transition-all duration-300 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-medium text-text-primary hover:text-text-primary/80 leading-snug flex-1 transition-colors flex items-center gap-1.5"
                >
                  <span className="line-clamp-2">{item.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-text-secondary" />
                </a>
              </div>
              
              {item.summary && (
                <p className="text-[11px] text-text-secondary font-mono leading-relaxed line-clamp-2">
                  {item.summary.replace(/<[^>]*>/g, "")}
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono mt-1 border-t border-border-core/40 pt-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${getSourceBadgeStyles(item.source)}`}>
                  {item.source}
                </span>
                <span className="text-text-secondary">
                  {timeAgo(item.published_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
