// ── State ──────────────────────────────────────────────────────────────
let currentUserId = null;
let currentTeamId = null;
let currentTeamName = null;
let currentProjectId = null;
let currentProjectName = null;
let currentTaskId = null;
let activeMembersTab = "members"; // "members" or "invites"

// ── Predefined & Dynamic Identity Switcher Helpers ─────────────────────
const DEFAULT_USERS = ["user-123", "alice", "bob", "charlie", "david"];
function getKnownUsers() {
  const stored = localStorage.getItem("collab_known_users");
  if (!stored) {
    localStorage.setItem("collab_known_users", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(stored);
}
function addKnownUser(uid) {
  const users = getKnownUsers();
  if (!users.includes(uid)) {
    users.push(uid);
    localStorage.setItem("collab_known_users", JSON.stringify(users));
  }
}

// ── Selectors ─────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const screens = { login: $("login-screen"), dashboard: $("dashboard-screen") };

const el = {
  loginForm: $("login-form"),
  userIdInput: $("user-id-input"),
  displayUserId: $("display-user-id"),
  avatarInitial: $("avatar-initial"),
  logoutBtn: $("logout-btn"),
  userSwitcher: $("user-switcher"),

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

  dashboardView: $("dashboard-view"),
  projectsList: $("projects-list"),
  projectsCount: $("projects-count"),
  showCreateProjectBtn: $("show-create-project-btn"),
  cancelCreateProject: $("cancel-create-project"),
  createProjectForm: $("create-project-form"),
  newProjectName: $("new-project-name"),
  newProjectDesc: $("new-project-desc"),
  createProjectSubmit: $("create-project-submit"),

  // Members & Access
  btnTabMembers: $("btn-tab-members"),
  btnTabInvites: $("btn-tab-invites"),
  membersList: $("members-list"),
  invitationsList: $("invitations-list"),
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

  // Project tasks view
  projectView: $("project-view"),
  backToDashboardBtn: $("back-to-dashboard-btn"),
  currentProjectTitle: $("current-project-title"),
  currentProjectDesc: $("current-project-desc"),
  showCreateTaskBtn: $("show-create-task-btn"),
  createTaskForm: $("create-task-form"),
  newTaskTitle: $("new-task-title"),
  newTaskAssignee: $("new-task-assignee"),
  newTaskDesc: $("new-task-desc"),
  createTaskSubmit: $("create-task-submit"),
  cancelCreateTask: $("cancel-create-task"),
  tasksTodo: $("tasks-todo"),
  tasksInProgress: $("tasks-in-progress"),
  tasksDone: $("tasks-done"),
  countTodo: $("count-todo"),
  countInProgress: $("count-in-progress"),
  countDone: $("count-done"),

  // Settings Modal
  showTeamSettingsBtn: $("show-team-settings-btn"),
  settingsModal: $("settings-modal"),
  settingsTeamName: $("settings-team-name"),
  settingsTeamDesc: $("settings-team-desc"),
  saveTeamDetailsBtn: $("save-team-details-btn"),
  savePermissionsMatrixBtn: $("save-permissions-matrix-btn"),
  deleteTeamBtn: $("delete-team-btn"),
  closeSettingsBtn: $("close-settings-btn"),

  // Task Details Modal
  taskDetailsModal: $("task-details-modal"),
  detailTaskTitle: $("detail-task-title"),
  detailTaskCreated: $("detail-task-created"),
  detailTaskDesc: $("detail-task-desc"),
  detailTaskStatus: $("detail-task-status"),
  detailTaskAssignee: $("detail-task-assignee"),
  saveTaskUpdatesBtn: $("save-task-updates-btn"),
  deleteTaskBtn: $("delete-task-btn"),
  closeTaskDetailsBtn: $("close-task-details-btn"),
  taskCommentsList: $("task-comments-list"),
  newCommentInput: $("new-comment-input"),
  submitCommentBtn: $("submit-comment-btn"),

  // Simulated Inbox Modal
  showInboxBtn: $("show-inbox-btn"),
  inboxModal: $("inbox-modal"),
  inboxInvitesList: $("inbox-invites-list"),
  closeInboxBtn: $("close-inbox-btn"),
};

// ── API ────────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  let url = path;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) {
    if (!body.requesterId && currentUserId) body.requesterId = currentUserId;
    opts.body = JSON.stringify(body);
  } else if ((method === "GET" || method === "DELETE") && currentUserId) {
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
  if (el) el.innerHTML = html;
}

// ── Reset workspace (called on login/logout) ────────────────────────────
function resetWorkspace() {
  currentTeamId = null;
  currentTeamName = null;
  currentProjectId = null;
  currentProjectName = null;
  currentTaskId = null;

  // Return to dashboard grid, hide project view
  el.projectView.classList.add("hidden");
  el.dashboardView.classList.remove("hidden");

  // Hide team view, show empty state
  el.teamView.classList.add("hidden");
  el.emptyState.classList.remove("hidden");
  // Clear sidebar team list
  el.teamsList.innerHTML = "";
  // Clear all panels
  setContent(el.projectsList, skeletonHTML(3));
  setContent(el.membersList, skeletonHTML(2));
  setContent(el.invitationsList, skeletonHTML(1));
  setContent(el.auditList, skeletonHTML(3));
  el.projectsCount.textContent = "0";
  el.membersCount.textContent = "0";

  // Close any open inline forms
  el.createTeamForm.classList.add("hidden");
  el.createProjectForm.classList.add("hidden");
  el.inviteForm.classList.add("hidden");
  el.createTaskForm.classList.add("hidden");

  // Remove active state from all nav items
  document
    .querySelectorAll(".team-nav-item")
    .forEach((n) => n.classList.remove("active"));
}

// ── Identity switcher populator ────────────────────────────────────────
function refreshUserSwitcher() {
  const users = getKnownUsers();
  el.userSwitcher.innerHTML = users
    .map(
      (u) =>
        `<option value="${u}" ${u === currentUserId ? "selected" : ""}>${u}</option>`,
    )
    .join("");
}

el.userSwitcher.addEventListener("change", async (e) => {
  const uid = e.target.value;
  currentUserId = uid;
  el.displayUserId.textContent = uid;
  el.avatarInitial.textContent = uid.charAt(0).toUpperCase();

  // Close modals
  el.settingsModal.classList.add("hidden");
  el.taskDetailsModal.classList.add("hidden");
  el.inboxModal.classList.add("hidden");

  let exists = false;
  if (currentTeamId) {
    try {
      const teams = await api("GET", `/users/${currentUserId}/teams`);
      exists = teams.some((t) => t.id === currentTeamId);
    } catch (err) {
      exists = false;
    }
  }

  if (!exists) {
    resetWorkspace();
    await loadTeams();
  } else {
    await loadTeams();
    refreshAll();
  }
  toast(`Switched to identity: ${uid}`);
});

// ── Auth ───────────────────────────────────────────────────────────────
el.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const uid = el.userIdInput.value.trim();
  if (!uid) return;
  currentUserId = uid;
  el.displayUserId.textContent = uid;
  el.avatarInitial.textContent = uid.charAt(0).toUpperCase();
  addKnownUser(uid);
  refreshUserSwitcher();
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

async function selectTeam(team, navEl) {
  currentTeamId = team.id;
  currentTeamName = team.name;
  currentProjectId = null;
  currentProjectName = null;

  document
    .querySelectorAll(".team-nav-item")
    .forEach((n) => n.classList.remove("active"));
  if (navEl) navEl.classList.add("active");

  el.emptyState.classList.add("hidden");
  el.teamView.classList.remove("hidden");

  // Swap back to dashboard view if project view was open
  el.projectView.classList.add("hidden");
  el.dashboardView.classList.remove("hidden");

  const initials = team.name.slice(0, 2).toUpperCase();
  el.wsTeamIcon.textContent = initials.charAt(0);
  el.teamTitle.textContent = team.name;
  el.teamDescription.textContent =
    team.description && team.description.trim()
      ? team.description
      : `Owner: ${team.owner_id || currentUserId}`;

  // Hide or show Settings cog button based on ownership
  const isOwner = String(team.owner_id) === String(currentUserId);
  if (isOwner) {
    el.showTeamSettingsBtn.classList.remove("hidden");
  } else {
    el.showTeamSettingsBtn.classList.add("hidden");
  }

  // Reset Members tab
  activeMembersTab = "members";
  el.btnTabMembers.classList.add("active");
  el.btnTabInvites.classList.remove("active");
  el.btnTabMembers.style.borderBottomColor = "var(--blue)";
  el.btnTabInvites.style.borderBottomColor = "transparent";
  el.membersList.classList.remove("hidden");
  el.invitationsList.classList.add("hidden");

  refreshAll();
}

function refreshAll() {
  if (!currentTeamId) return;
  loadProjects();
  if (activeMembersTab === "members") {
    loadMembers();
  } else {
    loadInvitations();
  }
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
    const res = await api("POST", "/teams", { name, requesterId: currentUserId });
    el.newTeamName.value = "";
    el.createTeamForm.classList.add("hidden");
    toast("Team created!");
    if (res && res.id) {
      currentTeamId = res.id;
    }
    await loadTeams();
    if (res && res.id) {
      selectTeam({ id: res.id, name });
    }
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

    // Load team to check for edit/delete authorization
    const teams = await api("GET", `/users/${currentUserId}/teams`);
    const thisTeam = teams.find((t) => t.id === currentTeamId);
    const isOwnerOrAdmin =
      thisTeam && String(thisTeam.owner_id) === String(currentUserId); // Simple toggle check

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

        let actionsHtml = "";
        // Show edit/delete project actions if owner or admin
        actionsHtml = `
          <div class="project-actions">
            <button class="project-btn-icon edit-project-btn" data-id="${p.id}" data-name="${escHtml(p.name)}" data-desc="${escHtml(p.description || "")}" title="Edit Project">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button class="project-btn-icon delete-project-btn" data-id="${p.id}" title="Delete Project" style="color:#f87171;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        `;

        return `
        <div class="project-card" data-project-id="${p.id}" data-project-name="${escHtml(p.name)}" data-project-desc="${escHtml(p.description || "")}" style="cursor:pointer;">
          <div class="project-avatar" style="background:${grad}">${initials}</div>
          <div class="project-info">
            <div class="project-name">${escHtml(p.name)}</div>
            <div class="project-meta">
              By <strong>${escHtml(p.created_by || "Unknown")}</strong>${date ? " · " + date : ""}
            </div>
          </div>
          ${actionsHtml}
        </div>`;
      })
      .join("");

    setContent(el.projectsList, html);

    // Click handler for project cards (switches to tasks board)
    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".project-btn-icon")) return; // Don't trigger if clicked actions
        const pid = card.dataset.projectId;
        const pname = card.dataset.projectName;
        const pdesc = card.dataset.projectDesc;
        openProjectTasks(pid, pname, pdesc);
      });
    });

    // Project Edit action handler
    document.querySelectorAll(".edit-project-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const pid = btn.dataset.id;
        const currentName = btn.dataset.name;
        const currentDesc = btn.dataset.desc;
        const newName = prompt("Edit Project Name:", currentName);
        if (newName === null) return; // cancelled
        if (newName.trim() === "") {
          toast("Project name cannot be empty", "error");
          return;
        }
        const newDesc = prompt("Edit Project Description:", currentDesc);
        try {
          await api("PATCH", `/teams/${currentTeamId}/projects/${pid}`, {
            name: newName.trim(),
            description: newDesc ? newDesc.trim() : "",
          });
          toast("Project updated successfully!");
          loadProjects();
          loadAuditLog();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });

    // Project Delete action handler
    document.querySelectorAll(".delete-project-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const pid = btn.dataset.id;
        if (
          !confirm(
            "Are you sure you want to permanently delete this project? All associated tasks and comments will be deleted.",
          )
        )
          return;
        try {
          await api("DELETE", `/teams/${currentTeamId}/projects/${pid}`);
          toast("Project deleted successfully");
          loadProjects();
          loadAuditLog();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });
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

