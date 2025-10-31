"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getProfile } from "@/lib/profile";

type TabId = "outputs" | "history" | "favorites" | "inspiration" | "settings";

export default function DashboardSidebar({ tab, onChange }: { tab: TabId; onChange: (t: TabId)=>void }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const [username, setUsername] = useState<string>("");
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);
  const [initials, setInitials] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("contenta:sidebar-collapsed");
    if (raw) setCollapsed(raw === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("contenta:sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const p = await getProfile(user.uid);
      if (p) {
        setUsername(p.username || "");
        setPhotoURL(p.avatar || undefined);
        const f = (p.firstName || "").charAt(0);
        const l = (p.lastName || "").charAt(0);
        setInitials(`${f}${l}` || (p.username || (user.email||"?")).slice(0,2).toUpperCase());
      }
    })();
  }, [user]);

  const Item = ({ id, label, icon }: { id: TabId; label: string; icon: React.ReactNode }) => {
    const active = tab === id;
    const animClass = active
      ? id === "outputs" ? "anim-spark" : id === "history" ? "anim-clock" : id === "favorites" ? "anim-star" : id === "inspiration" ? "anim-bulb" : "anim-gear"
      : "";
    return (
      <button
        onClick={() => onChange(id)}
        className={`group w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
          active ? "bg-white text-black active-tab" : "hover:bg-white/10 text-white"
        }`}
        title={label}
      >
        <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${animClass}`}>{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );
  };

  return (
    <aside className={`hidden md:block border-r border-white/10 bg-black ${collapsed ? "w-16" : "w-56"} transition-all duration-200 min-h-[calc(100vh-64px)] sticky top-16`}> 
      <div className="p-3 flex items-center gap-2 text-white">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 border flex items-center justify-center text-xs font-medium">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="avatar" className="object-cover w-full h-full" />
          ) : (initials || "")}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">@{username || (user?.email || "")}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || "Dashboard"}</p>
          </div>
        )}
        <button onClick={() => setCollapsed((v) => !v)} className="ml-auto text-xs px-2 py-1 border border-white/30 rounded" title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? ">>" : "<<"}
        </button>
      </div>
      <nav className="px-2 space-y-1">
        <Item id="outputs" label="Outputs" icon={<IconSpark />} />
        <Item id="history" label="Recent" icon={<IconClock />} />
        <Item id="favorites" label="Favorites" icon={<IconStar />} />
        <Item id="inspiration" label="Inspiration" icon={<IconLightbulb />} />
        <Item id="settings" label="Settings" icon={<IconSettings />} />
      </nav>
    </aside>
  );
}

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeWidth="1.5"/></svg>
  );
}
function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="1.5"/><path d="M12 7v6l4 2" strokeWidth="1.5"/></svg>
  );
}
function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" strokeWidth="1.2"/></svg>
  );
}
function IconLightbulb() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18h6M10 22h4" strokeWidth="1.5"/><path d="M6 9a6 6 0 1 1 12 0c0 2.31-1.2 3.83-2.42 4.86-.53.45-1.04 1.46-1.22 2.14H9.64c-.18-.68-.69-1.69-1.22-2.14C7.2 12.83 6 11.31 6 9z" strokeWidth="1.5"/></svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .67.39 1.27 1 1.51.31.13.64.19.98.19H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="1.2"/></svg>
  );
}
