import { useState, useEffect } from "react";

export interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

function measure(): ScreenSize {
  const w = typeof window !== "undefined" ? window.innerWidth : 1280;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  return {
    width: w,
    height: h,
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    isDesktop: w >= 1024,
  };
}

export function useScreenSize(): ScreenSize {
  const [size, setSize] = useState<ScreenSize>(measure);

  useEffect(() => {
    const mql768 = window.matchMedia("(max-width: 767px)");
    const mql1024 = window.matchMedia("(max-width: 1023px)");
    const handler = () => setSize(measure());
    mql768.addEventListener("change", handler);
    mql1024.addEventListener("change", handler);
    window.addEventListener("resize", handler);
    return () => {
      mql768.removeEventListener("change", handler);
      mql1024.removeEventListener("change", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return size;
}
