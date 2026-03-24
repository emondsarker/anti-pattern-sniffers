import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  size: string;
  variant: string;
  color: string;
  icon: string;
  loading: boolean;
  tooltip: string;
  className: string;
}

export function Button({ label, onClick, disabled, size, variant, color, icon, loading, tooltip, className }: ButtonProps) {
  return <button className={className} disabled={disabled} onClick={onClick}>{label}</button>;
}
