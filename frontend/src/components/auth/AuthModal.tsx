"use client";

import React, { useState } from "react";
import { useAuthStore, DEMO_PROFILES, UserProfile } from "@/stores/authStore";
import { useTryOnStore } from "@/stores/tryOnStore";
import { useMoodStore } from "@/stores/moodStore";
import {
  X,
  User,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  LogOut,
  Mail,
  Building2,
  Sparkles,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

export const AuthModal: React.FC = () => {
  const {
    user,
    isSignedIn,
    isAuthModalOpen,
    setAuthModalOpen,
    signInAsDemo,
    signIn,
    signOut,
  } = useAuthStore();

  const { runAnalysis, selectedGarment } = useTryOnStore();
  const { moodModifier } = useMoodStore();

  const [activeTab, setActiveTab] = useState<"switch" | "email">("switch");
  const [personaFilter, setPersonaFilter] = useState<"all" | "shopper" | "admin">("all");
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<"shopper" | "admin">("shopper");

  if (!isAuthModalOpen) return null;

  const handleSelectProfile = (profileId: string) => {
    signInAsDemo(profileId);
    if (selectedGarment) {
      runAnalysis(profileId, moodModifier);
    }
  };

  const handleCustomEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    const customUser: UserProfile = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: nameInput.trim() || emailInput.split("@")[0],
      email: emailInput.trim(),
      role: roleInput,
      avatarUrl: import.meta.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isCalibrated: false,
      roleTitle: roleInput === "admin" ? "Merchant Admin" : "Shopper",
      skinType: "Neutral (Uncalibrated)",
      allergies: [],
    };

    signIn(customUser);
    if (selectedGarment) {
      runAnalysis(customUser.id, moodModifier);
    }
  };

  const handleSignOut = () => {
    signOut();
    setAuthModalOpen(false);
  };

  const filteredProfiles = DEMO_PROFILES.filter((p) =>
    personaFilter === "all" ? true : p.role === personaFilter
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-foreground">
                {isSignedIn ? "Persona & Role Switcher" : "Sign In to VeraFit AI"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Switch between **End-User Shopper** and **B2B Merchant Admin** personas
              </p>
            </div>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border bg-muted/30 px-6 pt-3 justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("switch")}
              className={`pb-3 text-xs font-semibold px-3 border-b-2 transition-all ${
                activeTab === "switch"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Demo Personas
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`pb-3 text-xs font-semibold px-3 border-b-2 transition-all ${
                activeTab === "email"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom Login
            </button>
          </div>

          {activeTab === "switch" && (
            <div className="flex space-x-1 mb-2 bg-secondary/80 p-1 rounded-xl text-[10px] font-bold">
              <button
                onClick={() => setPersonaFilter("all")}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  personaFilter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPersonaFilter("shopper")}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  personaFilter === "shopper" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Shoppers
              </button>
              <button
                onClick={() => setPersonaFilter("admin")}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  personaFilter === "admin" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                B2B Admins
              </button>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {activeTab === "switch" ? (
            <div className="space-y-3">
              {filteredProfiles.map((profile) => {
                const isSelected = user?.id === profile.id;
                const isProfileAdmin = profile.role === "admin";
                return (
                  <button
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile.id)}
                    className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-secondary/50 hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-border shrink-0">
                        <img
                          src={profile.avatarUrl}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {profile.name}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                              isProfileAdmin
                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {isProfileAdmin ? "B2B Admin" : "Shopper"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {profile.roleTitle} {profile.companyName ? `• ${profile.companyName}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-foreground font-medium">
                            {profile.skinType}
                          </span>
                          {profile.allergies && profile.allergies.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                              Allergies: {profile.allergies.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Switch →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCustomEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Select Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoleInput("shopper")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                      roleInput === "shopper"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>End-User Shopper</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleInput("admin")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                      roleInput === "admin"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>B2B Merchant Admin</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Robin Taylor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center space-x-2"
              >
                <span>Sign In & Enter Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {isSignedIn && (
          <div className="p-4 bg-secondary/30 border-t border-border flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              Active: <span className="font-bold text-foreground">{user?.name}</span> ({user?.role === "admin" ? "B2B Admin" : "Shopper"})
            </div>
            <button
              onClick={handleSignOut}
              className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