// ── Members Panel Tab Handlers ──────────────────────────────────────────
el.btnTabMembers.addEventListener("click", () => {
  activeMembersTab = "members";
  el.btnTabMembers.classList.add("active");
  el.btnTabInvites.classList.remove("active");
  el.btnTabMembers.style.borderBottomColor = "var(--blue)";
  el.btnTabInvites.style.borderBottomColor = "transparent";
  el.membersList.classList.remove("hidden");
  el.invitationsList.classList.add("hidden");
  loadMembers();
});

el.btnTabInvites.addEventListener("click", () => {
  activeMembersTab = "invites";
  el.btnTabInvites.classList.add("active");
  el.btnTabMembers.classList.remove("active");
  el.btnTabInvites.style.borderBottomColor = "var(--blue)";
  el.btnTabMembers.style.borderBottomColor = "transparent";
  el.invitationsList.classList.remove("hidden");
  el.membersList.classList.add("hidden");
  loadInvitations();
});

// ── Members & Access ───────────────────────────────────────────────────
async function loadMembers() {
  setContent(el.membersList, skeletonHTML(2));
  try {
    const members = await api("GET", `/teams/${currentTeamId}/members`);
    el.membersCount.textContent = members.length;

    // Fetch team details to verify owner state
    const teams = await api("GET", `/users/${currentUserId}/teams`);
    const thisTeam = teams.find((t) => t.id === currentTeamId);
    const isOwner =
      thisTeam && String(thisTeam.owner_id) === String(currentUserId);

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
        const isThisMemberOwner = role === "owner";
        const label =
          role === "owner"
            ? "Team Owner"
            : role === "admin"
              ? "Administrator"
              : role === "viewer"
                ? "Viewer"
                : "Member";
        const initial = (m.user_id || "?").charAt(0).toUpperCase();

        let actionsHtml = "";
        // Show role selection dropdown & remove member button only if current user is owner
        // and target user is not owner
        if (
          isOwner &&
          !isThisMemberOwner &&
          String(m.user_id) !== String(currentUserId)
        ) {
          actionsHtml = `
            <div class="member-card-actions">
              <select class="member-role-select" data-user="${m.user_id}">
                <option value="viewer" ${role === "viewer" ? "selected" : ""}>Viewer</option>
                <option value="member" ${role === "member" ? "selected" : ""}>Member</option>
                <option value="admin" ${role === "admin" ? "selected" : ""}>Admin</option>
              </select>
              <button class="btn-icon-danger remove-member-btn" data-user="${m.user_id}" title="Remove member">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          `;
        } else {
          actionsHtml = `<span class="role-badge role-${role}">${role}</span>`;
        }

        return `
        <div class="member-card">
          <div class="member-avatar">${initial}</div>
          <div class="member-info">
            <div class="member-id">${escHtml(m.user_id)}</div>
            <div class="member-label">${label}</div>
          </div>
          ${actionsHtml}
        </div>`;
      })
      .join("");

    setContent(el.membersList, html);

    // Event listener for Role changes
    document.querySelectorAll(".member-role-select").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        const uid = e.target.dataset.user;
        const newRole = e.target.value;
        try {
          await api("POST", `/teams/${currentTeamId}/role`, {
            memberId: uid,
            role: newRole,
          });
          toast(`Updated ${uid} role to ${newRole}`);
          loadMembers();
          loadAuditLog();
        } catch (err) {
          toast(err.message, "error");
          loadMembers();
        }
      });
    });

    // Event listener for Member deletion
    document.querySelectorAll(".remove-member-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const uid = e.currentTarget.dataset.user;
        if (!confirm(`Are you sure you want to remove ${uid} from this team?`))
          return;
        try {
          await api("DELETE", `/teams/${currentTeamId}/member/${uid}`);
          toast(`Removed ${uid} from the team`);
          loadMembers();
          loadAuditLog();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });
  } catch (err) {
    setContent(
      el.membersList,
      `<div class="panel-empty"><p style="color:var(--red)">Failed to load members</p></div>`,
    );
  }
}

