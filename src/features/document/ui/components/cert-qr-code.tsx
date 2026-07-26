"use client";

import { QRCodeSVG } from "qrcode.react";

interface CertQrCodeProps {
  certId: string;
  recipientName: string;
  activityName: string;
  size?: number;
}

export function CertQrCode({
  certId,
  recipientName,
  activityName,
  size = 110,
}: CertQrCodeProps) {
  const qrPayload = JSON.stringify({
    id: certId,
    name: recipientName,
    act: activityName,
  });

  return (
    <div className="inline-block p-2 bg-white rounded-lg border border-gray-100 shadow-xs">
      <QRCodeSVG
        value={qrPayload}
        size={size}
        level="M"
        includeMargin={false}
      />
    </div>
  );
}
