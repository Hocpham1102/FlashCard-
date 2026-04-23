"use client";

import { useState } from "react";

interface UserAvatarProps {
  user: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
    image?: string | null;
  } | null | undefined;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ user, className = "", fallbackClassName = "" }: UserAvatarProps) {
  const [error, setError] = useState(false);
  
  if (!user) return null;

  const initial = (user.name || user.username || user.email || "U")[0].toUpperCase();

  // Thêm referrerPolicy="no-referrer" để fix lỗi 403 của ảnh Google
  if (user.image && !error) {
    return (
      <img
        src={user.image}
        alt="Avatar"
        className={`${className} object-cover`}
        onError={() => setError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`flex items-center justify-center font-bold text-white ${className} ${fallbackClassName}`}>
      {initial}
    </div>
  );
}
