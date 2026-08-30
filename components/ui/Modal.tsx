'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  overflowVisible?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  overflowVisible = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dropDirection, setDropDirection] = useState<'left' | 'right'>('right');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When parent changes `isOpen`
  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setDropDirection(Math.random() > 0.5 ? 'right' : 'left');
      setShouldRender(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else if (shouldRender) {
      // If isOpen became false while rendered, animate out smoothly
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        document.body.style.overflow = 'unset';
      }, 280);
    }
  }, [isOpen]);

  const handleRequestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      document.body.style.overflow = 'unset';
      onClose();
    }, 280);
  }, [isClosing, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && shouldRender && !isClosing) {
        handleRequestClose();
      }
    };

    if (shouldRender) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRender, isClosing, handleRequestClose]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!shouldRender || !mounted) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 w-screen h-screen">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-200'
        }`}
        onClick={handleRequestClose}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-white rounded-[2rem] shadow-2xl shadow-slate-900/25 border border-slate-100 ${
          overflowVisible ? 'overflow-visible' : 'overflow-hidden'
        } z-10 ${
          isClosing
            ? dropDirection === 'left'
              ? 'animate-paper-drop-left'
              : 'animate-paper-drop-right'
            : 'animate-modal-jump-in'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            {title && <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={handleRequestClose}
            className="group text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        <div
          className={`p-6 ${
            overflowVisible ? 'overflow-visible' : 'max-h-[80vh] overflow-y-auto'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
