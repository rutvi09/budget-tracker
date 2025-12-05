/* app.js - Budget Buddy (Peach+Mint Theme)
   Features: many currencies, live conversion (exchangerate.host), charts, dark mode, localStorage, export
*/

/* ========== CONFIG ========== */
const CURRENCIES = {
  "USD":"$ - USD","INR":"₹ - INR","EUR":"€ - EUR","GBP":"£ - GBP","JPY":"¥ - JPY",
  "AUD":"A$ - AUD","CAD":"C$ - CAD","CHF":"CHF - CHF","CNY":"¥ - CNY","HKD":"HK$ - HKD",
  "SGD":"S$ - SGD","KRW":"₩ - KRW","AED":"د.إ - AED","ZAR":"R - ZAR","PHP":"₱ - PHP",
  "MYR":"RM - MYR","THB":"฿ - THB","IDR":"Rp - IDR","MXN":"$ - MXN","BRL":"R$ - BRL",
  "TRY":"₺ - TRY","SEK":"kr - SEK","NOK":"kr - NOK","DKK":"kr - DKK","PLN":"zł - PLN"
};
const RATES_API = "https://api.exchangerate.host/latest";
let state = {
  expenses: [],
  rates: null,
  ratesFetchedAt: 0,
  displayCurrency: "USD",
  theme: "light",
  goal: {amount:0, currency:null}
};

/* ========== HELPERS ========== */
const $ = id => document.getElementById(id);
const now = ()=>Date.now();
const saveState = ()=>localStorage.setItem("bt_state_v2", JSON.stringify({
  expenses: state.expenses, theme: state.theme, displayCurrency: state.displayCurrency, goal: state.goal,
  rates: state.rates, ratesFetchedAt: state.ratesFetchedAt
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

// initial page may have saved initial choices
function applyInitialSettingsIfAny(){
  const initCurr = localStorage.getItem('bt_initial_displayCurrency');
  const initTheme = localStorage.getItem('bt_initial_theme');
  if(initCurr){ state.displayCurrency = initCurr; localStorage.removeItem('bt_initial_displayCurrency'); }
  if(initTheme){ state.theme = initTheme; localStorage.removeItem('bt_initial_theme'); }
}

/* ========== RATES ========== */
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
  }catch(err){
    console.error('fetchRates error', err);
    return state.rates;
  }
}

function convert(amount, from, to){
  if(!state.rates || !state.rates.rates) return amount;
  const rates = state.rates.rates;
  const base = state.rates.base || "EUR";
  if(from === to) return amount;
  if(from === base){
    if(!rates[to]) return amount;
    return amount * rates[to];
  }
  if(to === base){
    if(!rates[from]) return amount;
    return amount / rates[from];
  }
  const rateFrom = rates[from], rateTo = rates[to];
  if(!rateFrom || !rateTo) return amount;
  return (amount / rateFrom) * rateTo;
}

function symbolFor(code){
  if(CURRENCIES[code]) return CURRENCIES[code].split(" - ")[0];
  return code + " ";
}
function numberWithCommas(x){ return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

/* ========== UI INIT ========== */
let barChart, pieChart;
function populateCurrencyDropdowns(){
  if(!$('currency-select')) return;
  const displaySel = $("currency-select");
  const inputSel = $("input-currency");
  const goalSel = $("goal-currency");
  [displaySel, inputSel, goalSel].forEach(s=>s.innerHTML="");
  Object.keys(CURRENCIES).forEach(code=>{
    const label = CURRENCIES[code];
    const opt = `<option value="${code}">${label}</option>`;
    displaySel.insertAdjacentHTML("beforeend", opt);
    inputSel.insertAdjacentHTML("beforeend", opt);
    goalSel.insertAdjacentHTML("beforeend", opt);
  });
  displaySel.value = state.displayCurrency || "USD";
  inputSel.value = state.displayCurrency || "USD";
  goalSel.value = state.goal.currency || (state.displayCurrency || "USD");
}

function initCharts(){
  if(!document.getElementById('barChart')) return;
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
  if(!$('expense-list')) return;
  const list = $("expense-list");
  list.innerHTML = "";
  const displayCode = $("currency-select").value || state.displayCurrency || "USD";
  let totals = {};
  let totalSpent = 0;
  state.expenses.forEach((e)=>{
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

  const goal = state.goal;
  if(goal && goal.amount && goal.currency){
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

  // charts
  const labels = Object.keys(totals);
  const data = labels.map(l=>totals[l]);
  if(barChart && pieChart){
    barChart.data.labels = labels;
    barChart.data.datasets[0].data = data;
    pieChart.data.labels = labels;
    pieChart.data.datasets[0].data = data;
    barChart.update();
    pieChart.update();
  }

  saveState();
}

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
  if($('expense-form')){
    $('expense-form').addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const title = $('expense-title').value.trim();
      const amount = parseFloat($('expense-amount').value);
      const inputCurrency = $('input-currency').value;
      const category = $('expense-category').value;
      const date = $('expense-date').value;
      if(!title || !amount || isNaN(amount)){ alert('Enter valid title and amount'); return; }
      const id = cryptoRandomId();
      addExpenseObj({id, title, amount:Number(amount), currency: inputCurrency, category, date});
      $('expense-title').value=''; $('expense-amount').value=''; $('expense-date').value='';
    });
  }

  if($('clear-all')) $('clear-all').addEventListener('click', ()=>{
    if(!confirm('Clear all expenses?')) return;
    state.expenses = []; saveState(); renderExpenses();
  });

  if($('set-goal')) $('set-goal').addEventListener('click', ()=>{
    const g = parseFloat($('goal-amount-input').value);
    const gc = $('goal-currency').value;
    if(isNaN(g) || g<=0){ alert('Enter valid goal'); return; }
    state.goal = {amount: g, currency: gc}; $('goal-amount-input').value=''; saveState(); renderExpenses();
  });
  if($('clear-goal')) $('clear-goal').addEventListener('click', ()=>{ state.goal = {amount:0,currency:null}; saveState(); renderExpenses(); });

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

/* ========== EXPORTS ========== */
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

/* ========== THEME ========== */
function applyTheme(){
  if(state.theme === 'dark'){ document.body.classList.add('dark'); if($('theme-toggle')) $('theme-toggle').innerText='☀️'; }
  else { document.body.classList.remove('dark'); if($('theme-toggle')) $('theme-toggle').innerText='🌙'; }
}

/* ========== UTIL ========== */
function cryptoRandomId(){ return 'id_'+Math.random().toString(36).slice(2,9); }

/* ========== BOOTSTRAP ========== */
(async function bootstrap(){
  loadState();
  applyInitialSettingsIfAny();

  // If initial display currency was saved by intro page, use it as starting value
  const initialDisplay = localStorage.getItem('bt_initial_displayCurrency');
  if(initialDisplay){ state.displayCurrency = initialDisplay; localStorage.removeItem('bt_initial_displayCurrency'); }

  // If initial theme chosen at intro page, apply
  const initTheme = localStorage.getItem('bt_initial_theme');
  if(initTheme){ state.theme = initTheme; localStorage.removeItem('bt_initial_theme'); }

  populateCurrencyDropdowns();
  initCharts();
  setupEventListeners();
  applyTheme();

  await fetchRates();
  renderExpenses();
})();