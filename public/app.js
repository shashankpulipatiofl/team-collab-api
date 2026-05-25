// ── State ──────────────────────────────────────────────────────────────
let currentUserId = null;
let currentTeamId = null;
let currentTeamName = null;

// ── Selectors ─────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const screens = { login: $("login-screen"), dashboard: $("dashboard-screen") };

const el = {
  loginForm: $("login-form"),
  userIdInput: $("user-id-input"),
  displayUserId: $("display-user-id"),
  avatarInitial: $("avatar-initial"),
  logoutBtn: $("logout-btn"),

  teamsList: $("teams-list"),
  showCreateTeamBtn: $("show-create-team-btn"),
  cancelCreateTeam: $("cancel-create-team"),
  createTeamForm: $("create-team-form"),
  newTeamName: $("new-team-name"),
  createTeamSubmit: $("create-team-submit"),

  emptyState: $("empty-state"),
  emptyCreateBtn: $("empty-create-btn"),
  teamView: $("team-view"),
  teamTitle: $("team-title"),
  teamDescription: $("team-description"),
  wsTeamIcon: $("ws-team-icon"),
  refreshBtn: $("refresh-team-btn"),

  projectsList: $("projects-list"),
  projectsCount: $("projects-count"),
  showCreateProjectBtn: $("show-create-project-btn"),
  cancelCreateProject: $("cancel-create-project"),
  createProjectForm: $("create-project-form"),
  newProjectName: $("new-project-name"),
  newProjectDesc: $("new-project-desc"),
  createProjectSubmit: $("create-project-submit"),

  membersList: $("members-list"),
  membersCount: $("members-count"),
  showInviteBtn: $("show-invite-btn"),
  cancelInvite: $("cancel-invite"),
  inviteForm: $("invite-form"),
  inviteEmail: $("invite-email"),
  inviteRole: $("invite-role"),
  inviteSubmit: $("invite-submit"),

  auditList: $("audit-list"),
  toast: $("toast"),
  toastMsg: $("toast-msg"),
  toastIcon: $("toast-icon"),
};

// ── API ────────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  let url = path;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) {
    if (!body.requesterId && currentUserId) body.requesterId = currentUserId;
    opts.body = JSON.stringify(body);
  } else if (method === "GET" && currentUserId) {
    url += url.includes("?")
      ? `&requesterId=${currentUserId}`
      : `?requesterId=${currentUserId}`;
  }
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Toast ──────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, type = "success") {
  el.toastMsg.textContent = msg;
  el.toastIcon.textContent = type === "success" ? "✓" : "✕";
  el.toastIcon.className = `toast-icon ${type}`;
  el.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add("hidden"), 3500);
}

// ── Skeleton → real content ────────────────────────────────────────────
function setContent(el, html) {
  el.innerHTML = html;
}

// ── Reset workspace (called on login/logout) ────────────────────────────
function resetWorkspace() {
  currentTeamId = null;
  currentTeamName = null;
  // Hide team view, show empty state
  el.teamView.classList.add("hidden");
  el.emptyState.classList.remove("hidden");
  // Clear sidebar team list
  el.teamsList.innerHTML = "";
  // Clear all panels
  setContent(el.projectsList, skeletonHTML(3));
  setContent(el.membersList, skeletonHTML(2));
  setContent(el.auditList, skeletonHTML(3));
  el.projectsCount.textContent = "0";
  el.membersCount.textContent = "0";
  // Close any open inline forms
  el.createTeamForm.classList.add("hidden");
  el.createProjectForm.classList.add("hidden");
  el.inviteForm.classList.add("hidden");
  // Remove active state from all nav items
  document
    .querySelectorAll(".team-nav-item")
    .forEach((n) => n.classList.remove("active"));
}

// ── Auth ───────────────────────────────────────────────────────────────
el.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const uid = el.userIdInput.value.trim();
  if (!uid) return;
  currentUserId = uid;
  el.displayUserId.textContent = uid;
  el.avatarInitial.textContent = uid.charAt(0).toUpperCase();
  resetWorkspace(); // Always start fresh for every login
  screens.login.classList.remove("active");
  screens.dashboard.classList.add("active");
  await loadTeams();
});

el.logoutBtn.addEventListener("click", () => {
  currentUserId = null;
  el.userIdInput.value = "";
  el.newTeamName.value = "";
  resetWorkspace(); // Wipe all data from previous session
  screens.dashboard.classList.remove("active");
  screens.login.classList.add("active");
});

// ── Teams ──────────────────────────────────────────────────────────────
async function loadTeams() {
  try {
    const teams = await api("GET", `/users/${currentUserId}/teams`);
    el.teamsList.innerHTML = "";

    if (teams.length === 0) {
      el.teamsList.innerHTML = `<li style="padding:8px 10px;font-size:.78rem;color:var(--text-3)">No teams yet</li>`;
      return;
    }

    teams.forEach((team) => {
      const li = document.createElement("li");
      li.className = `team-nav-item${team.id === currentTeamId ? " active" : ""}`;
      li.innerHTML = `
        <div class="team-nav-avatar">${team.name.charAt(0).toUpperCase()}</div>
        <span class="team-nav-name">${escHtml(team.name)}</span>
      `;
      li.addEventListener("click", (e) => selectTeam(team, e.currentTarget));
      el.teamsList.appendChild(li);
    });
  } catch (err) {
    toast(err.message, "error");
  }
}

