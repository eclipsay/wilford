import "./globals.css";

export const metadata = {
  title: "Wilford Panel",
  description: "Internal dashboard for Wilford Industries.",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
