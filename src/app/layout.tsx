import { LoginButton } from "@/components/LoginButton";
import { NavBar } from "@/components/NavBar";
import { NavMenu } from "@/components/NavMenu";
import { Providers } from "@/components/Providers";
import { SoundToggle } from "@/components/SoundToggle";
import { UserStatsDisplay } from "@/components/UserStatsDisplay";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FlashCard",
  description: "A modern flashcard app for learning",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-gray-50 min-h-screen flex flex-col`}
      >
        <Providers>
          <NavBar>
            <Link
              href={session ? "/dashboard" : "/"}
              className="text-xl font-bold tracking-tight hover:text-indigo-100 transition-colors"
            >
              FlashCard
            </Link>
            <NavMenu />
            <div className="flex items-center gap-2 sm:gap-4">
              <SoundToggle />
              <UserStatsDisplay />
              <LoginButton />
            </div>
          </NavBar>
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

