import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AdminShell() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar storeName="Store admin" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-x-hidden px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
