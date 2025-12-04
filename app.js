// Advanced Budget Tracker - app.js
// Features: many currencies, live conversion (exchangerate.host), charts, dark mode, localStorage, export

/* ========== CONFIG ========== */
// Which currencies to show in dropdown (option C - big list)
const CURRENCIES = {
  "USD":"$ - USD",
  "INR":"₹ - INR",
  "EUR":"€ - EUR",
  "GBP":"£ - GBP",
  "JPY":"¥ - JPY",
  "AUD":"A$ - AUD",
  "CAD":"C$ - CAD",
  "CHF":"CHF - CHF",
  "CNY":"¥ - CNY",
  "HKD":"HK$ - HKD",
  "SGD":"S$ - SGD",
  "KRW":"₩ - KRW",
  "AED":"د.إ - AED",
  "ZAR":"R - ZAR",
  "PHP":"₱ - PHP",
  "MYR":"RM - MYR",
  "THB":"฿ - THB",
  "IDR":"Rp - IDR",
  "MXN":"$ - MXN",
  "BRL":"R$ - BRL",
  "TRY":"₺ - TRY",
  "SEK":"kr - SEK",
  "NOK":"kr - NOK",
  "DKK":"kr - DKK",
  "PLN":"zł - PLN"
};

// exchangerate.host endpoint (no key required)
// Docs: https://api.exchangerate.host/latest
const RATES_API = "https://api.exchangerate.host/latest";

/* ========== STATE ========== */
let state = {
  expenses: [], // {title, amount, currency, category, date, id}
  rates: null, // rates object from API (rates and base)
  ratesFetchedAt: 0,
  displayCurrency: "USD",
  theme: "light",
  goal: {amount:0, currency:null}
};

/* ========== UTIL ========== */
const $ = (id)=>document.getElementById(id);
const now = ()=>Date.now();
const saveState = ()=>localStorage.setItem("bt_state_v2", JSON.stringify({
  expenses: state.expenses, theme: state.theme, displayCurrency: state.displayCurrency,
  goal: state.goal, ratesFetchedAt: state.ratesFetchedAt, rates: state.rates
}));
const loadState = ()=>{
  const raw = localStorage.getItem("bt_state_v2");
  if(!raw) return;
  try{
    const obj = JSON.parse(raw);
    if(obj.expenses) state.expenses = obj.expenses;
    if(obj.theme) state.theme = obj.theme;
    if(obj.displayCurrency) state.displayCurrency = obj.displayCurrency;
    if(obj.goal) state.goal = obj.goal;
    if(obj.rates) state.rates = obj.rates;
    if(obj.ratesFetchedAt) state.ratesFetchedAt = obj.ratesFetchedAt;
  }catch(e){ console.warn("loadState err", e) }
};

/* ========== RATES / CONVERSION ========== */
// Fetch rates from exchangerate.host and cache to localStorage
async function fetchRates(force=false){
  // If we have cached rates fetched within 12 hours, reuse
  const TTL = 1000 * 60 * 60 * 12; // 12 hours
  if(state.rates && (now() - state.ratesFetchedAt < TTL) && !force) return state.rates;
  try{
    const res = await fetch(RATES_API);
    if(!res.ok) throw new Error("Rates fetch failed");
    const data = await res.json(); // {base: "EUR", rates: {...}, date: "2025-..." }
    state.rates = data;
    state.ratesFetchedAt = now();
    saveState();
    return data;
  }catch(err){
    console.error("Could not fetch rates:", err);
    // fall back to cached if available
    return state.rates;
  }
}

// Convert amount from currency 'from' to currency 'to'
// Uses formula: amount * (rate[to] / rate[from])  where rates are relative to API base
function convert(amount, from, to){
  if(!state.rates || !state.rates.rates) return amount; // can't convert
  const rates = state.rates.rates;
  const base = state.rates.base || "EUR";
  // If API includes the exact currency as base 1: handle
  if(from === to) return amount;
  // If API base equals 'from', then target rate is rates[to]
  if(from === base){
    if(!rates[to]) return amount;
    return amount * rates[to];
  }
  // If API base equals 'to'
  if(to === base){
    if(!rates[from]) return amount;
    return amount / rates[from];
  }
  // General case: amount_in_base = amount / rates[from]; amount_in_to = amount_in_base * rates[to]
  const rateFrom = rates[from];
  const rateTo = rates[to];
  if(!rateFrom || !rateTo) return amount;
  return (amount / rateFrom) * rateTo;
}

