"use client";

import React from "react";
import { Check, Sparkles, Award } from "lucide-react";

export interface TeacherScoreBubbleGridProps {
  itemNo: number;
  itemTitle?: string;
  maxScore: number;
  currentScore?: number | null;
  rubricDetail?: string | null;
  readOnly?: boolean;
  onChangeScore?: (newScore: number) => void;
}

export default function TeacherScoreBubbleGrid({
  itemNo,
  itemTitle,
  maxScore = 10,
  currentScore = null,
  rubricDetail,
  readOnly = false,
  onChangeScore
}: TeacherScoreBubbleGridProps) {
  // If maxScore is <= 10: Simple single row 0..maxScore
  const isDirectList = maxScore <= 10;

  // Single list of choices (0..maxScore)
  const directScores = Array.from({ length: Math.floor(maxScore) + 1 }, (_, i) => i);

  // Split tens and units for maxScore > 10
  const maxTens = Math.floor(maxScore / 10);
  const tensValues = Array.from({ length: maxTens + 1 }, (_, i) => i * 10);
  const unitsValues = Array.from({ length: 10 }, (_, i) => i);

  const currentTens = currentScore != null ? Math.floor(currentScore / 10) * 10 : null;
  const currentUnits = currentScore != null ? currentScore % 10 : null;

  const handleSelectTens = (tens: number) => {
    if (readOnly || !onChangeScore) return;
    const units = currentUnits ?? 0;
    const next = tens + units;
    onChangeScore(Math.min(maxScore, next));
  };

  const handleSelectUnits = (units: number) => {
    if (readOnly || !onChangeScore) return;
    const tens = currentTens ?? 0;
    const next = tens + units;
    onChangeScore(Math.min(maxScore, next));
  };

  return (
    <div className="p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono">
            {itemNo}
          </span>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {itemTitle || `ข้อสอบอัตนัยข้อที่ ${itemNo}`}
            </div>
            {rubricDetail && (
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                เกณฑ์: {rubricDetail}
              </div>
            )}
          </div>
        </div>

        {/* Current Score Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 font-mono text-xs font-bold shadow-2xs">
          <span className="text-indigo-600 dark:text-indigo-400">
            {currentScore != null ? currentScore : "-"}
          </span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 dark:text-slate-300">{maxScore}</span>
          <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">คะแนน</span>
        </div>
      </div>

      {/* Bubble Grid Selection */}
      <div className="space-y-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
        {isDirectList ? (
          /* Simple Row: 0 .. maxScore */
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-1">
              คะแนนที่ได้:
            </span>
            {directScores.map((scoreVal) => {
              const isSelected = currentScore === scoreVal;
              return (
                <button
                  key={scoreVal}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChangeScore && onChangeScore(scoreVal)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center font-bold text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 dark:ring-indigo-700 shadow-xs scale-105"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={`ให้ ${scoreVal} คะแนน`}
                >
                  {scoreVal}
                </button>
              );
            })}
          </div>
        ) : (
          /* Two Rows for Tens and Units */
          <div className="space-y-2">
            {/* Tens Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-slate-500 w-14">หลักสิบ:</span>
              {tensValues.map((tVal) => {
                const isSelected = currentTens === tVal;
                return (
                  <button
                    key={tVal}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleSelectTens(tVal)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs font-mono transition cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300"
                        : "bg-white dark:bg-slate-800 border-slate-300 text-slate-700 hover:bg-indigo-50"
                    } disabled:opacity-50`}
                  >
                    {tVal}
                  </button>
                );
              })}
            </div>

            {/* Units Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-slate-500 w-14">หลักหน่วย:</span>
              {unitsValues.map((uVal) => {
                const isSelected = currentUnits === uVal;
                return (
                  <button
                    key={uVal}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleSelectUnits(uVal)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs font-mono transition cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300"
                        : "bg-white dark:bg-slate-800 border-slate-300 text-slate-700 hover:bg-indigo-50"
                    } disabled:opacity-50`}
                  >
                    {uVal}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
