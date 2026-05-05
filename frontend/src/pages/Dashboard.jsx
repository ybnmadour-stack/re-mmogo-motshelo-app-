import React, { useEffect, useMemo, useState } from "react";
import {
  LogOut,
  PlusCircle,
  Users,
  Wallet,
  FileText,
  Landmark,
} from "lucide-react";
import { api, clearSession, getUser } from "../api.js";

export default function Dashboard() {
  const [activePage, setActivePage] = useState(
    window.location.hash.replace("#", "") || "groups"
  );

  const [data, setData] = useState({
    groups: [],
    stats: {
      members: 0,
      contributions: 0,
      outstandingLoans: 0,
    },
  });

  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [report, setReport] = useState({
    members: [],
    summary: {},
  });

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSignatory, setSelectedSignatory] = useState("");
  const [message, setMessage] = useState("");

  const user = getUser();

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
  });

  const [memberForm, setMemberForm] = useState({
    email: "",
    phone: "",
    is_signatory: false,
  });

  const [contributionForm, setContributionForm] = useState({
    member_id: "",
    amount: 1000,
    month: new Date().toISOString().slice(0, 7),
    proof_url: "",
  });

  const [loanForm, setLoanForm] = useState({
    member_id: "",
    principal: "",
    purpose: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    loan_id: "",
    member_id: "",
    amount: "",
    payment_type: "loan",
    proof_url: "",
  });

  useEffect(() => {
    function handleHashChange() {
      setActivePage(window.location.hash.replace("#", "") || "groups");
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  async function load() {
    try {
      const dashboard = await api("/api/dashboard");

      setData(dashboard);

      const firstGroup = selectedGroup || dashboard.groups[0]?.id || "";
      setSelectedGroup(firstGroup);

      if (firstGroup) {
        const loadedMembers = await api(`/api/groups/${firstGroup}/members`);
        setMembers(loadedMembers);

        const firstSignatory =
          loadedMembers.find((member) => Number(member.is_signatory) === 1)
            ?.id || "";

        setSelectedSignatory(firstSignatory);
      }

      setContributions(await api("/api/contributions"));
      setLoans(await api("/api/loans"));
      setPayments(await api("/api/payments"));
      setReport(await api("/api/reports/year-end"));
    } catch (err) {
      setMessage(err.message || "Could not load dashboard data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      api(`/api/groups/${selectedGroup}/members`)
        .then((loadedMembers) => {
          setMembers(loadedMembers);

          const firstSignatory =
            loadedMembers.find((member) => Number(member.is_signatory) === 1)
              ?.id || "";

          setSelectedSignatory(firstSignatory);
        })
        .catch(() => {});
    }
  }, [selectedGroup]);

  const groupOptions = useMemo(() => {
    return data.groups.map((group) => (
      <option key={group.id} value={group.id}>
        {group.name}
      </option>
    ));
  }, [data.groups]);

  const signatories = members.filter(
    (member) => Number(member.is_signatory) === 1
  );

  async function handleCreateGroup(e) {
    e.preventDefault();

    try {
      await api("/api/groups", {
        method: "POST",
        body: JSON.stringify(groupForm),
      });

      setGroupForm({
        name: "",
        description: "",
      });

      setMessage("Group registered successfully.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not create group.");
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();

    if (!selectedGroup) {
      setMessage("Create or select a group first.");
      return;
    }

    try {
      await api(`/api/groups/${selectedGroup}/members`, {
        method: "POST",
        body: JSON.stringify(memberForm),
      });

      setMemberForm({
        email: "",
        phone: "",
        is_signatory: false,
      });

      setMessage("Registered user added to group successfully.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not add member.");
    }
  }

  async function handleContribution(e) {
    e.preventDefault();

    try {
      await api("/api/contributions", {
        method: "POST",
        body: JSON.stringify({
          ...contributionForm,
          group_id: selectedGroup,
        }),
      });

      setMessage("Contribution submitted for approval.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not submit contribution.");
    }
  }

  async function handleLoan(e) {
    e.preventDefault();

    try {
      await api("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          ...loanForm,
          group_id: selectedGroup,
        }),
      });

      setLoanForm({
        member_id: "",
        principal: "",
        purpose: "",
      });

      setMessage("Loan request submitted. It needs two approvals.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not record loan.");
    }
  }

  async function handlePayment(e) {
    e.preventDefault();

    try {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          ...paymentForm,
          group_id: selectedGroup,
        }),
      });

      setPaymentForm({
        loan_id: "",
        member_id: "",
        amount: "",
        payment_type: "loan",
        proof_url: "",
      });

      setMessage("Payment submitted for approval.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not submit payment.");
    }
  }

  async function approveContribution(id) {
    if (!selectedSignatory) {
      setMessage("Select a signatory first.");
      return;
    }

    try {
      const result = await api(`/api/contributions/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          signatory_id: selectedSignatory,
        }),
      });

      setMessage(result.message || "Contribution approved.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not approve contribution.");
    }
  }

  async function approveLoan(id) {
    if (!selectedSignatory) {
      setMessage("Select a signatory first.");
      return;
    }

    try {
      const result = await api(`/api/loans/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          signatory_id: selectedSignatory,
        }),
      });

      setMessage(result.message || "Loan approval recorded.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not approve loan.");
    }
  }

  async function approvePayment(id) {
    if (!selectedSignatory) {
      setMessage("Select a signatory first.");
      return;
    }

    try {
      const result = await api(`/api/payments/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          signatory_id: selectedSignatory,
        }),
      });

      setMessage(result.message || "Payment approval recorded.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not approve payment.");
    }
  }

  async function applyInterest() {
    try {
      const result = await api("/api/loans/apply-monthly-interest", {
        method: "POST",
      });

      setMessage(result.message || "20% monthly interest applied.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not apply interest.");
    }
  }

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  function goToPage(page) {
    window.location.hash = page;
    setActivePage(page);
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <h2>Re-Mmogo</h2>
        <p>Motshelo group management system</p>

        <button
          className={activePage === "groups" ? "nav active" : "nav"}
          onClick={() => goToPage("groups")}
        >
          Groups & Members
        </button>

        <button
          className={activePage === "contributions" ? "nav active" : "nav"}
          onClick={() => goToPage("contributions")}
        >
          Contributions
        </button>

        <button
          className={activePage === "loans" ? "nav active" : "nav"}
          onClick={() => goToPage("loans")}
        >
          Loans
        </button>

        <button
          className={activePage === "payments" ? "nav active" : "nav"}
          onClick={() => goToPage("payments")}
        >
          Payments
        </button>

        <button
          className={activePage === "reports" ? "nav active" : "nav"}
          onClick={() => goToPage("reports")}
        >
          Reports
        </button>

        <button className="logout" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{pageTitle(activePage)}</h1>
            <p>
              Welcome, {user?.name || "member"}. Manage Motshelo groups,
              members, contributions, loans, payments and reports.
            </p>
          </div>

          <div className="top-controls">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">Select group</option>
              {groupOptions}
            </select>

            <select
              value={selectedSignatory}
              onChange={(e) => setSelectedSignatory(e.target.value)}
            >
              <option value="">Select signatory</option>

              {signatories.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {message && <div className="notice">{message}</div>}

        <Stats data={data} />

        {activePage === "groups" && (
          <GroupsMembersPage
            groupForm={groupForm}
            setGroupForm={setGroupForm}
            memberForm={memberForm}
            setMemberForm={setMemberForm}
            handleCreateGroup={handleCreateGroup}
            handleAddMember={handleAddMember}
            members={members}
          />
        )}

        {activePage === "contributions" && (
          <ContributionsPage
            contributionForm={contributionForm}
            setContributionForm={setContributionForm}
            handleContribution={handleContribution}
            members={members}
            contributions={contributions}
            approveContribution={approveContribution}
          />
        )}

        {activePage === "loans" && (
          <LoansPage
            loanForm={loanForm}
            setLoanForm={setLoanForm}
            handleLoan={handleLoan}
            members={members}
            loans={loans}
            approveLoan={approveLoan}
            applyInterest={applyInterest}
          />
        )}

        {activePage === "payments" && (
          <PaymentsPage
            paymentForm={paymentForm}
            setPaymentForm={setPaymentForm}
            handlePayment={handlePayment}
            members={members}
            loans={loans}
            payments={payments}
            approvePayment={approvePayment}
          />
        )}

        {activePage === "reports" && <ReportsPage report={report} />}
      </section>
    </main>
  );
}

function pageTitle(activePage) {
  if (activePage === "groups") return "Groups & Members";
  if (activePage === "contributions") return "Contributions";
  if (activePage === "loans") return "Loans";
  if (activePage === "payments") return "Payments";
  if (activePage === "reports") return "Year-End Reports";

  return "Dashboard";
}

function Stats({ data }) {
  return (
    <div className="cards">
      <Stat icon={<Users />} label="Members" value={data.stats.members} />

      <Stat
        icon={<Wallet />}
        label="Approved Contributions"
        value={`P${Number(data.stats.contributions).toFixed(2)}`}
      />

      <Stat
        icon={<Landmark />}
        label="Outstanding Loans"
        value={`P${Number(data.stats.outstandingLoans).toFixed(2)}`}
      />

      <Stat icon={<FileText />} label="Groups" value={data.groups.length} />
    </div>
  );
}

function GroupsMembersPage({
  groupForm,
  setGroupForm,
  memberForm,
  setMemberForm,
  handleCreateGroup,
  handleAddMember,
  members,
}) {
  return (
    <>
      <div className="grid two">
        <Panel title="1. Register Motshelo Group">
          <form onSubmit={handleCreateGroup} className="mini-form">
            <label>
              Group name
              <input
                placeholder="Example: Unity Motshelo"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm({
                    ...groupForm,
                    name: e.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Description
              <input
                placeholder="Example: Monthly savings group"
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm({
                    ...groupForm,
                    description: e.target.value,
                  })
                }
              />
            </label>

            <button>
              <PlusCircle size={16} />
              Add group
            </button>
          </form>
        </Panel>

        <Panel title="2. Enroll Registered User Into Group">
          <form onSubmit={handleAddMember} className="mini-form">
            <label>
              Registered user email
              <input
                type="email"
                placeholder="User must already have an account"
                value={memberForm.email}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    email: e.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Phone
              <input
                placeholder="Phone number"
                value={memberForm.phone}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    phone: e.target.value,
                  })
                }
              />
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={memberForm.is_signatory}
                onChange={(e) =>
                  setMemberForm({
                    ...memberForm,
                    is_signatory: e.target.checked,
                  })
                }
              />
              Signatory / Approver
            </label>

            <button>Add registered user</button>
          </form>
        </Panel>
      </div>

      <Panel title="Current Group Members">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
              </tr>
            </thead>

            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan="4">No members added yet.</td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.full_name}</td>
                    <td>{member.email || "-"}</td>
                    <td>{member.phone || "-"}</td>
                    <td>
                      {Number(member.is_signatory) === 1
                        ? "Signatory"
                        : "Member"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function ContributionsPage({
  contributionForm,
  setContributionForm,
  handleContribution,
  members,
  contributions,
  approveContribution,
}) {
  return (
    <>
      <Panel title="Record Monthly Contribution">
        <form onSubmit={handleContribution} className="mini-form">
          <label>
            Member
            <select
              value={contributionForm.member_id}
              onChange={(e) =>
                setContributionForm({
                  ...contributionForm,
                  member_id: e.target.value,
                })
              }
              required
            >
              <option value="">Select member</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount
            <input
              type="number"
              value={contributionForm.amount}
              onChange={(e) =>
                setContributionForm({
                  ...contributionForm,
                  amount: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Month
            <input
              type="month"
              value={contributionForm.month}
              onChange={(e) =>
                setContributionForm({
                  ...contributionForm,
                  month: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Proof of payment
            <input
              placeholder="Optional proof link"
              value={contributionForm.proof_url}
              onChange={(e) =>
                setContributionForm({
                  ...contributionForm,
                  proof_url: e.target.value,
                })
              }
            />
          </label>

          <button>Submit contribution</button>
        </form>
      </Panel>

      <Panel title="Contribution Records">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Group</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {contributions.map((contribution) => (
                <tr key={contribution.id}>
                  <td>{contribution.full_name}</td>
                  <td>{contribution.group_name}</td>
                  <td>{contribution.month}</td>
                  <td>P{contribution.amount}</td>
                  <td>{contribution.status}</td>
                  <td>
                    {contribution.status === "pending" && (
                      <button
                        className="small-btn"
                        onClick={() => approveContribution(contribution.id)}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function LoansPage({
  loanForm,
  setLoanForm,
  handleLoan,
  members,
  loans,
  approveLoan,
  applyInterest,
}) {
  return (
    <>
      <Panel title="Record Loan Taken By Member">
        <form onSubmit={handleLoan} className="mini-form">
          <label>
            Borrowing member
            <select
              value={loanForm.member_id}
              onChange={(e) =>
                setLoanForm({
                  ...loanForm,
                  member_id: e.target.value,
                })
              }
              required
            >
              <option value="">Select member</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Principal amount
            <input
              type="number"
              placeholder="Example: 2000"
              value={loanForm.principal}
              onChange={(e) =>
                setLoanForm({
                  ...loanForm,
                  principal: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Purpose
            <input
              placeholder="Example: Emergency"
              value={loanForm.purpose}
              onChange={(e) =>
                setLoanForm({
                  ...loanForm,
                  purpose: e.target.value,
                })
              }
            />
          </label>

          <button>Submit loan request</button>
        </form>
      </Panel>

      <Panel title="Loan Records">
        <button className="small-btn" onClick={applyInterest}>
          Apply 20% Monthly Interest
        </button>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Principal</th>
                <th>Balance</th>
                <th>Approvals</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.full_name}</td>
                  <td>P{loan.principal}</td>
                  <td>P{loan.balance}</td>
                  <td>{loan.approval_count || 0}/2</td>
                  <td>{loan.status}</td>
                  <td>
                    {loan.status !== "disbursed" && (
                      <button
                        className="small-btn"
                        onClick={() => approveLoan(loan.id)}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function PaymentsPage({
  paymentForm,
  setPaymentForm,
  handlePayment,
  members,
  loans,
  payments,
  approvePayment,
}) {
  return (
    <>
      <Panel title="Record Member Payment">
        <form onSubmit={handlePayment} className="mini-form">
          <label>
            Payment type
            <select
              value={paymentForm.payment_type}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  payment_type: e.target.value,
                })
              }
            >
              <option value="loan">Loan repayment</option>
              <option value="contribution">Monthly contribution</option>
            </select>
          </label>

          <label>
            Member
            <select
              value={paymentForm.member_id}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  member_id: e.target.value,
                })
              }
              required
            >
              <option value="">Select member</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Loan
            <select
              value={paymentForm.loan_id}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  loan_id: e.target.value,
                })
              }
            >
              <option value="">No loan selected</option>

              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.full_name} - P{loan.balance}
                </option>
              ))}
            </select>
          </label>

          <label>
            Amount
            <input
              type="number"
              placeholder="Payment amount"
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  amount: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Proof of payment
            <input
              placeholder="Optional proof link"
              value={paymentForm.proof_url}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  proof_url: e.target.value,
                })
              }
            />
          </label>

          <button>Submit payment</button>
        </form>
      </Panel>

      <Panel title="Payment Records">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Group</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Approvals</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.full_name}</td>
                  <td>{payment.group_name}</td>
                  <td>{payment.type}</td>
                  <td>P{payment.amount}</td>
                  <td>{payment.approval_count || 0}/2</td>
                  <td>{payment.status}</td>
                  <td>
                    {payment.status !== "approved" && (
                      <button
                        className="small-btn"
                        onClick={() => approvePayment(payment.id)}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function ReportsPage({ report }) {
  const members = report.members || [];
  const summary = report.summary || {};

  return (
    <>
      <div className="cards">
        <Stat
          icon={<Users />}
          label="Report Members"
          value={summary.totalMembers || 0}
        />

        <Stat
          icon={<Wallet />}
          label="Total Contributions"
          value={`P${Number(summary.totalContributions || 0).toFixed(2)}`}
        />

        <Stat
          icon={<Landmark />}
          label="Total Borrowed"
          value={`P${Number(summary.totalBorrowed || 0).toFixed(2)}`}
        />

        <Stat
          icon={<FileText />}
          label="Total Interest"
          value={`P${Number(summary.totalEstimatedInterest || 0).toFixed(2)}`}
        />
      </div>

      <div className="grid two">
        <Panel title="Highest Interest Member">
          <p>
            <strong>{summary.highestInterest?.full_name || "No data yet"}</strong>
          </p>

          <p>
            Estimated Interest: P
            {Number(summary.highestInterest?.estimated_interest || 0).toFixed(2)}
          </p>
        </Panel>

        <Panel title="Lowest Interest Member">
          <p>
            <strong>{summary.lowestInterest?.full_name || "No data yet"}</strong>
          </p>

          <p>
            Estimated Interest: P
            {Number(summary.lowestInterest?.estimated_interest || 0).toFixed(2)}
          </p>
        </Panel>
      </div>

      <Panel title="Year-End Report">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Group</th>
                <th>Contributed</th>
                <th>Borrowed</th>
                <th>Outstanding</th>
                <th>Interest</th>
                <th>Target</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {members.map((item) => (
                <tr key={item.id}>
                  <td>{item.full_name}</td>
                  <td>{item.group_name}</td>
                  <td>P{Number(item.total_contributed).toFixed(2)}</td>
                  <td>P{Number(item.total_borrowed).toFixed(2)}</td>
                  <td>P{Number(item.outstanding_balance).toFixed(2)}</td>
                  <td>P{Number(item.estimated_interest).toFixed(2)}</td>
                  <td>P{Number(item.interest_target).toFixed(2)}</td>
                  <td>{item.interest_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <span>{icon}</span>
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}