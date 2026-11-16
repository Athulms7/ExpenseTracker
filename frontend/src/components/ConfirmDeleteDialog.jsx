import { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatDate, formatMoney } from '../lib/format.js';

export default function ConfirmDeleteDialog({ expense, deleting, error, onCancel, onConfirm }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !deleting) onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleting, onCancel]);

  return <div className="modal-backdrop confirm-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget && !deleting) onCancel();
  }}>
    <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
      <div className="confirm-icon"><AlertTriangle size={22}/></div>
      <button type="button" className="modal-close confirm-close" onClick={onCancel} disabled={deleting} aria-label="Close"><X size={18}/></button>
      <h2 id="delete-title">Delete this expense?</h2>
      <p id="delete-description">This will permanently remove the expense from your transactions.</p>
      <div className="confirm-expense"><div><strong>{expense.title}</strong><span>{expense.category} · {formatDate(expense.date)}</span></div><b>{formatMoney(expense.amount)}</b></div>
      {error && <div className="notice confirm-error" role="alert">{error}</div>}
      <div className="confirm-actions">
        <button type="button" className="cancel-button" onClick={onCancel} disabled={deleting}>Keep expense</button>
        <button type="button" className="delete-confirm-button" onClick={onConfirm} disabled={deleting}><Trash2 size={15}/>{deleting ? 'Deleting…' : 'Delete expense'}</button>
      </div>
    </section>
  </div>;
}
