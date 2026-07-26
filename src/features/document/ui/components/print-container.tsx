"use client";

import React, { useRef } from "react";
import { Printer } from "lucide-react";

interface PrintContainerProps {
  children: React.ReactNode;
  title?: string;
  triggerButtonText?: string;
  triggerButtonClassName?: string;
}

export function PrintContainer({
  children,
  title = "พิมพ์เอกสาร",
  triggerButtonText = "พิมพ์เอกสาร / PDF",
  triggerButtonClassName,
}: PrintContainerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!contentRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เปิด Pop-up เพื่อพิมพ์เอกสาร");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: THSarabunNew, "TH Sarabun PSK", serif, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #print-area {
              width: 297mm;
              height: 210mm;
              box-sizing: border-box;
              margin: 0 auto;
            }
          </style>
          <link rel="stylesheet" href="/_next/static/css/app/layout.css" />
        </head>
        <body>
          <div id="print-area">
            ${contentRef.current.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        className={
          triggerButtonClassName ||
          "px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        }
      >
        <Printer className="w-4 h-4" />
        {triggerButtonText}
      </button>

      <div ref={contentRef} className="hidden">
        {children}
      </div>
    </>
  );
}
