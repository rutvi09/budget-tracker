/* app.js — polished Budget Buddy
   Features:
   - multi-currency display & input
   - exchangerate.host rates (cached)
   - charts (safe updates)
   - date (format: "December 04, 2025")
   - localStorage persistence
   - improved mobile spacing and input layout
*/

const CURRENCIES = {
  "USD":"$ - USD","INR":"₹ - INR","EUR":"€ - EUR","GBP":"£ - GBP","JPY":"¥ - JPY",
  "AUD":"A$ - AUD","CAD":"C$ - CAD","CHF":"CHF - CHF","CNY":"¥ - CNY","HKD":"HK$ - HKD",
  "SGD":"S$ - SGD","KRW":"₩ - KRW","AED":"د.إ - AED","ZAR":"R - ZAR","PHP":"₱ - PHP"
};
const RATES_API = "https://api.exchangerate.host/latest";

let state = {
  expenses: [], // {id,title,amount,currency,category,date}
  rates: null,
  ratesFetchedAt: 0,
  displayCurrency: "USD",
  theme: "light",
  goal: {amount:0,currency:null}
};

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const now = ()=>Date.now();
const saveState = ()=>localStorage.setItem("bt_state_v2", JSON.stringify(state));
const loadState = ()=>{
  const raw = localStorage.getItem("bt_state_v2");
  if(!raw) return;
  try{ Object.assign(state, JSON.parse(raw)); }catch(e){ console.warn(e) }
};

// initial settings from intro
function applyInitialSettingsIfAny(){
  const initCurr = localStorage.getItem('bt_initial_displayCurrency');
  const initTheme = localStorage.getItem('bt_initial_theme');
  if(initCurr){ state.displayCurrency = initCurr; localStorage.removeItem('bt_initial_displayCurrency'); }
  if(initTheme){ state.theme = initTheme; localStorage.removeItem('bt_initial_theme'); }
}

/* ---------- Rates & conversion ---------- */
async function fetchRates(force=false){
  const TTL = 1000*60*60*12;
  if(state.rates && (now()-state.ratesFetchedAt < TTL) && !force) return state.rates;
  try{
    const res = await fetch(RATES_API);
    if(!res.ok) throw new Error('Rates fetch failed');
    const data = await res.json();
    state.rates = data;
    state.ratesFetchedAt = now();
    saveState();
    return data;
  }catch(e){
    console.warn('Rates fetch error', e);
    return state.rates;
  }
}