async function loadInvitations() {
  setContent(el.invitationsList, skeletonHTML(1));
  try {
    const invites = await api("GET", `/teams/${currentTeamId}/invitations`);

    // Check if current user is owner
    const teams = await api("GET", `/users/${currentUserId}/teams`);
    const thisTeam = teams.find((t) => t.id === currentTeamId);
    const isOwner =
      thisTeam && String(thisTeam.owner_id) === String(currentUserId);

    if (invites.length === 0) {
      setContent(
        el.invitationsList,
        `<div class="panel-empty"><p>No pending invitations.</p></div>`,
      );
      return;
    }

    const html = invites
      .map((i) => {
        let cancelBtn = "";
        if (isOwner && i.status === "pending") {
          cancelBtn = `
          <button class="btn-icon-danger cancel-invite-btn" data-token="${i.token}" title="Cancel invitation">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        `;
        }
        const date = fmtDate(i.created_at);
        return `
        <div class="member-card" style="padding: 10px 18px;">
          <div class="member-avatar" style="background:rgba(217,119,6,0.12); color:var(--amber); font-weight:bold;">@</div>
          <div class="member-info">
            <div class="member-id" style="font-size:0.85rem; font-weight:600;">${escHtml(i.email || "Invited user")}</div>
            <div class="member-label">${i.status.toUpperCase()} · Invited on ${date}</div>
          </div>
          <div class="member-card-actions" style="margin-left:auto; display:flex; gap:8px; align-items:center;">
            <span class="role-badge" style="background:rgba(217,119,6,0.08); color:var(--amber); border:1px solid rgba(217,119,6,0.2);">${i.status}</span>
            ${cancelBtn}
          </div>
        </div>
      `;
      })
      .join("");

    setContent(el.invitationsList, html);

    // Event listener for cancelling invitation
    document.querySelectorAll(".cancel-invite-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const token = e.currentTarget.dataset.token;
        if (!confirm("Are you sure you want to cancel this invitation?"))
          return;
        try {
          await api("DELETE", `/teams/${currentTeamId}/invitations/${token}`);
          toast("Invitation cancelled");
          loadInvitations();
          loadAuditLog();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });
  } catch (err) {
    setContent(
      el.invitationsList,
      `<div class="panel-empty"><p style="color:var(--red)">Failed to load invitations</p></div>`,
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

    // Show email modal with mock details
    $("email-to-address").textContent = `To: ${email}`;
    $("email-token-link").textContent =
      `http://localhost:3000/invitations/${res.invitationId}/respond`;
    $("email-modal").classList.remove("hidden");

    toast(`Invitation sent to ${email}`);

    if (activeMembersTab === "invites") {
      loadInvitations();
    }
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
  update_project: { label: "Project Updated", dot: "dot-project" },
  delete_project: { label: "Project Deleted", dot: "dot-remove" },
  invite: { label: "Member Invited", dot: "dot-invite" },
  join: { label: "Member Joined", dot: "dot-join" },
  remove_member: { label: "Member Removed", dot: "dot-remove" },
  add_role: { label: "Role Assigned", dot: "dot-invite" },
  update_permissions: { label: "Permissions Updated", dot: "dot-project" },
  update_team: { label: "Team Updated", dot: "dot-project" },
  delete_team: { label: "Team Deleted", dot: "dot-remove" },
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

// ── Project Kanban Tasks View ──────────────────────────────────────────
async function openProjectTasks(projectId, projectName, projectDesc) {
  currentProjectId = projectId;
  currentProjectName = projectName;

  el.currentProjectTitle.textContent = projectName;
  el.currentProjectDesc.textContent =
    projectDesc && projectDesc.trim()
      ? projectDesc
      : "No project description provided.";

  // Swap views
  el.dashboardView.classList.add("hidden");
  el.projectView.classList.remove("hidden");

  // Reset task create form
  el.createTaskForm.classList.add("hidden");
  el.newTaskTitle.value = "";
  el.newTaskDesc.value = "";

  loadTasks();
}

el.backToDashboardBtn.addEventListener("click", () => {
  currentProjectId = null;
  currentProjectName = null;
  el.projectView.classList.add("hidden");
  el.dashboardView.classList.remove("hidden");
  loadProjects();
});

// Inline Task Form toggles
el.showCreateTaskBtn.addEventListener("click", async () => {
  el.createTaskForm.classList.remove("hidden");
  el.newTaskTitle.focus();

  // Load members into assignee dropdown
  try {
    const members = await api("GET", `/teams/${currentTeamId}/members`);
    el.newTaskAssignee.innerHTML =
      `<option value="">Unassigned</option>` +
      members
        .map(
          (m) =>
            `<option value="${escHtml(m.user_id)}">${escHtml(m.user_id)}</option>`,
        )
        .join("");
  } catch (e) {
    el.newTaskAssignee.innerHTML = `<option value="">Unassigned</option>`;
  }
});

el.cancelCreateTask.addEventListener("click", () => {
  el.createTaskForm.classList.add("hidden");
  el.newTaskTitle.value = "";
  el.newTaskDesc.value = "";
});

el.createTaskSubmit.addEventListener("click", async () => {
  const title = el.newTaskTitle.value.trim();
  const description = el.newTaskDesc.value.trim();
  const assignedTo = el.newTaskAssignee.value || null;
  if (!title) {
    el.newTaskTitle.focus();
    return;
  }
  try {
    el.createTaskSubmit.disabled = true;
    el.createTaskSubmit.textContent = "Creating...";
    await api(
      "POST",
      `/teams/${currentTeamId}/projects/${currentProjectId}/tasks`,
      {
        title,
        description,
        assignedTo,
        requesterId: currentUserId,
      },
    );
    el.newTaskTitle.value = "";
    el.newTaskDesc.value = "";
    el.createTaskForm.classList.add("hidden");
    toast(`Task "${title}" created!`);
    loadTasks();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    el.createTaskSubmit.disabled = false;
    el.createTaskSubmit.textContent = "Create Task";
  }
});

async function loadTasks() {
  setContent(el.tasksTodo, skeletonHTML(1));
  setContent(el.tasksInProgress, skeletonHTML(1));
  setContent(el.tasksDone, skeletonHTML(1));

  try {
    const tasks = await api(
      "GET",
      `/teams/${currentTeamId}/projects/${currentProjectId}/tasks`,
    );

    const todo = tasks.filter((t) => t.status === "todo");
    const progress = tasks.filter((t) => t.status === "in_progress");
    const done = tasks.filter((t) => t.status === "done");

    el.countTodo.textContent = todo.length;
    el.countInProgress.textContent = progress.length;
    el.countDone.textContent = done.length;

    const renderColumn = (colTasks) => {
      if (colTasks.length === 0) {
        return `<div style="text-align:center; padding: 25px 10px; font-size:0.75rem; color:var(--text-3); font-style:italic;">Empty</div>`;
      }
      return colTasks
        .map((t) => {
          const desc =
            t.description && t.description.trim() ? escHtml(t.description) : "";
          const descHtml = desc ? `<p class="task-desc-short">${desc}</p>` : "";
          const assigneeHtml = t.assigned_to
            ? `<span class="task-assignee">${escHtml(t.assigned_to)}</span>`
            : `<span class="task-assignee" style="opacity:0.4;">Unassigned</span>`;
          return `
          <div class="task-card" data-id="${t.id}">
            <div class="task-title-text">${escHtml(t.title)}</div>
            ${descHtml}
            <div class="task-foot">
              ${assigneeHtml}
              <span class="task-creator">By ${escHtml(t.created_by)}</span>
            </div>
          </div>
        `;
        })
        .join("");
    };

    setContent(el.tasksTodo, renderColumn(todo));
    setContent(el.tasksInProgress, renderColumn(progress));
    setContent(el.tasksDone, renderColumn(done));

    // Card click event listeners
    document.querySelectorAll(".task-card").forEach((card) => {
      card.addEventListener("click", async () => {
        const tid = card.dataset.id;
        const task = tasks.find((t) => String(t.id) === String(tid));
        if (task) openTaskDetailsModal(task);
      });
    });
  } catch (err) {
    const errMsg = `<div style="text-align:center; color:var(--red); padding:10px;">Error</div>`;
    setContent(el.tasksTodo, errMsg);
    setContent(el.tasksInProgress, errMsg);
    setContent(el.tasksDone, errMsg);
  }
}

// ── Task Details Modal & Comments ──────────────────────────────────────
async function openTaskDetailsModal(task) {
  currentTaskId = task.id;
  el.detailTaskTitle.textContent = task.title;
  el.detailTaskCreated.textContent = `Created by ${task.created_by} on ${fmtDate(task.created_at)}`;
  el.detailTaskDesc.textContent =
    task.description && task.description.trim()
      ? task.description
      : "No description provided.";
  el.detailTaskStatus.value = task.status;

  // Populate assignees in dropdown and select current
  try {
    const members = await api("GET", `/teams/${currentTeamId}/members`);
    el.detailTaskAssignee.innerHTML =
      `<option value="">Unassigned</option>` +
      members
        .map(
          (m) =>
            `<option value="${escHtml(m.user_id)}" ${String(task.assigned_to) === String(m.user_id) ? "selected" : ""}>${escHtml(m.user_id)}</option>`,
        )
        .join("");
  } catch (e) {
    el.detailTaskAssignee.innerHTML = `<option value="">Unassigned</option>`;
  }

  el.newCommentInput.value = "";
  el.taskDetailsModal.classList.remove("hidden");
  loadComments();
}

el.closeTaskDetailsBtn.addEventListener("click", () =>
  el.taskDetailsModal.classList.add("hidden"),
);

// Save changes to status or assignee
el.saveTaskUpdatesBtn.addEventListener("click", async () => {
  const status = el.detailTaskStatus.value;
  const assignedTo = el.detailTaskAssignee.value || null;
  try {
    await api(
      "PATCH",
      `/teams/${currentTeamId}/projects/${currentProjectId}/tasks/${currentTaskId}`,
      {
        status,
        assignedTo,
      },
    );
    toast("Task settings saved!");
    el.taskDetailsModal.classList.add("hidden");
    loadTasks();
  } catch (err) {
    toast(err.message, "error");
  }
});

// Delete task
el.deleteTaskBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to permanently delete this task?"))
    return;
  try {
    await api(
      "DELETE",
      `/teams/${currentTeamId}/projects/${currentProjectId}/tasks/${currentTaskId}`,
    );
    toast("Task deleted successfully");
    el.taskDetailsModal.classList.add("hidden");
    loadTasks();
  } catch (err) {
    toast(err.message, "error");
  }
});

// Comments Listing & Posting
async function loadComments() {
  setContent(
    el.taskCommentsList,
    `<div style="text-align:center; padding:10px; font-size:0.75rem; color:var(--text-3);">Loading comments...</div>`,
  );
  try {
    const comments = await api(
      "GET",
      `/tasks/${currentTaskId}/comments?teamId=${currentTeamId}`,
    );
    if (comments.length === 0) {
      setContent(
        el.taskCommentsList,
        `<div style="text-align:center; padding:15px; font-size:0.72rem; color:var(--text-3); font-style:italic;">No comments yet.</div>`,
      );
      return;
    }

    // Check user role for deletion checks
    const teams = await api("GET", `/users/${currentUserId}/teams`);
    const thisTeam = teams.find((t) => t.id === currentTeamId);
    const isOwner =
      thisTeam && String(thisTeam.owner_id) === String(currentUserId);

    const html = comments
      .map((c) => {
        const time = fmtDateTime(c.created_at);
        let deleteBtn = "";

        // Author of comment or Team Owner can delete comments
        if (String(c.created_by) === String(currentUserId) || isOwner) {
          deleteBtn = `
          <button class="btn-icon-danger delete-comment-btn" data-id="${c.id}" style="padding:2px;" title="Delete comment">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        `;
        }

        return `
        <div class="comment-card">
          <div class="comment-meta">
            <span class="comment-author">${escHtml(c.created_by)}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="comment-time">${time}</span>
              ${deleteBtn}
            </div>
          </div>
          <div class="comment-text">${escHtml(c.content)}</div>
        </div>
      `;
      })
      .join("");

    setContent(el.taskCommentsList, html);

    // Comment delete click listener
    document.querySelectorAll(".delete-comment-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const cid = e.currentTarget.dataset.id;
        if (!confirm("Delete comment?")) return;
        try {
          await api("DELETE", `/comments/${cid}`, { teamId: currentTeamId });
          toast("Comment deleted");
          loadComments();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });
  } catch (e) {
    setContent(
      el.taskCommentsList,
      `<div style="text-align:center; color:var(--red); padding:10px;">Error loading comments</div>`,
    );
  }
}

el.submitCommentBtn.addEventListener("click", async () => {
  const content = el.newCommentInput.value.trim();
  if (!content) return;
  try {
    await api("POST", `/tasks/${currentTaskId}/comments`, {
      content,
      teamId: currentTeamId,
      requesterId: currentUserId,
    });
    el.newCommentInput.value = "";
    loadComments();
  } catch (err) {
    toast(err.message, "error");
  }
});

el.newCommentInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    el.submitCommentBtn.click();
  }
});

