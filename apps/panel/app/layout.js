import "./globals.css";

export const metadata = {
  title: "Wilford Panel",
  description: "Internal dashboard for Wilford Industries."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
