"use strict";
import "./globals.css";
export const metadata = {
  title: "HertzSoft - Admin Panel & HCoder Dashboard",
  description: "Mumbai's leading IT solutions provider. Building powerful web, mobile & AI solutions since 2017."
};
export default function RootLayout({
  children
}) {
  return <html lang="en">
      <head>
        {
    /* FontAwesome CDN for sidebar & button icons */
  }
        <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    crossOrigin="anonymous"
    referrerPolicy="no-referrer"
  />
        {
    /* Google Fonts (Inter and Outfit) */
  }
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
      </head>
      <body>{children}</body>
    </html>;
}
