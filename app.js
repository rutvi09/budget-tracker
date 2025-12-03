let expenses = [];
let savingsGoal = 0;

const categoryLabels = ['Food','Shopping','Travel','Others'];
const categoryColors = ['#FFCDD2','#FFEB3B','#FF9800','#B39DDB'];

// Charts
const barCtx = document.getElementById('categoryBarChart').getContext('2d');
let categoryBarChart = new Chart(barCtx,{
    type:'bar',
    data:{ labels: categoryLabels, datasets:[{ label:'Spending per Category', data:[0,0,0,0], backgroundColor: categoryColors }] },
    options:{ responsive:true, plugins:{ legend:{display:false}, title:{display:true,text:'Expenses by Category (Bar)'} }, scales:{ y:{ beginAtZero:true } } }
});

const pieCtx = document.getElementById('categoryPieChart').getContext('2d');
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

// Add expense
function addExpense(){
    const title = document.getElementById("expense-title").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    let category = categorySelect.value;

    if(category==='Others' && customInput.value.trim()!==''){
        category = 'Others'; // custom entries go into Others
    }

    if(!title || isNaN(amount) || amount<=0){ alert("Enter valid title and amount"); return; }

    expenses.push({title, amount, category});
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
    updateUI();
}

// Update UI
function updateUI(){
    const totalSpent = expenses.reduce((sum,e)=>sum+e.amount,0);
    document.getElementById("total-spent").innerText = totalSpent.toFixed(2);

    // Expense list
    const list = document.getElementById("expense-list");
    list.innerHTML='';
    expenses.forEach((e,i)=>{
        const li=document.createElement('li');
        li.innerHTML=`${e.title} - $${e.amount.toFixed(2)} (${e.category}) <button onclick="deleteExpense(${i})">❌</button>`;
        list.appendChild(li);
    });

    // Goal progress message
    const goalMsgEl = document.getElementById('goal-msg');
    const goalRemainingEl = document.getElementById('goal-remaining');
    if(savingsGoal > 0){
        const remaining = savingsGoal - totalSpent;

        // Above / Below message
        if(remaining > 0){
            goalMsgEl.innerText = "✅ You are below your savings goal!";
            goalMsgEl.style.color = '#FF9800';
            goalRemainingEl.innerText = `💰 You are $${remaining.toFixed(2)} below your goal.`;
            goalRemainingEl.style.color = '#4CAF50';
        } else if(remaining === 0){
            goalMsgEl.innerText = "🎉 You reached your savings goal!";
            goalMsgEl.style.color = '#4CAF50';
            goalRemainingEl.innerText = "🎉 You have exactly reached your goal!";
            goalRemainingEl.style.color = '#4CAF50';
        } else {
            goalMsgEl.innerText = "⚠️ You have exceeded your savings goal!";
            goalMsgEl.style.color = '#F44336';
            goalRemainingEl.innerText = `⚠️ You have exceeded your goal by $${Math.abs(remaining).toFixed(2)}!`;
            goalRemainingEl.style.color = '#F44336';
        }
    } else {
        goalMsgEl.innerText = "";
        goalRemainingEl.innerText = "";
    }

    // Calculate totals for fixed categories
    const totals = { Food:0, Shopping:0, Travel:0, Others:0 };
    expenses.forEach(e=>{
        if(totals.hasOwnProperty(e.category)){
            totals[e.category] += e.amount;
        } else {
            totals['Others'] += e.amount;
        }
    });

    categoryBarChart.data.datasets[0].data = categoryLabels.map(l=>totals[l]);
    categoryPieChart.data.datasets[0].data = categoryLabels.map(l=>totals[l]);
    categoryBarChart.update();
    categoryPieChart.update();
}

// Delete expense
function deleteExpense(index){ expenses.splice(index,1); updateUI(); }

// Download PDF
function downloadPDF(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p','pt','a4');
    html2canvas(document.querySelector('.container')).then(canvas=>{
        const imgData = canvas.toDataURL('image/png');
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

// Initialize
updateUI();
