"use client";

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles,
  UserCheck,
  History,
  Activity,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Calendar,
  BarChart3,
  ShieldCheck,
  PackageCheck,
  Target,
  Settings,
  Building2,
  TrendingUp,
  Brain,
} from "lucide-react";
import { useTryOnStore } from "@/stores/tryOnStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { pathname } = useLocation();
  const { setDiagnosticsOpen } = useTryOnStore();
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("verafit_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("verafit_sidebar_collapsed", String(next));
  };

  const isAdmin = mounted && user?.role === "admin";

  const shopperNavItems = [
    {
      label: "My Fitting Room",
      href: "/",
      icon: Sparkles,
      active: pathname === "/" || pathname === "/try-on",
      badge: "LIVE",
    },
    {
      label: "7-Day Style Planner",
      href: "/calendar",
      icon: Calendar,
      active: pathname === "/calendar",
      badge: "NEW",
    },
    {
      label: "My Fit & Skin Profile",
      href: "/mannequin",
      icon: UserCheck,
      active: pathname === "/mannequin",
    },
    {
      label: "My Learnings & Recommendations",
      href: "/learnings",
      icon: Brain,
      active: pathname === "/learnings",
      badge: "NEW",
    },
    {
      label: "My Orders & Past Try-Ons",
      href: "/history",
      icon: History,
      active: pathname === "/history",
    },
  ];

  const adminNavItems = [
    {
      label: "AI Efficacy & Operations Hub",
      href: "/admin",
      icon: ShieldCheck,
      active: pathname === "/admin",
      badge: "ENTERPRISE",
    },
    {
      label: "Fleet Return Analytics",
      href: "/history",
      icon: BarChart3,
      active: pathname === "/history",
      badge: "B2B",
    },
    {
      label: "Cohort Biometrics (Aggregated)",
      href: "/mannequin",
      icon: UserCheck,
      active: pathname === "/mannequin",
    },
  ];

  const navItems = isAdmin ? adminNavItems : shopperNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-16 bottom-0 left-0 z-40 bg-card border-r border-border flex flex-col justify-between transition-all duration-300 ease-in-out md:static",
          isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60"
        )}
      >
        {/* Mobile Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-border md:hidden">
          <span className="font-bold text-sm text-foreground">
            {isAdmin ? "B2B Merchant Portal" : "Shopper Menu"}
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1.5 flex-1">
          {/* Persona Role Header with inline Expand/Collapse Toggle (Desktop) */}
          <div
            className={cn(
              "px-3 py-1.5 mb-1 flex items-center text-[10px] uppercase font-bold text-muted-foreground tracking-wider",
              collapsed ? "justify-center px-0" : "justify-between"
            )}
          >
            {!collapsed && (
              <span>{isAdmin ? "🏢 Retail Operations" : "🛍️ Personal Fitting Studio"}</span>
            )}
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex items-center justify-center p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all group",
                  item.active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                    item.active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded",
                          item.badge === "ENTERPRISE"
                            ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                            : item.badge === "B2B"
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-300"
                            : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Quick AI X-Ray Inspector Action (For Shoppers) */}
          {!isAdmin && (
            <button
              onClick={() => {
                setDiagnosticsOpen(true);
                onCloseMobile();
              }}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors mt-3",
                collapsed && "justify-center px-0"
              )}
              title="Open AI X-Ray Diagnostics"
            >
              <Activity className="w-4 h-4 shrink-0 text-indigo-500 animate-pulse" />
              {!collapsed && <span className="truncate font-semibold">AI X-Ray Math</span>}
            </button>
          )}
        </div>

        {/* Engine Telemetry Card & Desktop Collapse Toggle */}
        <div className="p-3 border-t border-border space-y-2">
          {!collapsed && (
            <div className="p-2.5 rounded-xl bg-secondary/60 border border-border/80 text-[11px]">
              <div className="flex items-center space-x-2 text-foreground font-semibold mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{isAdmin ? "Enterprise Engine" : "Purchase Certainty"}</span>
              </div>
              <p className="text-muted-foreground text-[10px] leading-tight">
                {isAdmin
                  ? "Live fleet analytics, AI agents & return-model performance active."
                  : "3-way SSIM fit stress test & color harmony active."}
              </p>
            </div>
          )}

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex w-full items-center justify-center p-2 rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center space-x-2 text-xs">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
