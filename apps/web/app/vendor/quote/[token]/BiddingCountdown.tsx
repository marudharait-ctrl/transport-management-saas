"use client";

import { useEffect, useMemo, useState } from "react";

function formatRemaining(ms: number) {
  if (ms <= 0) {
    return "Closed";
  }

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function BiddingCountdown({ deadline }: { deadline: string }) {
  const targetTime = useMemo(() => new Date(deadline).getTime(), [deadline]);
  const [remaining, setRemaining] = useState(() => targetTime - Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(targetTime - Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, [targetTime]);

  return <span className={remaining <= 0 ? "status rejected" : "status open"}>{formatRemaining(remaining)}</span>;
}
