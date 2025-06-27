import { useState, useEffect } from 'react';

export const useCookie = (cookieName: string): string | null => {
  const [cookieValue, setCookieValue] = useState<string | null>(null);

  useEffect(() => {
    const getCookieValue = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
      return null;
    };

    const value = getCookieValue(cookieName);
    setCookieValue(value ? decodeURIComponent(value) : null);
  }, [cookieName]);

  return cookieValue;
}; 