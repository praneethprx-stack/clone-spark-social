import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Home,
  Compass,
  Plus,
  Bell,
  MessageCircle,
  Search,
  Menu,
  Clapperboard,
  Ticket,
  LogOut,
  Settings,
  Bookmark,
  Image as ImageIcon,
  Type,
  CalendarDays,
  Newspaper,
  CircleDashed,
  Film,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";
import { Avatar } from "./Media";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const CREATE_PERSONAL = [
  { kind: "post", label: "Create Post", icon: ImageIcon },
  { kind: "reel", label: "Create Reel", icon: Film },
  { kind: "story", label: "Create Story", icon: CircleDashed },
  { kind: "tweet", label: "Create Tweet", icon: Type },
] as const;
const CREATE_BUSINESS = [
  { kind: "event", label: "Create Event", icon: CalendarDays },
  { kind: "ticket", label: "Create Ticket", icon: Ticket },
  { kind: "news", label: "Publish News", icon: Newspaper },
] as const;

function NavIcon({ to, label, children, badge }: { to: string; label: string; children: ReactNode; badge?: number }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "text-primary bg-accent" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
      {!!badge && (
        <span className="absolute right-1 top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function CreateMenu() {
  const { isBusiness } = useAuth();
  const navigate = useNavigate();
  const items = isBusiness ? [...CREATE_PERSONAL, ...CREATE_BUSINESS] : CREATE_PERSONAL;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Create"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition hover:scale-105"
      >
        <Plus className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{isBusiness ? "Business create" : "Create"}</DropdownMenuLabel>
        {items.map((it, i) => (
          <div key={it.kind}>
            {isBusiness && i === CREATE_PERSONAL.length && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => navigate({ to: "/create/$kind", params: { kind: it.kind } })}>
              <it.icon className="mr-2 h-4 w-4 text-primary" /> {it.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const { profile, userId, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifs", userId],
    enabled: !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("read", false)
        .neq("type", "message");
      return count ?? 0;
    },
  });
  const { data: unreadMsgs = 0 } = useQuery({
    queryKey: ["unread-msgs", userId],
    enabled: !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId!)
        .is("read_at", null);
      return count ?? 0;
    },
  });

  const menuLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/reels", label: "Reels", icon: Clapperboard },
    { to: "/search", label: "Search", icon: Search },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/bookings", label: "My bookings", icon: Ticket },
    { to: "/saved", label: "Saved", icon: Bookmark },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-4">
        <Link to="/" className="mr-auto">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <NavIcon to="/" label="Home"><Home className="h-5 w-5" /></NavIcon>
          <NavIcon to="/explore" label="Explore"><Compass className="h-5 w-5" /></NavIcon>
          <NavIcon to="/reels" label="Reels"><Clapperboard className="h-5 w-5" /></NavIcon>
        </nav>
        <CreateMenu />
        <NavIcon to="/notifications" label="Notifications" badge={unread}><Bell className="h-5 w-5" /></NavIcon>
        <div className="hidden items-center gap-1 sm:flex">
          <NavIcon to="/messages" label="Messages" badge={unreadMsgs}><MessageCircle className="h-5 w-5" /></NavIcon>
          <NavIcon to="/search" label="Search"><Search className="h-5 w-5" /></NavIcon>
        </div>
        {profile && (
          <Link to="/u/$username" params={{ username: profile.username }} aria-label="Profile" className="hidden sm:inline-flex">
            <Avatar src={profile.avatar_url} name={profile.display_name} size={34} className="ring-2 ring-primary/60" />
          </Link>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle><Logo /></SheetTitle>
            </SheetHeader>
            {profile && (
              <Link
                to="/u/$username"
                params={{ username: profile.username }}
                onClick={() => setOpen(false)}
                className="mx-4 flex items-center gap-3 rounded-2xl bg-secondary p-3"
              >
                <Avatar src={profile.avatar_url} name={profile.display_name} size={40} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{profile.display_name}</div>
                  <div className="truncate text-xs text-muted-foreground">@{profile.username} · {profile.account_type}</div>
                </div>
              </Link>
            )}
            <nav className="mt-2 flex flex-col px-2">
              {menuLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
                  activeProps={{ className: "text-primary" }}
                  activeOptions={{ exact: l.to === "/" }}
                >
                  <l.icon className="h-4 w-4" /> {l.label}
                </Link>
              ))}
              <button
                onClick={() => signOut()}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-primary hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function AppShell({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse"><Logo size={48} withText={false} /></div>
      </div>
    );
  if (!session) return <Navigate to="/auth" />;
  return (
    <div className="min-h-screen">
      <Header />
      {bare ? children : <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function LoadingCards({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-3xl bg-card" />
      ))}
    </div>
  );
}
