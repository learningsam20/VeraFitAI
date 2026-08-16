"use client";

import React, { useRef, useEffect } from "react";
import { Sparkles, Flame, Layers, Eye, RefreshCw, Camera, UserCheck, Upload, Check, Maximize2, ZoomIn, ZoomOut, RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useTryOnStore } from "@/stores/tryOnStore";
import { downscaleImageDataUrl } from "@/lib/utils";

interface VtoPreviewSliderProps {
  renders: string[];
  heatmapUrl?: string;
  isLoading?: boolean;
}

export const VtoPreviewSlider: React.FC<VtoPreviewSliderProps> = ({
  renders,
  heatmapUrl,
  isLoading = false,
}) => {
  const [sliderPos, setSliderPos] = React.useState<number>(50);
  const [activeMode, setActiveMode] = React.useState<"compare" | "heatmap" | "single">("compare");
  const [blendTarget, setBlendTarget] = React.useState<"user_photo" | "mannequin">("user_photo");
  const [primaryIndex, setPrimaryIndex] = React.useState<number>(0);
  const [compareIndex, setCompareIndex] = React.useState<number>(1);
  const [zoomOpen, setZoomOpen] = React.useState<boolean>(false);
  const [zoomIndex, setZoomIndex] = React.useState<number>(0);
  const [zoomScale, setZoomScale] = React.useState<number>(1);
  const [zoomView, setZoomView] = React.useState<"render" | "original">("render");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const userImageB64 = useTryOnStore((s) => s.userImageB64);
  const setUserImageB64 = useTryOnStore((s) => s.setUserImageB64);
  const ensureUserPhoto = useTryOnStore((s) => s.ensureUserPhoto);
  const loadedPhotoUserId = useTryOnStore((s) => s.loadedPhotoUserId);

  // Pull the user's own mannequin photo (their uploaded selfie / full-body
  // photo, or their distinct profile photo) so the fitting room and VTO show
  // that user instead of a shared default. Reloads when the signed-in shopper
  // switches (e.g. Elena -> Astrid) so the preview never shows a stale photo.
  useEffect(() => {
    if (user?.id && loadedPhotoUserId !== user.id) {
      ensureUserPhoto(user.id);
    }
  }, [user?.id, loadedPhotoUserId, ensureUserPhoto]);

  const userPhoto = userImageB64 || user?.avatarUrl || import.meta.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || "";
  const img1 = blendTarget === "user_photo" ? (renders[primaryIndex] || renders[0] || userPhoto) : (renders[primaryIndex] || renders[0] || "");
  const img2 = blendTarget === "user_photo" ? userPhoto : (renders[compareIndex] || renders[1] || renders[0] || "");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const raw = event.target.result as string;
          downscaleImageDataUrl(raw)
            .then((compressed) => {
              setUserImageB64(compressed);
              setBlendTarget("user_photo");
            })
            .catch(() => {
              setUserImageB64(raw);
              setBlendTarget("user_photo");
            });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-3xl bg-card border border-border/80 shadow-md overflow-hidden">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header controls */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-secondary/30">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-foreground">
            {blendTarget === "user_photo" ? "Blended on My Photo Studio" : "3D Digital Mannequin Studio"}
          </span>
        </div>

        {/* View Mode & Target Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          {/* Target Toggle: Blended Photo vs Mannequin */}
          <div className="flex items-center bg-muted/70 p-1 rounded-xl space-x-1">
            <button
              onClick={() => setBlendTarget("user_photo")}
              className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                blendTarget === "user_photo"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Render garment draped onto your uploaded personal photo"
            >
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span>Blended Photo</span>
            </button>
            <button
              onClick={() => setBlendTarget("mannequin")}
              className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                blendTarget === "mannequin"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Render garment on calibrated neutral 3D studio mannequin"
            >
              <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
              <span>3D Mannequin</span>
            </button>
          </div>

          {/* Upload My Photo Action */}
          {blendTarget === "user_photo" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all flex items-center space-x-1"
              title="Upload your own selfie or full-body photo"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{userImageB64 ? "Change My Photo" : "Upload My Photo"}</span>
            </button>
          )}

          {/* Analysis View: Compare vs SSIM Heatmap */}
          <div className="flex items-center bg-muted/70 p-1 rounded-xl space-x-1">
            <button
              onClick={() => setActiveMode("compare")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMode === "compare"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Compare
            </button>
            {heatmapUrl && (
              <button
                onClick={() => setActiveMode("heatmap")}
                className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all ${
                  activeMode === "heatmap"
                    ? "bg-card text-foreground shadow-xs text-rose-500 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Heatmap</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Visual Display */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] bg-slate-900/5 dark:bg-black/20 flex items-center justify-center p-4 select-none">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-spin">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground animate-pulse text-center">
              {blendTarget === "user_photo"
                ? `Blending realistic fabric drape onto ${user?.name || "your"} photo...`
                : "Computing 3D tension stress lines across studio mannequin..."}
            </p>
          </div>
        ) : renders.length === 0 ? (
          /* Placeholder: nothing to try yet */
          <div className="flex flex-col items-center justify-center text-center px-8 py-16 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-extrabold text-foreground">Select apparel to try</p>
              <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                Pick a garment from the catalog (or add a custom piece) and we'll drape it onto{" "}
                {blendTarget === "user_photo" ? "your photo" : "the 3D studio mannequin"} to preview the fit.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-muted-foreground/80">
              <Layers className="w-3.5 h-3.5" />
              <span>3 drape variations · SSIM heatmap · keep probability</span>
            </div>
          </div>
        ) : activeMode === "heatmap" && heatmapUrl ? (
          /* Heatmap View */
          <div className="relative w-full max-w-sm h-full flex flex-col items-center justify-center">
            <img
              src={heatmapUrl}
              alt="SSIM Variance Heatmap"
              className="w-full max-h-[420px] object-contain rounded-2xl border border-indigo-500/30 shadow-lg"
            />
            <div className="absolute bottom-3 bg-black/75 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full flex items-center space-x-2 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>High structural divergence highlighted in red/yellow</span>
            </div>
          </div>
        ) : (
          /* Interactive Compare Slider View */
          <div className="relative w-full max-w-sm aspect-[3/4] max-h-[620px] rounded-2xl overflow-hidden shadow-md border border-border bg-slate-900/80">
            {/* Background Image (Render B or Studio Mannequin) */}
            <img
              src={img2}
              alt="VTO Simulation B"
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              {blendTarget === "user_photo" ? "My Uploaded Photo" : "Mesh #2"}
            </div>

            {/* Foreground Clipped Image (Render A or Blended User Photo) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={img1}
                alt="VTO Simulation A"
                className="absolute inset-0 w-full h-full object-contain max-w-none"
                style={{ width: "100%", height: "100%" }}
              />
              <div className="absolute top-3 left-3 bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center space-x-1">
                <Check className="w-3 h-3 text-emerald-300" />
                <span>{blendTarget === "user_photo" ? "Draped On Your Photo" : "Mesh #1"}</span>
              </div>
            </div>

            {/* Divider Line & Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-7 h-7 rounded-full bg-white text-slate-800 shadow-xl border border-slate-200 flex items-center justify-center text-[10px] font-bold">
                ⇄
              </div>
            </div>

            {/* Range Input on top of slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
              aria-label="Compare slider"
            />

            {/* Open Full-Size View */}
            <button
              onClick={() => {
                setZoomIndex(primaryIndex);
                setZoomScale(1);
                setZoomView("render");
                setZoomOpen(true);
              }}
              className="absolute bottom-3 right-3 z-10 px-2.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold flex items-center space-x-1.5 hover:bg-primary/90 transition-colors shadow-lg"
              title="Open full body fit view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Render Selector Thumbnails */}
      {renders.length > 0 && !isLoading && (
        <div className="p-3 border-t border-border bg-secondary/20 flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-muted-foreground">
            {blendTarget === "user_photo" ? "Parallel Drape Variations:" : "3 Mesh Variations:"}
          </span>
          <div className="flex items-center space-x-2">
            {renders.map((r, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrimaryIndex(idx);
                  setCompareIndex((idx + 1) % renders.length);
                  setActiveMode("compare");
                }}
                className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${
                  primaryIndex === idx
                    ? "border-primary shadow-sm scale-105"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
                title={`Simulation Render ${idx + 1}`}
              >
                <img src={r} alt={`Sim ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Full-Size Fit Zoom Modal */}
      {zoomOpen && renders.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200"
          onClick={() => setZoomOpen(false)}
        >
          {/* Modal Header */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <Maximize2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-extrabold text-white">
                Full Body Fit View — {zoomView === "render" ? "Alternate Fit" : "Original Photo"}
              </span>
              <span className="text-[11px] text-white/50 font-semibold">
                {zoomIndex + 1} / {renders.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Original vs Render Toggle */}
              <div className="flex items-center bg-white/10 p-1 rounded-xl space-x-1">
                <button
                  onClick={() => setZoomView("original")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    zoomView === "original" ? "bg-white/90 text-slate-900" : "text-white/70 hover:text-white"
                  }`}
                  disabled={!img1}
                >
                  Original
                </button>
                <button
                  onClick={() => setZoomView("render")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    zoomView === "render" ? "bg-white/90 text-slate-900" : "text-white/70 hover:text-white"
                  }`}
                >
                  Render
                </button>
              </div>

              <button
                onClick={() => setZoomIndex((zoomIndex - 1 + renders.length) % renders.length)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Previous render"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomIndex((zoomIndex + 1) % renders.length)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Next render"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-white/15 mx-1" />

              <button
                onClick={() => setZoomScale((s) => Math.max(1, s - 0.5))}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="min-w-[38px] text-center text-[11px] font-bold text-white">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((s) => Math.min(3, s + 0.5))}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomScale(1)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setZoomOpen(false)}
                className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body: full-size image with native pan */}
          <div
            className="flex-1 overflow-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setZoomOpen(false);
            }}
          >
            <div
              className="min-w-full min-h-full flex items-center justify-center p-6"
              style={{ width: `${zoomScale * 100}%`, height: `${zoomScale * 100}%` }}
            >
              <img
                src={zoomView === "render" ? renders[zoomIndex] : img1}
                alt={zoomView === "render" ? `Full body alternate fit ${zoomIndex + 1}` : "Original uploaded photo"}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl select-none"
                draggable={false}
              />
            </div>
          </div>

          {/* Modal Footer Hint */}
          <div
            className="px-4 py-2.5 border-t border-white/10 text-center text-[11px] text-white/50 font-medium flex items-center justify-center space-x-4"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Click backdrop or press Esc to close</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Scroll or drag within frame to pan when zoomed</span>
          </div>
        </div>
      )}
    </div>
  );
};
