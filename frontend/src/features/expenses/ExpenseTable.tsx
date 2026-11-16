import { ArrowDownLeft, ChevronLeft, ChevronRight, Coffee, Plus } from 'lucide-react';
import { CATEGORY_META } from './constants';
import { formatDate, formatMoney } from '../../lib/format';
import type { Expense } from '../../types';

interface ExpenseTableProps {
  expenses: Expense[];
  total: number;
  offset: number;
  error: string;
  hasLoaded: boolean;
  loading: boolean;
  hasFilters: boolean;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export default function ExpenseTable({
  expenses, total, offset, error, hasLoaded, loading, hasFilters,
  onAdd, onEdit, onDelete, onRetry, onPrevious, onNext,
}: ExpenseTableProps) {
  const firstRow = total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + expenses.length, total);
  const pageCount = Math.max(1, Math.ceil(total / 10));
  const currentPage = Math.min(pageCount, Math.floor(offset / 10) + 1);

  return <>
    <div className="table-wrap"><table>
      <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>NOTE</th><th className="amount-head">AMOUNT</th><th></th></tr></thead>
      <tbody>
        {loading ? <tr><td className="state-cell" colSpan={6}><span className="spinner"/> Loading your expenses…</td></tr>
          : error && !hasLoaded ? <tr><td className="state-cell" colSpan={6}><div className="empty-icon"><Coffee size={21}/></div><strong>Expenses couldn't be loaded</strong><span>Check the API and database, then try again.</span><button type="button" className="empty-add" onClick={onRetry}>Retry</button></td></tr>
          : expenses.length === 0 ? <tr><td className="state-cell" colSpan={6}>
            <div className="empty-icon"><Coffee size={21}/></div><strong>No expenses found</strong>
            <span>{hasFilters ? 'Try changing your filters.' : 'Add your first expense to get started.'}</span>
            {!hasFilters && <button type="button" className="empty-add" onClick={onAdd}><Plus size={14}/> Add expense</button>}
          </td></tr>
          : expenses.map(expense => {
            const meta = CATEGORY_META[expense.category] || CATEGORY_META.Other;
            const Icon = meta.icon;
            return <tr key={expense.id}>
              <td><div className={`transaction-icon ${meta.color}`}><Icon size={17}/></div><div className="transaction-name"><strong>{expense.title}</strong><span>Personal expense</span></div></td>
              <td><span className={`category-tag ${meta.color}`}>{expense.category}</span></td>
              <td className="date-cell">{formatDate(expense.date)}</td>
              <td className="note-cell" title={expense.note || ''}>{expense.note || '—'}</td>
              <td className="amount-cell">− {formatMoney(expense.amount)}</td>
              <td className="row-actions"><button type="button" onClick={() => onEdit(expense)} aria-label={`Edit ${expense.title}`}>Edit</button><button type="button" onClick={() => onDelete(expense)} aria-label={`Delete ${expense.title}`}>Delete</button></td>
            </tr>;
          })}
      </tbody>
    </table></div>
    <div className="table-footer">
      <span>Showing <b>{firstRow}–{lastRow}</b> of <b>{total}</b> transactions</span>
      <div className="pagination-controls">
        <span>Page {currentPage} of {pageCount}</span>
        <button type="button" onClick={onPrevious} disabled={loading || offset === 0} aria-label="Previous page"><ChevronLeft size={15}/> Previous</button>
        <button type="button" onClick={onNext} disabled={loading || offset + expenses.length >= total} aria-label="Next page">Next <ChevronRight size={15}/></button>
      </div>
      <span className="sort-label">Newest first <ArrowDownLeft size={14}/></span>
    </div>
  </>;
}
