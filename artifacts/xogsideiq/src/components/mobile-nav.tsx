import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, BarChart2, Brain, Star, Briefcase, Bell, Globe } from "lucide-react";

const TABS = [
  { path: "/",           icon: LayoutDashboard, label: "Home",     color: "#2962ff" },
  { path: "/markets",    icon: BarChart2,        label: "Markets",  color: "#26a69a" },
  { path: "/discover",   icon: Globe,            label: "Discover", color: "#4d7fff" },
  { path: "/ai-insights",icon: Brain,            label: "AI",       color: "#7c3aed" },
  { path: "/watchlist",  icon: Star,             label: "Watch",    color: "#f7931a" },
  { path: "/portfolio",  icon: Briefcase,        label: "Portfolio",color: "#26a69a" },
  { path: "/alerts",     icon: Bell,             label: "Alerts",   color: "#ef5350" },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div className="pointer-events-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 4px)" }}>
        <div
          className="mx-2 mb-2 rounded-3xl"
          style={{
            background: "rgba(5,8,16,0.97)",
            backdropFilter: "blur(48px)",
            WebkitBackdropFilter: "blur(48px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 -4px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(41,98,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center justify-around px-1 py-1.5">
            {TABS.map(tab => {
              const isActive =
                location === tab.path ||
                (tab.path !== "/" && location.startsWith(tab.path));
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className="flex flex-col items-center justify-center gap-0.5 relative select-none touch-manipulation active:opacity-80"
                  style={{ minWidth: 48, minHeight: 48 }}
                >
                  <div className="relative flex items-center justify-center" style={{ width: 40, height: 32 }}>
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-active"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${tab.color}28, ${tab.color}14)`,
                          boxShadow: `0 0 16px ${tab.color}40, 0 0 32px ${tab.color}18`,
                          border: `1px solid ${tab.color}35`,
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      />
                    )}
                    {/* Notification dot for Alerts */}
                    {tab.label === "Alerts" && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ef5350] border border-[rgba(5,8,16,0.9)] z-20 animate-pulse" />
                    )}
                    <motion.div
                      animate={{ scale: isActive ? 1.14 : 1, y: isActive ? -1 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="relative z-10"
                    >
                      <tab.icon
                        size={16}
                        style={{
                          color: isActive ? tab.color : "#2a3050",
                          filter: isActive ? `drop-shadow(0 0 7px ${tab.color}90)` : "none",
                          transition: "color 0.2s, filter 0.2s",
                          fill: (tab.label === "Watch" && isActive) ? tab.color : "none",
                        }}
                      />
                    </motion.div>
                  </div>

                  {/* Top indicator line */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${tab.color}, transparent)`,
                          boxShadow: `0 0 8px ${tab.color}`,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.span
                    animate={{ color: isActive ? tab.color : "#2a3050", fontWeight: isActive ? 700 : 500 }}
                    transition={{ duration: 0.15 }}
                    className="text-[8px] tracking-wide"
                  >
                    {tab.label}
                  </motion.span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
