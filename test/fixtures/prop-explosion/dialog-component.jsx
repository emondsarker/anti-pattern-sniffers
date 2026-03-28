import React from 'react';

// 10 props — should NOT be flagged at threshold 12.
// Dialogs naturally need: open state, handlers, title, description, labels, variant, loading, focus.
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, description, confirmLabel, cancelLabel, variant, isLoading, defaultFocus }) => {
  return (
    <div className={isOpen ? 'dialog open' : 'dialog'}>
      <h2>{title}</h2>
      <p>{description}</p>
      <button onClick={onClose}>{cancelLabel}</button>
      <button onClick={onConfirm} className={variant} disabled={isLoading} autoFocus={defaultFocus === 'confirm'}>
        {confirmLabel}
      </button>
    </div>
  );
};

export default ConfirmationDialog;
