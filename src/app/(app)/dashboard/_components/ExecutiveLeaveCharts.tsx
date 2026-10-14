"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TypeDataPoint {
  type: string;
  label: string;
  count: number;
  color: string;
}

interface DeptDataPoint {
  department: string;
  count: number;
  percentage: number;
}

interface ExecutiveLeaveChartsProps {
  typeData: TypeDataPoint[];
  deptData: DeptDataPoint[];
}

export default function ExecutiveLeaveCharts({
  typeData,
  deptData,
}: ExecutiveLeaveChartsProps) {
  const totalCount = typeData.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <div className="bg-white rounded-2xl border border-[#E6EEF7] shadow-[0_4px_16px_rgba(40,90,140,0.06)] p-4 sm:p-5 select-none flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-50">
          <div>
            <h3 className="font-bold text-[#163A66] text-sm sm:text-base">
              สัดส่วนประเภทการลา (ภาคเรียนนี้)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              แยกตามประเภทการลาและกลุ่มสาระการเรียนรู้
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            รวม {totalCount} ครั้ง
          </span>
        </div>

        {/* Donut Chart & Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3 my-2">
          {/* Donut */}
          <div className="h-40 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, _name, item) => [
                    `${val} ครั้ง`,
                    (item as any)?.payload?.label,
                  ]}
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    fontSize: "11px",
                    border: "none",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-xs text-slate-400 font-medium block">
                คำขอรวม
              </span>
              <span className="text-lg font-black text-[#163A66]">
                {totalCount}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 text-xs">
            {typeData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-700 font-medium text-xs">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#163A66]">{item.count}</span>
                  <span className="text-[10px] text-slate-400 w-8 text-right">
                    {Math.round((item.count / totalCount) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Breakdown Mini Progress Bars */}
      <div className="pt-3 border-t border-slate-100">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
          สัดส่วนการลาแยกตามกลุ่มสาระฯ
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {deptData.slice(0, 4).map((dept, i) => (
            <div
              key={i}
              className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 truncate font-medium">
                  {dept.department}
                </span>
                <span className="font-bold text-[#163A66]">{dept.count}</span>
              </div>
              <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
