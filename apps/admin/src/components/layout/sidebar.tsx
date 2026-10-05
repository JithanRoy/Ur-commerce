import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
  ChevronDown,
  Package,
  Layers,
  Tag,
  FolderTree,
  Receipt,
  Users,
  Store,
  Palette,
  GalleryHorizontal,
  LayoutList,
  MessageSquareText,
} from "lucide-react";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { preloadRouteFor } from "@/routes/lazy";

function preloadOnIntent(path: string) {
  const preload = () => preloadRouteFor(path);
  return { onMouseEnter: preload, onFocus: preload };
}

type NavItem = { label: string; to: string; icon: typeof Package };

const sell: NavItem[] = [
  { label: "Orders", to: "/orders", icon: Receipt },
  { label: "Reviews", to: "/reviews", icon: MessageSquareText },
];

const productModule = {
  label: "Products",
  to: "/products",
  icon: Package,
  children: [
    { label: "All products", to: "/products", icon: Package },
    { label: "Categories", to: "/categories", icon: FolderTree },
    { label: "Brands", to: "/brands", icon: Tag },
    { label: "Collections", to: "/collections", icon: Layers },
  ] satisfies NavItem[],
};

const manage: NavItem[] = [
  { label: "Branding", to: "/branding", icon: Palette },
  { label: "Homepage hero", to: "/hero", icon: GalleryHorizontal },
  { label: "Homepage sections", to: "/sections", icon: LayoutList },
  { label: "Team", to: "/team", icon: Users },
];

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-3 pb-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-sidebar-muted">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            {...preloadOnIntent(item.to)}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
                isActive
                  ? "bg-sidebar-active font-medium text-sidebar-active-foreground shadow-sm"
                  : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? "text-sidebar-active-foreground"
                      : "text-sidebar-muted group-hover:text-sidebar-foreground",
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function NavModule({
  module,
}: {
  module: typeof productModule;
}) {
  const location = useLocation();
  const routeInside = module.children.some((child) =>
    location.pathname.startsWith(child.to),
  );
  const [open, setOpen] = useState(routeInside);
  const expanded = open || routeInside;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={expanded}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
          routeInside
            ? "font-medium text-sidebar-foreground"
            : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground",
        )}
      >
        <module.icon className="size-4 shrink-0" />
        {module.label}
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
          {module.children.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              {...preloadOnIntent(item.to)}
              end={item.to === "/products"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all",
                  isActive
                    ? "bg-sidebar-active font-medium text-sidebar-active-foreground shadow-sm"
                    : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarContent({ storeName }: { storeName: string }) {
  const role = useAuth((state) => state.user?.role);

  return (
    <>
      <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-white/15 text-sidebar-foreground">
          <Store className="size-3.5" aria-hidden />
        </span>
        <span className="truncate text-sm font-semibold text-sidebar-foreground">
          {storeName}
        </span>
      </div>

      <nav className="space-y-5 p-3">
        <NavGroup title="Sell" items={sell} />
        <div>
          <p className="px-3 pb-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-sidebar-muted">
            Catalogue
          </p>
          <NavModule module={productModule} />
        </div>
        {role === "TENANT_OWNER" ? (
          <NavGroup title="Manage" items={manage} />
        ) : null}
      </nav>
    </>
  );
}

export function Sidebar({ storeName }: { storeName: string }) {
  return (
    <aside className="hidden w-60 shrink-0 bg-sidebar md:block">
      <SidebarContent storeName={storeName} />
    </aside>
  );
}