// Helper: format with symbol for a given currency code
function symbolFor(code){
  // Try to parse from CURRENCIES map
  if(CURRENCIES[code]){
    // e.g. "₹ - INR" -> get prefix before ' - '
    return CURRENCIES[code].split(" - ")[0];
  }
  return code + " ";
}

/* ========== UI INIT ========== */
let barChart, pieChart;
function populateCurrencyDropdowns(){
  const displaySel = $("currency-select");
  const inputSel = $("input-currency");
  const goalSel = $("goal-currency");
  // empty
  [displaySel, inputSel, goalSel].forEach(s=>s.innerHTML="");
  Object.keys(CURRENCIES).forEach(code=>{
    const label = CURRENCIES[code];
    const opt = `<option value="${code}">${label}</option>`;
    displaySel.insertAdjacentHTML("beforeend", opt);
    inputSel.insertAdjacentHTML("beforeend", opt);
    goalSel.insertAdjacentHTML("beforeend", opt);
  });
  // set defaults
  displaySel.value = state.displayCurrency || "USD";
  inputSel.value = state.displayCurrency || "USD";
  goalSel.value = state.goal.currency || (state.displayCurrency || "USD");
}

function initCharts(){
  const barCtx = document.getElementById("barChart").getContext("2d");
  const pieCtx = document.getElementById("pieChart").getContext("2d");
  barChart = new Chart(barCtx, {
    type: "bar",
    data: { labels: [], datasets:[{ label:"Category totals", data:[], backgroundColor: [
      "#FFCDD2","#FFEB3B","#FF9800","#B39DDB","#C8E6C9","#BBDEFB"
    ] }]},
    options:{responsive:true, plugins:{legend:{display:false}}}
  });
  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: { labels:[], datasets:[{ data:[], backgroundColor:[
      "#FFCDD2","#FFEB3B","#FF9800","#B39DDB","#C8E6C9","#BBDEFB"
    ]}]},
    options:{responsive:true}
  });
}

/* ========== RENDER ========== */
function renderExpenses(){
  const list = $("expense-list");
  list.innerHTML = "";
  const displayCode = $("currency-select").value || state.displayCurrency || "USD";
  let totals = {}; // totals by category (in display currency)
  let totalSpent = 0;
  state.expenses.forEach((e)=>{
    // e.amount is stored in e.currency
    const converted = (state.rates ? convert(Number(e.amount), e.currency, displayCode) : Number(e.amount));
    totalSpent += converted;
    totals[e.category] = (totals[e.category] || 0) + converted;

    const li = document.createElement("li");
    li.className = "expense-item";
    li.innerHTML = `
      <div class="expense-meta">
        <div>
          <div style="font-weight:600">${escapeHtml(e.title)}</div>
          <div class="muted" style="font-size:0.85rem">${e.date || ""} • ${e.currency}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <div class="category-badge">${e.category}</div>
        <div style="font-weight:700">${symbolFor(displayCode)}${numberWithCommas(converted.toFixed(2))}</div>
        <button class="btn" onclick="deleteExpense('${e.id}')">❌</button>
      </div>
    `;
    list.appendChild(li);
  });

  $("total-spent").innerText = `${symbolFor(displayCode)}${numberWithCommas(totalSpent.toFixed(2))}`;

  // goal calc
  const goal = state.goal;
  if(goal && goal.amount && goal.currency){
    // convert goal to display currency for comparison
    const goalInDisplay = state.rates ? convert(Number(goal.amount), goal.currency, displayCode) : Number(goal.amount);
    const remaining = goalInDisplay - totalSpent;
    if(remaining > 0){
      $("remaining-goal").innerText = `${symbolFor(displayCode)}${numberWithCommas(remaining.toFixed(2))} below goal`;
      $("goal-status").innerText = `Goal: ${symbolFor(goal.currency)}${numberWithCommas(Number(goal.amount).toFixed(2))}`;
    } else {
      $("remaining-goal").innerText = `Goal reached / exceeded by ${symbolFor(displayCode)}${numberWithCommas(Math.abs(remaining).toFixed(2))}`;
      $("goal-status").innerText = `Goal: ${symbolFor(goal.currency)}${numberWithCommas(Number(goal.amount).toFixed(2))}`;
    }
  } else {
    $("remaining-goal").innerText = "No goal set";
    $("goal-status").innerText = "";
  }

  // Update charts
  const labels = Object.keys(totals);
  const data = labels.map(l=>totals[l]);
  barChart.data.labels = labels;
  barChart.data.datasets[0].data = data;
  pieChart.data.labels = labels;
  pieChart.data.datasets[0].data = data;
  barChart.update();
  pieChart.update();

  saveState();
}

