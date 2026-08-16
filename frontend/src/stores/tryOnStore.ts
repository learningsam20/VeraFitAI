import { create } from "zustand";
import { Garment, KeepProbabilityResult, GarmentCompatibilityResponse, api } from "@/lib/api";

interface TryOnState {
  garments: Garment[];
  selectedGarment: Garment | null;
  activeResult: KeepProbabilityResult | null;
  isLoading: boolean;
  analysisError: string | null;
  isDiagnosticsOpen: boolean;
  activeDiagnosticTab: "fit" | "color" | "fabric";
  userImageB64: string | null;
  loadedPhotoUserId: string | null;
  compatibility: GarmentCompatibilityResponse | null;
  compatibilityLoading: boolean;
  compatibilityError: string | null;
  showExcluded: boolean;

  fetchGarments: (userId?: string) => Promise<void>;
  fetchCompatibility: (userId?: string) => Promise<void>;
  toggleShowExcluded: () => void;
  setSelectedGarment: (garment: Garment) => void;
  runAnalysis: (userId?: string, moodModifier?: number) => Promise<void>;
  ensureUserPhoto: (userId?: string) => Promise<string | undefined>;
  setUserImageB64: (b64: string | null) => void;
  setDiagnosticsOpen: (open: boolean) => void;
  setActiveDiagnosticTab: (tab: "fit" | "color" | "fabric") => void;
}

export const useTryOnStore = create<TryOnState>((set, get) => ({
  garments: [],
  selectedGarment: null,
  activeResult: null,
  isLoading: false,
  analysisError: null,
  isDiagnosticsOpen: false,
  activeDiagnosticTab: "fit",
  userImageB64: null,
  loadedPhotoUserId: null,
  compatibility: null,
  compatibilityLoading: false,
  compatibilityError: null,
  showExcluded: false,

  fetchGarments: async (userId?: string) => {
    try {
      const items = await api.getGarments(userId);
      set({ garments: items });
    } catch (e) {
      console.error("Error loading garments", e);
    }
  },

  fetchCompatibility: async (userId = "usr_94b3a8c1") => {
    set({ compatibilityLoading: true, compatibilityError: null });
    try {
      const compatibility = await api.getGarmentCompatibility(userId);
      set({ compatibility, compatibilityLoading: false });
    } catch (e: any) {
      console.error("Error loading garment compatibility", e);
      set({
        compatibilityLoading: false,
        compatibilityError: e?.message || "Failed to load compatibility",
      });
    }
  },

  toggleShowExcluded: () => set((s) => ({ showExcluded: !s.showExcluded })),

  setSelectedGarment: (garment) => {
    set({ selectedGarment: garment });
  },

  ensureUserPhoto: async (userId = "usr_94b3a8c1") => {
    const { userImageB64, loadedPhotoUserId } = get();
    // Reuse the cached photo only when it belongs to the same user; a switch
    // to another shopper (e.g. Elena -> Astrid) must reload their own photo.
    if (userImageB64 && loadedPhotoUserId === userId) return userImageB64;
    try {
      const profile = await api.getMannequinProfile(userId);
      if (profile.basePhotoUrl) {
        set({ userImageB64: profile.basePhotoUrl, loadedPhotoUserId: userId });
        return profile.basePhotoUrl;
      }
    } catch (err) {
      console.error("Failed to load mannequin photo", err);
    }
    return undefined;
  },

  runAnalysis: async (userId = "usr_94b3a8c1", moodModifier = 0.0) => {
    const garment = get().selectedGarment;
    if (!garment) return;

    set({ isLoading: true, analysisError: null });
    try {
      // Make sure the VTO drapes on the user's own mannequin/uploaded photo.
      const photo = await get().ensureUserPhoto(userId);
      const result = await api.analyzeKeepProbability({
        userId,
        garment,
        context: { moodSlider: moodModifier },
        userImageB64: get().userImageB64 ?? photo ?? undefined,
      });
      set({ activeResult: result, isLoading: false });
    } catch (err: any) {
      console.error("Analysis execution failed", err);
      set({
        isLoading: false,
        analysisError:
          err?.message || "Analysis failed. Please try again.",
      });
    }
  },

  setUserImageB64: (b64) => set({ userImageB64: b64 }),

  setDiagnosticsOpen: (open) => set({ isDiagnosticsOpen: open }),
  setActiveDiagnosticTab: (tab) => set({ activeDiagnosticTab: tab, isDiagnosticsOpen: true }),
}));