// ── Team Settings Modal ────────────────────────────────────────────────
el.showTeamSettingsBtn.addEventListener("click", async () => {
  el.settingsTeamName.value = currentTeamName;
  el.settingsTeamDesc.value = el.teamDescription.textContent.startsWith(
    "Owner:",
  )
    ? ""
    : el.teamDescription.textContent;

  // Open Settings Modal
  el.settingsModal.classList.remove("hidden");

  // Populate Permission Matrix settings
  try {
    const permissions = await api("GET", `/teams/${currentTeamId}/permissions`);
    el.savePermissionsMatrixBtn.disabled = false;
    $("matrix-invite").value = permissions.invite || "owner";
    $("matrix-create-project").value = permissions.createProject || "owner";
    $("matrix-delete-project").value = permissions.deleteProject || "owner";
  } catch (e) {
    // If permissions not set yet
    $("matrix-invite").value = "owner";
    $("matrix-create-project").value = "owner";
    $("matrix-delete-project").value = "owner";
  }
});

el.closeSettingsBtn.addEventListener("click", () =>
  el.settingsModal.classList.add("hidden"),
);

// Save Team details (name/desc)
el.saveTeamDetailsBtn.addEventListener("click", async () => {
  const name = el.settingsTeamName.value.trim();
  const description = el.settingsTeamDesc.value.trim();
  if (!name) {
    toast("Team name cannot be empty", "error");
    return;
  }
  try {
    el.saveTeamDetailsBtn.disabled = true;
    await api("PATCH", `/teams/${currentTeamId}`, { name, description });
    toast("Team details updated!");
    currentTeamName = name;
    el.teamTitle.textContent = name;
    el.teamDescription.textContent = description || `Owner: ${currentUserId}`;
    await loadTeams();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    el.saveTeamDetailsBtn.disabled = false;
  }
});

