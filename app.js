let expenses = [];
let savingsGoal = 0;

// Load from localStorage
if(localStorage.getItem("expenses")) expenses = JSON.parse(localStorage.getItem("expenses"));
if(localStorage.getItem("savingsGoal")) savingsGoal = JSON.parse(localStorage.getItem("savingsGoal"));

const categoryLabels = ['Food','Shopping','Travel','Health','Entertainment','Bills','Others'];
const categoryColors = ['#FFCDD2','#FFEB3B','#FF9800','#4DB6AC','#90CAF9','#D7CCC8','#B39DDB'];

// Charts
const categoryCtx = document.getElementById('categoryChart').getContext('2d');
let categoryChart = new Chart(categoryCtx,{
    type:'bar',
    data:{ labels: categoryLabels, datasets:[{ label:'Spending per Category', data:Array(categoryLabels.length).fill(0), backgroundColor: categoryColors }] },
    options:{ responsive:true, plugins:{ legend:{display:false}, title:{display:true,text:'Expenses by Category'} }, scales:{ y:{ beginAtZero:true } } }
});

const trendCtx = document.getElementById('trendChart').getContext('2d');
let trendChart = new Chart(trendCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Spending', data: [], backgroundColor: [] }] },
    options: { responsive: true, plugins: { title: { display: true, text: 'Spending Trend' } } }
});

// Toggle custom category input
document.getElementById('expense-category').addEventListener('change', function () {
    document.getElementById("custom-category").style.display = this.value === "Others" ? "block" : "none";
});

// Save to localStorage
function saveData(){
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("savingsGoal", JSON.stringify(savingsGoal));
}

// Add new expense
function addExpense(){
    const title = document.getElementById("expense-title").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    let category = document.getElementById("expense-category").value;
    if(category==="Others" && document.getElementById("custom-category").value.trim()!=="") category=document.getElementById("custom-category").value;

    const dateVal = document.getElementById("expense-date").value;
    const timeVal = document.getElementById("expense-time").value;

    if(!title || isNaN(amount) || amount <= 0 || !dateVal || !timeVal){
        alert("Please enter valid expense details.");
        return;
    }

    expenses.push({title, amount, category, date:new Date(`${dateVal}T${timeVal}`).toISOString()});
    updateUI();
    saveData();

    // Clear inputs
    document.getElementById("expense-title").value="";
    document.getElementById("expense-amount").value="";
    document.getElementById("custom-category").value="";
    document.getElementById("expense-date").value="";
    document.getElementById("expense-time").value="";
}

// Set savings goal
function updateGoal(){
    const goal = parseFloat(document.getElementById("savings-goal").value);
    if(isNaN(goal) || goal <= 0) return alert("Enter a valid savings goal.");
    savingsGoal = goal;
    updateUI();
    saveData();
}

// Remove all expenses
function resetExpenses(){
    if(!confirm("Are you sure you want to delete all expenses?")) return;
    expenses = [];
    savingsGoal = 0;
    localStorage.removeItem("expenses");
    localStorage.removeItem("savingsGoal");
    updateUI();
}

// Delete single expense
function deleteExpense(index){
    expenses.splice(index, 1);
    updateUI();
    saveData();
}

// Update UI
function updateUI(){
    const total = expenses.reduce((s,e)=>s+e.amount,0);
    document.getElementById("total-spent").innerText = total.toFixed(2);

    const today = new Date();
    const dailyTotal = expenses.filter(e=>new Date(e.date).toDateString()===today.toDateString()).reduce((s,e)=>s+e.amount,0);
    const monthlyTotal = expenses.filter(e=>{const d=new Date(e.date); return d.getMonth()===today.getMonth() && d.getFullYear()===today.getFullYear();}).reduce((s,e)=>s+e.amount,0);
    const yearlyTotal = expenses.filter(e=>new Date(e.date).getFullYear()===today.getFullYear()).reduce((s,e)=>s+e.amount,0);

    document.getElementById("daily-total").innerText = `Daily: $${dailyTotal.toFixed(2)}`;
    document.getElementById("monthly-total").innerText = `Monthly: $${monthlyTotal.toFixed(2)}`;
    document.getElementById("yearly-total").innerText = `Yearly: $${yearlyTotal.toFixed(2)}`;

    // List
    const list = document.getElementById("expense-list");
    list.innerHTML = "";
    expenses.sort((a,b)=>new Date(b.date)-new Date(a.date));
    expenses.forEach((e,i)=>{
        const li = document.createElement("li");
        const d = new Date(e.date);
        if(d.toDateString() === today.toDateString()) li.classList.add("today-expense");
        li.innerHTML = `<strong>${e.title}</strong> - $${e.amount.toFixed(2)} (${e.category}) <br><small>${d.toLocaleString()}</small>
        <span style="cursor:pointer;color:#D32F2F" onclick="deleteExpense(${i})">❌</span>`;
        list.appendChild(li);
    });

    // Category chart
    const totals = {};
    expenses.forEach(e=>totals[e.category]=(totals[e.category]||0)+e.amount);
    categoryChart.data.datasets[0].data = categoryLabels.map(c=>totals[c]||0);
    categoryChart.update();

    // Trend chart
    updateTrendChart(document.getElementById("trend-chart-select").value);

    // Goal messages
    if(savingsGoal > 0){
        const remaining = savingsGoal - total;
        document.getElementById("goal-msg").innerText = `Savings Goal: $${savingsGoal.toFixed(2)}`;
        document.getElementById("goal-remaining").innerText = remaining >= 0 ? `Remaining: $${remaining.toFixed(2)}` : `Exceeded by $${(-remaining).toFixed(2)}`;
    } else {
        document.getElementById("goal-msg").innerText="";
        document.getElementById("goal-remaining").innerText="";
    }
}

