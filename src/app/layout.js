import React from 'react';

export const metadata = {
  title: 'eLeave & ระบบนิเทศการสอน',
  description: 'School Management System - eLeave & Instructional Supervision Subsystem'
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        {children}
      </body>
    </html>
  );
}
