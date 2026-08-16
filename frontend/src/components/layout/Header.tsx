"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useMoodStore } from "@/stores/moodStore";
import { useTryOnStore } from "@/stores/tryOnStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
  Menu,
  ShieldCheck,
  User,
  LogOut,
  LogIn,
  Users,
  Building2,
  ShoppingBag,
  HelpCircle,
  Calendar,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { MoodBreakdownModal } from "@/components/mood/MoodBreakdownModal";
import { AuthModal } from "@/components/auth/AuthModal";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { pathname } = useLocation();

  const { moodModifier, setMoodModifier, getMoodLabel, setBreakdownModalOpen } = useMoodStore();
  const { runAnalysis, selectedGarment, isLoading } = useTryOnStore();
  const { user, isSignedIn, setAuthModalOpen, signOut, toggleRole } = useAuthStore();

  const isAdmin = mounted && isSignedIn && user?.role === "admin";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMoodModifier(val);
  };

  const handleSliderRelease = () => {
    if (selectedGarment && !isLoading) {
      runAnalysis(user?.id || "usr_94b3a8c1", moodModifier);
    }
  };

  const handleSignOutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    signOut();
    setUserDropdownOpen(false);
  };

  const getBreadcrumbTitle = () => {
    if (pathname === "/admin") return "AI Operations & Efficacy Hub";
    if (pathname === "/mannequin") return isAdmin ? "Cohort Biometric Telemetry (Aggregated)" : "My Fit & Skin Profile";
    if (pathname === "/history") return isAdmin ? "Fleet Return Analytics" : "My Orders & Past Try-Ons";
    if (pathname === "/calendar") return "7-Day Style Planner";
    return isAdmin ? "Operations Command" : "My Fitting Room";
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-background/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between transition-colors">
        {/* Left: Hamburger & Brand / Breadcrumb */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground md:hidden transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Geometric Hanger Logo */}
          <Link to={isAdmin ? "/admin" : "/"} className="flex items-center space-x-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-[1px] shadow-sm group-hover:shadow-md transition-all">
              <div className="w-full h-full bg-background rounded-[11px] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-primary group-hover:scale-105 transition-transform"
                >
                  <path d="M12 3a2.5 2.5 0 0 1 2.5 2.5c0 1.2-.8 2-2 2.5L3 14a2 2 0 0 0 1 3.5h16a2 2 0 0 0 1-3.5L12.5 8" />
                  <circle cx="12" cy="14" r="1.5" className="fill-primary" />
                </svg>
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                VeraFit
              </span>
              <span className="text-[10px] uppercase font-semibold text-primary ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 tracking-widest">
                AI
              </span>
            </div>
          </Link>

          {/* Role Toggle Switcher Pill */}
          {mounted && (
            <button
              onClick={toggleRole}
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition-all hover:scale-105 shadow-xs ${
                isAdmin
                  ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
              }`}
              title="Click to quickly switch between Shopper Mode and B2B Merchant Admin Mode"
            >
              {isAdmin ? <Building2 className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
              <span>{isAdmin ? "🏢 B2B Merchant" : "🛍️ Shopper Mode"}</span>
              <ArrowLeftRight className="w-3 h-3 ml-1 opacity-70" />
            </button>
          )}

          {/* Breadcrumb Path */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-medium text-muted-foreground pl-2 border-l border-border">
            <span>{isAdmin ? "Enterprise" : "Studio"}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-foreground font-semibold">{getBreadcrumbTitle()}</span>
          </div>
        </div>

        {/* Middle: Daily Mood Context Slider (For Shoppers) */}
        {!isAdmin && (
          <div className="hidden md:flex items-center space-x-2 bg-secondary/50 border border-border/80 px-3.5 py-1.5 rounded-full shadow-inner max-w-sm lg:max-w-md w-full mx-4">
            <button
              onClick={() => setBreakdownModalOpen(true)}
              className="p-1 rounded-full text-primary hover:bg-primary/10 transition-colors shrink-0"
              title="See how Daily Mood is calculated from Agenda, Weather & Biometrics"
              aria-label="Daily mood calculation breakdown"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center text-[11px] font-medium leading-none mb-1">
                <span className="text-muted-foreground">Cozy</span>
                <button
                  onClick={() => setBreakdownModalOpen(true)}
                  className="text-primary font-bold hover:underline flex items-center gap-1"
                  title="Click to view telemetry breakdown"
                >
                  <span>{getMoodLabel()}</span>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/80 inline" />
                </button>
                <span className="text-muted-foreground">Power</span>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.1"
                value={moodModifier}
                onChange={handleSliderChange}
                onMouseUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                title="Adjust shopping context from relaxed cozy to sharp tailored"
              />
            </div>
          </div>
        )}

        {/* Right: Theme Toggle & User Profile / Sign In */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-all hover:scale-105"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 transition-transform" />
              )}
            </button>
          )}

          {/* User Profile / Auth Button */}
          {mounted && (
            isSignedIn && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1 pl-2 pr-3 rounded-full border border-border bg-card hover:bg-secondary/70 transition-colors"
                  aria-label="User account menu"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-border">
                    <img
                      src={user.avatarUrl || import.meta.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || ""}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold leading-tight">{user.name.split(" ")[0]}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold leading-none">
                      {isAdmin ? "Admin" : "Shopper"}
                    </span>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-border">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{user.name}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      <p className="text-[10px] text-primary/80 font-medium mt-0.5">
                        {user.roleTitle} {user.companyName ? `• ${user.companyName}` : ""}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setAuthModalOpen(true);
                        }}
                        className="w-full flex items-center px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors text-left font-medium"
                      >
                        <Users className="w-4 h-4 mr-2 text-primary" />
                        Switch Persona / Role
                      </button>

                      <button
                        onClick={() => {
                          toggleRole();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors text-left font-medium"
                      >
                        <ArrowLeftRight className="w-4 h-4 mr-2 text-indigo-500" />
                        Switch to {isAdmin ? "Shopper Mode" : "B2B Merchant Mode"}
                      </button>

                      {isAdmin ? (
                        <>
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
                          >
                            <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" />
                            Operations & Efficacy Hub
                          </Link>
                          <Link
                            to="/history"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
                          >
                            <BarChart3 className="w-4 h-4 mr-2 text-muted-foreground" />
                            Fleet Return Analytics
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/calendar"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
                          >
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            7-Day Style Planner
                          </Link>
                          <Link
                            to="/mannequin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
                          >
                            <User className="w-4 h-4 mr-2 text-muted-foreground" />
                            My Fit & Skin Profile
                          </Link>
                          <Link
                            to="/history"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-secondary rounded-lg transition-colors font-medium"
                          >
                            <Sparkles className="w-4 h-4 mr-2 text-muted-foreground" />
                            My Orders & Past Try-Ons
                          </Link>
                        </>
                      )}

                      <button
                        onClick={handleSignOutClick}
                        className="w-full flex items-center px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors mt-1 font-medium"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 transition-all hover:scale-105"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )
          )}
        </div>
      </header>

      {/* Modals */}
      <MoodBreakdownModal />
      <AuthModal />
    </>
  );
};