function convert(amount, from, to){
  if(!state.rates || !state.rates.rates) return amount;
  const rates = state.rates.rates;
  const base = state.rates.base || "EUR";
  if(from === to) return amount;
  if(from === base){ if(!rates[to]) return amount; return amount * rates[to]; }
  if(to === base){ if(!rates[from]) return amount; return amount / rates[from]; }
  const rateFrom = rates[from], rateTo = rates[to];
  if(!rateFrom || !rateTo) return amount;
  return (amount / rateFrom) * rateTo;
}
function symbolFor(code){ return CURRENCIES[code] ? CURRENCIES[code].split(" - ")[0] : code + " "; }
function fmt(n){ return Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- Date formatting (C) ---------- */
function formatDateToLong(isoDate){
  if(!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  if(isNaN(d)) return isoDate;
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const day = String(d.getDate()).padStart(2,'0');
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/* ---------- UI & Charts ---------- */
let barChart, pieChart;
function populateCurrencyDropdowns(){
  const displaySel = $("currency-select");
  const inputSel = $("input-currency");
  const goalSel = $("goal-currency");
  [displaySel, inputSel, goalSel].forEach(s=>{ if(!s) return; s.innerHTML=""; });
  Object.keys(CURRENCIES).forEach(code=>{
    const opt = `<option value="${code}">${CURRENCIES[code]}</option>`;
    if(displaySel) displaySel.insertAdjacentHTML("beforeend", opt);
    if(inputSel) inputSel.insertAdjacentHTML("beforeend", opt);
    if(goalSel) goalSel.insertAdjacentHTML("beforeend", opt);
  });
  if(displaySel) displaySel.value = state.displayCurrency || "USD";
  if(inputSel) inputSel.value = state.displayCurrency || "USD";
  if(goalSel) goalSel.value = state.goal.currency || state.displayCurrency || "USD";
}

function initCharts(){
  const barEl = document.getElementById("barChart");
  const pieEl = document.getElementById("pieChart");
  if(!barEl || !pieEl) return;
  const barCtx = barEl.getContext("2d");
  const pieCtx = pieEl.getContext("2d");
  barChart = new Chart(barCtx, {
    type: "bar",
    data: { labels: ['Food','Shopping','Travel','Bills','Entertainment','Other'], datasets:[{ data:[0,0,0,0,0,0], backgroundColor:[
      "#FFCDD2","#FFEB3B","#FF9800","#B39DDB","#C8E6C9","#BBDEFB"
    ]}]},
    options:{responsive:true, plugins:{legend:{display:false}}}
  });
  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: { labels: ['Food','Shopping','Travel','Bills','Entertainment','Other'], datasets:[{ data:[0,0,0,0,0,0], backgroundColor:[
      "#FFCDD2","#FFEB3B","#FF9800","#B39DDB","#C8E6C9","#BBDEFB"
    ]}]},
    options:{responsive:true}
  });
}

function renderExpenses(){
  const list = $("expense-list");
  if(!list) return;
  list.innerHTML = "";
  const displayCode = ($("currency-select") && $("currency-select").value) || state.displayCurrency || "USD";
  let totals = {};
  let totalSpent = 0;

  // accumulate
  state.expenses.forEach(e=>{
    const converted = state.rates ? convert(Number(e.amount), e.currency, displayCode) : Number(e.amount);
    totalSpent += converted;
    totals[e.category] = (totals[e.category] || 0) + converted;

    const dateText = e.date ? formatDateToLong(e.date) : "";

    const li = document.createElement("li");
    li.className = "expense-item";
    li.innerHTML = `
      <div class="expense-meta">
        <div>
          <div style="font-weight:600">${escapeHtml(e.title)}</div>
          <div class="muted" style="font-size:0.85rem">${dateText} • ${e.currency}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <div class="category-badge">${escapeHtml(e.category)}</div>
        <div style="font-weight:700">${symbolFor(displayCode)}${fmt(converted)}</div>
        <button class="btn" onclick="deleteExpense('${e.id}')">❌</button>
      </div>
    `;
    list.appendChild(li);
  });

  $("total-spent").innerText = `${symbolFor(displayCode)}${fmt(totalSpent)}`;

  // goal
  const goal = state.goal;
  if(goal && goal.amount && goal.currency){
    const goalInDisplay = state.rates ? convert(Number(goal.amount), goal.currency, displayCode) : Number(goal.amount);
    const remaining = goalInDisplay - totalSpent;
    if(remaining > 0){
      $("remaining-goal").innerText = `${symbolFor(displayCode)}${fmt(remaining)} below goal`;
      $("goal-status").innerText = `Goal: ${symbolFor(goal.currency)}${fmt(Number(goal.amount))}`;
    } else {
      $("remaining-goal").innerText = `Goal reached / exceeded by ${symbolFor(displayCode)}${fmt(Math.abs(remaining))}`;
      $("goal-status").innerText = `Goal: ${symbolFor(goal.currency)}${fmt(Number(goal.amount))}`;
    }
  } else {
    $("remaining-goal").innerText = "No goal set";
    $("goal-status").innerText = "";
  }

  // charts: ensure consistent categories order
  const cats = ['Food','Shopping','Travel','Bills','Entertainment','Other'];
  const data = cats.map(c => totals[c] || 0);
  if(barChart && pieChart){
    barChart.data.labels = cats;
    barChart.data.datasets[0].data = data;
    pieChart.data.labels = cats;
    pieChart.data.datasets[0].data = data;
    // fallback: if all zeros, keep charts but show zeros (prevents errors)
    barChart.update();
    pieChart.update();
  }

  saveState();
}

/* ---------- CRUD & events ---------- */
function addExpenseObj(obj){
  state.expenses.unshift(obj);
  saveState(); renderExpenses();
}
function deleteExpense(id){
  state.expenses = state.expenses.filter(x=>x.id !== id);
  saveState(); renderExpenses();
}

function cryptoRandomId(){ return 'id_'+Math.random().toString(36).slice(2,9); }

/* ---------- Event wiring ---------- */
function setupEventListeners(){
  // populate currency selectors already done in populateCurrencyDropdowns

  // default date = today
  if($('expense-date')) $('expense-date').value = new Date().toISOString().slice(0,10);

  // show/hide custom category
  const catSel = $('expense-category'), custom = $('custom-category');
  if(catSel){
    catSel.addEventListener('change', ()=>{
      if(catSel.value === 'Other'){ custom.style.display = 'block'; custom.focus(); }
      else { custom.style.display = 'none'; custom.value = ''; }
    });
  }

  const form = $('expense-form');
  if(form){
    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const title = $('expense-title').value.trim();
      const amount = parseFloat($('expense-amount').value);
      const inputCurrency = $('input-currency').value;
      let category = $('expense-category').value;
      if(category === 'Other' && $('custom-category').value.trim()) category = $('custom-category').value.trim();
      const date = $('expense-date').value;
      if(!title || isNaN(amount) || amount <= 0){ alert('Enter valid title and amount'); return; }
      addExpenseObj({ id: cryptoRandomId(), title, amount:Number(amount), currency: inputCurrency, category, date });
      $('expense-title').value=''; $('expense-amount').value=''; $('expense-date').value = new Date().toISOString().slice(0,10);
      $('custom-category').value=''; $('custom-category').style.display='none';
    });
  }

  const clearBtn = $('clear-all');
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    if(!confirm('Clear all expenses?')) return;
    state.expenses = []; saveState(); renderExpenses();
  });

  const setGoal = $('set-goal');
  if(setGoal) setGoal.addEventListener('click', ()=>{
    const g = parseFloat($('goal-amount-input').value);
    const gc = $('goal-currency').value;
    if(isNaN(g) || g<=0){ alert('Enter valid goal'); return; }
    state.goal = { amount:g, currency:gc }; $('goal-amount-input').value=''; saveState(); renderExpenses();
  });

  const clearGoal = $('clear-goal');
  if(clearGoal) clearGoal.addEventListener('click', ()=>{ state.goal = {amount:0,currency:null}; saveState(); renderExpenses(); });

  if($('currency-select')) $('currency-select').addEventListener('change', async ()=>{
    state.displayCurrency = $('currency-select').value; saveState();
    await fetchRates(); renderExpenses();
  });

  if($('theme-toggle')) $('theme-toggle').addEventListener('click', ()=>{
    state.theme = (state.theme === 'dark') ? 'light' : 'dark';
    applyTheme(); saveState();
  });

  if($('download-pdf')) $('download-pdf').addEventListener('click', ()=>downloadPDF());
  if($('download-img')) $('download-img').addEventListener('click', ()=>downloadImage());
}

