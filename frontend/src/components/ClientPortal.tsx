'use client';

import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ClientPortalProps {
  children: ReactNode;
}

export default function ClientPortal({ children }: ClientPortalProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}
