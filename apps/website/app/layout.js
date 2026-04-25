import "./globals.css";

export const metadata = {
  title: "Wilford Industries",
  description: "Official public portal of Wilford Industries."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
