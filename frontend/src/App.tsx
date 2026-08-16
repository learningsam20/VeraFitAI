import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AiXRayModal } from "@/components/diagnostics/AiXRayModal";
import FittingRoom from "@/pages/FittingRoom";
import Mannequin from "@/pages/Mannequin";
import History from "@/pages/History";
import Calendar from "@/pages/Calendar";
import Admin from "@/pages/Admin";
import Learnings from "@/pages/Learnings";

export default function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <Header onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      <div className="flex-1 flex w-full">
        <Sidebar
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<FittingRoom />} />
            <Route path="/try-on" element={<FittingRoom />} />
            <Route path="/mannequin" element={<Mannequin />} />
            <Route path="/history" element={<History />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/learnings" element={<Learnings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<FittingRoom />} />
          </Routes>
        </main>
      </div>

      <AiXRayModal />
    </ThemeProvider>
  );
}
