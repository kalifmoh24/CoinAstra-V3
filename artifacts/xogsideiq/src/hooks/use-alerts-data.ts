import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface UserAlert {
  id: number;
  type: "price" | "ai" | "whale" | "portfolio";
  coinId?: string | null;
  coinSymbol?: string | null;
  title: string;
  description: string;
  targetPrice?: number | null;
  targetDirection?: "above" | "below" | null;
  status: "ACTIVE" | "TRIGGERED" | "DISMISSED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  triggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  type?: "price" | "ai" | "whale" | "portfolio";
  coinId?: string;
  coinSymbol?: string;
  title: string;
  description: string;
  targetPrice?: number;
  targetDirection?: "above" | "below";
  priority?: "HIGH" | "MEDIUM" | "LOW";
}

const QUERY_KEY = ["ca-alerts"];

export function useAlerts() {
  return useQuery<UserAlert[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const r = await fetch("/api/alerts");
      if (!r.ok) throw new Error(`alerts ${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
    retry: 2,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      const r = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error(`create alert ${r.status}`);
      return r.json() as Promise<UserAlert>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "ACTIVE" | "TRIGGERED" | "DISMISSED" }) => {
      const r = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`update alert ${r.status}`);
      return r.json() as Promise<UserAlert>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(`delete alert ${r.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
