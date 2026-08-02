"use client";

import React, { useState } from "react";
import { Building2, Save, Check, Plus, Wrench, Laptop, Bus } from "lucide-react";
import { useToast } from "@/components/toast-provider";

export default function FacilitySettingsPage() {
  const { showToast } = useToast();
  const [isSaved, setIsSaved] = useState(false);

  // Form State
  const [resources, setResources] = useState([
    { id: "res-1", code: "ROOM-CONF-1", name: "ห้องประชุมกุญชร 1", type: "ห้องประชุมส่วนกลาง", capacity: 80, status: "พร้อมใช้งาน" },
    { id: "res-2", code: "BUS-01", name: "รถบัสปรับอากาศ 45 ที่นั่ง", type: "ยานพาหนะโรงเรียน", capacity: 45, status: "พร้อมใช้งาน" },
    { id: "res-3", code: "LAB-CHEM-1", name: "ห้องปฏิบัติการเคมี 1", type: "ห้อง Lab", capacity: 40, status: "พร้อมใช้งาน" }
  ]);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("ห้องประชุมส่วนกลาง");
  const [newCapacity, setNewCapacity] = useState(30);

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setResources(prev => [
      ...prev,
      {
        id: `res-${Date.now()}`,
        code: newCode || `RES-${Date.now()}`,
        name: newName,
        type: newType,
        capacity: newCapacity,
        status: "พร้อมใช้งาน"
      }
    ]);
    setNewCode("");
    setNewName("");
    showToast("success", "เพิ่มรายการทรัพยากรส่วนกลางสำเร็จ");
  };

  const handleSave = () => {
    setIsSaved(true);
    showToast("success", "บันทึกการตั้งค่าฝ่ายบริหารทั่วไปสำเร็จ");
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            การตั้งค่าฝ่ายบริหารทั่วไป & ทรัพยากรส่วนกลาง (General Administration Settings)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บริหารแคตตาล็อกทรัพยากรส่วนกลาง (ห้องประชุม, รถโรงเรียน, อุปกรณ์ Lab) และเกณฑ์การแจ้งซ่อมครุภัณฑ์
          </p>
        </div>

        <button
          onClick={handleSave}
          className="h-10 px-5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-teal-600/20"
        >
          {isSaved ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
          {isSaved ? "บันทึกตั้งค่าแล้ว!" : "บันทึกการตั้งค่า"}
        </button>
      </div>

      {/* Resource Management Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-4xl">
        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
          🏢 บันทึกและแก้ไขรายการทรัพยากรกลางส่วนกลาง
        </h2>

        {/* Add Form */}
        <form onSubmit={handleAddResource} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">รหัสกำกับ</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="เช่น BUS-01"
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ชื่อทรัพยากร</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="เช่น ห้องประชุมกุญชร 1"
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ประเภท</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="ห้องประชุมส่วนกลาง">ห้องประชุมส่วนกลาง</option>
              <option value="ยานพาหนะโรงเรียน">ยานพาหนะโรงเรียน</option>
              <option value="ห้อง Lab">ห้อง Lab</option>
              <option value="อุปกรณ์ส่วนกลาง">อุปกรณ์ส่วนกลาง</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ความจุ (คน/ที่นั่ง)</label>
            <input
              type="number"
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> เพิ่มรายการ
          </button>
        </form>

        {/* Resources Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="p-3">รหัส</th>
                <th className="p-3">ชื่อรายการทรัพยากร</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3 text-center">ความจุ</th>
                <th className="p-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {resources.map(res => (
                <tr key={res.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono font-bold text-slate-500">{res.code}</td>
                  <td className="p-3 font-bold text-teal-700 dark:text-teal-300">{res.name}</td>
                  <td className="p-3 font-medium">{res.type}</td>
                  <td className="p-3 text-center font-bold">{res.capacity} ที่นั่ง</td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
