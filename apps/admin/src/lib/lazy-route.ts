import { lazy, type ComponentType } from "react";

type Preloadable = ComponentType & { preload: () => Promise<unknown> };

export function lazyRoute<M extends Record<string, unknown>>(
  loader: () => Promise<M>,
  exportName: keyof M,
): Preloadable {
  let loading: Promise<{ default: ComponentType }> | null = null;
  const load = () => {
    loading ??= loader().then((module) => ({
      default: module[exportName] as ComponentType,
    }));
    return loading;
  };
  const Component = lazy(load) as unknown as Preloadable;
  Component.preload = load;
  return Component;
}
