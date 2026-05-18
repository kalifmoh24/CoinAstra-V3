import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Markets from "@/pages/Markets";
import Research from "@/pages/Research";
import Narratives from "@/pages/Narratives";
import NarrativeDetail from "@/pages/NarrativeDetail";
import Signals from "@/pages/Signals";
import Portfolio from "@/pages/Portfolio";
import AiInsights from "@/pages/AiInsights";
import WhaleTracker from "@/pages/WhaleTracker";
import OnChain from "@/pages/OnChain";
import Screener from "@/pages/Screener";
import News from "@/pages/News";
import Watchlist from "@/pages/Watchlist";
import Alerts from "@/pages/Alerts";
import Heatmap from "@/pages/Heatmap";
import Learn from "@/pages/Learn";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import TokenDetail from "@/pages/TokenDetail";
import UnlockDetail from "@/pages/UnlockDetail";
import Discover from "@/pages/Discover";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Markets has its own full-page layout (independent nav) */}
      <Route path="/markets" component={Markets} />

      {/* All other routes use AppLayout (sidebar + top nav) */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/discover" component={Discover} />
            <Route path="/research" component={Research} />
            <Route path="/research/unlocks/:symbol" component={UnlockDetail} />
            <Route path="/research/:symbol" component={TokenDetail} />
            <Route path="/narratives" component={Narratives} />
            <Route path="/narratives/:slug" component={NarrativeDetail} />
            <Route path="/signals" component={Signals} />
            <Route path="/portfolio" component={Portfolio} />
            <Route path="/ai-insights" component={AiInsights} />
            <Route path="/whale-tracker" component={WhaleTracker} />
            <Route path="/on-chain" component={OnChain} />
            <Route path="/screener" component={Screener} />
            <Route path="/news" component={News} />
            <Route path="/watchlist" component={Watchlist} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/heatmap" component={Heatmap} />
            <Route path="/learn" component={Learn} />
            <Route path="/settings" component={Settings} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <PwaInstallPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
