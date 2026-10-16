import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { AppProviders } from "@/components/providers/app-providers";
import { prisma } from "@/lib/db";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata(): Promise<Metadata> {
  let iconUrl: string = "/images/teacher/school_logo.png";
  let appTitleSuffix: string = "KP School Management System";

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: { logoUrl: true, schoolName: true, subheader: true },
    });
    if (settings?.logoUrl) {
      iconUrl = settings.logoUrl;
    }
    if (settings?.subheader && settings.subheader.trim()) {
      appTitleSuffix = settings.subheader.trim();
    } else if (settings?.schoolName && settings.schoolName.trim()) {
      appTitleSuffix = settings.schoolName.trim();
    }
  } catch {
    // fallback to default icon if DB is unreachable
  }

  return {
    title: {
      default: `${appTitleSuffix}`,
      template: `%s | ${appTitleSuffix}`,
    },
    description: "ระบบบริหารสถานศึกษาและระบบการลาออนไลน์ โรงเรียนกุดจับประชาสรรค์ - KP School Management System",
    manifest: "/manifest.json",
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
        <link rel="preload" as="image" href="/images/teacher/school_logo.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange={false}
          >
            <AppProviders>
              {children}
            </AppProviders>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
