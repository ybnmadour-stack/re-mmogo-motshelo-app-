const express = require("express");
const { run, get, all } = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

async function requireGroup(id) {
  return get("SELECT * FROM groups WHERE id = ?", [id]);
}

async function requireSignatory(groupId, signatoryId) {
  return get(
    "SELECT * FROM members WHERE id = ? AND group_id = ? AND is_signatory = 1",
    [signatoryId, groupId]
  );
}

/* =========================
   DASHBOARD
========================= */

router.get("/dashboard", async (req, res) => {
  try {
    const groups = await all("SELECT * FROM groups ORDER BY id DESC");

    const members = await get("SELECT COUNT(*) AS count FROM members");

    const contributions = await get(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM contributions WHERE status = 'approved'"
    );

    const loans = await get(
      "SELECT COALESCE(SUM(balance), 0) AS total FROM loans WHERE status = 'disbursed'"
    );

    res.json({
      groups,
      stats: {
        members: members.count,
        contributions: contributions.total,
        outstandingLoans: loans.total,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not load dashboard",
      error: error.message,
    });
  }
});

/* =========================
   GROUPS
========================= */

router.post("/groups", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    const result = await run(
      "INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)",
      [name, description || "", req.user.id]
    );

    const group = await get("SELECT * FROM groups WHERE id = ?", [result.id]);

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({
      message: "Could not create group",
      error: error.message,
    });
  }
});

/* =========================
   MEMBERS
========================= */

router.get("/groups/:groupId/members", async (req, res) => {
  try {
    const group = await requireGroup(req.params.groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const members = await all(
      "SELECT * FROM members WHERE group_id = ? ORDER BY full_name",
      [req.params.groupId]
    );

    res.json(members);
  } catch (error) {
    res.status(500).json({
      message: "Could not load members",
      error: error.message,
    });
  }
});

router.post("/groups/:groupId/members", async (req, res) => {
  try {
    const group = await requireGroup(req.params.groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const { email, phone, is_signatory } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Member email is required",
      });
    }

    const existingUser = await get("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (!existingUser) {
      return res.status(400).json({
        message:
          "This person must create an account first before being added to a group",
      });
    }

    const alreadyMember = await get(
      "SELECT * FROM members WHERE group_id = ? AND email = ?",
      [req.params.groupId, email]
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "This user is already a member of this group",
      });
    }

    const result = await run(
      "INSERT INTO members (group_id, full_name, email, phone, is_signatory) VALUES (?, ?, ?, ?, ?)",
      [
        req.params.groupId,
        existingUser.name,
        existingUser.email,
        phone || "",
        is_signatory ? 1 : 0,
      ]
    );

    const member = await get("SELECT * FROM members WHERE id = ?", [result.id]);

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({
      message: "Could not add member",
      error: error.message,
    });
  }
});

/* =========================
   CONTRIBUTIONS
========================= */

router.get("/contributions", async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.*, m.full_name, g.name AS group_name
      FROM contributions c
      JOIN members m ON m.id = c.member_id
      JOIN groups g ON g.id = c.group_id
      ORDER BY c.id DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Could not load contributions",
      error: error.message,
    });
  }
});

router.post("/contributions", async (req, res) => {
  try {
    const { group_id, member_id, amount, month, proof_url } = req.body;

    const group = await requireGroup(group_id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const member = await get(
      "SELECT * FROM members WHERE id = ? AND group_id = ?",
      [member_id, group_id]
    );

    if (!member) {
      return res.status(400).json({
        message: "Only enrolled members can contribute",
      });
    }

    if (!month) {
      return res.status(400).json({
        message: "Contribution month is required",
      });
    }

    const value = Number(amount || 1000);

    if (value <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than zero",
      });
    }

    const result = await run(
      "INSERT INTO contributions (group_id, member_id, amount, month, proof_url, status) VALUES (?, ?, ?, ?, ?, ?)",
      [group_id, member_id, value, month, proof_url || "", "pending"]
    );

    res.status(201).json(
      await get("SELECT * FROM contributions WHERE id = ?", [result.id])
    );
  } catch (error) {
    res.status(500).json({
      message: "Could not record contribution",
      error: error.message,
    });
  }
});

router.patch("/contributions/:id/approve", async (req, res) => {
  try {
    const { signatory_id } = req.body;

    const contribution = await get("SELECT * FROM contributions WHERE id = ?", [
      req.params.id,
    ]);

    if (!contribution) {
      return res.status(404).json({
        message: "Contribution not found",
      });
    }

    const signatory = await requireSignatory(
      contribution.group_id,
      signatory_id
    );

    if (!signatory) {
      return res.status(400).json({
        message: "A valid signatory must approve this contribution",
      });
    }

    await run("UPDATE contributions SET status = ? WHERE id = ?", [
      "approved",
      req.params.id,
    ]);

    res.json({
      message: "Contribution approved",
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not approve contribution",
      error: error.message,
    });
  }
});