// Save Custom Permissions Matrix
el.savePermissionsMatrixBtn.addEventListener("click", async () => {
  const invite = $("matrix-invite").value;
  const createProject = $("matrix-create-project").value;
  const deleteProject = $("matrix-delete-project").value;
  try {
    el.savePermissionsMatrixBtn.disabled = true;
    await api("PATCH", `/teams/${currentTeamId}/permissions`, {
      permissionMatrix: { invite, createProject, deleteProject },
    });
    toast("Permissions matrix updated successfully!");
    el.settingsModal.classList.add("hidden");
    loadAuditLog();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    el.savePermissionsMatrixBtn.disabled = false;
  }
});

// Delete team
el.deleteTeamBtn.addEventListener("click", async () => {
  if (
    !confirm(
      "WARNING: Are you absolutely sure you want to delete this team? All projects, tasks, members, and audit logs will be permanently deleted!",
    )
  )
    return;
  try {
    el.deleteTeamBtn.disabled = true;
    await api("DELETE", `/teams/${currentTeamId}`);
    toast("Team deleted successfully!");
    el.settingsModal.classList.add("hidden");
    resetWorkspace();
    await loadTeams();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    el.deleteTeamBtn.disabled = false;
  }
});

// ── Simulated Inbox ────────────────────────────────────────────────────
el.showInboxBtn.addEventListener("click", async () => {
  loadInboxInvitations();
  el.inboxModal.classList.remove("hidden");
});

