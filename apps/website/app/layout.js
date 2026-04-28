import "./globals.css";

export const metadata = {
  title: "Wilford Panem Union",
  description: "Official State Portal of the Wilford Panem Union."
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
