import React from "react";
import { MobileDashboard } from "@/components/mobile-dashboard";
import { DesktopDashboard } from "@/components/desktop-dashboard";

export default function Home() {
  return (
    <>
      {/* Mobile — hidden on md+ via CSS */}
      <div className="md:hidden">
        <MobileDashboard />
      </div>

      {/* Desktop — hidden below md via CSS */}
      <div className="hidden md:block">
        <DesktopDashboard />
      </div>
    </>
  );
}
