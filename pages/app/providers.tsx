"use client";

import * as React from "react";
import {NextUIProvider} from "@nextui-org/system";
import {useRouter} from 'next/navigation'
import {ThemeProvider as NextThemesProvider} from "next-themes";
import {ThemeProviderProps} from "next-themes/dist/types";
// import {useReviewToken} from "@/dove/token";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps | any;
}

export function Providers({children, themeProps}: ProvidersProps) {
  const router = useRouter();
  // useReviewToken();
  return (
    <NextUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
    </NextUIProvider>
  );
}