function selectTeam(team, navEl) {
  currentTeamId = team.id;
  currentTeamName = team.name;

  document
    .querySelectorAll(".team-nav-item")
    .forEach((n) => n.classList.remove("active"));
  if (navEl) navEl.classList.add("active");

  el.emptyState.classList.add("hidden");
  el.teamView.classList.remove("hidden");

  const initials = team.name.slice(0, 2).toUpperCase();
  el.wsTeamIcon.textContent = initials.charAt(0);
  el.teamTitle.textContent = team.name;
  el.teamDescription.textContent =
    team.description && team.description.trim()
      ? team.description
      : `Owner: ${team.owner_id || currentUserId}`;

  refreshAll();
}

function refreshAll() {
  if (!currentTeamId) return;
  loadProjects();
  loadMembers();
  loadAuditLog();
}

el.refreshBtn.addEventListener("click", refreshAll);

// ── Create Team ────────────────────────────────────────────────────────
el.showCreateTeamBtn.addEventListener("click", () => {
  el.createTeamForm.classList.remove("hidden");
  el.newTeamName.focus();
});
el.cancelCreateTeam.addEventListener("click", () => {
  el.createTeamForm.classList.add("hidden");
  el.newTeamName.value = "";
});
el.createTeamSubmit.addEventListener("click", async () => {
  const name = el.newTeamName.value.trim();
  if (!name) {
    el.newTeamName.focus();
    return;
  }
  try {
    el.createTeamSubmit.disabled = true;
    el.createTeamSubmit.textContent = "Creating…";
    await api("POST", "/teams", { name, requesterId: currentUserId });
    el.newTeamName.value = "";
    el.createTeamForm.classList.add("hidden");
    toast("Team created!");
    await loadTeams();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    el.createTeamSubmit.disabled = false;
    el.createTeamSubmit.textContent = "Create";
  }
});

el.emptyCreateBtn.addEventListener("click", () => {
  el.showCreateTeamBtn.click();
});

// ── Projects ───────────────────────────────────────────────────────────
const PROJ_COLORS = [
  "linear-gradient(135deg,#7c3aed,#5b21b6)",
  "linear-gradient(135deg,#2563eb,#1d4ed8)",
  "linear-gradient(135deg,#059669,#065f46)",
  "linear-gradient(135deg,#d97706,#92400e)",
  "linear-gradient(135deg,#dc2626,#991b1b)",
  "linear-gradient(135deg,#0891b2,#0e7490)",
  "linear-gradient(135deg,#9333ea,#6b21a8)",
];

function projectColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xfffffff;
  return PROJ_COLORS[h % PROJ_COLORS.length];
}

async function loadProjects() {
  setContent(el.projectsList, skeletonHTML(3));
  try {
    const projects = await api("GET", `/teams/${currentTeamId}/projects`);
    el.projectsCount.textContent = projects.length;

    if (projects.length === 0) {
      setContent(
        el.projectsList,
        `
        <div class="panel-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <p>No projects yet.<br>Create your first project to get started.</p>
        </div>`,
      );
      return;
    }

    const html = projects
      .map((p) => {
        const initials = p.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const date = p.created_at ? fmtDate(p.created_at) : "";
        const grad = projectColor(p.name);
        return `
        <div class="project-card">
          <div class="project-avatar" style="background:${grad}">${initials}</div>
          <div class="project-info">
            <div class="project-name">${escHtml(p.name)}</div>
            <div class="project-meta">
              By <strong>${escHtml(p.created_by || "Unknown")}</strong>${date ? " · " + date : ""}
            </div>
          </div>
          <span class="status-chip status-active">Active</span>
        </div>`;
      })
      .join("");

    setContent(el.projectsList, html);
  } catch (err) {
    setContent(
      el.projectsList,
      `<div class="panel-empty"><p style="color:var(--red)">Failed to load projects</p></div>`,
    );
  }
}

el.showCreateProjectBtn.addEventListener("click", () => {
  el.createProjectForm.classList.remove("hidden");
  el.newProjectName.focus();
});
el.cancelCreateProject.addEventListener("click", () => {
  el.createProjectForm.classList.add("hidden");
  el.newProjectName.value = "";
  el.newProjectDesc.value = "";
});
el.createProjectSubmit.addEventListener("click", async () => {
  const name = el.newProjectName.value.trim();
  const description = el.newProjectDesc.value.trim();
  if (!name) {
    el.newProjectName.focus();
    return;
  }
  try {
    el.createProjectSubmit.disabled = true;
    el.createProjectSubmit.textContent = "Creating…";
    await api("POST", `/teams/${currentTeamId}/projects`, {
      name,
      description,
      requesterId: currentUserId,
    });
    el.newProjectName.value = "";
    el.newProjectDesc.value = "";
    el.createProjectForm.classList.add("hidden");
    toast(`Project "${name}" created!`);
    loadProjects();
    loadAuditLog();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    el.createProjectSubmit.disabled = false;
    el.createProjectSubmit.textContent = "Create Project";
  }
});

