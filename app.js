const $ = id => document.getElementById(id);

let expenses = JSON.parse(localStorage.getItem("exp") || "[]");
let goal = JSON.parse(localStorage.getItem("goal") || '{"amount":0,"currency":"USD"}');
let rates = {};

// Fetch Live Currency Rates (API)
async function fetchRates() {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  rates = await res.json();
  fillCurrencies();
  render();
}

// Fill dropdowns
function fillCurrencies() {
  const options = Object.keys(rates.rates)
    .map(c => `<option ${c==="USD"?"selected":""}>${c}</option>`).join("");
  $("currency").innerHTML = options;
  $("goal-cur").innerHTML = options;
}

const convert = (amt, cur) => amt * (rates.rates[cur] || 1);

// Add Expense
$("add").onclick = () => {
  const a = parseFloat($("amount").value);
  const d = $("desc").value;
  const c = $("currency").value;
  if(!a || !d) return alert("Enter details!");

  expenses.push({ amount:a, desc:d, currency:c });
  localStorage.setItem("exp",JSON.stringify(expenses));
  
  $("amount").value = "";
  $("desc").value = "";
  render();
};

// Set Goal
$("set-goal").onclick = () => {
  goal.amount = parseFloat($("goal").value);
  goal.currency = $("goal-cur").value;
  localStorage.setItem("goal",JSON.stringify(goal));
  render();
};

// Goal Alerts
function checkGoal(total) {
  if(goal.amount === 0) {
    $("remaining").textContent="—";
    $("goal-msg").textContent="";
    return;
  }

  let goalUSD = convert(goal.amount, goal.currency);
  let left = goalUSD - total;

  if(left > 0) {
    $("goal-msg").textContent="Great! Keep saving! 😊";
    $("goal-msg").style.color="green";
    $("remaining").textContent = left.toFixed(2);
  } else {
    $("goal-msg").textContent="Goal Achieved! 🎉";
    $("goal-msg").style.color="blue";
    $("remaining").textContent = "0";
    
    // Sound + Vibration (Feature C)
    $("alert-sound").play();
    if(navigator.vibrate) navigator.vibrate([200,100,200]);
  }
}

// Chart
let chart;
function drawChart() {
  const ctx = document.getElementById("chart").getContext("2d");
  if(chart) chart.destroy();
  chart = new Chart(ctx,{
    type:"bar",
    data:{
      labels:expenses.map(e=>e.desc),
      datasets:[{
        label:"Expenses (USD)",
        data:expenses.map(e=>convert(e.amount, e.currency)),
      }]
    }
  });
}

// Render All
function render() {
  const total = expenses.reduce((t,e)=>t+convert(e.amount,e.currency),0);
  $("total").textContent = total.toFixed(2);

  $("list").innerHTML = expenses.map(
    e=>`<li>${e.desc} — ${e.amount} ${e.currency}</li>`
  ).join("");

  checkGoal(total);
  drawChart();
}

// Clear All
$("clear").onclick = ()=> {
  expenses = [];
  localStorage.removeItem("exp");
  render();
};

fetchRates();