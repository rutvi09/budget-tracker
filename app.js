let expenses = [];
let savingsGoal = 0;

document.getElementById("expense-form").addEventListener("submit", function(event) {
    event.preventDefault();

    let title = document.getElementById("title").value;
    let amount = parseFloat(document.getElementById("amount").value);
    let category = document.getElementById("category").value;

    expenses.push({ title, amount, category });

    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";

    updateUI();
});

document.getElementById("goal-form").addEventListener("submit", function(event) {
    event.preventDefault();
    
    savingsGoal = parseFloat(document.getElementById("goal-amount-input").value);
    document.getElementById("goal-amount-input").value = "";

    updateUI();
});

function deleteExpense(i) {
    expenses.splice(i, 1);
    updateUI();
}

function updateUI() {
    const currency = document.getElementById("currency-select").value;

    let totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById("total-spent").innerText = `${currency}${totalSpent.toFixed(2)}`;

    let list = document.getElementById("expense-list");
    list.innerHTML = "";

    expenses.forEach((e, i) => {
        let li = document.createElement("li");
        li.innerHTML = `${e.title} - ${currency}${e.amount.toFixed(2)} (${e.category})
        <button onclick="deleteExpense(${i})">❌</button>`;
        list.appendChild(li);
    });

    let goalRemainingEl = document.getElementById("goal-remaining");

    if (savingsGoal > 0) {
        let remaining = savingsGoal - totalSpent;
        if (remaining >= 0) {
            goalRemainingEl.innerText = `💰 You are ${currency}${remaining.toFixed(2)} below your goal.`;
        } else {
            goalRemainingEl.innerText = `⚠️ You exceeded your goal by ${currency}${Math.abs(remaining).toFixed(2)}!`;
        }
    } else {
        goalRemainingEl.innerText = "";
    }
}