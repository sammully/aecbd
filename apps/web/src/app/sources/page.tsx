"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Rss, Globe } from "lucide-react";

export default function SourcesPage() {
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [newName, setNewName] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [newType, setNewType] = useState("rss");

    const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
    const [bulkUrls, setBulkUrls] = useState("");
    const [isBulking, setIsBulking] = useState(false);

    const fetchSources = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/sources");
            const data = await res.json();
            setSources(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSources();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch("http://localhost:8000/api/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, url: newUrl, type: newType, enabled: true }),
            });
            setNewName("");
            setNewUrl("");
            fetchSources();
        } catch (e) {
            console.error(e);
        }
    };

    const handleBulkAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsBulking(true);

        const urls = bulkUrls.split(/[\s,]+/).map(u => u.trim()).filter(u => u.length > 0);

        const payloadSources = urls.map(url => {
            const isRss = url.includes('.xml') || url.includes('/rss') || url.includes('feed');
            const type = isRss ? 'rss' : 'web';
            let name = "Unknown Source";
            try {
                const urlObj = new URL(url);
                name = urlObj.hostname.replace('www.', '') + (isRss ? ' Feed' : '');
            } catch (e) { }

            return {
                name,
                url,
                type,
                enabled: true
            };
        });

        try {
            await fetch("http://localhost:8000/api/sources/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sources: payloadSources }),
            });
            setBulkUrls("");
            fetchSources();
        } catch (e) {
            console.error(e);
        } finally {
            setIsBulking(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this source?")) return;
        try {
            await fetch(`http://localhost:8000/api/sources/${id}`, { method: "DELETE" });
            fetchSources();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Manage Sources</h1>
                <p className="text-muted-foreground">Add RSS feeds or Web pages to capture AEC intelligence.</p>
            </div>

            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <div className="flex border-b bg-muted/20">
                    <button
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'single' ? 'border-b-2 border-primary text-foreground bg-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                        onClick={() => setActiveTab('single')}
                    >
                        Single Add
                    </button>
                    <button
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'bulk' ? 'border-b-2 border-primary text-foreground bg-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                        onClick={() => setActiveTab('bulk')}
                    >
                        Bulk Add
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'single' ? (
                        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. ArchDaily News"
                                    className="w-full px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium">URL</label>
                                <input
                                    required
                                    type="url"
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-32 space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <select
                                    className="w-full px-3 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                >
                                    <option value="rss">RSS/Atom</option>
                                    <option value="web">Web Page</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition h-[42px]"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleBulkAdd} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Paste URLs</label>
                                <p className="text-xs text-muted-foreground">Paste a list of URLs separated by commas or newlines. We will automatically deduplicate and infer the source type (RSS vs Web).</p>
                                <textarea
                                    required
                                    rows={5}
                                    placeholder="https://feed.com/rss&#10;https://news.com/feed&#10;https://company.com/blog"
                                    className="w-full p-3 bg-background border rounded-md focus:ring-2 focus:ring-primary focus:outline-none min-h-[120px]"
                                    value={bulkUrls}
                                    onChange={(e) => setBulkUrls(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isBulking || bulkUrls.trim() === ""}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" /> {isBulking ? "Importing..." : "Bulk Import"}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="px-6 py-3 font-medium">Source</th>
                            <th className="px-6 py-3 font-medium">Type</th>
                            <th className="px-6 py-3 font-medium">URL</th>
                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={4} className="p-6 text-center text-muted-foreground animate-pulse">Loading sources...</td></tr>
                        ) : sources.length === 0 ? (
                            <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No sources configured yet.</td></tr>
                        ) : (
                            sources.map(s => (
                                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 font-medium">{s.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1.5 text-xs font-semibold bg-accent text-accent-foreground px-2 py-1 rounded w-fit uppercase">
                                            {s.type === 'rss' ? <Rss className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                            {s.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground truncate max-w-[200px]" title={s.url}>
                                        {s.url}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                                            title="Delete Source"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
