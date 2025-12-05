const $ = id => document.getElementById(id);

// State
let expenses = [];
let goal = { amount: 0, currency: "USD" };

// Add expense
$("add-expense").addEventListener("click", () => {
  const amt = parseFloat($("expense-amount").value);
  const desc = $("expense-desc").value;
  const cur = $("expense-currency").value;

  if (!amt || !desc) return;

  expenses.push({ amount: amt, desc, currency: cur });
  $("expense-amount").value = "";
  $("expense-desc").value = "";

  renderUI();
});

// Set goal
$("set-goal").addEventListener("click", () => {
  goal.amount = parseFloat($("goal-amount").value) || 0;
  goal.currency = $("goal-currency").value;
  renderUI();
});

// Conversion simplified as 1:1 (You can add real API later)
const convert = amt => amt;

// UI Update
function renderUI() {
  const total = expenses.reduce((t,e)=>t+convert(e.amount),0);
  $("total-spent").textContent = total.toFixed(2);

  let html="";
  expenses.forEach(e => html += `<li>${e.desc} - ${e.amount} ${e.currency}</li>`);
  $("expense-list").innerHTML = html;

  updateGoalStatus(total);
  drawChart();
}

// Goal Alerts
function updateGoalStatus(total){
  const left = goal.amount - total;
  if (goal.amount === 0) {
    $("remaining-goal").textContent = "—";
    $("goal-status").textContent = "";
    return;
  }

  if (left > 0) {
    $("remaining-goal").textContent = left.toFixed(2);
    $("goal-status").textContent = "You're doing great! Keep saving! 😊";
    $("goal-status").style.color = "green";
  } else {
    $("remaining-goal").textContent = "Goal Reached! 🎉";
    $("goal-status").textContent = "Amazing! You achieved your goal! 🏆";
    $("goal-status").style.color = "blue";
  }
}

// Chart
let chart;
function drawChart() {
  const ctx = document.getElementById("expense-chart").getContext("2d");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: expenses.map(e=>e.desc),
      datasets: [{
        label: "Expenses",
        data: expenses.map(e=>convert(e.amount)),
      }]
    }
  });
}

// Export PDF + Clear
$("export-pdf").addEventListener("click", ()=>alert("PDF feature coming soon!"));
$("clear-all").addEventListener("click", ()=>{ expenses=[]; renderUI(); });

renderUI();