/* =========================
   LOANS
========================= */

router.get("/loans", async (req, res) => {
  try {
    const rows = await all(`
      SELECT 
        l.*, 
        m.full_name, 
        g.name AS group_name,
        COALESCE((SELECT COUNT(*) FROM loan_approvals la WHERE la.loan_id = l.id), 0) AS approval_count
      FROM loans l
      JOIN members m ON m.id = l.member_id
      JOIN groups g ON g.id = l.group_id
      ORDER BY l.id DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Could not load loans",
      error: error.message,
    });
  }
});

router.post("/loans", async (req, res) => {
  try {
    const { group_id, member_id, principal, purpose } = req.body;

    const group = await requireGroup(group_id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const member = await get(
      "SELECT * FROM members WHERE id = ? AND group_id = ?",
      [member_id, group_id]
    );

    if (!member) {
      return res.status(400).json({
        message: "Only members can borrow from the motshelo",
      });
    }

    const amount = Number(principal);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Loan principal must be greater than zero",
      });
    }

    const result = await run(
      "INSERT INTO loans (group_id, member_id, principal, balance, purpose, status) VALUES (?, ?, ?, ?, ?, ?)",
      [group_id, member_id, amount, amount, purpose || "", "pending"]
    );

    res.status(201).json(await get("SELECT * FROM loans WHERE id = ?", [result.id]));
  } catch (error) {
    res.status(500).json({
      message: "Could not request loan",
      error: error.message,
    });
  }
});

router.patch("/loans/:id/approve", async (req, res) => {
  try {
    const { signatory_id } = req.body;

    const loan = await get("SELECT * FROM loans WHERE id = ?", [req.params.id]);

    if (!loan) {
      return res.status(404).json({
        message: "Loan not found",
      });
    }

    if (loan.status === "disbursed") {
      return res.status(400).json({
        message: "Loan is already disbursed",
      });
    }

    const signatory = await requireSignatory(loan.group_id, signatory_id);

    if (!signatory) {
      return res.status(400).json({
        message: "A valid signatory must approve this loan",
      });
    }

    try {
      await run(
        "INSERT INTO loan_approvals (loan_id, signatory_id) VALUES (?, ?)",
        [req.params.id, signatory_id]
      );
    } catch (error) {
      return res.status(400).json({
        message: "This signatory already approved this loan",
      });
    }

    const count = await get(
      "SELECT COUNT(*) AS approvals FROM loan_approvals WHERE loan_id = ?",
      [req.params.id]
    );

    const status = count.approvals >= 2 ? "disbursed" : "pending";

    await run(
      "UPDATE loans SET status = ? WHERE id = ?",
      [status, req.params.id]
    );

    res.json({
      message:
        status === "disbursed"
          ? "Loan disbursed after two signatory approvals"
          : "First approval recorded. One more signatory approval is required.",
      approvals: count.approvals,
      status,
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not approve loan",
      error: error.message,
    });
  }
});

router.post("/loans/apply-monthly-interest", async (req, res) => {
  try {
    await run(
      "UPDATE loans SET balance = ROUND(balance * 1.20, 2) WHERE status = 'disbursed' AND balance > 0"
    );

    res.json({
      message: "20% monthly interest applied to active loan balances",
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not apply interest",
      error: error.message,
    });
  }
});

/* =========================
   PAYMENTS
========================= */

router.get("/payments", async (req, res) => {
  try {
    const rows = await all(`
      SELECT 
        p.*, 
        m.full_name, 
        g.name AS group_name,
        COALESCE((SELECT COUNT(*) FROM payment_approvals pa WHERE pa.payment_id = p.id), 0) AS approval_count
      FROM payments p
      JOIN members m ON m.id = p.member_id
      JOIN groups g ON g.id = p.group_id
      ORDER BY p.id DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Could not load payments",
      error: error.message,
    });
  }
});

