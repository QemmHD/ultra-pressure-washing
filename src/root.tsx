import { useEffect } from "react";
import type { LinksFunction } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { SettingsProvider } from "./lib/settings";
import stylesheet from "./index.css?inline";

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
  { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-slate-50">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0f172a" />
        <Meta />
        <Links />
        <style
          data-site-styles="inline"
          dangerouslySetInnerHTML={{ __html: stylesheet }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.ultraHydrated = "true";

    return () => {
      delete document.documentElement.dataset.ultraHydrated;
    };
  }, []);

  return null;
}

export default function Root() {
  return (
    <SettingsProvider>
      <HydrationMarker />
      <Outlet />
    </SettingsProvider>
  );
}
