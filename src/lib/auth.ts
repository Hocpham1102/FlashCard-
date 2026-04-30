import { canAccessAdminArea } from "@/lib/admin";
import { prisma } from "@/lib/prisma"; // Adjust path if necessary
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any, // Cast to any to avoid type mismatch between NextAuth v4 and Auth.js Prisma adapter
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "Tên đăng nhập",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
          role: (user as { role?: "USER" | "ADMIN" }).role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login", // Set the sign-in page to our custom login page
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const userWithUsername = user as typeof user & {
          username?: string | null;
          role?: "USER" | "ADMIN";
        };
        token.username = userWithUsername.username ?? token.username;
        token.role = userWithUsername.role ?? token.role;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { email: true, username: true, role: true },
        });

        if (dbUser) {
          token.email = dbUser.email ?? token.email;
          token.username = dbUser.username;
          token.role = dbUser.role;
        }
      }

      token.isAdmin = canAccessAdminArea({
        role: token.role,
      });
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.username = token.username as string;
        session.user.role = token.role;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
};
