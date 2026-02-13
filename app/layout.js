import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/CartContext";

const inter = Inter({ subsets: ["latin"] });

import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Pumato - Food Delivery",
  description: "Delicious food delivered to your hostel.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          {children}
          <Toaster position="bottom-center" toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
          }} />
        </CartProvider>
      </body>
    </html>
  );
}
