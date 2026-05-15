import React, { useState } from "react";
import { 
  useListSignals, getListSignalsQueryKey,
  useCreateSignal,
  useUpdateSignal
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Target, Crosshair, Ban, Clock, Filter, Plus } from "lucide-react";
import { Link } from "wouter";

type SignalStatus = "active" | "hit_target" | "stopped" | "expired";

export default function Signals() {
  const [filter, setFilter] = useState<SignalStatus | "all">("all");
  const queryClient = useQueryClient();

  const { data: signals, isLoading } = useListSignals(
    filter === "all" ? {} : { status: filter },
    { query: { queryKey: getListSignalsQueryKey(filter === "all" ? {} : { status: filter }) } }
  );

  const updateSignal = useUpdateSignal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Signals</h1>
          <p className="text-muted-foreground mt-1">High-conviction setups and ongoing trades.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-md p-1">
            {(["all", "active", "hit_target", "stopped", "expired"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${
                  filter === f ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))
        ) : signals?.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            No signals found for this filter.
          </div>
        ) : (
          signals?.map(signal => (
            <div key={signal.id} className="border border-border bg-card rounded-lg overflow-hidden flex flex-col hover:border-primary/30 transition-colors">
              <div className="p-4 border-b border-border flex justify-between items-start bg-secondary/20">
                <div className="flex gap-3">
                  <div className={`px-2.5 py-1 rounded font-bold text-xs uppercase flex items-center justify-center shrink-0 ${
                    signal.action === 'BUY' ? 'bg-primary/20 text-primary border border-primary/30' :
                    signal.action === 'SELL' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                    'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                  }`}>
                    {signal.action}
                  </div>
                  <div>
                    <Link href={`/research/${signal.tokenSymbol}`} className="font-bold text-lg hover:text-primary transition-colors">
                      {signal.tokenSymbol}
                    </Link>
                    <div className="text-xs text-muted-foreground">{signal.timeframe} timeframe</div>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="outline" className={`
                    ${signal.status === 'active' ? 'border-blue-500 text-blue-500' : ''}
                    ${signal.status === 'hit_target' ? 'border-primary text-primary' : ''}
                    ${signal.status === 'stopped' ? 'border-destructive text-destructive' : ''}
                    ${signal.status === 'expired' ? 'border-muted-foreground text-muted-foreground' : ''}
                  `}>
                    {signal.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(signal.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="p-4 flex-grow space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-secondary/50 rounded-md p-2 border border-border/50">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1 flex items-center justify-center gap-1">
                      Entry
                    </div>
                    <div className="font-mono font-bold text-sm">{formatCurrency(signal.entryPrice)}</div>
                  </div>
                  <div className="bg-primary/5 rounded-md p-2 border border-primary/20">
                    <div className="text-[10px] uppercase text-primary font-bold mb-1 flex items-center justify-center gap-1">
                      <Target className="h-3 w-3" /> Target
                    </div>
                    <div className="font-mono font-bold text-sm text-primary">{formatCurrency(signal.targetPrice)}</div>
                  </div>
                  <div className="bg-destructive/5 rounded-md p-2 border border-destructive/20">
                    <div className="text-[10px] uppercase text-destructive font-bold mb-1 flex items-center justify-center gap-1">
                      <Ban className="h-3 w-3" /> Stop
                    </div>
                    <div className="font-mono font-bold text-sm text-destructive">
                      {signal.stopLossPrice ? formatCurrency(signal.stopLossPrice) : 'None'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Progress to Target</span>
                    <span className="font-mono font-bold">{signal.progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        signal.status === 'stopped' ? 'bg-destructive' :
                        signal.progressPercent < 0 ? 'bg-destructive' : 'bg-primary'
                      }`} 
                      style={{ width: `${Math.max(0, Math.min(100, signal.status === 'stopped' ? 100 : signal.progressPercent))}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Confidence</span>
                    <span className="font-mono font-bold">{signal.confidence}/100</span>
                  </div>
                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-blue-500" 
                      style={{ width: `${signal.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {signal.status === 'active' && (
                <div className="p-3 border-t border-border bg-secondary/10 flex gap-2">
                  <button 
                    onClick={() => updateSignal.mutate({ id: signal.id, data: { status: 'hit_target' } })}
                    className="flex-1 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded transition-colors"
                  >
                    MARK TARGET HIT
                  </button>
                  <button 
                    onClick={() => updateSignal.mutate({ id: signal.id, data: { status: 'stopped' } })}
                    className="flex-1 py-1.5 text-xs font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded transition-colors"
                  >
                    MARK STOPPED
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
