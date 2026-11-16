import { useEffect } from 'react';
import type { FormEventHandler, MouseEvent } from 'react';
import { Check, X } from 'lucide-react';
import type { Category, ExpenseDraft } from '../types';

interface ExpenseFormProps {
  categories: readonly Category[];
  editing: number | null;
  error: string;
  form: ExpenseDraft;
  saving: boolean;
  onChange: (form: ExpenseDraft) => void;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function ExpenseForm({
  categories, editing, error, form, saving, onChange, onClose, onSubmit,
}: ExpenseFormProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  return <div className="modal-backdrop" onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !saving) onClose();
  }}>
    <form className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-form-title" onSubmit={onSubmit}>
      <div className="modal-header">
        <div><span className="eyebrow"><span className="eyebrow-line"/> EXPENSE DETAILS</span>
          <h2 id="expense-form-title">{editing ? 'Edit expense' : 'Add an expense'}</h2>
        </div>
        <button type="button" className="modal-close" onClick={onClose} disabled={saving} aria-label="Close"><X size={19}/></button>
      </div>
      {error && <div className="notice form-notice" role="alert">{error}</div>}
      <label className="form-field">Title
        <input autoFocus required maxLength={160} placeholder="e.g. Coffee at Starbucks" value={form.title} onChange={event => onChange({ ...form, title: event.target.value })}/>
      </label>
      <div className="form-row">
        <label className="form-field">Amount (₹)
          <input required type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={event => onChange({ ...form, amount: event.target.value })}/>
        </label>
        <label className="form-field">Category
          <select required value={form.category} onChange={event => onChange({ ...form, category: event.target.value as Category })}>{categories.map(category => <option key={category}>{category}</option>)}</select>
        </label>
      </div>
      <label className="form-field">Date
        <input required type="date" value={form.date} onChange={event => onChange({ ...form, date: event.target.value })}/>
      </label>
      <label className="form-field">Note <span className="optional">Optional</span>
        <textarea maxLength={2000} rows={3} placeholder="Add a little more detail..." value={form.note} onChange={event => onChange({ ...form, note: event.target.value })}/>
      </label>
      <div className="modal-actions">
        <button className="cancel-button" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="primary-button" disabled={saving}><Check size={16}/>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}</button>
      </div>
    </form>
  </div>;
}
