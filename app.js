// ====== Storage helpers ======
console.log("NEW APP.JS LOADED ✅", new Date().toISOString());


const KEY = "debt_pwa_v2_data";

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { people: [], tx: [] };
  } catch {
    return { people: [], tx: [] };
  }
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

let data = loadData();

// ====== Model ======
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getBalance(personId) {
  return data.tx
    .filter(t => t.personId === personId)
    .reduce((sum, t) => sum + t.amount, 0);
}

function fmtMoney(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${abs} грн`;
}

function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ====== UI (simple, no framework) ======
function $(id) { return document.getElementById(id); }

function ensureUI() {
  // Якщо ти лишив старий index.html, додаємо мінімальні блоки автоматом
  if (!$("app")) {
    document.body.innerHTML = `
      <h2>Борги</h2>

      <div id="app">
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
          <input id="personName" placeholder="Імʼя" style="flex:1; min-width:160px;">
          <button id="addPersonBtn">+ Людина</button>
        </div>

        <div id="peopleList"></div>

        <hr style="margin:16px 0;">
        <div id="personView" style="display:none;"></div>
      </div>
    `;
  }
}
ensureUI();

// ====== People ======
function addPerson(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;

  // якщо така людина вже є — не дублюємо (просте правило)
  const exists = data.people.some(p => p.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return;

  data.people.push({ id: uid(), name: trimmed, createdAt: Date.now() });
  saveData(data);
  renderPeople();
}

function deletePerson(personId) {
  // видаляємо людину + всі її транзакції (обережно!)
  data.people = data.people.filter(p => p.id !== personId);
  data.tx = data.tx.filter(t => t.personId !== personId);
  saveData(data);
  renderPeople();
  closePersonView();
}

// ====== Transactions ======
function addTx(personId, amount, note) {
  const a = Number(amount);
  if (!personId || !Number.isFinite(a) || a === 0) return;

  data.tx.push({
    id: uid(),
    personId,
    amount: a,            // + видав, - повернув
    note: (note || "").trim(),
    date: today(),
    createdAt: Date.now()
  });

  saveData(data);
  renderPeople();
  openPerson(personId);
}

function deleteTx(txId) {
  data.tx = data.tx.filter(t => t.id !== txId);
  saveData(data);
  renderPeople();
  const current = $("personView")?.dataset?.personId;
  if (current) openPerson(current);
}

// ====== Views ======
function renderPeople() {
  const host = $("peopleList");
  if (!host) return;

  // сортуємо: найбільший борг зверху
  const rows = data.people
    .map(p => ({ ...p, bal: getBalance(p.id) }))
    .sort((a, b) => b.bal - a.bal);

  host.innerHTML = rows.length
    ? rows.map(p => `
        <div style="padding:10px; border:1px solid #ddd; border-radius:12px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <div>
              <div style="font-size:16px; font-weight:600;">${escapeHtml(p.name)}</div>
              <div style="opacity:.75;">Баланс: <b>${fmtMoney(p.bal)}</b></div>
            </div>
            <div style="display:flex; gap:8px;">
              <button onclick="openPerson('${p.id}')">Відкрити</button>
            </div>
          </div>
        </div>
      `).join("")
    : `<div style="opacity:.7;">Немає людей. Додай першу 👆</div>`;
}

function openPerson(personId) {
  const p = data.people.find(x => x.id === personId);
  const view = $("personView");
  if (!p || !view) return;

  view.style.display = "block";
  view.dataset.personId = personId;

  const tx = data.tx
    .filter(t => t.personId === personId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const bal = getBalance(personId);

  view.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <div>
        <div style="font-size:18px; font-weight:700;">${escapeHtml(p.name)}</div>
        <div style="opacity:.8;">Поточний баланс: <b>${fmtMoney(bal)}</b></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button onclick="closePersonView()">Закрити</button>
        <button onclick="deletePerson('${personId}')" style="opacity:.85;">Видалити людину</button>
      </div>
    </div>

    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
      <input id="txAmount" type="number" placeholder="Сума ( + видав, - повернув )" style="flex:1; min-width:220px;">
      <input id="txNote" placeholder="Коментар (необовʼязково)" style="flex:2; min-width:220px;">
      <button onclick="quickGive('${personId}')">+ Дати</button>
      <button onclick="quickPayback('${personId}')">- Повернув</button>
      <button onclick="addCustomTx('${personId}')">Додати</button>
    </div>

    <div style="margin-top:12px;">
      <div style="font-weight:600; margin-bottom:6px;">Історія</div>
      ${tx.length ? tx.map(t => `
        <div style="padding:8px; border:1px solid #eee; border-radius:12px; margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
            <div>
              <div>
                <b>${t.amount >= 0 ? "+" : ""}${t.amount} грн</b>
                <span style="opacity:.7;">— ${t.date}</span>
              </div>
              <div style="opacity:.8;">${escapeHtml(t.note || "")}</div>
            </div>
            <button onclick="deleteTx('${t.id}')" style="opacity:.8;">Видалити</button>
          </div>
        </div>
      `).join("") : `<div style="opacity:.7;">Поки немає операцій.</div>`}
    </div>
  `;
}

function closePersonView() {
  const view = $("personView");
  if (!view) return;
  view.style.display = "none";
  view.innerHTML = "";
  delete view.dataset.personId;
}

function quickGive(personId) {
  const a = Number($("txAmount")?.value);
  if (!Number.isFinite(a) || a <= 0) return;
  const note = $("txNote")?.value || "";
  addTx(personId, Math.abs(a), note);
}

function quickPayback(personId) {
  const a = Number($("txAmount")?.value);
  if (!Number.isFinite(a) || a <= 0) return;
  const note = $("txNote")?.value || "";
  addTx(personId, -Math.abs(a), note);
}

function addCustomTx(personId) {
  const a = Number($("txAmount")?.value);
  if (!Number.isFinite(a) || a === 0) return;
  const note = $("txNote")?.value || "";
  addTx(personId, a, note);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ====== wire buttons ======
const addBtn = $("addPersonBtn");
if (addBtn) {
  addBtn.addEventListener("click", () => addPerson($("personName").value));
}

renderPeople();

// Expose for inline onclick (quick demo)
window.openPerson = openPerson;
window.closePersonView = closePersonView;
window.deletePerson = deletePerson;
window.deleteTx = deleteTx;
window.quickGive = quickGive;
window.quickPayback = quickPayback;
window.addCustomTx = addCustomTx;
