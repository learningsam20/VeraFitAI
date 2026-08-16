import { create } from "zustand";

export interface OwnedWardrobeItem {
  sku: string;
  name: string;
  category: string;
  imageUrl: string;
  colorHex: string;
  pairingNote: string;
}

export interface EventSlot {
  id: "morning" | "afternoon" | "evening";
  title: "Morning (09:00 - 13:00)" | "Afternoon (13:00 - 17:30)" | "Evening (18:00 - 22:30)";
  agenda: string;
  agendaType: "formal" | "wfh" | "casual" | "social" | "gala";
  weatherTemp: string;
  weatherCondition: string;
  biometricReadiness: number; // 0-100
  computedMood: number;       // -1.0 to +1.0
  recommendedSku: string;
  recommendedGarmentName: string;
  recommendedGarmentImg: string;
  recommendedReason: string;
  makeupPaletteSuggestion: string;
  pairedOwnedItem?: OwnedWardrobeItem;
  keepCertainty: number;
}

export interface DaySchedule {
  id: string;
  dayName: string;
  shortDay: string;
  dateStr: string;
  selectedSlotId: "morning" | "afternoon" | "evening";
  slots: {
    morning: EventSlot;
    afternoon: EventSlot;
    evening: EventSlot;
  };
}

export const INITIAL_7_DAYS: DaySchedule[] = [
  {
    id: "day-1",
    dayName: "Monday",
    shortDay: "Mon",
    dateStr: "Aug 17",
    selectedSlotId: "morning",
    slots: {
      morning: {
        id: "morning",
        title: "Morning (09:00 - 13:00)",
        agenda: "Executive Product Keynote & Board Review",
        agendaType: "formal",
        weatherTemp: "14°C",
        weatherCondition: "Crisp & Windy",
        biometricReadiness: 94,
        computedMood: 0.70,
        recommendedSku: "TOP-SLK-001",
        recommendedGarmentName: "Tailored Mulberry Silk Shirt",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Sharp collar tailoring & thermoregulating silk provides executive poise.",
        makeupPaletteSuggestion: "Cool Berry Lip & Velvet Matte Contour",
        pairedOwnedItem: {
          sku: "OWN-BLZ-001",
          name: "Your Midnight Tailored Trousers",
          category: "bottoms",
          imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&auto=format&fit=crop&q=80",
          colorHex: "#1C1C1C",
          pairingNote: "Harmonizes with silk collar contrast for a 94% keep-certainty outfit.",
        },
        keepCertainty: 93.5,
      },
      afternoon: {
        id: "afternoon",
        title: "Afternoon (13:00 - 17:30)",
        agenda: "Investor Coffee & Creative Team Sync",
        agendaType: "casual",
        weatherTemp: "18°C",
        weatherCondition: "Pleasant & Breezy",
        biometricReadiness: 86,
        computedMood: 0.20,
        recommendedSku: "TOP-LNN-003",
        recommendedGarmentName: "Relaxed French Linen Tunic",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Low-friction drape transitions comfortably into outdoor cafe transit.",
        makeupPaletteSuggestion: "Soft Rose Flush & Neutral Lip Balm",
        pairedOwnedItem: {
          sku: "OWN-DNM-002",
          name: "Your Indigo Selvedge Denim",
          category: "bottoms",
          imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&auto=format&fit=crop&q=80",
          colorHex: "#1E3A8A",
          pairingNote: "Balances relaxed linen texture with clean structure.",
        },
        keepCertainty: 89.0,
      },
      evening: {
        id: "evening",
        title: "Evening (18:00 - 22:30)",
        agenda: "Private Gallery Opening & Dinner",
        agendaType: "social",
        weatherTemp: "16°C",
        weatherCondition: "Clear Twilight",
        biometricReadiness: 88,
        computedMood: 0.45,
        recommendedSku: "DRS-SYN-004",
        recommendedGarmentName: "Crimson Crepe Evening Top",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "High-chroma Cool Winter tone with fluid silhouette under evening gallery lighting.",
        makeupPaletteSuggestion: "Wine Stained Lip & Subtle Shimmer Eye",
        pairedOwnedItem: {
          sku: "OWN-SKT-003",
          name: "Your Black Pleated Midi Skirt",
          category: "bottoms",
          imageUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&auto=format&fit=crop&q=80",
          colorHex: "#0F172A",
          pairingNote: "Creates continuous fluid silhouette and enhances color pop.",
        },
        keepCertainty: 87.2,
      },
    },
  },
  {
    id: "day-2",
    dayName: "Tuesday",
    shortDay: "Tue",
    dateStr: "Aug 18",
    selectedSlotId: "morning",
    slots: {
      morning: {
        id: "morning",
        title: "Morning (09:00 - 13:00)",
        agenda: "Deep Work Sprint & Architecture Reviews",
        agendaType: "wfh",
        weatherTemp: "11°C",
        weatherCondition: "Overcast Rain",
        biometricReadiness: 79,
        computedMood: -0.65,
        recommendedSku: "TOP-OVR-006",
        recommendedGarmentName: "Oversized Organic Cotton Tee",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Zero friction seam construction prevents sensitivity irritation during 4-hour focus blocks.",
        makeupPaletteSuggestion: "Hydrating Glaze & Fresh Skin Minimalist",
        keepCertainty: 96.0,
      },
      afternoon: {
        id: "afternoon",
        title: "Afternoon (13:00 - 17:30)",
        agenda: "Async Code Review & Virtual Sync",
        agendaType: "wfh",
        weatherTemp: "13°C",
        weatherCondition: "Drizzling Rain",
        biometricReadiness: 76,
        computedMood: -0.50,
        recommendedSku: "TOP-LNN-003",
        recommendedGarmentName: "Relaxed French Linen Tunic",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Natural breathable thermoregulation for comfortable temperature control.",
        makeupPaletteSuggestion: "Nourishing Lip Oil & Bare Brow",
        keepCertainty: 91.5,
      },
      evening: {
        id: "evening",
        title: "Evening (18:00 - 22:30)",
        agenda: "Cozy Home Cooking & Reading",
        agendaType: "wfh",
        weatherTemp: "10°C",
        weatherCondition: "Cold Night Rain",
        biometricReadiness: 82,
        computedMood: -0.75,
        recommendedSku: "TOP-OVR-006",
        recommendedGarmentName: "Oversized Organic Cotton Tee",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Cocoon comfort rating with maximum skin breathing index.",
        makeupPaletteSuggestion: "Night Recovery Serum Glaze",
        keepCertainty: 97.0,
      },
    },
  },
  {
    id: "day-3",
    dayName: "Wednesday",
    shortDay: "Wed",
    dateStr: "Aug 19",
    selectedSlotId: "afternoon",
    slots: {
      morning: {
        id: "morning",
        title: "Morning (09:00 - 13:00)",
        agenda: "Cross-Functional Quarterly Planning",
        agendaType: "formal",
        weatherTemp: "16°C",
        weatherCondition: "Sunny & Crisp",
        biometricReadiness: 88,
        computedMood: 0.50,
        recommendedSku: "TOP-SLK-001",
        recommendedGarmentName: "Tailored Mulberry Silk Shirt",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Structured collar and breathable thermal release.",
        makeupPaletteSuggestion: "Rosy Nude Satin Lip",
        keepCertainty: 90.0,
      },
      afternoon: {
        id: "afternoon",
        title: "Afternoon (13:00 - 17:30)",
        agenda: "Design Workshop & Client Demo",
        agendaType: "casual",
        weatherTemp: "20°C",
        weatherCondition: "Warm Sun",
        biometricReadiness: 84,
        computedMood: 0.15,
        recommendedSku: "TOP-LNN-003",
        recommendedGarmentName: "Relaxed French Linen Tunic",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Approachable smart-casual silhouette with natural drape.",
        makeupPaletteSuggestion: "Warm Peach Coral Lip & Dewy Cheek",
        keepCertainty: 88.5,
      },
      evening: {
        id: "evening",
        title: "Evening (18:00 - 22:30)",
        agenda: "Dinner & Cocktails with Design Colleagues",
        agendaType: "social",
        weatherTemp: "18°C",
        weatherCondition: "Clear Sky",
        biometricReadiness: 89,
        computedMood: 0.35,
        recommendedSku: "DRS-SYN-004",
        recommendedGarmentName: "Crimson Crepe Evening Top",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Vibrant jewel hue tailored for evening atmosphere.",
        makeupPaletteSuggestion: "Burgundy Gloss & Smudged Liner",
        keepCertainty: 86.0,
      },
    },
  },
  {
    id: "day-4",
    dayName: "Thursday",
    shortDay: "Thu",
    dateStr: "Aug 20",
    selectedSlotId: "morning",
    slots: {
      morning: {
        id: "morning",
        title: "Morning (09:00 - 13:00)",
        agenda: "1-on-1 Mentorships & Coffee Walks",
        agendaType: "casual",
        weatherTemp: "17°C",
        weatherCondition: "Breezy Morning",
        biometricReadiness: 83,
        computedMood: 0.05,
        recommendedSku: "TOP-OVR-006",
        recommendedGarmentName: "Oversized Organic Cotton Tee",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Clean organic cotton with hypoallergenic softness.",
        makeupPaletteSuggestion: "Minimal Glow & Hydrated Tint",
        keepCertainty: 93.0,
      },
      afternoon: {
        id: "afternoon",
        title: "Afternoon (13:00 - 17:30)",
        agenda: "Brand Strategy Working Session",
        agendaType: "casual",
        weatherTemp: "21°C",
        weatherCondition: "Bright & Sunny",
        biometricReadiness: 85,
        computedMood: 0.20,
        recommendedSku: "TOP-LNN-003",
        recommendedGarmentName: "Relaxed French Linen Tunic",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Breathable weave maintains crisp shape throughout brainstorming sessions.",
        makeupPaletteSuggestion: "Soft Bronzer & Sheer Lip Glaze",
        keepCertainty: 89.2,
      },
      evening: {
        id: "evening",
        title: "Evening (18:00 - 22:30)",
        agenda: "Casual Bistro Dinner",
        agendaType: "social",
        weatherTemp: "19°C",
        weatherCondition: "Mild Evening",
        biometricReadiness: 87,
        computedMood: 0.30,
        recommendedSku: "TOP-SLK-001",
        recommendedGarmentName: "Tailored Mulberry Silk Shirt",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Effortless smart sophistication.",
        makeupPaletteSuggestion: "Plum Berry Lip & Brushed Brows",
        keepCertainty: 91.0,
      },
    },
  },
  {
    id: "day-5",
    dayName: "Friday",
    shortDay: "Fri",
    dateStr: "Aug 21",
    selectedSlotId: "evening",
    slots: {
      morning: {
        id: "morning",
        title: "Morning (09:00 - 13:00)",
        agenda: "Sprint Retrospective & Team Demos",
        agendaType: "casual",
        weatherTemp: "18°C",
        weatherCondition: "Sunny",
        biometricReadiness: 90,
        computedMood: 0.15,
        recommendedSku: "TOP-LNN-003",
        recommendedGarmentName: "Relaxed French Linen Tunic",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Relaxed Friday energy with tailored polish.",
        makeupPaletteSuggestion: "Champagne Glow & Tinted Lip",
        keepCertainty: 90.5,
      },
      afternoon: {
        id: "afternoon",
        title: "Afternoon (13:00 - 17:30)",
        agenda: "Studio Wrap-Up & Prep for Evening",
        agendaType: "casual",
        weatherTemp: "22°C",
        weatherCondition: "Warm & Clear",
        biometricReadiness: 88,
        computedMood: 0.25,
        recommendedSku: "TOP-SLK-001",
        recommendedGarmentName: "Tailored Mulberry Silk Shirt",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Seamless day-to-night transition piece.",
        makeupPaletteSuggestion: "Golden Hour Glow",
        keepCertainty: 92.0,
      },
      evening: {
        id: "evening",
        title: "Evening (18:00 - 22:30)",
        agenda: "Rooftop Party & Celebration Gala",
        agendaType: "gala",
        weatherTemp: "21°C",
        weatherCondition: "Balmy Clear Night",
        biometricReadiness: 92,
        computedMood: 0.75,
        recommendedSku: "DRS-SYN-004",
        recommendedGarmentName: "Crimson Crepe Evening Top",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "High-impact silhouette with dramatic drape and radiant Cool Winter color depth.",
        makeupPaletteSuggestion: "Statement Crimson Lip & Winged Eye",
        keepCertainty: 88.4,
      },
    },
  },
  {
    id: "day-6",
    dayName: "Saturday",
    shortDay: "Sat",
    dateStr: "Aug 22",
    selectedSlotId: "morning",
    slots: {
      morning: {
        id: "morning",
        title: "Morning (09:00 - 13:00)",
        agenda: "Farmers Market & Outdoor Brunch",
        agendaType: "social",
        weatherTemp: "21°C",
        weatherCondition: "Sunny & Gentle Breeze",
        biometricReadiness: 96,
        computedMood: 0.10,
        recommendedSku: "TOP-LNN-003",
        recommendedGarmentName: "Relaxed French Linen Tunic",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Lightweight natural weave lets skin breathe in direct sunlight.",
        makeupPaletteSuggestion: "Sunscreen Glaze & Sheer Coral Balm",
        keepCertainty: 94.0,
      },
      afternoon: {
        id: "afternoon",
        title: "Afternoon (13:00 - 17:30)",
        agenda: "Botanical Garden Walk & Reading",
        agendaType: "casual",
        weatherTemp: "24°C",
        weatherCondition: "Warm Sunlight",
        biometricReadiness: 92,
        computedMood: -0.10,
        recommendedSku: "TOP-OVR-006",
        recommendedGarmentName: "Oversized Organic Cotton Tee",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Pure hypoallergenic cotton protects sensitive skin during warm weather.",
        makeupPaletteSuggestion: "Natural Freckle Tint & Hydration Mist",
        keepCertainty: 95.2,
      },
      evening: {
        id: "evening",
        title: "Evening (18:00 - 22:30)",
        agenda: "Acoustic Concert & Tapas",
        agendaType: "social",
        weatherTemp: "20°C",
        weatherCondition: "Clear Warm Night",
        biometricReadiness: 94,
        computedMood: 0.35,
        recommendedSku: "TOP-SLK-001",
        recommendedGarmentName: "Tailored Mulberry Silk Shirt",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Polished casual aesthetic with effortless evening comfort.",
        makeupPaletteSuggestion: "Smoky Bronze Liner & Tinted Gloss",
        keepCertainty: 91.8,
      },
    },
  },
  {
    id: "day-7",
    dayName: "Sunday",
    shortDay: "Sun",
    dateStr: "Aug 23",
    selectedSlotId: "morning",
    slots: {
      morning: {
        id: "morning",
        title: "Morning (09:00 - 13:00)",
        agenda: "Slow Coffee, Journaling & Yoga",
        agendaType: "wfh",
        weatherTemp: "16°C",
        weatherCondition: "Misty Fog",
        biometricReadiness: 95,
        computedMood: -0.80,
        recommendedSku: "TOP-OVR-006",
        recommendedGarmentName: "Oversized Organic Cotton Tee",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Maximum cocoon softness with zero skin restriction.",
        makeupPaletteSuggestion: "Bare Skin Recovery Barrier Cream",
        keepCertainty: 98.0,
      },
      afternoon: {
        id: "afternoon",
        title: "Afternoon (13:00 - 17:30)",
        agenda: "Weekly Wardrobe Organization & Reset",
        agendaType: "wfh",
        weatherTemp: "18°C",
        weatherCondition: "Filtered Light",
        biometricReadiness: 92,
        computedMood: -0.60,
        recommendedSku: "TOP-LNN-003",
        recommendedGarmentName: "Relaxed French Linen Tunic",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Relaxed fit for moving around the home with ease.",
        makeupPaletteSuggestion: "Hydrating Facial Mist",
        keepCertainty: 93.0,
      },
      evening: {
        id: "evening",
        title: "Evening (18:00 - 22:30)",
        agenda: "Movie Night & Rest",
        agendaType: "wfh",
        weatherTemp: "15°C",
        weatherCondition: "Calm Overcast",
        biometricReadiness: 90,
        computedMood: -0.75,
        recommendedSku: "TOP-OVR-006",
        recommendedGarmentName: "Oversized Organic Cotton Tee",
        recommendedGarmentImg: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
        recommendedReason: "Pure soft comfort before the start of the new week.",
        makeupPaletteSuggestion: "Nighttime Lipid Barrier Treatment",
        keepCertainty: 97.5,
      },
    },
  },
];

