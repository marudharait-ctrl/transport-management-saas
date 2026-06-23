import type { Metadata } from "next";
import { AutoRefresh } from "@/app/components/AutoRefresh";
import { BrandLogo } from "@/app/components/BrandLogo";
import { LanguageTools } from "@/app/components/LanguageTools";
import { appBrand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: appBrand.companyName,
  description: `${appBrand.companyName} workflow`,
  icons: {
    icon: appBrand.faviconPath,
    shortcut: appBrand.faviconPath,
    apple: appBrand.faviconPath
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AutoRefresh />
        <LanguageTools />
        <div className="global-brand-strip">
          <BrandLogo />
        </div>
        {children}
      </body>
    </html>
  );
}
