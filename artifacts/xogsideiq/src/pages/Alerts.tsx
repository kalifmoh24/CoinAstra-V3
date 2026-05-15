import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Zap,
  TrendingUp, TrendingDown, BarChart2, X, Activity, Loader2,
} from "lucide-react";
import { useAlerts, useCreateAlert, useUpdateAlert, useDeleteAlert } from "@/hooks/use-alerts-data";
import type { CreateAlertInput, UserAlert } from "@/hooks/use-alerts-data";

type StatusFilter = "ALL" | "ACTIVE" | "TRIGGERED" | "DISMISSED";
type TypeFilter = "all" | "price" | "whale" | "ai" | "portfolio";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  price: <TrendingUp className="h-3.5 w-3.5" />,
  whale: <Activity className="h-3.5 w-3.5" />,
  ai: <Zap className="h-3.5 w-3.5" />,
  portfolio: <BarChart2 className="h-3.5 w-3.5" />,
};
const TYPE_COLORS: Record<string, string> = {
  price: "#2962ff", whale: "#7c3aed", ai: "#f7931a", portfolio: "#26a69a",
};
const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "#ef5350", MEDIUM: "#f7931a", LOW: "#26a69a",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <Clock className="h-3 w-3" style={{ color: "#f7931a" }} />,
  TRIGGERED: <CheckCircle2 className="h-3 w-3" style={{ color: "#26a69a" }} />,
  DISMISSED: <X className="h-3 w-3" style={{ color: "#5a6072" }} />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const EMPTY_FORM: CreateAlertInput = {
  type: "price", coinSymbol: "", title: "", description: "", priority: "MEDIUM",
};

