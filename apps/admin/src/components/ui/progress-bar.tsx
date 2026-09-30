import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SHOW_AFTER_MS = 150;
const TRICKLE_MS = 250;
const CEILING = 0.92;

type Phase = "idle" | "running" | "finishing";

export function ProgressBar({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const phaseRef = useRef<Phase>("idle");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (active) {
      const timer = window.setTimeout(() => {
        setProgress(0.12);
        setPhase("running");
      }, SHOW_AFTER_MS);
      return () => window.clearTimeout(timer);
    }
    if (phaseRef.current !== "running") return;
    setProgress(1);
    setPhase("finishing");
    const timer = window.setTimeout(() => {
      setPhase("idle");
      setProgress(0);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => {
      setProgress((current) => current + (CEILING - current) * 0.08);
    }, TRICKLE_MS);
    return () => window.clearInterval(timer);
  }, [phase]);

  return (
    <div
      aria-hidden
      data-slot="progress-bar"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-300",
        phase === "running" ? "opacity-100" : "opacity-0",
        phase === "finishing" && "delay-150",
        className,
      )}
    >
      <div
        className="h-full origin-left bg-primary shadow-[0_0_10px_var(--color-primary)] transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
