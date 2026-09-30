import { PageSkeleton } from "@/components/ui/states";
import { useTrackActivity } from "@/lib/activity";

export function RouteFallback() {
  useTrackActivity(true);
  return <PageSkeleton />;
}
