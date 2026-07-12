import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  let iconUrl: string = "/icon.jpg";
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: { logoUrl: true, schoolName: true },
    });
    if (settings?.logoUrl) {
      iconUrl = settings.logoUrl;
    }
  } catch {
    // fallback to default icon if DB is unreachable
  }

  return {
    title: "e-Leave System | ระบบลาออนไลน์",
    description: "ระบบการลาออนไลน์สำหรับโรงเรียน - Online Leave Management System",
    icons: {
      icon: iconUrl,
      apple: iconUrl,
    },
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700;800&family=Sarabun:wght@300;400;500;600;700;800&family=Taviraj:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange={false}
          >
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
