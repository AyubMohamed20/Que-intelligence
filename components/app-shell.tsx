"use client";

import {
  Bot,
  Building2,
  ChevronRight,
  Command,
  Database,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const primaryNavigation = [
  { href: "/", label: "Briefing", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/reports", label: "Reports", icon: FileText },
];

const systemNavigation = [
  { href: "/agents", label: "Research agents", icon: Bot },
  { href: "/sources", label: "Sources", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
];

const pageNames: Record<string, string> = {
  "": "Morning briefing",
  discover: "Lead discovery",
  companies: "Company intelligence",
  reports: "Client-ready reports",
  agents: "Research agents",
  sources: "Data sources",
  settings: "Settings",
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children, companies }: { children: React.ReactNode; companies: Array<{ id: string; name: string; industry: string; neighborhood: string }> }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);

  const segments = pathname.split("/").filter(Boolean);
  const currentSection = pageNames[segments[0] ?? ""] ?? "Company intelligence";

  const commands = useMemo(
    () => [
      ...primaryNavigation,
      ...systemNavigation,
      ...companies.map((company) => ({
        href: `/companies/${company.id}`,
        label: company.name,
        icon: Building2,
      })),
    ],
    [companies],
  );

  const filteredCommands = query.trim()
    ? commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : [...primaryNavigation, ...systemNavigation];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const syncNavigationMode = () => {
      setCompactNavigation(media.matches);
      if (!media.matches) setNavOpen(false);
    };
    syncNavigationMode();
    media.addEventListener("change", syncNavigationMode);
    return () => media.removeEventListener("change", syncNavigationMode);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (commandOpen && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => searchRef.current?.focus());
    } else if (!commandOpen && dialog.open) {
      dialog.close();
    }
  }, [commandOpen]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        window.requestAnimationFrame(() => mobileMenuRef.current?.focus());
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => sidebarCloseRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  const closeCommand = () => {
    setCommandOpen(false);
    setQuery("");
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" inert={navOpen ? true : undefined}>
        Skip to main content
      </a>
      <div
        className={`nav-scrim ${navOpen ? "is-visible" : ""}`}
        aria-hidden="true"
        onClick={() => {
          setNavOpen(false);
          window.requestAnimationFrame(() => mobileMenuRef.current?.focus());
        }}
      />
      <aside
        id="primary-navigation"
        className={`sidebar ${navOpen ? "is-open" : ""}`}
        aria-label="Primary navigation"
        aria-hidden={compactNavigation && !navOpen ? true : undefined}
        inert={compactNavigation && !navOpen ? true : undefined}
      >
        <div className="brand-row">
          <Link className="brand-lockup" href="/" aria-label="Que Media Intelligence home">
            <img className="brand-mark" src="/icon.svg" alt="" width={36} height={36} aria-hidden="true" />
            <span>
              <strong>Que intelligence</strong>
              <small>Research before reach</small>
            </span>
          </Link>
          <button ref={sidebarCloseRef} className="icon-button sidebar-close" type="button" onClick={() => { setNavOpen(false); window.requestAnimationFrame(() => mobileMenuRef.current?.focus()); }} aria-label="Close navigation">
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <nav className="nav-groups">
          <div className="nav-group">
            <p className="nav-group-label">Workspace</p>
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={`nav-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
                  href={item.href}
                  key={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                >
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="nav-group">
            <p className="nav-group-label">System</p>
            {systemNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={`nav-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
                  href={item.href}
                  key={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                >
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-foot">
          <div className="manual-boundary">
            <ShieldCheck aria-hidden="true" size={18} />
            <div>
              <strong>Manual outreach only</strong>
              <span>No agent can contact a prospect.</span>
            </div>
          </div>
          <Link className="profile-button" href="/settings" aria-label="Open workspace settings">
            <span className="avatar" aria-hidden="true">AK</span>
            <span>
              <strong>Ayub Khan</strong>
              <small>Que Media</small>
            </span>
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </aside>

      <div className="main-shell" inert={navOpen ? true : undefined}>
        <header className="topbar">
          <div className="topbar-context">
            <button ref={mobileMenuRef} className="icon-button mobile-menu" type="button" onClick={() => setNavOpen(true)} aria-label="Open navigation" aria-expanded={navOpen} aria-controls="primary-navigation">
              <Menu aria-hidden="true" size={20} />
            </button>
            <div>
              <span className="topbar-kicker">Que Media</span>
              <strong>{currentSection}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="command-trigger" type="button" onClick={() => setCommandOpen(true)} aria-label="Search intelligence">
              <Search aria-hidden="true" size={17} />
              <span>Search intelligence</span>
              <kbd><Command aria-hidden="true" size={12} />K</kbd>
            </button>
          </div>
        </header>

        <main id="main-content" className="page-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation" inert={navOpen ? true : undefined}>
        {primaryNavigation.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "is-active" : ""}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <Icon aria-hidden="true" size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <dialog
        ref={dialogRef}
        className="command-dialog"
        onClose={() => setCommandOpen(false)}
        onCancel={() => setCommandOpen(false)}
        aria-labelledby="command-title"
      >
        <div className="command-search-row">
          <Search aria-hidden="true" size={19} />
          <label className="sr-only" htmlFor="command-search" id="command-title">
            Search pages and intelligence
          </label>
          <input
            id="command-search"
            name="command-search"
            type="search"
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Go to a page or company…"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="key-button" type="button" onClick={() => setCommandOpen(false)} aria-label="Close search">
            Esc
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">{filteredCommands.length} {filteredCommands.length === 1 ? "destination" : "destinations"} available.</p>
        <div className="command-results" aria-label="Search results">
          <p>Navigate</p>
          {filteredCommands.length ? (
            filteredCommands.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={`${item.href}-${item.label}`} href={item.href} onClick={closeCommand}>
                  <span><Icon aria-hidden="true" size={18} />{item.label}</span>
                  <ChevronRight aria-hidden="true" size={16} />
                </Link>
              );
            })
          ) : (
            <div className="command-empty">No matching intelligence yet.</div>
          )}
        </div>
      </dialog>
    </div>
  );
}
