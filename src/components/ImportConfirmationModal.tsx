interface ImportConfirmationModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ImportConfirmationModal({ isOpen, onCancel, onConfirm }: ImportConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-md w-full mx-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl"></span>
          <h3 className="text-xl font-bold">Import Data?</h3>
        </div>
        <p className="text-text-secondary mb-4">
          You are about to import data from a backup file. This will:
        </p>
        <ul className="list-disc list-inside text-sm text-text-secondary mb-6 space-y-1">
          <li><strong>Replace all existing pages and widgets</strong></li>
          <li>Replace your current settings (theme, grid layout)</li>
          <li>Replace AI provider configurations</li>
          <li>This action <strong>cannot be undone</strong></li>
        </ul>
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-button mb-6">
          <p className="text-sm text-yellow-600 font-medium">
            Warning: All current data will be lost. Consider exporting a backup first if you want to keep it.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity"
          >
            Import Data
          </button>
        </div>
      </div>
    </div>
  )
}
