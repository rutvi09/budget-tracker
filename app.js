let expenses = [];
let savingsGoal = 0;
let goalCurrency = '₹';
let selectedCurrency = '₹';

// Supported currencies
const currencies = ['$', '₹', '€', '£'];

// Category info
const categoryLabels = ['Food','Shopping','Travel','Others'];
const categoryColors = ['#FFCDD2','#FFEB3B','#FF9800','#B39DDB'];

// Get canvas contexts
const barCtx = document.getElementById('categoryBarChart').getContext('2d');
const pieCtx = document.getElementById('categoryPieChart').getContext('2d');

// Initialize charts
let categoryBarChart = new Chart(barCtx,{
    type:'bar',
    data:{ labels: categoryLabels, datasets:[{ label:'Spending per Category', data:[0,0,0,0], backgroundColor: categoryColors }] },
    options:{ responsive:true, plugins:{ legend:{display:false}, title:{display:true,text:'Expenses by Category (Bar)'} }, scales:{ y:{ beginAtZero:true } } }
});

let categoryPieChart = new Chart(pieCtx,{
    type:'pie',
    data:{ labels: categoryLabels, datasets:[{ label:'Spending per Category', data:[0,0,0,0], backgroundColor: categoryColors }] },
    options:{ responsive:true }
});

// Custom category input
const categorySelect = document.getElementById('expense-category');
const customInput = document.getElementById('custom-category');
categorySelect.addEventListener('change', ()=>{
    if(categorySelect.value==='Others'){ customInput.style.display='block'; customInput.focus(); }
    else{ customInput.style.display='none'; customInput.value=''; }
});

// Currency selection
const currencySelect = document.getElementById('currency-select');
currencySelect.innerHTML = currencies.map(c=>`<option value="${c}">${c}</option>`).join('');
currencySelect.addEventListener('change', ()=>{
    selectedCurrency = currencySelect.value;
    updateUI();
});

// Add expense
function addExpense(){
    const title = document.getElementById("expense-title").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    let category = categorySelect.value;

    if(category==='Others' && customInput.value.trim()!==''){
        category = 'Others'; // custom entries go into Others
    }

    if(!title || isNaN(amount) || amount<=0){ alert("Enter valid title and amount"); return; }

    const date = new Date().toLocaleDateString(); // Add date
    expenses.push({title, amount, category, date});
    updateUI();

    document.getElementById("expense-title").value='';
    document.getElementById("expense-amount").value='';
    customInput.value='';
}

// Update Goal
function updateGoal(){
    const goalInput = parseFloat(document.getElementById("savings-goal").value);
    if(isNaN(goalInput) || goalInput<=0){ alert("Enter valid goal"); return; }
    savingsGoal = goalInput;
    goalCurrency = selectedCurrency;
    updateUI();
    document.getElementById("savings-goal").value='';
}

// Update UI
function updateUI(){
    const totalSpent = expenses.reduce((sum,e)=>sum+e.amount,0);
    document.getElementById("total-spent").innerText = `${selectedCurrency}${totalSpent.toFixed(2)}`;

    // Expense list
    const list = document.getElementById("expense-list");
    list.innerHTML='';
    expenses.forEach((e,i)=>{
        const li=document.createElement('li');
        li.innerHTML=`${e.date} - ${e.title} - ${selectedCurrency}${e.amount.toFixed(2)} (${e.category}) <button onclick="deleteExpense(${i})">❌</button>`;
        list.appendChild(li);
    });

    // Goal progress
    const goalMsgEl = document.getElementById('goal-msg');
    const goalRemainingEl = document.getElementById('goal-remaining');
    if(savingsGoal > 0){
        const remaining = savingsGoal - totalSpent;
        if(remaining > 0){
            goalMsgEl.innerText = "✅ You are below your savings goal!";
            goalMsgEl.style.color = '#FF9800';
            goalRemainingEl.innerText = `💰 You are ${goalCurrency}${remaining.toFixed(2)} below your goal.`;
            goalRemainingEl.style.color = '#4CAF50';
        } else if(remaining === 0){
            goalMsgEl.innerText = "🎉 You reached your savings goal!";
            goalMsgEl.style.color = '#4CAF50';
            goalRemainingEl.innerText = `🎉 You have exactly reached your goal!`;
            goalRemainingEl.style.color = '#4CAF50';
        } else {
            goalMsgEl.innerText = "⚠️ You have exceeded your savings goal!";
            goalMsgEl.style.color = '#F44336';
            goalRemainingEl.innerText = `⚠️ You have exceeded your goal by ${goalCurrency}${Math.abs(remaining).toFixed(2)}!`;
            goalRemainingEl.style.color = '#F44336';
        }
    } else {
        goalMsgEl.innerText = "";
        goalRemainingEl.innerText = "";
    }

    // Category totals
    const totals = { Food:0, Shopping:0, Travel:0, Others:0 };
    expenses.forEach(e=>{
        if(totals.hasOwnProperty(e.category)){
            totals[e.category] += e.amount;
        } else {
            totals['Others'] += e.amount;
        }
    });

    // Update charts safely
    const labels = categoryLabels;
    const data = labels.map(l=>totals[l]);
    categoryBarChart.data.labels = labels;
    categoryBarChart.data.datasets[0].data = data;
    categoryPieChart.data.labels = labels;
    categoryPieChart.data.datasets[0].data = data;
    categoryBarChart.update();
    categoryPieChart.update();
}

// Delete expense
function deleteExpense(index){ expenses.splice(index,1); updateUI(); }

// Download PDF
function downloadPDF(){
    const { jsPDF } = window.jspdf;
    html2canvas(document.querySelector('.container')).then(canvas=>{
        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF('p','pt','a4');
        const imgWidth=595;
        const imgHeight=canvas.height*imgWidth/canvas.width;
        doc.addImage(imgData,'PNG',0,0,imgWidth,imgHeight);
        doc.save('budget-tracker.pdf');
    });
}

// Download Image
function downloadImage(){
    html2canvas(document.querySelector('.container')).then(canvas=>{
        const link=document.createElement('a');
        link.download='budget-tracker.png';
        link.href=canvas.toDataURL();
        link.click();
    });
}

// Enter key support
document.querySelectorAll('#expense-title,#expense-amount,#custom-category').forEach(input=>{
    input.addEventListener('keypress',e=>{
        if(e.key==='Enter'){ addExpense(); e.preventDefault(); }
    });
});

// Initialize UI
updateUI();