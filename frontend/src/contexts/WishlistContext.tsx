'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WishlistContextType {
  wishlist: string[]; // array of product IDs
  toggleWishlist: (productId: string | number) => void;
  isInWishlist: (productId: string | number) => boolean;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const getInitialWishlist = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  const saved = localStorage.getItem('wishlist');
  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch (error) {
    console.error('Failed to parse wishlist', error);
    return [];
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<string[]>(getInitialWishlist);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (productId: string | number) => {
    const idStr = String(productId);
    setWishlist((prev) => 
      prev.includes(idStr) 
        ? prev.filter(id => id !== idStr) 
        : [...prev, idStr]
    );
  };

  const isInWishlist = (productId: string | number) => {
    return wishlist.includes(String(productId));
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist, wishlistCount: wishlist.length }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
