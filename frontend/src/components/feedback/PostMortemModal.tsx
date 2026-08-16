"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { X, CheckCircle, RotateCcw, AlertTriangle, Sparkles, Send } from "lucide-react";

interface PostMortemModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  garmentName: string;
  userId?: string;
  onFeedbackSaved?: () => void;
  title?: string;
  initialAction?: "KEPT" | "RETURNED";
}

export const PostMortemModal: React.FC<PostMortemModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  garmentName,
  userId = "usr_94b3a8c1",
  onFeedbackSaved,
  title = "Continuous Learning Post-Mortem",
  initialAction = "KEPT",
}) => {
  const [action, setAction] = useState<"KEPT" | "RETURNED">(initialAction);
  const [returnReason, setReturnReason] = useState<string>("FABRIC_ITCHY");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.recordFeedback({
        userId,
        sessionId,
        action,
        reason: action === "RETURNED" ? returnReason : undefined,
        details: details.trim() || undefined,
      });
      if (onFeedbackSaved) onFeedbackSaved();
      onClose();
    } catch (err) {
      console.error("Failed to log feedback", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Log what happened with <strong className="text-foreground">{garmentName}</strong>. VeraFit will recalibrate your algorithmic preference weights for all future sessions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Action Choice: KEPT vs RETURNED */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction("KEPT")}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
                action === "KEPT"
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/20"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>I Kept The Item</span>
            </button>

            <button
              type="button"
              onClick={() => setAction("RETURNED")}
              className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
                action === "RETURNED"
                  ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 font-bold ring-2 ring-rose-500/20"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <RotateCcw className="w-5 h-5" />
              <span>I Returned The Item</span>
            </button>
          </div>

          {/* If Returned: Reason Selector */}
          {action === "RETURNED" && (
            <div className="space-y-2 p-3 rounded-2xl bg-secondary/40 border border-border">
              <label className="font-bold text-foreground">Primary Return Reason</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="FABRIC_ITCHY">Fabric Itchy / Skin Sensitivity Flare</option>
                <option value="FIT_TOO_TIGHT">Fit Too Tight / Drape Uncomfortable</option>
                <option value="COLOR_UNFLATTERING">Color Was Unflattering in Person</option>
                <option value="POOR_QUALITY">Material Quality / Stitching Issue</option>
              </select>
            </div>
          )}

          {/* Details / Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Additional Observations (Optional)</label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g., Neck area felt too restrictive after 30 minutes..."
              className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Recalibrating..." : "Save & Recalibrate"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
