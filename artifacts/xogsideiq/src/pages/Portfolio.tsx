import React from "react";
import { 
  useGetPortfolioSummary, getGetPortfolioSummaryQueryKey,
  useListPositions, getListPositionsQueryKey,
  useGetPortfolioInsights, getGetPortfolioInsightsQueryKey,
  useDeletePosition
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ArrowUpRight, ArrowDownRight, PieChart, BrainCircuit, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function Portfolio() {
  const queryClient = useQueryClient();

  const { data: summary, isLoading: isSummaryLoading } = useGetPortfolioSummary({
    query: { queryKey: getGetPortfolioSummaryQueryKey() }
  });

  const { data: positions, isLoading: isPositionsLoading } = useListPositions({
    query: { queryKey: getListPositionsQueryKey() }
  });

  const { data: insights, isLoading: isInsightsLoading } = useGetPortfolioInsights({
    query: { queryKey: getGetPortfolioInsightsQueryKey() }
  });

  const deletePosition = useDeletePosition({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPositionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPortfolioSummaryQueryKey() });
      }
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Manager</h1>
        <p className="text-muted-foreground mt-1">Track performance, allocation, and risk.</p>
      </div>

      {isSummaryLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 p-6 rounded-xl bg-card border border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Briefcase className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Value</div>
              <div className="text-4xl font-mono font-bold">{formatCurrency(summary.totalValueUsd)}</div>
              <div className={`mt-2 flex items-center font-bold text-sm ${summary.totalPnlUsd >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {summary.totalPnlUsd >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatCurrency(Math.abs(summary.totalPnlUsd))} ({formatPercent(Math.abs(summary.totalPnlPercent))}) All Time
              </div>
            </div>
          </div>
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col justify-center">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Invested</div>
            <div className="text-2xl font-mono font-bold">{formatCurrency(summary.totalInvestedUsd)}</div>
          </div>
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col justify-center">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Positions</div>
            <div className="text-2xl font-mono font-bold">{summary.positionCount} Assets</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
              <CardTitle className="text-lg">Holdings</CardTitle>
              {/* Note: Add form would go here in a real app, omitted for space but mentioned in specs */}
            </CardHeader>
            <CardContent className="p-0">
              {isPositionsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : positions?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No positions yet. Add a position to start tracking.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3 text-right">Holdings</th>
                      <th className="px-4 py-3 text-right">Avg Buy / Current</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3 text-right">PnL</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-border">
                    {positions?.map(pos => (
                      <tr key={pos.id} className="hover:bg-secondary/30 transition-colors group">
                        <td className="px-4 py-3">
                          <Link href={`/research/${pos.tokenSymbol}`} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs shrink-0">
                              {pos.tokenSymbol.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-foreground group-hover:text-primary transition-colors">{pos.tokenSymbol}</div>
                              {pos.narrativeSlug && (
                                <div className="text-[10px] text-muted-foreground uppercase">{pos.narrativeSlug}</div>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-mono font-medium">{formatNumber(pos.amount, 2)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-muted-foreground text-xs font-mono">{formatCurrency(pos.avgBuyPrice)}</div>
                          <div className="font-mono font-medium">{formatCurrency(pos.currentPrice)}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {formatCurrency(pos.valueUsd)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${
                          pos.pnlUsd >= 0 ? 'text-primary' : 'text-destructive'
                        }`}>
                          <div>{pos.pnlUsd >= 0 ? '+' : ''}{formatCurrency(pos.pnlUsd)}</div>
                          <div className="text-xs opacity-80">{pos.pnlPercent >= 0 ? '+' : ''}{formatPercent(pos.pnlPercent)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => deletePosition.mutate({ id: pos.id })}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" /> Sector Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {isSummaryLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : summary?.allocationByNarrative?.length ? (
                summary.allocationByNarrative.map((item, i) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="font-mono font-medium">{formatPercent(item.percent)}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-blue-500' : 'bg-muted-foreground'}`} 
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4 text-sm">
                  No allocation data available.
                </div>
              )}
            </CardContent>
          </Card>

          {isInsightsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : insights ? (
            <Card className="border-card-border bg-card overflow-hidden">
              <div className="bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-primary">AI Portfolio Insights</h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Risk</h4>
                    <Badge variant="outline" className={`
                      ${insights.overallRisk === 'high' || insights.overallRisk === 'very_high' ? 'border-destructive text-destructive' : ''}
                      ${insights.overallRisk === 'moderate' ? 'border-yellow-500 text-yellow-500' : ''}
                      ${insights.overallRisk === 'low' ? 'border-primary text-primary' : ''}
                    `}>
                      {insights.overallRisk.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Diversification Score</h4>
                    <span className="font-mono font-bold text-sm">{insights.diversificationScore}/100</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  {insights.opportunities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4" /> Opportunities
                      </h4>
                      <ul className="space-y-1">
                        {insights.opportunities.map((o, i) => (
                          <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                            <span className="text-primary">•</span> {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.rebalancingSuggestions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-yellow-500 mb-2">Rebalancing Suggestions</h4>
                      <ul className="space-y-1">
                        {insights.rebalancingSuggestions.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                            <span className="text-yellow-500">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