interface CalendarState {
  schedule: DaySchedule[];
  selectedDayId: string;
  setSelectedDayId: (id: string) => void;
  setSelectedSlotForDay: (dayId: string, slotId: "morning" | "afternoon" | "evening") => void;
  updateSlotAgenda: (
    dayId: string,
    slotId: "morning" | "afternoon" | "evening",
    agenda: string,
    type: EventSlot["agendaType"]
  ) => void;
  getSelectedDay: () => DaySchedule;
  getSelectedSlot: () => EventSlot;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  schedule: INITIAL_7_DAYS,
  selectedDayId: "day-1",
  setSelectedDayId: (id: string) => set({ selectedDayId: id }),
  setSelectedSlotForDay: (dayId: string, slotId: "morning" | "afternoon" | "evening") => {
    set((state) => ({
      schedule: state.schedule.map((d) =>
        d.id === dayId ? { ...d, selectedSlotId: slotId } : d
      ),
    }));
  },
  updateSlotAgenda: (dayId, slotId, agenda, type) => {
    set((state) => {
      const updated = state.schedule.map((d) => {
        if (d.id === dayId) {
          let moodShift = 0.0;
          if (type === "formal") moodShift = 0.65;
          else if (type === "gala") moodShift = 0.80;
          else if (type === "wfh") moodShift = -0.65;
          else if (type === "social") moodShift = 0.40;
          else moodShift = 0.15;

          const updatedSlot: EventSlot = {
            ...d.slots[slotId],
            agenda,
            agendaType: type,
            computedMood: moodShift,
          };

          return {
            ...d,
            slots: {
              ...d.slots,
              [slotId]: updatedSlot,
            },
          };
        }
        return d;
      });
      return { schedule: updated };
    });
  },
  getSelectedDay: () => {
    const { schedule, selectedDayId } = get();
    return schedule.find((d) => d.id === selectedDayId) || schedule[0];
  },
  getSelectedSlot: () => {
    const day = get().getSelectedDay();
    return day.slots[day.selectedSlotId] || day.slots.morning;
  },
}));
