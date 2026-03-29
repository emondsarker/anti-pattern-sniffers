import React from 'react';

// Specialization wrapper — provides delete-specific defaults for a generic ConfirmationModal.
// This is GOOD design, not prop drilling.
const DeleteConfirmation = ({
  title = 'Confirm Action',
  description = 'Are you sure?',
  confirmDescription = 'Confirm',
  cancelDescription = 'Cancel',
  isOpen,
  onConfirm,
  onClose,
  isLoading = false,
  defaultFocus = 'cancel',
  confirmButtonVariant = 'destructive',
}) => (
  <ConfirmationModal
    title={title}
    confirmDescription={confirmDescription}
    cancelDescription={cancelDescription}
    description={description}
    isOpen={isOpen}
    onConfirm={onConfirm}
    onClose={onClose}
    isLoading={isLoading}
    defaultFocus={defaultFocus}
    confirmButtonVariant={confirmButtonVariant}
  />
);

export default DeleteConfirmation;
