import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Home, Database, Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AEC Intelligence Feeds",
  description: "AEC Business Development Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <div className="w-64 border-r bg-card flex flex-col hidden md:flex shrink-0">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold text-primary">AEC Feeds</h1>
              <p className="text-xs text-muted-foreground mt-1">Intelligence MVP</p>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              <Link href="/sources" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
                <Database className="w-4 h-4" />
                Manage Sources
              </Link>
            </nav>
            
            <div className="p-4 border-t">
              <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-accent text-sm font-medium transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-14 border-b bg-card flex items-center px-4 md:hidden">
              <h1 className="font-bold">AEC Feeds</h1>
            </header>
            <main className="flex-1 overflow-y-auto bg-muted/20">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
