import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "shopper" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  isCalibrated: boolean;
  roleTitle: string;
  skinType?: string;
  allergies?: string[];
  companyName?: string;
  vendorId?: string;
}

export const DEMO_PROFILES: UserProfile[] = [
  // End-User Shopper Personas
  {
    id: "usr_94b3a8c1",
    name: "Elena Vance",
    email: "elena.vance@verafit.ai",
    role: "shopper",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    isCalibrated: true,
    roleTitle: "Luxury Apparel Shopper",
    skinType: "Cool Winter (Rosacea prone)",
    allergies: ["wool", "nickel"],
    vendorId: "vendor_venice"
  },
  {
    id: "usr_astrid_holm",
    name: "Astrid Holm",
    email: "astrid.holm@verafit.ai",
    role: "shopper",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    isCalibrated: true,
    roleTitle: "Eco-Naturalist Shopper",
    skinType: "Warm Autumn (Eczema prone)",
    allergies: ["synthetics", "latex", "wool"],
    vendorId: "vendor_nordic"
  },
  {
    id: "usr_lars_hedlund",
    name: "Lars Hedlund",
    email: "lars.hedlund@verafit.ai",
    role: "shopper",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    isCalibrated: true,
    roleTitle: "Minimalist Menswear Shopper",
    skinType: "Warm Autumn (Sensitive)",
    allergies: ["wool", "rough_synthetic"],
    vendorId: "vendor_nordic"
  },

  // B2B Retail Merchant Admin Personas for 2 Distinct Vendors
  {
    id: "adm_marcus_vance",
    name: "Marcus Vance",
    email: "marcus.vance@veniceluxury.it",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    isCalibrated: true,
    roleTitle: "VP of Retail Merchandising & AI Quality",
    companyName: "Venice Luxury Atelier (Italy)",
    skinType: "Merchant Admin",
    allergies: [],
    vendorId: "vendor_venice"
  },
  {
    id: "adm_freja_lindqvist",
    name: "Freja Lindqvist",
    email: "freja.lindqvist@nordicweaves.se",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    isCalibrated: true,
    roleTitle: "Head of Operations & Inventory AI",
    companyName: "Nordic Organic Weaves & WFH Collective (Sweden)",
    skinType: "Merchant Admin",
    allergies: [],
    vendorId: "vendor_nordic"
  }
];

interface AuthState {
  user: UserProfile | null;
  isSignedIn: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signIn: (user: UserProfile) => void;
  signInAsDemo: (userId: string) => void;
  toggleRole: () => void;
  switchRole: (role: UserRole) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: DEMO_PROFILES[0], // Default Shopper Elena Vance
      isSignedIn: true,
      isAuthModalOpen: false,
      setAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),

      signIn: (user: UserProfile) => {
        set({ user, isSignedIn: true, isAuthModalOpen: false });
      },

      signInAsDemo: (userId: string) => {
        const found = DEMO_PROFILES.find((p) => p.id === userId);
        if (found) {
          set({ user: found, isSignedIn: true, isAuthModalOpen: false });
        }
      },

      toggleRole: () => {
        const current = get().user;
        if (!current) return;
        const nextRole: UserRole = current.role === "shopper" ? "admin" : "shopper";
        const candidate = DEMO_PROFILES.find((p) => p.role === nextRole) || DEMO_PROFILES[0];
        set({ user: candidate, isSignedIn: true });
      },

      switchRole: (role: UserRole) => {
        const candidate = DEMO_PROFILES.find((p) => p.role === role) || DEMO_PROFILES[0];
        set({ user: candidate, isSignedIn: true });
      },

      signOut: () => {
        set({ user: null, isSignedIn: false });
      },
    }),
    {
      name: "verafit_auth_session",
    }
  )
);