function numberWithCommas(x){ return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

/* ========== CRUD ========== */
function addExpenseObj(e){
  state.expenses.unshift(e);
  saveState();
  renderExpenses();
}

function deleteExpense(id){
  state.expenses = state.expenses.filter(x=>x.id !== id);
  saveState();
  renderExpenses();
}

/* ========== EVENTS ========== */
function setupEventListeners(){
  // forms
  $("expense-form").addEventListener("submit", (ev)=>{
    ev.preventDefault();
    const title = $("expense-title").value.trim();
    const amount = parseFloat($("expense-amount").value);
    const inputCurrency = $("input-currency").value;
    const category = $("expense-category").value;
    const date = $("expense-date").value;
    if(!title || !amount || isNaN(amount)){
      alert("Enter valid title and amount");
      return;
    }
    const id = cryptoRandomId();
    addExpenseObj({id, title, amount:Number(amount), currency: inputCurrency, category, date});
    $("expense-title").value=""; $("expense-amount").value=""; $("expense-date").value="";
  });

  $("clear-all").addEventListener("click", ()=>{
    if(!confirm("Clear all expenses?")) return;
    state.expenses = [];
    saveState();
    renderExpenses();
  });

  $("set-goal").addEventListener("click", ()=>{
    const g = parseFloat($("goal-amount-input").value);
    const gc = $("goal-currency").value;
    if(isNaN(g) || g<=0){ alert("Enter valid goal"); return; }
    state.goal = {amount: g, currency: gc};
    $("goal-amount-input").value="";
    saveState();
    renderExpenses();
  });

  $("clear-goal").addEventListener("click", ()=>{
    state.goal = {amount:0, currency:null};
    saveState(); renderExpenses();
  });

  // currency display change
  $("currency-select").addEventListener("change", async ()=>{
    state.displayCurrency = $("currency-select").value;
    saveState();
    // ensure rates are present
    await fetchRates();
    renderExpenses();
  });

  // theme toggle
  $("theme-toggle").addEventListener("click", ()=>{
    state.theme = (state.theme === "dark") ? "light" : "dark";
    applyTheme();
    saveState();
  });

  // Export
  $("download-pdf").addEventListener("click", ()=>downloadPDF());
  $("download-img").addEventListener("click", ()=>downloadImage());
}

/* ========== EXPORT ========== */
function downloadPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p','pt','a4');
  html2canvas(document.querySelector(".app")).then(canvas=>{
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 595;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    doc.addImage(imgData,'PNG',0,0,imgWidth,imgHeight);
    doc.save('budget-tracker.pdf');
  });
}

function downloadImage(){
  html2canvas(document.querySelector(".app")).then(canvas=>{
    const link = document.createElement("a");
    link.download = 'budget-tracker.png';
    link.href = canvas.toDataURL();
    link.click();
  });
}

/* ========== THEME ========== */
function applyTheme(){
  if(state.theme === "dark"){
    document.body.classList.add("dark");
    $("theme-toggle").innerText = "☀️";
  } else {
    document.body.classList.remove("dark");
    $("theme-toggle").innerText = "🌙";
  }
}

/* ========== UTIL HELPERS ========== */
function cryptoRandomId(){ return 'id_'+Math.random().toString(36).slice(2,9); }

/* ========== BOOTSTRAP ========== */
(async function bootstrap(){
  loadState();
  populateCurrencyDropdowns();
  initCharts();
  setupEventListeners();
  applyTheme();

  // Ensure we have rates (fetch, but don't block UI)
  await fetchRates();

  // If user had saved displayCurrency, set selects accordingly
  if(state.displayCurrency) $("currency-select").value = state.displayCurrency;
  if(state.goal && state.goal.currency) $("goal-currency").value = state.goal.currency;

  // Render saved expenses
  renderExpenses();
})();