import './ConfirmModal.css'

export default function ConfirmModal({
  icon: Icon,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="cm-overlay" onClick={onCancel}>
      <div className="cm-card" onClick={e => e.stopPropagation()}>
        {Icon && (
          <div className={`cm-icon${danger ? ' cm-icon-danger' : ''}`}>
            <Icon size={24} />
          </div>
        )}
        <h3 className="cm-title">{title}</h3>
        {message && <p className="cm-message">{message}</p>}
        <div className="cm-actions">
          <button className="cm-btn cm-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`cm-btn ${danger ? 'cm-danger' : 'cm-confirm'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