router.post("/payments", async (req, res) => {
  try {
    const {
      group_id,
      member_id,
      loan_id,
      payment_type,
      type,
      amount,
      proof_url,
    } = req.body;

    const finalType = payment_type || type;

    const group = await requireGroup(group_id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const member = await get(
      "SELECT * FROM members WHERE id = ? AND group_id = ?",
      [member_id, group_id]
    );

    if (!member) {
      return res.status(400).json({
        message: "Payment must be initiated by an enrolled member",
      });
    }

    if (!["contribution", "loan", "loan_repayment"].includes(finalType)) {
      return res.status(400).json({
        message: "Invalid payment type",
      });
    }

    const value = Number(amount);

    if (!value || value <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than zero",
      });
    }

    if (finalType === "loan" || finalType === "loan_repayment") {
      const loan = await get(
        "SELECT * FROM loans WHERE id = ? AND member_id = ? AND group_id = ?",
        [loan_id, member_id, group_id]
      );

      if (!loan) {
        return res.status(400).json({
          message: "Loan repayment must belong to the selected member",
        });
      }
    }

    const result = await run(
      "INSERT INTO payments (group_id, member_id, loan_id, type, amount, proof_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        group_id,
        member_id,
        loan_id || null,
        finalType === "loan" ? "loan_repayment" : finalType,
        value,
        proof_url || "",
        "pending",
      ]
    );

    res.status(201).json(await get("SELECT * FROM payments WHERE id = ?", [result.id]));
  } catch (error) {
    res.status(500).json({
      message: "Could not submit payment",
      error: error.message,
    });
  }
});

router.patch("/payments/:id/approve", async (req, res) => {
  try {
    const { signatory_id } = req.body;

    const payment = await get("SELECT * FROM payments WHERE id = ?", [
      req.params.id,
    ]);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    if (payment.status === "approved") {
      return res.status(400).json({
        message: "Payment already approved",
      });
    }

    const signatory = await requireSignatory(payment.group_id, signatory_id);

    if (!signatory) {
      return res.status(400).json({
        message: "A valid signatory must approve this payment",
      });
    }

    try {
      await run(
        "INSERT INTO payment_approvals (payment_id, signatory_id) VALUES (?, ?)",
        [req.params.id, signatory_id]
      );
    } catch (error) {
      return res.status(400).json({
        message: "This signatory already approved this payment",
      });
    }

    const count = await get(
      "SELECT COUNT(*) AS approvals FROM payment_approvals WHERE payment_id = ?",
      [req.params.id]
    );

    if (count.approvals >= 2) {
      await run("UPDATE payments SET status = ? WHERE id = ?", [
        "approved",
        req.params.id,
      ]);

      if (payment.type === "loan_repayment" && payment.loan_id) {
        await run(
          "UPDATE loans SET balance = MAX(balance - ?, 0) WHERE id = ?",
          [payment.amount, payment.loan_id]
        );
      }
    }

    res.json({
      message:
        count.approvals >= 2
          ? "Payment approved after two signatory approvals"
          : "First approval recorded. One more signatory approval is required.",
      approvals: count.approvals,
      status: count.approvals >= 2 ? "approved" : "pending",
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not approve payment",
      error: error.message,
    });
  }
});

/* =========================
   REPORTS
========================= */

router.get("/reports/year-end", async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        m.id,
        m.full_name,
        g.name AS group_name,

        COALESCE((
          SELECT SUM(c.amount)
          FROM contributions c
          WHERE c.member_id = m.id
          AND c.status = 'approved'
        ), 0) AS total_contributed,

        COALESCE((
          SELECT SUM(l.principal)
          FROM loans l
          WHERE l.member_id = m.id
        ), 0) AS total_borrowed,

        COALESCE((
          SELECT SUM(l.balance)
          FROM loans l
          WHERE l.member_id = m.id
        ), 0) AS outstanding_balance,

        COALESCE((
          SELECT SUM(l.balance - l.principal)
          FROM loans l
          WHERE l.member_id = m.id
        ), 0) AS estimated_interest,

        5000 AS interest_target,

        CASE
          WHEN COALESCE((
            SELECT SUM(l.balance - l.principal)
            FROM loans l
            WHERE l.member_id = m.id
          ), 0) >= 5000
          THEN 'Target reached'
          ELSE 'Below target'
        END AS interest_status

      FROM members m
      JOIN groups g ON g.id = m.group_id
      ORDER BY estimated_interest DESC
    `);

    const highestInterest = rows.length ? rows[0] : null;
    const lowestInterest = rows.length ? rows[rows.length - 1] : null;

    res.json({
      members: rows,
      summary: {
        highestInterest,
        lowestInterest,
        totalMembers: rows.length,
        totalContributions: rows.reduce(
          (sum, item) => sum + Number(item.total_contributed || 0),
          0
        ),
        totalBorrowed: rows.reduce(
          (sum, item) => sum + Number(item.total_borrowed || 0),
          0
        ),
        totalOutstanding: rows.reduce(
          (sum, item) => sum + Number(item.outstanding_balance || 0),
          0
        ),
        totalEstimatedInterest: rows.reduce(
          (sum, item) => sum + Number(item.estimated_interest || 0),
          0
        ),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not produce report",
      error: error.message,
    });
  }
});

module.exports = router;