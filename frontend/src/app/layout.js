import "./globals.css";

export const metadata = {
  title: "Project Relay",
  description: "Full-fledged chatting website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}