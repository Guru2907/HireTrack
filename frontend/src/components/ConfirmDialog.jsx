import Dialog from './Dialog';
import Button from './Button';

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', onConfirm, onCancel, busy = false }) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      description={description}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    />
  );
}
