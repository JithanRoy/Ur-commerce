import { NavLink } from "react-router";
import { Package, Layers, Tag, FolderTree, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  { label: "Orders", to: "/orders", icon: Receipt },
  { label: "Products", to: "/products", icon: Package },
  { label: "Categories", to: "/categories", icon: FolderTree },
  { label: "Brands", to: "/brands", icon: Tag },
  { label: "Collections", to: "/collections", icon: Layers },
];

export function Sidebar({ storeName }: { storeName: string }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-muted/20 md:block">
      <div className="flex h-14 items-center border-b px-5">
        <span className="truncate text-sm font-semibold">{storeName}</span>
      </div>
      <nav className="space-y-0.5 p-3">
        {modules.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-background font-medium text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
