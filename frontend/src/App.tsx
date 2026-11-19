import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronDown, CircleHelp, CreditCard, Ellipsis, Filter, LayoutDashboard, Moon, Plus, Search, SlidersHorizontal, Sparkles, Sun, Wallet, X } from 'lucide-react';
import ExpenseForm from './components/ExpenseForm';
import ConfirmDeleteDialog from './components/ConfirmDeleteDialog';
import AuthScreen from './features/auth/AuthScreen';
import ExpenseTable from './features/expenses/ExpenseTable';
import { CATEGORIES, CATEGORY_META } from './features/expenses/constants';
import { apiRequest, ApiError, errorMessage } from './lib/api';
import { formatMoney, localToday } from './lib/format';
import type { Category, Expense, ExpenseDraft, ExpenseFilters, ExpensePage, MonthlySummary, User } from './types';

const emptyForm = (): ExpenseDraft => ({ title: '', amount: '', category: 'Food', date: localToday(), note: '' });
const money = formatMoney;
const noFilters = (): ExpenseFilters => ({ category: '', date_from: '', date_to: '', title: '' });
const PAGE_SIZE = 10;

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return window.localStorage.getItem('spendly-theme') === 'dark'; }
    catch { return false; }
  });
  const [authError, setAuthError] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [offset, setOffset] = useState(0);
  const [summary, setSummary] = useState<MonthlySummary>({ month: '', total: 0, count: 0, categories: [] });
  const [filters, setFilters] = useState<ExpenseFilters>(noFilters());
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(false);
  const [confirmExpense, setConfirmExpense] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseDraft>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const latestLoad = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    try { window.localStorage.setItem('spendly-theme', darkMode ? 'dark' : 'light'); }
    catch { /* The theme still works for this session when storage is unavailable. */ }
  }, [darkMode]);

  const monthName = useMemo(() => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), []);
  const dayOfMonth = new Date().getDate();
  const load = useCallback(async (activeFilters: ExpenseFilters, requestedOffset = 0): Promise<void> => {
    const loadId = ++latestLoad.current;
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(activeFilters).filter(([, value]) => value));
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(requestedOffset));
      const [initialPage, totals] = await Promise.all([
        apiRequest<ExpensePage>(`/api/expenses?${params}`),
        apiRequest<MonthlySummary>('/api/summary/monthly'),
      ]);
      if (loadId !== latestLoad.current) return;

      // If another client removed rows while this page was open, move to the
      // last page that still exists instead of showing a misleading empty page.
      let page = initialPage;
      if (page.total > 0 && requestedOffset >= page.total) {
        const lastOffset = Math.floor((page.total - 1) / page.limit) * page.limit;
        params.set('offset', String(lastOffset));
        page = await apiRequest<ExpensePage>(`/api/expenses?${params}`);
        if (loadId !== latestLoad.current) return;
      }

      setExpenses(page.items);
      setTotalExpenses(page.total);
      setOffset(page.total === 0 ? 0 : page.offset);
      setSummary(totals);
      setHasLoaded(true);
      setLoadError('');
      setNotice('');
    } catch (error: unknown) {
      if (loadId === latestLoad.current) {
        handleUnauthorized(error);
        setExpenses([]);
        setTotalExpenses(0);
        setOffset(error instanceof ApiError && error.status === 401 ? 0 : requestedOffset);
        setHasLoaded(false);
        setLoadError(errorMessage(error));
        setNotice(errorMessage(error));
      }
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<User>('/api/auth/me')
      .then(user => { if (active) setCurrentUser(user); })
      .catch((error: unknown) => { if (active && !(error instanceof ApiError && error.status === 401)) setAuthError(errorMessage(error)); })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (currentUser) {
      const defaults = noFilters();
      setFilters(defaults);
      setHasLoaded(false);
      setLoadError('');
      setNotice('');
      setOffset(0);
      setTotalExpenses(0);
      load(defaults, 0);
    }
  }, [load, currentUser?.id]);
  useEffect(() => () => {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
  }, []);

  function cancelScheduledSearch(): void {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    searchTimer.current = null;
  }

  function handleUnauthorized(error: unknown): void {
    if (error instanceof ApiError && error.status === 401) {
      latestLoad.current += 1;
      cancelScheduledSearch();
      setCurrentUser(null);
      setAuthError('Your session has expired. Please log in again.');
      setFilters(noFilters());
      setExpenses([]);
      setTotalExpenses(0);
      setOffset(0);
      setSummary({ month: '', total: 0, count: 0, categories: [] });
      setConfirmExpense(null);
      setModal(false);
    }
  }
  async function logout(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      latestLoad.current += 1;
      cancelScheduledSearch();
      setCurrentUser(null);
      setAuthError('');
      setFilters(noFilters());
      setExpenses([]);
      setTotalExpenses(0);
      setOffset(0);
      setSummary({ month: '', total: 0, count: 0, categories: [] });
      setNotice('');
    } catch (error: unknown) { setNotice(errorMessage(error)); }
  }

  function openAdd(): void { setEditing(null); setForm(emptyForm()); setFormError(''); setModal(true); }
  function openEdit(expense: Expense): void {
    setEditing(expense.id);
    setForm({ title: expense.title, amount: String(expense.amount), category: expense.category, date: expense.date, note: expense.note || '' });
    setFormError('');
    setModal(true);
  }
  async function saveExpense(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest(editing ? `/api/expenses/${editing}` : '/api/expenses', {
        method: editing ? 'PUT' : 'POST',
        // Keep money as a decimal string; converting to Number can round cents.
        body: JSON.stringify({ ...form, note: form.note || null }),
      });
      setModal(false);
      await load(filters, 0);
    } catch (error: unknown) { handleUnauthorized(error); setFormError(errorMessage(error)); }
    finally { setSaving(false); }
  }
  async function deleteExpense(): Promise<void> {
    if (!confirmExpense) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiRequest(`/api/expenses/${confirmExpense.id}`, { method: 'DELETE' });
      setConfirmExpense(null);
      const remainingCount = Math.max(0, totalExpenses - 1);
      const lastOffset = remainingCount === 0
        ? 0
        : Math.floor((remainingCount - 1) / PAGE_SIZE) * PAGE_SIZE;
      await load(filters, Math.min(offset, lastOffset));
    } catch (error: unknown) { handleUnauthorized(error); setDeleteError(errorMessage(error)); }
    finally { setDeleting(false); }
  }
  function setFilter(key: keyof ExpenseFilters, value: string): void {
    if (key === 'category' && value !== '' && !CATEGORIES.includes(value as Category)) return;
    const next = { ...filters, [key]: value } as ExpenseFilters;
    setFilters(next);
    setOffset(0);
    cancelScheduledSearch();
    if (key === 'title') searchTimer.current = setTimeout(() => { searchTimer.current = null; void load(next, 0); }, 250);
    else load(next, 0);
  }
  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    cancelScheduledSearch();
    setOffset(0);
    load(filters, 0);
  }
  function clearFilters(): void {
    cancelScheduledSearch();
    const emptyFilters = noFilters();
    setFilters(emptyFilters);
    setOffset(0);
    load(emptyFilters, 0);
  }

  const monthCategories = [...summary.categories].sort((a, b) => Number(b.total) - Number(a.total));
  const highest = Math.max(0, ...monthCategories.map(item => Number(item.total)));

  if (!authReady) return <div className="auth-loading"><span className="spinner"/> Checking your session…</div>;
  if (!currentUser) return <AuthScreen initialError={authError} onAuthenticated={user => { setAuthError(''); setNotice(''); setCurrentUser(user); }} />;

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top"><span className="brand-mark"><Wallet size={20} /></span><span>spendly<span className="brand-period">.</span></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav><a className="nav-link active" href="#dashboard"><LayoutDashboard size={18} />Overview<span className="nav-dot" /></a><a className="nav-link" href="#transactions"><CreditCard size={18} />Transactions</a></nav>
      <div className="sidebar-bottom"><div className="tip-card"><span className="tip-icon"><Sparkles size={17} /></span><strong>Small steps add up.</strong><p>You're building a great money habit. Keep tracking every expense.</p><button type="button" onClick={() => setNotice('Track every purchase, no matter how small, for an accurate monthly picture.')}>More tips <ArrowUpRight size={13} /></button></div><div className="profile"><div className="avatar">{currentUser.username[0].toUpperCase()}</div><div><b>{currentUser.username}</b><small>Signed in</small></div><Ellipsis size={18} className="profile-more" /></div></div>
    </aside>

    <main className="main" id="top">
      <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <b>Overview</b></div><div className="top-actions"><span className="today-label"><CalendarDays size={15} />{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="signed-in-user">{currentUser.username}</span><button type="button" className="theme-toggle" onClick={() => setDarkMode(value => !value)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={darkMode} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}<span>{darkMode ? 'Light' : 'Dark'}</span></button><button className="logout-button" onClick={logout}>Log out</button></div></header>
      <section className="content" id="dashboard">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR FINANCES AT A GLANCE</div><h1>Good day, <span>let's take a look.</span></h1><p className="subtitle">Here's what's happening with your money.</p></div><button className="primary-button" onClick={openAdd}><Plus size={17} /> Add expense</button></div>

        {notice && <div className="notice" role="alert"><CircleHelp size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button></div>}

        <section className="summary-grid" aria-label="Monthly summary">
          <article className="summary-card total-card"><div className="summary-top"><span className="summary-label">TOTAL SPENT</span><span className="summary-icon wallet-icon"><Wallet size={19} /></span></div><div className="summary-value">{money(summary.total)}</div><div className="summary-foot"><span className="positive"><ArrowDownLeft size={14} /> This month</span><span>{summary.count} {summary.count === 1 ? 'transaction' : 'transactions'}</span></div><div className="card-glow" /></article>
          <article className="summary-card"><div className="summary-top"><span className="summary-label">DAILY AVERAGE</span><span className="summary-icon avg-icon"><CalendarDays size={18} /></span></div><div className="summary-value">{money(Number(summary.total) / Math.max(1, dayOfMonth))}</div><div className="summary-foot"><span>Based on {dayOfMonth} days</span><span className="mini-sparkline"><i/><i/><i/><i/><i/><i/><i/></span></div></article>
          <article className="summary-card"><div className="summary-top"><span className="summary-label">TOP CATEGORY</span><span className="summary-icon top-icon"><Sparkles size={18} /></span></div><div className="summary-value category-value">{monthCategories[0]?.category || '—'}</div><div className="summary-foot"><span>{monthCategories[0] ? `${money(monthCategories[0].total)} this month` : 'No expenses yet'}</span><span className="category-share">{monthCategories[0] && Number(summary.total) ? `${Math.round(Number(monthCategories[0].total) / Number(summary.total) * 100)}%` : ''}</span></div></article>
        </section>

        <div className="section-heading"><div><h2>Spending by category</h2><p>Your {monthName} breakdown</p></div><span className="period-pill"><span className="live-dot" />This month <ChevronDown size={14}/></span></div>
        <section className="category-grid" aria-label="Spending by category">{CATEGORIES.map(category => {
          const meta = CATEGORY_META[category]; const Icon = meta.icon; const item = summary.categories.find(row => row.category === category); const amount = Number(item?.total || 0); const percent = highest ? amount / highest * 100 : 0;
          return <button className="category-card" key={category} onClick={() => { setFilter('category', filters.category === category ? '' : category); document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' }); }} aria-pressed={filters.category === category}><div className="category-card-top"><span className={`category-icon ${meta.color}`}><Icon size={17}/></span><span className="category-chevron"><ArrowUpRight size={15}/></span></div><strong>{category}</strong><div className="category-amount">{money(amount)}</div><div className="progress-track"><span className={meta.color} style={{ width: `${percent}%` }} /></div></button>;
        })}</section>

        <section className="transactions" id="transactions"><div className="transactions-title"><div><h2>Recent transactions</h2><p>Your latest spending activity</p></div><button type="button" className="text-button" onClick={clearFilters}>Clear filters <X size={14}/></button></div>
          <form className="filters" onSubmit={submitSearch}><label className="search-box"><Search size={17}/><input aria-label="Search by title" maxLength={160} placeholder="Search expenses..." value={filters.title} onChange={e => setFilter('title', e.target.value)}/></label><label className="filter-select"><Filter size={15}/><select aria-label="Filter by category" value={filters.category} onChange={e => setFilter('category', e.target.value)}><option value="">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={14}/></label><label className="date-filter"><span>From</span><input aria-label="Start date" type="date" value={filters.date_from} max={filters.date_to || undefined} onChange={e => setFilter('date_from', e.target.value)}/></label><label className="date-filter"><span>To</span><input aria-label="End date" type="date" value={filters.date_to} min={filters.date_from || undefined} onChange={e => setFilter('date_to', e.target.value)}/></label><button className="filter-submit" aria-label="Apply filters"><SlidersHorizontal size={16}/></button></form>
          <ExpenseTable
            expenses={expenses}
            total={totalExpenses}
            offset={offset}
            error={loadError}
            hasLoaded={hasLoaded}
            loading={loading}
            hasFilters={Object.values(filters).some(Boolean)}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={expense => { setDeleteError(''); setConfirmExpense(expense); }}
            onRetry={() => load(filters, offset)}
            onPrevious={() => load(filters, Math.max(0, offset - PAGE_SIZE))}
            onNext={() => load(filters, offset + PAGE_SIZE)}
          />
        </section>
        <footer className="footer"><span>Spendly <i>·</i> A clearer view of your everyday spending</span><span>Made for your financial wellbeing <span className="heart">♥</span></span></footer>
      </section>
    </main>

    {modal && <ExpenseForm
      categories={CATEGORIES}
      editing={editing}
      error={formError}
      form={form}
      saving={saving}
      onChange={value => { setForm(value); setFormError(''); }}
      onClose={() => setModal(false)}
      onSubmit={saveExpense}
    />}
    {confirmExpense && <ConfirmDeleteDialog
      expense={confirmExpense}
      deleting={deleting}
      error={deleteError}
      onCancel={() => { if (!deleting) setConfirmExpense(null); }}
      onConfirm={deleteExpense}
    />}
  </div>;
}
