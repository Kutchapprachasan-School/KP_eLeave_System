"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Plus, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Users, 
  MapPin, 
  Calendar,
  Layers
} from "lucide-react";

interface ResourceItemUI {
  id: string;
  code: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  utilizationPercent: number;
  status: "AVAILABLE" | "BUSY";
}

const RESOURCES_DATA: ResourceItemUI[] = [
  { id: "r1", code: "LAB-CHEM-1", name: "ห้องปฏิบัติการเคมี 1", type: "SCIENCE_LAB", capacity: 40, location: "อาคาร 3 ชั้น 2", utilizationPercent: 88, status: "BUSY" },
  { id: "r2", code: "LAB-COMP-2", name: "ห้องคอมพิวเตอร์กราฟิก 2", type: "COMPUTER_LAB", capacity: 45, location: "อาคาร 4 ชั้น 3", utilizationPercent: 92, status: "BUSY" },
  { id: "r3", code: "ROOM-MUSIC", name: "ห้องซ้อมดนตรีและสากล", type: "MUSIC_ROOM", capacity: 30, location: "อาคารกิจกรรม ชั้น 1", utilizationPercent: 40, status: "AVAILABLE" },
  { id: "r4", code: "GYM-MAIN", name: "โรงยิมเนเซียมอเนกประสงค์", type: "GYM", capacity: 500, location: "อาคารพลศึกษา", utilizationPercent: 65, status: "AVAILABLE" },
];

export default function ResourcesDomainPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>Resource Capacity Engine</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
            บริหารจัดการความจุและทรัพยากรส่วนกลาง (Resource Capacity Engine)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บริหารความจุห้องแล็บวิทยาศาสตร์ ห้องคอมพิวเตอร์ โรงยิม สนามกีฬา หอประชุม และป้องกันข้อขัดแย้งในการจอง (Conflict Engine)
          </p>
        </div>

        <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2">
          <Plus className="w-4 h-4" />
          เพิ่มทรัพยากรใหม่
        </button>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {RESOURCES_DATA.map((r) => (
          <div key={r.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">{r.code}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  r.status === "AVAILABLE" 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                }`}>
                  {r.status}
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{r.name}</h3>

              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {r.location}</p>
                <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /> ความจุ {r.capacity} คน</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-500">อัตราการใช้งาน:</span>
                <span className="text-cyan-600 dark:text-cyan-400">{r.utilizationPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    r.utilizationPercent > 85 ? "bg-rose-500" : "bg-cyan-500"
                  }`} 
                  style={{ width: `${r.utilizationPercent}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