export default function Alerts() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateAlertInput>(EMPTY_FORM);

  const { data: alerts = [], isLoading } = useAlerts();
  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();

  const filtered = useMemo(() => {
    let list = [...alerts];
    if (statusFilter !== "ALL") list = list.filter(a => a.status === statusFilter);
    if (typeFilter !== "all") list = list.filter(a => a.type === typeFilter);
    return list;
  }, [alerts, statusFilter, typeFilter]);

  const activeCount = alerts.filter(a => a.status === "ACTIVE").length;
  const triggeredCount = alerts.filter(a => a.status === "TRIGGERED").length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    await createAlert.mutateAsync(form);
    setForm(EMPTY_FORM);
    setShowCreate(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#ef5350,#ff6b6b)", boxShadow: "0 0 16px rgba(239,83,80,0.4)" }}>
              <Bell className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#ffcdd2 50%,#ef5350 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Alerts
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            {activeCount} active · {triggeredCount} triggered · {alerts.length} total
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all"
          style={{ background: "rgba(239,83,80,0.18)", color: "#ef5350", border: "1px solid rgba(239,83,80,0.35)" }}>
          <Plus className="h-3.5 w-3.5" /> Create Alert
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active", value: activeCount, color: "#f7931a" },
          { label: "Triggered", value: triggeredCount, color: "#26a69a" },
          { label: "Dismissed", value: alerts.filter(a => a.status === "DISMISSED").length, color: "#5a6072" },
          { label: "High Priority", value: alerts.filter(a => a.priority === "HIGH" && a.status === "ACTIVE").length, color: "#ef5350" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#4a5068" }}>{s.label}</div>
            <div className="text-[20px] font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create alert form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(13,17,26,0.9)", border: "1px solid rgba(239,83,80,0.25)" }}>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-bold text-white">New Alert</span>
                <button type="button" onClick={() => setShowCreate(false)}>
                  <X className="h-4 w-4" style={{ color: "#5a6072" }} />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#4a5068" }}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CreateAlertInput["type"] }))}
                    className="w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <option value="price">Price</option>
                    <option value="ai">AI Signal</option>
                    <option value="whale">Whale Activity</option>
                    <option value="portfolio">Portfolio</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#4a5068" }}>Coin (optional)</label>
                  <input value={form.coinSymbol ?? ""} onChange={e => setForm(f => ({ ...f, coinSymbol: e.target.value.toUpperCase() }))}
                    placeholder="BTC, ETH..."
                    className="w-full rounded-lg px-3 py-1.5 text-[11px]"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#4a5068" }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as CreateAlertInput["priority"] }))}
                    className="w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                {form.type === "price" && (
                  <div>
                    <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#4a5068" }}>Target Price ($)</label>
                    <input type="number" value={form.targetPrice ?? ""} onChange={e => setForm(f => ({ ...f, targetPrice: Number(e.target.value) }))}
                      placeholder="0.00"
                      className="w-full rounded-lg px-3 py-1.5 text-[11px]"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#4a5068" }}>Title</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Alert title..."
                  className="w-full rounded-lg px-3 py-1.5 text-[12px]"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#4a5068" }}>Description</label>
                <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the condition or reason for this alert..."
                  rows={2}
                  className="w-full rounded-lg px-3 py-1.5 text-[11px] resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-1.5 rounded-xl text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#5a6072", border: "1px solid rgba(255,255,255,0.06)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={createAlert.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={{ background: "rgba(239,83,80,0.2)", color: "#ef5350", border: "1px solid rgba(239,83,80,0.4)" }}>
                  {createAlert.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                  Create Alert
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1 rounded-xl p-0.5 shrink-0" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["ALL", "ACTIVE", "TRIGGERED", "DISMISSED"] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: statusFilter === s ? "rgba(239,83,80,0.2)" : "transparent", color: statusFilter === s ? "#ef5350" : "#5a6072" }}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl p-0.5 shrink-0" style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["all", "price", "ai", "whale", "portfolio"] as TypeFilter[]).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all capitalize"
              style={{ background: typeFilter === t ? "rgba(41,98,255,0.2)" : "transparent", color: typeFilter === t ? "#4d7fff" : "#5a6072" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" style={{ color: "#ef5350" }} />
          <p className="text-[12px]" style={{ color: "#5a6072" }}>Loading alerts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: "#ef5350" }} />
          <p className="text-[14px] font-bold text-white mb-1">
            {alerts.length === 0 ? "No alerts yet" : "No alerts match your filters"}
          </p>
          <p className="text-[12px] mb-4" style={{ color: "#5a6072" }}>
            {alerts.length === 0 ? "Create price alerts, AI signals, and whale activity notifications" : "Try changing your filters"}
          </p>
          {alerts.length === 0 && (
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-[11px] font-bold"
              style={{ background: "rgba(239,83,80,0.2)", color: "#ef5350", border: "1px solid rgba(239,83,80,0.35)" }}>
              <Plus className="h-3.5 w-3.5 inline mr-1" /> Create First Alert
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((alert, i) => (
            <motion.div key={alert.id} layout
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-2xl p-4 transition-all"
              style={{ background: "rgba(13,17,26,0.85)", border: `1px solid ${alert.status === "TRIGGERED" ? "rgba(38,166,154,0.3)" : alert.status === "DISMISSED" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)"}` }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${TYPE_COLORS[alert.type] ?? "#5a6072"}18`, color: TYPE_COLORS[alert.type] ?? "#5a6072" }}>
                  {TYPE_ICONS[alert.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[13px] font-bold text-white">{alert.title}</span>
                    {alert.coinSymbol && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#a0a8bc" }}>
                        {alert.coinSymbol}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                      style={{ background: `${PRIORITY_COLORS[alert.priority] ?? "#5a6072"}18`, color: PRIORITY_COLORS[alert.priority] ?? "#5a6072" }}>
                      {alert.priority}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[9px] font-semibold"
                      style={{ color: alert.status === "TRIGGERED" ? "#26a69a" : alert.status === "DISMISSED" ? "#5a6072" : "#f7931a" }}>
                      {STATUS_ICONS[alert.status]}
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-[11px] mb-2" style={{ color: "#5a6072" }}>{alert.description}</p>
                  {alert.targetPrice && (
                    <div className="text-[10px] font-semibold mb-2" style={{ color: "#4a5068" }}>
                      Target: ${alert.targetPrice.toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[9px]" style={{ color: "#3a4058" }}>
                    <Clock className="h-2.5 w-2.5" /> {timeAgo(alert.createdAt)}
                    {alert.triggeredAt && (
                      <><CheckCircle2 className="h-2.5 w-2.5 ml-1" style={{ color: "#26a69a" }} />
                        Triggered {timeAgo(alert.triggeredAt)}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {alert.status === "ACTIVE" && (
                    <button onClick={() => updateAlert.mutate({ id: alert.id, status: "DISMISSED" })}
                      title="Dismiss" className="p-1.5 rounded-lg transition-all hover:bg-white/5">
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#5a6072" }} />
                    </button>
                  )}
                  <button onClick={() => deleteAlert.mutate(alert.id)}
                    title="Delete" className="p-1.5 rounded-lg transition-all hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: "#3a4058" }} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
