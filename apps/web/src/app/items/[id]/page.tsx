"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, Calendar, User, Tag } from "lucide-react";
import { format } from "date-fns";

export default function ItemDetail() {
    const { id } = useParams();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Chat State
    const [question, setQuestion] = useState("");
    const [chatLog, setChatLog] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [asking, setAsking] = useState(false);

    useEffect(() => {
        const fetchItem = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/items/${id}`);
                const data = await res.json();
                setItem(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchItem();
    }, [id]);

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        const q = question;
        setChatLog(prev => [...prev, { role: 'user', content: q }]);
        setQuestion("");
        setAsking(true);

        try {
            const res = await fetch(`http://localhost:8000/api/items/${id}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q })
            });
            const data = await res.json();
            setChatLog(prev => [...prev, { role: 'ai', content: data.answer }]);
        } catch (e) {
            setChatLog(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error answering your question." }]);
        } finally {
            setAsking(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading item details...</div>;
    }

    if (!item) {
        return <div className="p-8 text-center text-muted-foreground">Item not found.</div>;
    }

    return (
        <div className="flex h-full max-w-7xl mx-auto">
            {/* Left side: Article Content */}
            <div className="flex-1 overflow-y-auto border-r p-6 pb-20 space-y-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>

                <div className="space-y-4">
                    <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                        {item.title}
                    </h1>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-y py-3">
                        {item.published_at && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(item.published_at), "PPP")}
                            </div>
                        )}
                        {item.author && (
                            <div className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                {item.author}
                            </div>
                        )}
                        {item.external_id && (
                            <div className="flex items-center gap-1.5 ml-auto">
                                <Tag className="w-4 h-4" />
                                <a href={item.external_id} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    Original Source
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="prose prose-neutral dark:prose-invert max-w-none">
                    {item.cleaned_text ? (
                        item.cleaned_text.split('\n').map((para: string, idx: number) => (
                            para.trim() ? <p key={idx} className="leading-relaxed">{para}</p> : null
                        ))
                    ) : (
                        <p className="italic text-muted-foreground">No cleaned text available for this item. Generating raw output:</p>
                    )}

                    {!item.cleaned_text && item.raw_content && (
                        <div className="bg-muted/50 p-4 rounded-md text-sm whitespace-pre-wrap font-mono relative overflow-hidden">
                            {item.raw_content}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side: RAG Chat */}
            <div className="w-full md:w-80 lg:w-96 flex flex-col bg-card shrink-0">
                <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold">Ask about this item</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatLog.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground pt-10">
                            <p>Ask a question, and the LLM will answer using only the context from this article.</p>
                            <p className="mt-2 text-xs opacity-70">(RAG-ready interface)</p>
                        </div>
                    ) : (
                        chatLog.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-none'
                                        : 'bg-muted text-foreground rounded-bl-none border border-border/50'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                    {asking && (
                        <div className="flex justify-start">
                            <div className="bg-muted px-4 py-2 rounded-lg rounded-bl-none text-sm animate-pulse border border-border/50">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/10">
                    <form onSubmit={handleAsk} className="relative flex items-center">
                        <input
                            type="text"
                            placeholder="E.g. What companies are mentioned?"
                            className="w-full pl-4 pr-10 py-3 bg-background border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            disabled={asking}
                        />
                        <button
                            type="submit"
                            disabled={asking || !question.trim()}
                            className="absolute right-1.5 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 transition"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
