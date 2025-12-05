let expenses = [];
let savingsGoal = 0;

const categoryLabels = ['Food', 'Shopping', 'Travel', 'Others'];
const categoryColors = ['#FFCDD2','#FFEB3B','#FF9800','#B39DDB'];

// Chart Setup
const barCtx = document.getElementById('categoryBarChart').getContext('2d');
let categoryBarChart = new Chart(barCtx, {
    type: 'bar',
    data: {
        labels: categoryLabels,
        datasets: [{
            label: 'Spending per Category',
            data: [0, 0, 0, 0],
            backgroundColor: categoryColors
        }]
    }
});

const pieCtx = document.getElementById('categoryPieChart').getContext('2d');
let categoryPieChart = new Chart(pieCtx, {
    type: 'pie',
    data: {
        labels: categoryLabels,
        datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: categoryColors
        }]
    }
});

// Show custom category input
document.getElementById("expense-category").addEventListener("change", () => {
    if (categorySelect.value === "Others") {
        customInput.style.display = "block";
    } else {
        customInput.style.display = "none";
        customInput.value = "";
    }
});

// Add Expense
function addExpense() {
    const title = document.getElementById("expense-title").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);

    if (!title || isNaN(amount) || amount <= 0) {
        alert("Enter valid title & amount");
        return;
    }

    const category = document.getElementById("expense-category").value;
    expenses.push({ title, amount, category });

    document.getElementById("expense-title").value = "";
    document.getElementById("expense-amount").value = "";

    updateUI();
}

// Update Goal
function updateGoal() {
    const goal = parseFloat(document.getElementById("savings-goal").value);
    if (isNaN(goal) || goal <= 0) return;
    savingsGoal = goal;
    updateUI();
}

// Update UI & Charts
function updateUI() {
    let total = expenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById("total-spent").innerText = total.toFixed(2);

    let list = document.getElementById("expense-list");
    list.innerHTML = "";
    expenses.forEach((e, i) => {
        list.innerHTML += `<li>${e.title} - $${e.amount.toFixed(2)} (${e.category}) 
            <button onclick="deleteExpense(${i})">❌</button></li>`;
    });

    let totals = { Food:0, Shopping:0, Travel:0, Others:0 };
    expenses.forEach(e => totals[e.category] += e.amount);

    categoryBarChart.data.datasets[0].data = categoryLabels.map(label => totals[label]);
    categoryPieChart.data.datasets[0].data = categoryLabels.map(label => totals[label]);

    categoryBarChart.update();
    categoryPieChart.update();
}

// Delete
function deleteExpense(i) {
    expenses.splice(i, 1);
    updateUI();
}

// PDF Download
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    html2canvas(document.querySelector(".container")).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF();
        pdf.addImage(imgData, "PNG", 0, 0, 210, 300);
        pdf.save("budget-tracker.pdf");
    });
}

// Image Download
function downloadImage() {
    html2canvas(document.querySelector(".container")).then(canvas => {
        const link = document.createElement("a");
        link.download = "budget-tracker.png";
        link.href = canvas.toDataURL();
        link.click();
    });
}

updateUI();