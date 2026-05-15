import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, BookOpen, PlayCircle, Clock, Star, ChevronRight,
  Zap, Shield, TrendingUp, BarChart2, Activity, Lock, CheckCircle2,
  Users, Award,
} from "lucide-react";

type Category = "All" | "Fundamentals" | "Technical" | "On-Chain" | "AI Trading" | "DeFi" | "Risk";

const COURSES = [
  {
    id: 1, title: "Bitcoin & Crypto Fundamentals", category: "Fundamentals",
    desc: "Master blockchain basics, Bitcoin's monetary policy, and why crypto matters in the modern financial system.",
    lessons: 12, duration: "4.5h", level: "Beginner", icon: BookOpen, color: "#f7931a",
    progress: 100, rating: 4.9, students: 24800,
  },
  {
    id: 2, title: "Technical Analysis Masterclass", category: "Technical",
    desc: "Learn candlestick patterns, support/resistance, RSI, MACD, Fibonacci retracements, and volume analysis.",
    lessons: 18, duration: "7.2h", level: "Intermediate", icon: BarChart2, color: "#2962ff",
    progress: 65, rating: 4.8, students: 18200,
  },
  {
    id: 3, title: "On-Chain Analytics Deep Dive", category: "On-Chain",
    desc: "Interpret whale movements, exchange flows, active addresses, MVRV ratio, and other key on-chain metrics.",
    lessons: 14, duration: "5.8h", level: "Intermediate", icon: Activity, color: "#26a69a",
    progress: 30, rating: 4.7, students: 9400,
  },
  {
    id: 4, title: "AI-Powered Trading Strategies", category: "AI Trading",
    desc: "Use AI signals, smart money detection, and sentiment analysis to build high-probability trade setups.",
    lessons: 16, duration: "6.4h", level: "Advanced", icon: Zap, color: "#7c3aed",
    progress: 0, rating: 4.9, students: 12100,
  },
  {
    id: 5, title: "DeFi: Yield, Liquidity & Risk", category: "DeFi",
    desc: "Understand liquidity pools, yield farming, impermanent loss, lending protocols, and DeFi risk management.",
    lessons: 20, duration: "8.1h", level: "Intermediate", icon: TrendingUp, color: "#10b981",
    progress: 0, rating: 4.6, students: 7800,
  },
  {
    id: 6, title: "Crypto Risk Management", category: "Risk",
    desc: "Position sizing, stop-loss strategies, portfolio diversification, drawdown management, and emotional discipline.",
    lessons: 10, duration: "3.8h", level: "All Levels", icon: Shield, color: "#ef5350",
    progress: 0, rating: 4.8, students: 15600,
  },
  {
    id: 7, title: "Market Psychology & Sentiment", category: "Fundamentals",
    desc: "Fear & Greed cycles, FOMO/FUD dynamics, crowd psychology, and how to profit from market emotions.",
    lessons: 8, duration: "3.2h", level: "Beginner", icon: Users, color: "#0ea5e9",
    progress: 0, rating: 4.7, students: 11200,
  },
  {
    id: 8, title: "Advanced Narrative Investing", category: "AI Trading",
    desc: "Identify emerging crypto narratives early, rotate into leading tokens, and exit at peak narrative strength.",
    lessons: 11, duration: "4.6h", level: "Advanced", icon: Award, color: "#f7931a",
    progress: 0, rating: 4.9, students: 6400,
  },
];

const CATEGORIES: Category[] = ["All", "Fundamentals", "Technical", "On-Chain", "AI Trading", "DeFi", "Risk"];

const LEVEL_COLORS: Record<string, string> = {
  "Beginner": "#26a69a", "Intermediate": "#f7931a", "Advanced": "#ef5350", "All Levels": "#2962ff",
};

const RECENT_LESSONS = [
  { title: "Reading Candlestick Patterns", course: "Technical Analysis Masterclass", time: "Yesterday", duration: "22m" },
  { title: "RSI Divergence Strategies", course: "Technical Analysis Masterclass", time: "2d ago", duration: "18m" },
  { title: "Bitcoin Halving Cycles", course: "Bitcoin & Crypto Fundamentals", time: "4d ago", duration: "14m" },
];

