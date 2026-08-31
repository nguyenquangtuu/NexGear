'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const MINIMUM_VISIBLE_MS = 700;
const EXIT_DURATION_MS = 320;

const AppLoadingScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startExit = () => {
      window.setTimeout(() => {
        setIsExiting(true);
      }, MINIMUM_VISIBLE_MS);
    };

    if (document.readyState === 'complete') {
      startExit();
    } else {
      window.addEventListener('load', startExit, { once: true });
    }

    const removeTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, MINIMUM_VISIBLE_MS + EXIT_DURATION_MS);

    return () => {
      window.removeEventListener('load', startExit);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-background transition-all duration-300 ${
        isExiting ? 'opacity-0 blur-sm' : 'opacity-100'
      }`}
      aria-hidden="true"
      suppressHydrationWarning
    >
      <div className="flex flex-col items-center gap-5">
        <div className="animate-logo-pulse relative">
          <Image
            src="/images/brand/logo-light.png"
            alt="NEXGEAR"
            width={240}
            height={72}
            priority
            className="block h-auto w-[180px] object-contain dark:hidden md:w-[220px]"
          />
          <Image
            src="/images/brand/logo-dark.png"
            alt="NEXGEAR"
            width={240}
            height={72}
            priority
            className="hidden h-auto w-[180px] object-contain dark:block md:w-[220px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-loader-dot rounded-full bg-primary [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-loader-dot rounded-full bg-primary [animation-delay:-0.1s]" />
          <span className="h-2 w-2 animate-loader-dot rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
};

export default AppLoadingScreen;
