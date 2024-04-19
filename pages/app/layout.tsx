// These styles apply to every route in the application
import "@/styles/globals.css";
import type {Metadata, Viewport} from "next";
import React, {Suspense} from "react";
import classNames from "clsx";
import {fontSans} from "@/config/fonts";
import {siteConfig} from "@/config/site";


export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: `Dove-Mail`,
  manifest: '/manifest.json',
  icons: {
    icon: "/logo.png",
    // shortcut: "/favicon-16x16.png",
    // apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL("https://sso.hocgin.com"),
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: `black-translucent`
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  // viewportFit: 'cover',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    {media: "(prefers-color-scheme: light)", color: "white"},
    {media: "(prefers-color-scheme: dark)", color: "black"},
  ],
}


const RootLayout = ({children}: { children: React.ReactNode }) => {
  return <html lang="en" suppressHydrationWarning>
  <head />
  <body className={classNames(
    "min-h-screen bg-background font-sans antialiased",
    fontSans.variable
  )}>
  <Suspense>
    <main className="flex-1">{children}</main>
  </Suspense>
  </body>
  </html>;
};

export default RootLayout;
