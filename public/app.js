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
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    if (!body.requesterId && currentUserId) {
      body.requesterId = currentUserId; // Auto-inject requesterId
    }
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);
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
      li.addEventListener("click", () =>
        selectTeam(team.id, team.name, team.description),
      );
      elements.teamsList.appendChild(li);
    });
  } catch (err) {
    showToast(err.message, true);
  }
}

function selectTeam(id, name, description) {
  currentTeamId = id;

  // Update sidebar UI
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  event.currentTarget.classList.add("active");

  // Update Main UI
  elements.emptyState.classList.remove("active");
  elements.teamView.classList.add("active");
  elements.teamTitle.textContent = name;
  elements.teamDescription.textContent = description || "Workspace";

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
      html = '<p class="subtitle">No projects yet.</p>';
    } else {
      projects.forEach((p) => {
        html += `
          <div class="list-item">
            <div class="item-info">
              <h4>${p.name}</h4>
              <p>ID: ${p.id}</p>
            </div>
          </div>
        `;
      });
    }
    // Keep loader element
    elements.projectsList.innerHTML = '<div class="loader"></div>' + html;
  } catch (err) {
    elements.projectsList.innerHTML =
      '<div class="loader"></div><p class="subtitle" style="color:var(--danger)">Failed to load</p>';
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
    members.forEach((m) => {
      html += `
        <div class="list-item">
          <div class="item-info">
            <h4>${m.userId}</h4>
            <p>Member</p>
          </div>
          <span class="badge ${m.role}">${m.role}</span>
        </div>
      `;
    });
    elements.membersList.innerHTML = '<div class="loader"></div>' + html;
  } catch (err) {
    elements.membersList.innerHTML =
      '<div class="loader"></div><p class="subtitle" style="color:var(--danger)">Failed to load</p>';
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
async function loadAuditLogs() {
  setLoader("audit-list", true);
  try {
    const logs = await apiCall("GET", `/teams/${currentTeamId}/audit?limit=5`);
    let html =
      "<table><thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Time</th></tr></thead><tbody>";
    if (logs.length === 0) {
      html =
        '<p class="subtitle" style="padding:16px 24px">No recent activity.</p>';
    } else {
      logs.forEach((l) => {
        const date = new Date(l.timestamp).toLocaleString();
        html += `
          <tr>
            <td><strong>${l.action}</strong></td>
            <td>${l.actorId}</td>
            <td>${l.targetId || "-"}</td>
            <td>${date}</td>
          </tr>
        `;
      });
      html += "</tbody></table>";
    }
    elements.auditList.innerHTML = '<div class="loader"></div>' + html;
  } catch (err) {
    elements.auditList.innerHTML =
      '<div class="loader"></div><p class="subtitle" style="color:var(--danger)">Failed to load</p>';
  }
  setLoader("audit-list", false);
}
