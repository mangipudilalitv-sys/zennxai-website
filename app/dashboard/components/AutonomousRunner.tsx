"use client";

import { useEffect } from "react";

export default function AutonomousRunner() {
  useEffect(() => {
    const runLoop = async () => {
      try {
        await fetch("/api/autonomous-loop", {
          method: "GET",
          cache: "no-store",
        });
      } catch (error) {
        console.error("Autonomous runner failed:", error);
      }
    };

    const interval = setInterval(runLoop, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return null;
}