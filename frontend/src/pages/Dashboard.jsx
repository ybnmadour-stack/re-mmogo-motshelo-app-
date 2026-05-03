import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, PlusCircle, Users, Wallet, FileText, Landmark, CheckCircle, Banknote } from 'lucide-react';
import { api, clearSession, getUser } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState({ groups: [], stats: { members: 0, contributions: 0, outstandingLoans: 0 } });
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [report, setReport] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [message, setMessage] = useState('');
  const user = getUser();

  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [memberForm, setMemberForm] = useState({ full_name: '', email: '', phone: '', is_signatory: false });
  const [contributionForm, setContributionForm] = useState({ member_id: '', amount: 1000, month: new Date().toISOString().slice(0, 7), proof_url: '', signatory_id: '' });
  const [loanForm, setLoanForm] = useState({ member_id: '', principal: '', purpose: '', signatory_id: '' });
  const [paymentForm, setPaymentForm] = useState({ member_id: '', loan_id: '', type: 'loan_repayment', amount: '', proof_url: '', signatory_id: '' });

  async function load() {
    const dashboard = await api('/api/dashboard');
    setData(dashboard);
    const firstGroup = selectedGroup || dashboard.groups[0]?.id || '';
    setSelectedGroup(firstGroup);
    if (firstGroup) setMembers(await api(`/api/groups/${firstGroup}/members`));
    setContributions(await api('/api/contributions'));
    setLoans(await api('/api/loans'));
    setPayments(await api('/api/payments'));
    setReport(await api('/api/reports/year-end'));
  }

  useEffect(() => { load().catch(err => setMessage(err.message)); }, []);
  useEffect(() => { if (selectedGroup) api(`/api/groups/${selectedGroup}/members`).then(setMembers).catch(() => {}); }, [selectedGroup]);

  const groupOptions = useMemo(() => data.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>), [data.groups]);
  const memberOptions = members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>);
  const signatoryOptions = members.filter(m => m.is_signatory).map(m => <option key={m.id} value={m.id}>{m.full_name}</option>);
  const memberLoans = loans.filter(l => String(l.member_id) === String(paymentForm.member_id) && l.status === 'disbursed' && Number(l.balance) > 0);

  async function submit(e, action, success) {
    e.preventDefault();
    try {
      await action();
      setMessage(success);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  }

  function logout() {
    clearSession();
    window.location.href = '/login';
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <h2>Re-Mmogo</h2>
        <p>Motshelo group management system</p>
        <nav>
          <a href="#groups">Groups</a>
          <a href="#members">Members</a>
          <a href="#contributions">Contributions</a>
          <a href="#loans">Loans</a>
          <a href="#payments">Payments</a>
          <a href="#reports">Reports</a>
        </nav>
        <button className="logout" onClick={logout}><LogOut size={16} /> Logout</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><h1>Dashboard</h1><p>Welcome, {user?.name || 'member'}. Manage Motshelo groups, members, payments and reports.</p></div>
          <select aria-label="Select group" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
            <option value="">Select group</option>{groupOptions}
          </select>
        </header>

        {message && <div className="notice">{message}</div>}

        <div className="cards">
          <Stat icon={<Users />} label="Members" value={data.stats.members} />
          <Stat icon={<Wallet />} label="Approved Contributions" value={`P${Number(data.stats.contributions).toFixed(2)}`} />
          <Stat icon={<Landmark />} label="Outstanding Loans" value={`P${Number(data.stats.outstandingLoans).toFixed(2)}`} />
          <Stat icon={<FileText />} label="Groups" value={data.groups.length} />
        </div>

        <div className="grid two">
          <Panel id="groups" title="1. Register Motshelo Group">
            <form onSubmit={e => submit(e, async () => {
              await api('/api/groups', { method: 'POST', body: JSON.stringify(groupForm) });
              setGroupForm({ name: '', description: '' });
            }, 'Group registered successfully.')} className="mini-form">
              <label>Group name<input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} required /></label>
              <label>Description<input value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} /></label>
              <button><PlusCircle size={16} /> Add group</button>
            </form>
          </Panel>

          <Panel id="members" title="2. Enroll Member Into Group">
            <form onSubmit={e => submit(e, async () => {
              if (!selectedGroup) throw new Error('Create or select a group first.');
              await api(`/api/groups/${selectedGroup}/members`, { method: 'POST', body: JSON.stringify(memberForm) });
              setMemberForm({ full_name: '', email: '', phone: '', is_signatory: false });
            }, 'Member enrolled successfully.')} className="mini-form">
              <label>Full name<input value={memberForm.full_name} onChange={e => setMemberForm({ ...memberForm, full_name: e.target.value })} required /></label>
              <label>Email<input type="email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} /></label>
              <label>Phone<input value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} /></label>
              <label className="check"><input type="checkbox" checked={memberForm.is_signatory} onChange={e => setMemberForm({ ...memberForm, is_signatory: e.target.checked })} /> Signatory / Approver</label>
              <button>Add member</button>
            </form>
          </Panel>
        </div>

        <div className="grid two">
          <Panel id="contributions" title="3. Record Monthly Contribution">
            <form onSubmit={e => submit(e, async () => {
              await api('/api/contributions', { method: 'POST', body: JSON.stringify({ ...contributionForm, group_id: selectedGroup }) });
              setContributionForm({ ...contributionForm, member_id: '', proof_url: '' });
            }, 'Contribution submitted. A signatory must approve it.')} className="mini-form">
              <label>Member<select value={contributionForm.member_id} onChange={e => setContributionForm({ ...contributionForm, member_id: e.target.value })} required><option value="">Select member</option>{memberOptions}</select></label>
              <label>Amount<input type="number" min="1" value={contributionForm.amount} onChange={e => setContributionForm({ ...contributionForm, amount: e.target.value })} required /></label>
              <label>Month<input type="month" value={contributionForm.month} onChange={e => setContributionForm({ ...contributionForm, month: e.target.value })} required /></label>
              <label>Proof link<input value={contributionForm.proof_url} onChange={e => setContributionForm({ ...contributionForm, proof_url: e.target.value })} placeholder="Optional proof-of-payment link" /></label>
              <button>Submit contribution</button>
            </form>
          </Panel>

          <Panel id="loans" title="4. Record Loan Taken By Member">
            <form onSubmit={e => submit(e, async () => {
              await api('/api/loans', { method: 'POST', body: JSON.stringify({ ...loanForm, group_id: selectedGroup }) });
              setLoanForm({ member_id: '', principal: '', purpose: '', signatory_id: '' });
            }, 'Loan request submitted. It needs two signatory approvals.')} className="mini-form">
              <label>Borrowing member<select value={loanForm.member_id} onChange={e => setLoanForm({ ...loanForm, member_id: e.target.value })} required><option value="">Select member</option>{memberOptions}</select></label>
              <label>Principal amount<input type="number" min="1" value={loanForm.principal} onChange={e => setLoanForm({ ...loanForm, principal: e.target.value })} required /></label>
              <label>Purpose<input value={loanForm.purpose} onChange={e => setLoanForm({ ...loanForm, purpose: e.target.value })} /></label>
              <button>Request loan</button>
            </form>
          </Panel>
        </div>

        <Panel title="Contribution Approvals">
          <Table headers={['Member', 'Group', 'Month', 'Amount', 'Status', 'Approve With Signatory']}>
            {contributions.map(c => <tr key={c.id}><td>{c.full_name}</td><td>{c.group_name}</td><td>{c.month}</td><td>P{c.amount}</td><td>{c.status}</td><td>{c.status === 'pending' && <ApproveSelect options={signatoryOptions} onApprove={id => api(`/api/contributions/${c.id}/approve`, { method: 'PATCH', body: JSON.stringify({ signatory_id: id }) }).then(load).then(() => setMessage('Contribution approved.')).catch(err => setMessage(err.message))} />}</td></tr>)}
          </Table>
        </Panel>

        <Panel title="Loan Approvals and Interest">
          <button className="small-btn" onClick={() => api('/api/loans/apply-monthly-interest', { method: 'POST' }).then(load).then(() => setMessage('20% monthly interest applied.')).catch(err => setMessage(err.message))}><Banknote size={15} /> Apply 20% Monthly Interest</button>
          <Table headers={['Member', 'Principal', 'Balance', 'Approvals', 'Status', 'Approve With Signatory']}>
            {loans.map(l => <tr key={l.id}><td>{l.full_name}</td><td>P{l.principal}</td><td>P{l.balance}</td><td>{l.approvals}/2</td><td>{l.status}</td><td>{l.status !== 'disbursed' && <ApproveSelect options={signatoryOptions} onApprove={id => api(`/api/loans/${l.id}/approve`, { method: 'PATCH', body: JSON.stringify({ signatory_id: id }) }).then(load).then(() => setMessage('Loan approval recorded.')).catch(err => setMessage(err.message))} />}</td></tr>)}
          </Table>
        </Panel>

        <div className="grid two">
          <Panel id="payments" title="5. Track Payment Balances">
            <form onSubmit={e => submit(e, async () => {
              await api('/api/payments', { method: 'POST', body: JSON.stringify({ ...paymentForm, group_id: selectedGroup }) });
              setPaymentForm({ member_id: '', loan_id: '', type: 'loan_repayment', amount: '', proof_url: '', signatory_id: '' });
            }, 'Payment submitted for signatory approval.')} className="mini-form">
              <label>Member<select value={paymentForm.member_id} onChange={e => setPaymentForm({ ...paymentForm, member_id: e.target.value, loan_id: '' })} required><option value="">Select member</option>{memberOptions}</select></label>
              <label>Payment type<select value={paymentForm.type} onChange={e => setPaymentForm({ ...paymentForm, type: e.target.value })}><option value="loan_repayment">Loan repayment</option><option value="contribution">Contribution payment</option></select></label>
              <label>Loan<select value={paymentForm.loan_id} onChange={e => setPaymentForm({ ...paymentForm, loan_id: e.target.value })} disabled={paymentForm.type !== 'loan_repayment'}><option value="">Select loan</option>{memberLoans.map(l => <option key={l.id} value={l.id}>Loan #{l.id} - Balance P{l.balance}</option>)}</select></label>
              <label>Amount<input type="number" min="1" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required /></label>
              <label>Proof link<input value={paymentForm.proof_url} onChange={e => setPaymentForm({ ...paymentForm, proof_url: e.target.value })} placeholder="Optional proof-of-payment link" /></label>
              <button>Submit payment</button>
            </form>
          </Panel>

          <Panel title="Payment Approval Queue">
            <Table headers={['Member', 'Type', 'Amount', 'Status', 'Approve']}>
              {payments.map(p => <tr key={p.id}><td>{p.full_name}</td><td>{p.type}</td><td>P{p.amount}</td><td>{p.status}</td><td>{p.status === 'pending' && <ApproveSelect options={signatoryOptions} onApprove={id => api(`/api/payments/${p.id}/approve`, { method: 'PATCH', body: JSON.stringify({ signatory_id: id }) }).then(load).then(() => setMessage('Payment approved and balance updated.')).catch(err => setMessage(err.message))} />}</td></tr>)}
            </Table>
          </Panel>
        </div>

        <Panel id="reports" title="6. Year-End Report">
          <Table headers={['Member', 'Group', 'Contributed', 'Borrowed', 'Outstanding', 'Interest', 'Target']}>
            {report.map(r => <tr key={r.id}><td>{r.full_name}</td><td>{r.group_name}</td><td>P{Number(r.total_contributed).toFixed(2)}</td><td>P{Number(r.total_borrowed).toFixed(2)}</td><td>P{Number(r.outstanding_balance).toFixed(2)}</td><td>P{Number(r.estimated_interest).toFixed(2)}</td><td>{r.interest_status}</td></tr>)}
          </Table>
        </Panel>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }) {
  return <div className="stat"><span>{icon}</span><p>{label}</p><h3>{value}</h3></div>;
}

function Panel({ id, title, children }) {
  return <section id={id} className="panel"><h2>{title}</h2>{children}</section>;
}

function Table({ headers, children }) {
  return <div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function ApproveSelect({ options, onApprove }) {
  const [id, setId] = useState('');
  return <div className="approve-box"><select value={id} onChange={e => setId(e.target.value)}><option value="">Choose signatory</option>{options}</select><button className="small-btn" disabled={!id} onClick={() => onApprove(id)}><CheckCircle size={14} /> Approve</button></div>;
}