el.closeInboxBtn.addEventListener("click", () =>
  el.inboxModal.classList.add("hidden"),
);

async function loadInboxInvitations() {
  setContent(
    el.inboxInvitesList,
    `<div style="text-align:center; padding:15px; font-size:0.75rem; color:var(--text-3);">Loading inbox...</div>`,
  );
  try {
    const invites = await api("GET", "/invitations");
    if (invites.length === 0) {
      setContent(
        el.inboxInvitesList,
        `<div style="text-align:center; padding:20px; font-size:0.8rem; color:var(--text-3); font-style:italic;">Inbox is empty. No invitations sent yet.</div>`,
      );
      return;
    }

    const html = invites
      .map((i) => {
        const date = fmtDate(i.created_at);
        let actionsHtml = "";
        if (i.status === "pending") {
          actionsHtml = `
          <div style="display:flex; gap:6px;">
            <button class="btn-primary sm accept-invite-btn" data-token="${i.token}" data-team="${i.team_id}" data-email="${escHtml(i.email)}" style="padding:4px 10px; font-size:0.7rem; height:26px;">Accept</button>
            <button class="btn-ghost sm decline-invite-btn" data-token="${i.token}" style="padding:4px 10px; font-size:0.7rem; height:26px; border:1px solid rgba(255,255,255,0.08);">Decline</button>
          </div>
        `;
        } else {
          const badgeColor =
            i.status === "accepted"
              ? "rgba(34,197,94,0.12); color:#4ade80; border:1px solid rgba(34,197,94,0.2)"
              : "rgba(220,38,38,0.12); color:#fca5a5; border:1px solid rgba(220,38,38,0.2)";
          actionsHtml = `<span class="role-badge" style="background:${badgeColor};">${i.status}</span>`;
        }

        return `
        <div class="member-card" style="padding:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px;">
          <div class="member-info">
            <div class="member-id" style="font-size:0.85rem; font-weight:600;">To: ${escHtml(i.email)}</div>
            <div class="member-label" style="font-size:0.72rem; color:var(--text-3); margin-top:2px;">Team ID: ${i.team_id} · Invited on ${date}</div>
            <div class="invite-token-display" style="font-family:monospace; font-size:0.65rem; color:var(--text-3); background:rgba(0,0,0,0.2); padding:2px 6px; border-radius:4px; margin-top:6px; display:inline-block; word-break:break-all;">Token: ${i.token}</div>
          </div>
          <div style="margin-left:auto; display:flex; align-items:center;">
            ${actionsHtml}
          </div>
        </div>
      `;
      })
      .join("");

    setContent(el.inboxInvitesList, html);

    // Accept invite listener
    document.querySelectorAll(".accept-invite-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const token = btn.dataset.token;
        const teamId = btn.dataset.team;
        const email = btn.dataset.email;
        const username = email ? email.split("@")[0] : "invited-user";
        try {
          await api("POST", `/invitations/${token}/respond`, {
            responderId: username,
            decision: "accept",
          });
          toast(`Invitation accepted as "${username}"!`);
          addKnownUser(username);
          refreshUserSwitcher();
          loadInboxInvitations();
          await loadTeams();
          // Select team if same as accepted
          if (String(currentTeamId) === String(teamId)) refreshAll();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });

    // Decline invite listener
    document.querySelectorAll(".decline-invite-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const token = btn.dataset.token;
        try {
          await api("POST", `/invitations/${token}/respond`, {
            responderId: currentUserId,
            decision: "decline",
          });
          toast("Invitation declined.");
          loadInboxInvitations();
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });
  } catch (e) {
    setContent(
      el.inboxInvitesList,
      `<div style="text-align:center; color:var(--red); padding:15px;">Error loading invitations</div>`,
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

// Initialize Switcher on startup
refreshUserSwitcher();
