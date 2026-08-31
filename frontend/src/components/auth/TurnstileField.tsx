'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileFieldProps = {
  action: 'register' | 'password-reset-request' | 'password-reset-confirm';
  value: string;
  onChange: (value: string) => void;
  resetSignal?: number;
};

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function TurnstileField({ action, value, onChange, resetSignal = 0 }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== 'undefined' && !!window.turnstile);
  const [renderError, setRenderError] = useState('');
  const fallbackId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile || !SITE_KEY) return;

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    containerRef.current.innerHTML = '';

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      action,
      theme: 'light',
      callback: (token) => {
        setRenderError('');
        onChange(token);
      },
      'expired-callback': () => {
        setRenderError('');
        onChange('');
      },
      'error-callback': () => {
        onChange('');
        setRenderError('Không tải được Turnstile. Vui lòng thử lại.');
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, fallbackId, onChange, scriptReady]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) return;
    if (resetSignal <= 0) return;

    onChange('');
    window.turnstile.reset(widgetIdRef.current);
  }, [onChange, resetSignal]);

  return (
    <div className="space-y-1">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      {!SITE_KEY ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          Thiếu `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
        </div>
      ) : null}

      <div className="flex justify-center">
        <div ref={containerRef} />
      </div>

      {renderError ? <p className="px-1 text-xs text-red-500">{renderError}</p> : null}
    </div>
  );
}
