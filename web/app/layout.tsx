import "./globals.css";

export const metadata = {
  title: "WhatIf — Decision Intelligence",
  description: "Assumption-driven decision simulation. Not prediction."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
