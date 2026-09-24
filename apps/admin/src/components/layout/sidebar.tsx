import { NavLink } from "react-router";
import {
  Package,
  Layers,
  Tag,
  FolderTree,
  Receipt,
  Users,
  Store,
  Palette,
} from "lucide-react";
import { useAuth } from "@/stores/auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: typeof Package };

const sell: NavItem[] = [{ label: "Orders", to: "/orders", icon: Receipt }];

const catalogue: NavItem[] = [
  { label: "Products", to: "/products", icon: Package },
  { label: "Categories", to: "/categories", icon: FolderTree },
  { label: "Brands", to: "/brands", icon: Tag },
  { label: "Collections", to: "/collections", icon: Layers },
];

const manage: NavItem[] = [
  { label: "Branding", to: "/branding", icon: Palette },
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
        <NavGroup title="Catalogue" items={catalogue} />
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
