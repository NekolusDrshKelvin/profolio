// ====== CONFIG ======
// Your deployed API (Vercel)
const API_BASE = "https://profolio-serverapi.vercel.app";

// ====== ELEMENTS ======
const yearEl = document.getElementById("year");
const apiBadge = document.getElementById("apiBadge");
const apiText = document.getElementById("apiText");
const msgCountEl = document.getElementById("msgCount");
const recentMsgEl = document.getElementById("recentMsg");
const msgList = document.getElementById("msgList");
const refreshBtn = document.getElementById("refreshBtn");
const backToTop = document.getElementById("backToTop");

const form = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

// ====== INIT ======
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ====== HELPERS ======
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function setApiStatus(isOnline) {
  if (!apiBadge || !apiText) return;

  if (isOnline) {
    apiBadge.className = "badge rounded-pill text-bg-success";
    apiBadge.textContent = "Online";
    apiText.textContent = "Online";
  } else {
    apiBadge.className = "badge rounded-pill text-bg-danger";
    apiBadge.textContent = "Offline";
    apiText.textContent = "Offline";
  }
}

function showMessagesLoading() {
  if (!msgList) return;
  msgList.innerHTML = `<div class="text-secondary small">Loading messages…</div>`;
}

function showMessagesError(message) {
  if (!msgList) return;
  msgList.innerHTML = `<div class="text-secondary small">${escapeHtml(message)}</div>`;
}

function renderMessages(items) {
  if (!msgList || !msgCountEl || !recentMsgEl) return;

  if (!items || items.length === 0) {
    msgList.innerHTML = `<div class="text-secondary small">No messages yet.</div>`;
    msgCountEl.textContent = "0";
    recentMsgEl.textContent = "—";
    return;
  }

  msgCountEl.textContent = String(items.length);
  recentMsgEl.textContent = `${items[0].name}: ${items[0].message}`;

  msgList.innerHTML = items
    .map((m) => {
      const dateText = m.createdAt ? new Date(m.createdAt).toLocaleString() : "";
      return `
        <div class="msg">
          <div class="d-flex justify-content-between gap-2 flex-wrap">
            <div class="fw-semibold">${escapeHtml(m.name || "")}</div>
            <div class="text-secondary small">${escapeHtml(dateText)}</div>
          </div>
          <div class="text-secondary small">${escapeHtml(m.email || "")}</div>
          <div class="mt-2">${escapeHtml(m.message || "")}</div>
        </div>
      `;
    })
    .join("");
}

// ====== API ======
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);

  // Try read JSON (even on errors)
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function loadStatus() {
  try {
    await apiFetch("/api/health", { method: "GET" });
    setApiStatus(true);
  } catch {
    setApiStatus(false);
  }
}

async function loadMessages() {
  showMessagesLoading();
  try {
    const data = await apiFetch("/api/messages", { method: "GET" });
    renderMessages(data.items || []);
  } catch (err) {
    // Most common here is CORS or network.
    showMessagesError("Could not load messages. Check API & CORS.");
  }
}

async function sendMessage(payload) {
  return apiFetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ====== EVENTS ======
if (refreshBtn) {
  refreshBtn.addEventListener("click", loadMessages);
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formStatus) formStatus.textContent = "";

    const nameEl = document.getElementById("name");
    const emailEl = document.getElementById("email");
    const messageEl = document.getElementById("message");

    const name = (nameEl?.value || "").trim();
    const email = (emailEl?.value || "").trim();
    const message = (messageEl?.value || "").trim();

    const setInvalid = (el, bad) => {
      if (!el) return;
      el.classList.toggle("is-invalid", bad);
      el.classList.toggle("is-valid", !bad);
    };

    let ok = true;
    setInvalid(nameEl, name.length < 2); ok = ok && name.length >= 2;
    setInvalid(emailEl, !validateEmail(email)); ok = ok && validateEmail(email);
    setInvalid(messageEl, message.length < 10); ok = ok && message.length >= 10;

    if (!ok) {
      if (formStatus) formStatus.textContent = "Fix the highlighted fields.";
      return;
    }

    try {
      if (formStatus) formStatus.textContent = "Sending...";
      await sendMessage({ name, email, message });

      if (formStatus) formStatus.textContent = "Sent ✅";
      form.reset();
      [nameEl, emailEl, messageEl].forEach((el) => el && el.classList.remove("is-valid"));

      await loadMessages();
    } catch (err) {
      if (formStatus) formStatus.textContent = err.message || "Failed to send.";
    }
  });
}

// Back to top
if (backToTop) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 600) backToTop.classList.add("show");
    else backToTop.classList.remove("show");
  });

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ====== RUN ======
loadStatus();
loadMessages();
