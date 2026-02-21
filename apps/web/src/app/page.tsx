"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Search, Filter, RefreshCw, ExternalLink } from "lucide-react";

export default function Dashboard() {
    const [items, setItems] = useState<any[]>([]);
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [runs, setRuns] = useState<any[]>([]);
    const [showRuns, setShowRuns] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedSource, setSelectedSource] = useState("");
    const [selectedTag, setSelectedTag] = useState("");

    const TAGS = ["Contracts", "M&A", "Layoffs", "Startups & Funding"];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sourcesRes, itemsRes] = await Promise.all([
                fetch("http://localhost:8000/api/sources"),
                fetch(`http://localhost:8000/api/items?limit=50${search ? `&search=${search}` : ""}${selectedSource ? `&source_id=${selectedSource}` : ""}${selectedTag ? `&tag=${selectedTag}` : ""}`)
            ]);
            const sourcesData = await sourcesRes.json();
            const itemsData = await itemsRes.json();

            setSources(sourcesData);
            setItems(itemsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchRuns();
    }, [search, selectedSource, selectedTag]);

    const fetchRuns = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/runs");
            const data = await res.json();
            setRuns(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setShowRuns(true);
        try {
            await fetch("http://localhost:8000/api/ingest", { method: "POST" });
            fetchRuns(); // Fetch immediately

            // Poll for runs every 2 seconds
            const interval = setInterval(fetchRuns, 2000);

            // Stop polling after 12 seconds and fetch final items
            setTimeout(async () => {
                clearInterval(interval);
                await fetchRuns();
                await fetchData();
                setRefreshing(false);
            }, 12000);
        } catch (e) {
            console.error(e);
            setRefreshing(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Intelligence Dashboard</h1>
                    <p className="text-muted-foreground">Latest business development signals from AEC feeds.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Scraping..." : "Refresh Feeds"}
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search keywords, companies, projects..."
                        className="w-full pl-9 pr-4 py-2 bg-card border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="relative w-full md:w-64">
                    <Filter className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <select
                        className="w-full pl-9 pr-4 py-2 bg-card border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                    >
                        <option value="">All Sources</option>
                        {sources.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex gap-2 pb-2 overflow-x-auto scbar-none">
                <button
                    onClick={() => setSelectedTag("")}
                    className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${selectedTag === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                    All News
                </button>
                {TAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${selectedTag === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {showRuns && runs.length > 0 && (
                <div className="bg-muted/30 border rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-sm">Recent Scraping Activity</h3>
                        <button onClick={() => setShowRuns(false)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        {runs.slice(0, 4).map((run, i) => (
                            <div key={`${run.id}-${i}`} className="flex flex-col bg-card p-3 rounded border justify-between gap-1">
                                <span className="font-medium truncate">{run.source_name}</span>
                                <div className="flex items-center text-xs">
                                    {run.status === 'running' && <span className="text-blue-500 animate-pulse flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Running...</span>}
                                    {run.status === 'success' && <span className="text-green-500 font-medium">+{run.items_processed} items</span>}
                                    {run.status === 'failed' && <span className="text-red-500" title={run.error_log}>Failed</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-card border rounded-lg shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground animate-pulse">Loading intelligence feeds...</div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No items found. Try adjusting filters or adding sources.</div>
                ) : (
                    <div className="divide-y relative h-[600px] overflow-y-auto">
                        {items.map(item => (
                            <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <Link href={`/items/${item.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                                            {item.title}
                                        </Link>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-medium bg-accent px-2 py-0.5 rounded text-accent-foreground">
                                                {sources.find(s => s.id === item.source_id)?.name || "Unknown Source"}
                                            </span>
                                            <span>•</span>
                                            <span>{item.published_at ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true }) : "Unknown date"}</span>
                                        </div>
                                        {item.tags_json && item.tags_json.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {item.tags_json.map((t: string) => (
                                                    <span key={t} className="text-[10px] uppercase font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {item.external_id && (
                                        <a href={item.external_id} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground shrink-0 mt-1">
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
