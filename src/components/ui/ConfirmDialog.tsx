import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-charcoal-light mb-6">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={confirmVariant}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';
