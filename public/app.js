// State
let currentUserId = null;
let currentTeamId = null;

// DOM Elements
const screens = {
  login: document.getElementById("login-screen"),
  dashboard: document.getElementById("dashboard-screen"),
};

const elements = {
  loginForm: document.getElementById("login-form"),
  userIdInput: document.getElementById("user-id-input"),
  displayUserId: document.getElementById("display-user-id"),
  avatarInitial: document.getElementById("avatar-initial"),
  logoutBtn: document.getElementById("logout-btn"),

  teamsList: document.getElementById("teams-list"),
  showCreateTeamBtn: document.getElementById("show-create-team-btn"),
  createTeamForm: document.getElementById("create-team-form"),
  newTeamName: document.getElementById("new-team-name"),
  createTeamSubmit: document.getElementById("create-team-submit"),

  emptyState: document.getElementById("empty-state"),
  teamView: document.getElementById("team-view"),

  teamTitle: document.getElementById("team-title"),
  teamDescription: document.getElementById("team-description"),
  refreshTeamBtn: document.getElementById("refresh-team-btn"),

  projectsList: document.getElementById("projects-list"),
  showCreateProjectBtn: document.getElementById("show-create-project-btn"),
  createProjectForm: document.getElementById("create-project-form"),
  newProjectName: document.getElementById("new-project-name"),
  createProjectSubmit: document.getElementById("create-project-submit"),

  membersList: document.getElementById("members-list"),
  showInviteBtn: document.getElementById("show-invite-btn"),
  inviteForm: document.getElementById("invite-form"),
  inviteEmail: document.getElementById("invite-email"),
  inviteRole: document.getElementById("invite-role"),
  inviteSubmit: document.getElementById("invite-submit"),

  auditList: document.getElementById("audit-list"),
  toast: document.getElementById("toast"),
  toastMsg: document.getElementById("toast-msg"),
};

// API Helpers
async function apiCall(method, path, body = null) {
  let finalPath = path;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    if (!body.requesterId && currentUserId) {
      body.requesterId = currentUserId; // Auto-inject requesterId
    }
    options.body = JSON.stringify(body);
  } else if (method === "GET" && currentUserId) {
    // Append requesterId to query string for GET requests
    finalPath += finalPath.includes("?")
      ? `&requesterId=${currentUserId}`
      : `?requesterId=${currentUserId}`;
  }

  const response = await fetch(finalPath, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API Error");
  }
  return data;
}

function showToast(message, isError = false) {
  elements.toastMsg.textContent = message;
  elements.toast.style.borderLeftColor = isError
    ? "var(--danger)"
    : "var(--primary)";
  elements.toast.classList.remove("hidden");
  setTimeout(() => elements.toast.classList.add("hidden"), 3000);
}

function setLoader(containerId, active) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const loader = container.querySelector(".loader");
  if (loader) {
    if (active) loader.classList.add("active");
    else loader.classList.remove("active");
  }
}

// Auth
elements.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userId = elements.userIdInput.value.trim();
  if (userId) {
    currentUserId = userId;
    elements.displayUserId.textContent = userId;
    elements.avatarInitial.textContent = userId.charAt(0).toUpperCase();

    screens.login.classList.remove("active");
    screens.dashboard.classList.add("active");

    await loadTeams();
  }
});

elements.logoutBtn.addEventListener("click", () => {
  currentUserId = null;
  currentTeamId = null;
  elements.userIdInput.value = "";
  screens.dashboard.classList.remove("active");
  screens.login.classList.add("active");
});

// Teams
async function loadTeams() {
  try {
    const teams = await apiCall("GET", `/users/${currentUserId}/teams`);
    elements.teamsList.innerHTML = "";

    if (teams.length === 0) {
      elements.teamsList.innerHTML =
        '<li class="nav-item" style="opacity:0.5">No teams found</li>';
    }

    teams.forEach((team) => {
      const li = document.createElement("li");
      li.className = `nav-item ${team.id === currentTeamId ? "active" : ""}`;
      li.innerHTML = `
        <div class="team-icon">${team.name.charAt(0).toUpperCase()}</div>
        ${team.name}
      `;
      li.addEventListener("click", (e) =>
        selectTeam(team.id, team.name, team.description, e.currentTarget),
      );
      elements.teamsList.appendChild(li);
    });
  } catch (err) {
    showToast(err.message, true);
  }
}

