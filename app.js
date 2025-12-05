
const $ = id => document.getElementById(id);

let state = { expenses: [], goal: null, rates: null, displayCurrency: "INR" };

async function fetchRates() {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/INR");
  state.rates = (await res.json()).rates;
  renderExpenses();
}

function convert(amount, from, to) {
  if (!state.rates) return amount;
  const inINR = amount / state.rates[from];
  return inINR * state.rates[to];
}

function symbolFor(c) {
  return { INR: "₹", USD: "$", EUR: "€", GBP: "£" }[c] || "";
}

function numberWithCommas(x) {
  return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function addExpense() {
  const amount = parseFloat($("amount").value);
  if (!amount) return;

  state.expenses.push({
    category: $("category").value,
    amount,
    currency: $("currency").value
  });

  $("amount").value = "";
  renderExpenses();
}

function setGoal() {
  const amount = parseFloat($("goal-amount").value);
  if (!amount) return;
  
  state.goal = {
    amount,
    currency: $("goal-currency").value
  };

  $("goal-amount").value = "";
  $("set-goal").style.display = "none";
  $("reset-goal").style.display = "inline-block";
  renderExpenses();
}

function resetGoal() {
  state.goal = null;
  $("goal-status").textContent = "";
  $("remaining-goal").textContent = "—";
  $("set-goal").style.display = "inline-block";
  $("reset-goal").style.display = "none";
  renderExpenses();
}

function changeDisplayCurrency() {
  state.displayCurrency = $("currency-select").value;
  renderExpenses();
}

function renderExpenses() {
  const list = $("expense-list");
  list.innerHTML = "";
  let total = 0;
  const disp = state.displayCurrency;

  state.expenses.forEach(exp => {
    const c = convert(exp.amount, exp.currency, disp);
    total += c;
    list.innerHTML += `<li>${exp.category} - ${symbolFor(disp)}${c.toFixed(2)}</li>`;
  });

  $("total-spent").textContent = symbolFor(disp) + total.toFixed(2);

  updateGoal(total);
  renderChart();
}

function updateGoal(totalSpent) {
  const disp = state.displayCurrency;
  const goal = state.goal;

  if (!goal) return;

  const convertedGoal = convert(goal.amount, goal.currency, disp);
  const remain = convertedGoal - totalSpent;

  if (remain > 0) {
    $("remaining-goal").textContent = symbolFor(disp) + remain.toFixed(2);
    $("goal-status").textContent = "You're doing great! Keep saving! 😊";
    $("goal-status").style.color = "white";
  } else {
    $("remaining-goal").textContent = "Goal Reached! 🎉";
    $("goal-status").textContent = "Amazing! You achieved your goal! 🏆";
    $("goal-status").style.color = "var(--primary)";
  }
}

let chart;
function renderChart() {
  const ctx = $("expense-chart");
  const categories = {};
  const disp = state.displayCurrency;

  state.expenses.forEach(exp => {
    const c = convert(exp.amount, exp.currency, disp);
    categories[exp.category] = (categories[exp.category] || 0) + c;
  });

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories)
      }]
    }
  });
}

function exportAsPDF() {
  alert("📌 PDF Export will be added soon! (Working on it!)");
}

fetchRates();