export default function Learn() {
  const [category, setCategory] = useState<Category>("All");

  const filtered = category === "All" ? COURSES : COURSES.filter(c => c.category === category);
  const completed = COURSES.filter(c => c.progress === 100).length;
  const inProgress = COURSES.filter(c => c.progress > 0 && c.progress < 100).length;
  const avgProgress = Math.round(COURSES.reduce((a, c) => a + c.progress, 0) / COURSES.length);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#7c3aed)", boxShadow: "0 0 16px rgba(14,165,233,0.4)" }}>
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#bfdbfe 50%,#7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CoinAstra Academy
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            {COURSES.length} courses · Learn crypto, AI trading, and on-chain analytics
          </p>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Courses Completed", value: completed.toString(), sub: `of ${COURSES.length} total`, color: "#26a69a", icon: CheckCircle2 },
          { label: "In Progress", value: inProgress.toString(), sub: "courses active", color: "#f7931a", icon: BookOpen },
          { label: "Overall Progress", value: `${avgProgress}%`, sub: "across all courses", color: "#2962ff", icon: BarChart2 },
          { label: "Certificates", value: completed.toString(), sub: "earned", color: "#7c3aed", icon: Award },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{card.label}</span>
              <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
            </div>
            <div className="text-[20px] font-black" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#5a6072" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Course Grid */}
        <div className="lg:col-span-2 space-y-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: category === cat ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.04)",
                  color: category === cat ? "#7dd3fc" : "#5a6072",
                  border: category === cat ? "1px solid rgba(14,165,233,0.35)" : "1px solid rgba(255,255,255,0.06)",
                }}>{cat}</button>
            ))}
          </div>

          {/* Course Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((course, i) => (
              <motion.div key={course.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4 cursor-pointer group"
                style={{ background: "rgba(13,17,26,0.85)", border: `1px solid ${course.progress === 100 ? course.color + "30" : "rgba(255,255,255,0.06)"}` }}
                whileHover={{ borderColor: course.color + "40" }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${course.color}18` }}>
                    <course.icon className="h-4 w-4" style={{ color: course.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[12px] font-bold text-white leading-snug">{course.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                        style={{ background: `${LEVEL_COLORS[course.level]}15`, color: LEVEL_COLORS[course.level] }}>
                        {course.level}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}>{course.category}</span>
                    </div>
                  </div>
                  {course.progress === 100 && (
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#26a69a" }} />
                  )}
                </div>

                <p className="text-[10px] leading-relaxed mb-3" style={{ color: "#787b86" }}>{course.desc}</p>

                <div className="flex items-center gap-3 mb-3 text-[9px]" style={{ color: "#4a5068" }}>
                  <div className="flex items-center gap-1"><BookOpen className="h-2.5 w-2.5" />{course.lessons} lessons</div>
                  <div className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{course.duration}</div>
                  <div className="flex items-center gap-1"><Star className="h-2.5 w-2.5" style={{ color: "#f7931a" }} />{course.rating}</div>
                  <div className="flex items-center gap-1"><Users className="h-2.5 w-2.5" />{(course.students / 1000).toFixed(1)}K</div>
                </div>

                {/* Progress */}
                <div>
                  {course.progress > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px]" style={{ color: "#4a5068" }}>
                          {course.progress === 100 ? "Completed!" : `${course.progress}% complete`}
                        </span>
                        <span className="text-[9px]" style={{ color: course.color }}>
                          {course.progress === 100 ? "✓" : "Continue →"}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${course.progress}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          style={{ background: `linear-gradient(90deg,${course.color},${course.color}aa)` }} />
                      </div>
                    </>
                  )}
                  {course.progress === 0 && (
                    <button className="w-full py-2 rounded-xl text-[10px] font-semibold transition-all group-hover:opacity-80"
                      style={{ background: `${course.color}15`, color: course.color, border: `1px solid ${course.color}25` }}>
                      Start Course
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Recent + Featured */}
        <div className="space-y-4">
          {/* Continue Learning */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="h-3.5 w-3.5" style={{ color: "#2962ff" }} />
              <span className="text-[12px] font-bold text-white">Continue Learning</span>
            </div>
            <div className="space-y-2">
              {RECENT_LESSONS.map((lesson, i) => (
                <div key={i} className="p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-start gap-2">
                    <PlayCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#2962ff" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-white truncate">{lesson.title}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: "#5a6072" }}>{lesson.course}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px]" style={{ color: "#3a4058" }}>{lesson.time}</span>
                        <span className="text-[8px] font-mono" style={{ color: "#3a4058" }}>{lesson.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Path */}
          <div className="rounded-2xl p-4"
            style={{ background: "linear-gradient(135deg,rgba(14,165,233,0.1),rgba(124,58,237,0.08))", border: "1px solid rgba(14,165,233,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-3.5 w-3.5" style={{ color: "#7dd3fc" }} />
              <span className="text-[12px] font-bold text-white">Recommended Path</span>
            </div>
            <div className="space-y-2">
              {[
                { step: 1, title: "Bitcoin Fundamentals", done: true, color: "#f7931a" },
                { step: 2, title: "Technical Analysis", done: false, current: true, color: "#2962ff" },
                { step: 3, title: "On-Chain Analytics", done: false, color: "#26a69a" },
                { step: 4, title: "AI Trading Strategies", done: false, color: "#7c3aed" },
                { step: 5, title: "Risk Management", done: false, color: "#ef5350" },
              ].map((step) => (
                <div key={step.step} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black`}
                    style={{
                      background: step.done ? "#26a69a" : step.current ? step.color : "rgba(255,255,255,0.08)",
                      color: (step.done || step.current) ? "white" : "#3a4058",
                      border: step.current ? `2px solid ${step.color}` : "none",
                    }}>
                    {step.done ? "✓" : step.step}
                  </div>
                  <span className="text-[11px] font-semibold"
                    style={{ color: step.done ? "#26a69a" : step.current ? "white" : "#4a5068" }}>
                    {step.title}
                  </span>
                  {step.current && <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold ml-auto"
                    style={{ background: `${step.color}20`, color: step.color }}>NOW</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Facts */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Quick Stats</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Total learners", value: "124,800+" },
                { label: "Expert instructors", value: "18" },
                { label: "Course hours", value: "43.6h" },
                { label: "Certificates issued", value: "8,400+" },
                { label: "Avg completion rate", value: "74%" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <span className="text-[10px]" style={{ color: "#787b86" }}>{s.label}</span>
                  <span className="text-[11px] font-bold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
