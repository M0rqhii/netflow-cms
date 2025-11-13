"use client";

import React from 'react';
import clsx from 'clsx';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={clsx('relative z-10 w-full max-w-lg card', className)}>
        <div className="card-body">
          {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
}

