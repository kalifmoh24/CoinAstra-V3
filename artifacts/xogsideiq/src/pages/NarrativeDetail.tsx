import React from "react";
import { Link, useLocation, useParams } from "wouter";
import { useGetNarrative, getGetNarrativeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/format";
import * as Icons from "lucide-react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, BrainCircuit } from "lucide-react";

export default function NarrativeDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();

  const { data: narrative, isLoading } = useGetNarrative(slug, {
    query: { enabled: !!slug, queryKey: getGetNarrativeQueryKey(slug) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!narrative) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Narrative not found</h2>
        <button 
          onClick={() => setLocation('/narratives')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
        >
          Back to Narratives
        </button>
      </div>
    );
  }

  // @ts-ignore
  const Icon = Icons[narrative.iconKey] || Icons.Box;

  return (
    <div className="space-y-8">
      <div>
        <button 
          onClick={() => setLocation('/narratives')}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Narratives
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{narrative.name}</h1>
              <p className="text-muted-foreground mt-1 max-w-2xl">{narrative.description}</p>
            </div>
          </div>

          <div className="flex gap-4 shrink-0">
            <div className="bg-secondary/50 border border-border p-4 rounded-lg flex flex-col items-center justify-center min-w-24">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Momentum</span>
              <span className="text-2xl font-mono font-bold text-primary">{narrative.momentumScore}</span>
            </div>
            <div className="bg-secondary/50 border border-border p-4 rounded-lg flex flex-col items-center justify-center min-w-24">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">24H</span>
              <span className={`text-lg font-mono font-bold flex items-center ${narrative.perf24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {narrative.perf24h >= 0 ? '+' : ''}{formatPercent(narrative.perf24h)}
              </span>
            </div>
            <div className="bg-secondary/50 border border-border p-4 rounded-lg flex flex-col items-center justify-center min-w-24">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">7D</span>
              <span className={`text-lg font-mono font-bold flex items-center ${narrative.perf7d >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {narrative.perf7d >= 0 ? '+' : ''}{formatPercent(narrative.perf7d)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {narrative.aiCommentary && (
        <Card className="border-card-border bg-card overflow-hidden">
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center gap-3">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-primary">AI Sector Intelligence</h3>
          </div>
          <CardContent className="p-6">
            <p className="text-foreground leading-relaxed">{narrative.aiCommentary}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Top {narrative.name} Tokens</h2>
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">24h Change</th>
                <th className="px-4 py-3 text-right">Market Cap</th>
                <th className="px-4 py-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {narrative.topTokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No tokens found for this narrative.
                  </td>
                </tr>
              ) : (
                narrative.topTokens.map((token) => (
                  <tr key={token.id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/research/${token.symbol}`} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                          {token.symbol.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{token.name}</div>
                          <div className="text-muted-foreground text-xs flex items-center gap-2">
                            <span>{token.symbol}</span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatCurrency(token.price)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${
                      (token.priceChange24h || 0) >= 0 ? 'text-primary' : 'text-destructive'
                    }`}>
                      {(token.priceChange24h || 0) > 0 && '+'}{formatPercent(token.priceChange24h)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(token.marketCap)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs bg-secondary">
                        {token.finalGrade || '--'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
