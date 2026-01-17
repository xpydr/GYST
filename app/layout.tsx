import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "GYST - Productivity Platform | Time Blocking & Task Management",
  description: "Experience the future of productivity with GYST. Advanced time blocking, task management, and calendar integration in a sleek interface. Transform your workflow today.",
  keywords: ["productivity", "time blocking", "task management", "calendar", "productivity app"],
  openGraph: {
    title: "GYST - Productivity Platform",
    description: "Experience the future of productivity with GYST. Advanced time blocking and task management.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GYST - Productivity Platform",
    description: "Experience the future of productivity with GYST.",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
