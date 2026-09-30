import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useActivityPending } from "@/lib/activity";

export function ActivityBar() {
  const firstLoads = useIsFetching({
    predicate: (query) => query.state.data === undefined,
  });
  const mutations = useIsMutating();
  const routeLoading = useActivityPending();

  return <ProgressBar active={firstLoads + mutations > 0 || routeLoading} />;
}