// Download CSV
function downloadCSV(){
    if(expenses.length === 0) return alert("No expenses to export!");
    let csv = "Title,Amount,Category,Date & Time\n";
    expenses.forEach(e=>csv+=`"${e.title}",${e.amount},"${e.category}","${new Date(e.date).toLocaleString()}"\n`);
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "expenses.csv"; a.click(); URL.revokeObjectURL(url);
}

// Download PDF
async function downloadPDF(){
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','pt','a4');
    let y=40;
    pdf.setFontSize(20); pdf.text("💼 Budget Tracker Report", 210, y, {align:"center"}); y+=30;
    pdf.setFontSize(12); pdf.text(`Generated on: ${new Date().toLocaleString()}`, 40, y); y+=20;

    const totalSpent = expenses.reduce((s,e)=>s+e.amount,0);
    pdf.setFontSize(14); pdf.text(`Total Spent: $${totalSpent.toFixed(2)}`, 40, y); y+=20;
    if(savingsGoal>0){ const remaining= savingsGoal-totalSpent; pdf.text(`Savings Goal: $${savingsGoal.toFixed(2)}`,40,y); y+=15; pdf.text(remaining>=0?`Remaining: $${remaining.toFixed(2)}`:`Exceeded by $${(-remaining).toFixed(2)}`,40,y); y+=20; }

    // Charts images
    const catImg = document.getElementById('categoryChart').toDataURL('image/png',1.0);
    const trendImg = document.getElementById('trendChart').toDataURL('image/png',1.0);
    pdf.addImage(catImg,'PNG',40,y,500,200); y+=210;
    pdf.addImage(trendImg,'PNG',40,y,500,200); y+=210;

    pdf.save("BudgetTracker_Report.pdf");
}

// Update Category Chart Type
function updateCategoryChartType(type){
    categoryChart.destroy();
    categoryChart = new Chart(categoryCtx,{
        type: type,
        data:{ labels: categoryLabels, datasets:[{ label:'Spending per Category', data:Array(categoryLabels.length).fill(0), backgroundColor: categoryColors }] },
        options:{ responsive:true, plugins:{ legend:{display:false}, title:{display:true,text:'Expenses by Category'} }, scales:{ y:{ beginAtZero:true } } }
    });
    updateUI();
}

// Update Trend Chart Type
function updateTrendChartType(option){
    updateTrendChart(option);
}

// Update Trend Chart Data
function updateTrendChart(option){
    let labels=[], data=[], colors=[];
    const today = new Date();

    if(option==='daily'){
        for(let i=29;i>=0;i--){
            const d = new Date(); d.setDate(d.getDate()-i);
            labels.push(d.toLocaleDateString());
            const total = expenses.filter(e=>new Date(e.date).toDateString()===d.toDateString()).reduce((s,e)=>s+e.amount,0);
            data.push(total);
            colors.push(d.toDateString()===today.toDateString()?'#FF5722':'#FFCDD2');
        }
    } else if(option==='monthly'){
        for(let i=0;i<12;i++){
            const total = expenses.filter(e=>{const d=new Date(e.date); return d.getMonth()===i && d.getFullYear()===today.getFullYear();}).reduce((s,e)=>s+e.amount,0);
            labels.push(new Date(today.getFullYear(),i).toLocaleString('default',{month:'short'}));
            data.push(total);
            colors.push('#90CAF9');
        }
    } else if(option==='quarterly'){
        for(let i=0;i<4;i++){
            const qStart = new Date(today.getFullYear(), i*3, 1);
            const qEnd = new Date(today.getFullYear(), i*3+3, 0);
            const total = expenses.filter(e=>{const d=new Date(e.date); return d>=qStart && d<=qEnd;}).reduce((s,e)=>s+e.amount,0);
            labels.push(`Q${i+1}`);
            data.push(total);
            colors.push('#4DB6AC');
        }
    } else if(option==='yearly'){
        const years = [...new Set(expenses.map(e=>new Date(e.date).getFullYear()))].sort();
        years.forEach(y=>{
            const total = expenses.filter(e=>new Date(e.date).getFullYear()===y).reduce((s,e)=>s+e.amount,0);
            labels.push(y);
            data.push(total);
            colors.push('#D7CCC8');
        });
    }

    trendChart.destroy();
    trendChart = new Chart(trendCtx,{
        type:'bar',
        data:{ labels, datasets:[{ label:'Spending', data, backgroundColor: colors }] },
        options:{ responsive:true, plugins:{ title:{display:true,text:`Spending Trend (${option})`} } }
    });
}

// Initial UI
updateUI();