// ── Members ────────────────────────────────────────────────────────────
async function loadMembers() {
  setContent(el.membersList, skeletonHTML(2));
  try {
    const members = await api("GET", `/teams/${currentTeamId}/members`);
    el.membersCount.textContent = members.length;

    if (members.length === 0) {
      setContent(
        el.membersList,
        `<div class="panel-empty"><p>No members found.</p></div>`,
      );
      return;
    }

    const html = members
      .map((m) => {
        const role = m.role || "member";
        const label =
          role === "owner"
            ? "Team Owner"
            : role === "admin"
              ? "Administrator"
              : "Member";
        const initial = (m.user_id || "?").charAt(0).toUpperCase();
        return `
        <div class="member-card">
          <div class="member-avatar">${initial}</div>
          <div class="member-info">
            <div class="member-id">${escHtml(m.user_id)}</div>
            <div class="member-label">${label}</div>
          </div>
          <span class="role-badge role-${role}">${role}</span>
        </div>`;
      })
      .join("");

    setContent(el.membersList, html);
  } catch (err) {
    setContent(
      el.membersList,
      `<div class="panel-empty"><p style="color:var(--red)">Failed to load members</p></div>`,
    );
  }
}

el.showInviteBtn.addEventListener("click", () => {
  el.inviteForm.classList.remove("hidden");
  el.inviteEmail.focus();
});
el.cancelInvite.addEventListener("click", () => {
  el.inviteForm.classList.add("hidden");
  el.inviteEmail.value = "";
});
el.inviteSubmit.addEventListener("click", async () => {
  const email = el.inviteEmail.value.trim();
  const role = el.inviteRole.value;
  if (!email) {
    el.inviteEmail.focus();
    return;
  }
  try {
    el.inviteSubmit.disabled = true;
    el.inviteSubmit.textContent = "Sending…";
    const res = await api("POST", `/teams/${currentTeamId}/invite`, {
      email,
      role,
      requesterId: currentUserId,
    });
    el.inviteEmail.value = "";
    el.inviteForm.classList.add("hidden");

    // Show email modal
    $("email-to-address").textContent = `To: ${email}`;
    $("email-token-link").textContent =
      `http://localhost:3000/invitations/${res.invitationId}/respond`;
    $("email-modal").classList.remove("hidden");

    toast(`Invitation sent to ${email}`);
    loadAuditLog();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    el.inviteSubmit.disabled = false;
    el.inviteSubmit.textContent = "Send Invite";
  }
});

$("close-email-btn").addEventListener("click", () =>
  $("email-modal").classList.add("hidden"),
);
$("email-modal").addEventListener("click", (e) => {
  if (e.target === $("email-modal")) $("email-modal").classList.add("hidden");
});

// ── Audit Log ──────────────────────────────────────────────────────────
const ACTION_META = {
  create: { label: "Team Created", dot: "dot-create" },
  create_project: { label: "Project Created", dot: "dot-project" },
  invite: { label: "Member Invited", dot: "dot-invite" },
  join: { label: "Member Joined", dot: "dot-join" },
  remove_member: { label: "Member Removed", dot: "dot-remove" },
  add_role: { label: "Role Assigned", dot: "dot-invite" },
  update_permissions: { label: "Permissions Updated", dot: "dot-project" },
};

async function loadAuditLog() {
  setContent(el.auditList, skeletonHTML(3));
  try {
    const logs = await api("GET", `/teams/${currentTeamId}/audit?limit=20`);

    if (logs.length === 0) {
      setContent(
        el.auditList,
        `<div class="panel-empty"><p>No activity recorded yet.</p></div>`,
      );
      return;
    }

    const rows = logs
      .map((l) => {
        const meta = ACTION_META[l.action] || {
          label: l.action,
          dot: "dot-default",
        };
        const actor = l.performed_by || "—";
        const time = l.at ? fmtDateTime(l.at) : "—";

        const details = l.details
          ? Object.entries(l.details)
              .filter(([k]) => k !== "emailHash" && k !== "token")
              .map(([k, v]) => `${k}: <strong>${escHtml(String(v))}</strong>`)
              .join(" · ")
          : "—";

        return `
        <tr>
          <td>
            <div class="audit-action">
              <span class="audit-dot ${meta.dot}"></span>
              ${meta.label}
            </div>
          </td>
          <td><span class="audit-actor">${escHtml(actor)}</span></td>
          <td><span class="audit-detail">${details}</span></td>
          <td><span class="audit-time">${time}</span></td>
        </tr>`;
      })
      .join("");

    setContent(
      el.auditList,
      `
      <table class="audit-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Performed By</th>
            <th>Details</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`,
    );
  } catch (err) {
    setContent(
      el.auditList,
      `<div class="panel-empty"><p style="color:var(--red)">Failed to load activity log</p></div>`,
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function skeletonHTML(n) {
  return `<div class="skeleton-list">${Array(n).fill('<div class="skeleton-item"></div>').join("")}</div>`;
}