/* ---------- Export helpers ---------- */
function downloadPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p','pt','a4');
  html2canvas(document.querySelector('.app')).then(canvas=>{
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 595;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    doc.addImage(imgData,'PNG',0,0,imgWidth,imgHeight);
    doc.save('budget-buddy.pdf');
  });
}
function downloadImage(){
  html2canvas(document.querySelector('.app')).then(canvas=>{
    const link = document.createElement('a'); link.download='budget-buddy.png'; link.href=canvas.toDataURL(); link.click();
  });
}

/* ---------- Theme ---------- */
function applyTheme(){
  if(state.theme === 'dark'){ document.body.classList.add('dark'); if($('theme-toggle')) $('theme-toggle').innerText='☀️'; }
  else { document.body.classList.remove('dark'); if($('theme-toggle')) $('theme-toggle').innerText='🌙'; }
}

/* ---------- Boot ---------- */
(async function bootstrap(){
  loadState();
  applyInitialSettingsIfAny();

  populateCurrencyDropdowns();
  initCharts();
  setupEventListeners();
  applyTheme();

  // ensure display select initially set to state
  if($('currency-select')) $('currency-select').value = state.displayCurrency || 'USD';

  // fetch rates (non-blocking) and then render
  await fetchRates();
  renderExpenses();
})();