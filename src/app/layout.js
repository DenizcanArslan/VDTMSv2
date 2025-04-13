import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import 'react-toastify/dist/ReactToastify.css';
import { Providers } from '@/redux/provider';
import { ToastContainer } from 'react-toastify';
import { SocketProvider } from '@/context/SocketContext'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Van Dijle",
  description: "Transport Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <SocketProvider>
            <ClerkProvider afterSignOutUrl="/">
              {children}
              <ToastContainer position="bottom-right" autoClose={3000} />
            </ClerkProvider>
          </SocketProvider>
        </Providers>
      </body>
    </html>
  );
}