function selectTeam(id, name, description, element) {
  currentTeamId = id;

  // Update sidebar UI
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  if (element) {
    element.classList.add("active");
  }

  // Update Main UI
  elements.emptyState.classList.remove("active");
  elements.teamView.classList.add("active");
  elements.teamTitle.textContent = name;
  elements.teamDescription.textContent =
    description && description.trim()
      ? description
      : `Team workspace · Owner: ${currentUserId}`;

  refreshTeamData();
}

async function refreshTeamData() {
  if (!currentTeamId) return;
  loadProjects();
  loadMembers();
  loadAuditLogs();
}

elements.refreshTeamBtn.addEventListener("click", refreshTeamData);

// Create Team
elements.showCreateTeamBtn.addEventListener("click", () => {
  elements.createTeamForm.classList.toggle("hidden");
});
elements.createTeamSubmit.addEventListener("click", async () => {
  const name = elements.newTeamName.value.trim();
  if (!name) return;
  try {
    await apiCall("POST", "/teams", { name, requesterId: currentUserId });
    elements.newTeamName.value = "";
    elements.createTeamForm.classList.add("hidden");
    showToast("Team created successfully!");
    loadTeams();
  } catch (err) {
    showToast(err.message, true);
  }
});

// Projects
async function loadProjects() {
  setLoader("projects-list", true);
  try {
    const projects = await apiCall("GET", `/teams/${currentTeamId}/projects`);
    let html = "";
    if (projects.length === 0) {
      html =
        '<p class="subtitle" style="padding:8px 0">No projects yet. Create your first one!</p>';
    } else {
      projects.forEach((p) => {
        const initials = (p.name || "P")
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const date = p.created_at
          ? new Date(p.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "";
        html += `
          <div class="list-item">
            <div class="item-info" style="display:flex;align-items:center;gap:12px">
              <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:white;flex-shrink:0">${initials}</div>
              <div>
                <h4>${p.name}</h4>
                <p>Created by <strong>${p.created_by || "Unknown"}</strong>${date ? " · " + date : ""}</p>
              </div>
            </div>
            <span class="badge viewer" style="background:rgba(59,130,246,0.15);color:#93c5fd;border-color:rgba(59,130,246,0.3)">Active</span>
          </div>
        `;
      });
    }
    elements.projectsList.innerHTML = '<div class="loader"></div>' + html;
  } catch (err) {
    elements.projectsList.innerHTML =
      '<div class="loader"></div><p class="subtitle" style="color:var(--danger)">Failed to load projects</p>';
  }
  setLoader("projects-list", false);
}

elements.showCreateProjectBtn.addEventListener("click", () => {
  elements.createProjectForm.classList.toggle("hidden");
});
elements.createProjectSubmit.addEventListener("click", async () => {
  const name = elements.newProjectName.value.trim();
  if (!name) return;
  try {
    await apiCall("POST", `/teams/${currentTeamId}/projects`, {
      name,
      requesterId: currentUserId,
    });
    elements.newProjectName.value = "";
    elements.createProjectForm.classList.add("hidden");
    showToast("Project created!");
    loadProjects();
    loadAuditLogs();
  } catch (err) {
    showToast(err.message, true);
  }
});

// Members
async function loadMembers() {
  setLoader("members-list", true);
  try {
    const members = await apiCall("GET", `/teams/${currentTeamId}/members`);
    let html = "";
    if (members.length === 0) {
      html = '<p class="subtitle" style="padding:8px 0">No members yet.</p>';
    } else {
      members.forEach((m) => {
        const isOwner = m.role === "owner";
        const initials = (m.user_id || "?").charAt(0).toUpperCase();
        const roleLabel = m.role
          ? m.role.charAt(0).toUpperCase() + m.role.slice(1)
          : "Member";
        html += `
          <div class="list-item">
            <div class="item-info" style="display:flex;align-items:center;gap:12px">
              <div class="avatar" style="width:36px;height:36px;font-size:14px;border-radius:10px;flex-shrink:0">${initials}</div>
              <div>
                <h4>${m.user_id}</h4>
                <p>${isOwner ? "Team Owner" : "Team Member"}</p>
              </div>
            </div>
            <span class="badge ${m.role || "viewer"}">${roleLabel}</span>
          </div>
        `;
      });
    }
    elements.membersList.innerHTML = '<div class="loader"></div>' + html;
  } catch (err) {
    elements.membersList.innerHTML =
      '<div class="loader"></div><p class="subtitle" style="color:var(--danger)">Failed to load members</p>';
  }
  setLoader("members-list", false);
}

elements.showInviteBtn.addEventListener("click", () => {
  elements.inviteForm.classList.toggle("hidden");
});
elements.inviteSubmit.addEventListener("click", async () => {
  const email = elements.inviteEmail.value.trim();
  const role = elements.inviteRole.value;
  if (!email) return;
  try {
    const res = await apiCall("POST", `/teams/${currentTeamId}/invite`, {
      email,
      role,
      requesterId: currentUserId,
    });
    elements.inviteEmail.value = "";
    elements.inviteForm.classList.add("hidden");

    // Simulate Email Delivery
    const modal = document.getElementById("email-modal");
    document.getElementById("email-to-address").textContent = `To: ${email}`;
    document.getElementById("email-token-link").textContent =
      `http://localhost:3000/invitations/${res.invitationId}/respond`;
    modal.classList.add("active");

    showToast(`Invitation sent to ${email}`);
    loadAuditLogs();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("close-email-btn").addEventListener("click", () => {
  document.getElementById("email-modal").classList.remove("active");
});

// Audit Logs
function formatAction(action) {
  const labels = {
    create: "🏗️ Team Created",
    invite: "📧 Member Invited",
    join: "✅ Member Joined",
    remove_member: "🚫 Member Removed",
    add_role: "🏷️ Role Assigned",
    create_project: "📁 Project Created",
    update_permissions: "🔐 Permissions Updated",
  };
  return labels[action] || action;
}

async function loadAuditLogs() {
  setLoader("audit-list", true);
  try {
    const logs = await apiCall("GET", `/teams/${currentTeamId}/audit?limit=10`);
    let html;
    if (logs.length === 0) {
      html =
        '<p class="subtitle" style="padding:16px 24px">No recent activity.</p>';
    } else {
      html = `<table>
        <thead><tr>
          <th>Action</th>
          <th>Performed By</th>
          <th>Details</th>
          <th>Time</th>
        </tr></thead>
        <tbody>`;
      logs.forEach((l) => {
        const date = l.at
          ? new Date(l.at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";
        const actor = l.performed_by || "-";
        const details = l.details
          ? Object.entries(l.details)
              .filter(([k]) => k !== "emailHash" && k !== "token")
              .map(([k, v]) => `${k}: <strong>${v}</strong>`)
              .join(", ")
          : "-";
        html += `<tr>
          <td>${formatAction(l.action)}</td>
          <td style="font-family:monospace;font-size:0.85rem">${actor}</td>
          <td style="color:var(--text-secondary);font-size:0.85rem">${details}</td>
          <td style="color:var(--text-secondary);font-size:0.8rem;white-space:nowrap">${date}</td>
        </tr>`;
      });
      html += "</tbody></table>";
    }
    elements.auditList.innerHTML = '<div class="loader"></div>' + html;
  } catch (err) {
    elements.auditList.innerHTML =
      '<div class="loader"></div><p class="subtitle" style="color:var(--danger)">Failed to load logs</p>';
  }
  setLoader("audit-list", false);
}
