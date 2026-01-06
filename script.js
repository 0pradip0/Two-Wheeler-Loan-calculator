// State Management
let currentState = {
    onRoadPrice: 500000,
    downPayment: 100000,
    tenure: 60,
    interestRate: 8. 5,
    rateType: 'flat', // 'flat' or 'reducing'
    flatRate: 8.5,
    reducingRate: null,
    results: null
};

let comparisonChart = null;

// DOM Elements
const onRoadPriceInput = document.getElementById('onRoadPrice');
const downPaymentInput = document.getElementById('downPayment');
const tenureInput = document.getElementById('tenure');
const interestRateInput = document.getElementById('interestRate');
const calculateBtn = document.getElementById('calculateBtn');
const themeToggle = document.getElementById('themeToggle');
const rateButtons = document.querySelectorAll('. rate-btn');
const resultsSection = document.getElementById('resultsSection');
const breakdownButtons = document.querySelectorAll('. breakdown-btn');
const breakdownModal = document.getElementById('breakdownModal');
const closeModal = document.getElementById('closeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const rateTypeLabel = document.getElementById('rateTypeLabel');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
    calculateEMI();
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body. classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// Event Listeners Setup
function setupEventListeners() {
    onRoadPriceInput.addEventListener('input', handleInputChange);
    downPaymentInput.addEventListener('input', handleInputChange);
    tenureInput.addEventListener('input', handleInputChange);
    interestRateInput.addEventListener('input', handleInterestRateChange);
    calculateBtn.addEventListener('click', calculateEMI);

    // Rate Type Toggle
    rateButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            rateButtons.forEach(b => b.classList.remove('active'));
            e.target.closest('.rate-btn').classList.add('active');
            currentState.rateType = e. target.closest('.rate-btn').dataset.rateType;
            updateRateTypeLabel();
            calculateEMI();
        });
    });

    // Breakdown Buttons
    breakdownButtons.forEach(btn => {
        btn. addEventListener('click', () => {
            const rateType = btn.dataset.rateType;
            showBreakdownModal(rateType);
        });
    });

    closeModal.addEventListener('click', () => breakdownModal.classList.remove('active'));
    closeModalBtn.addEventListener('click', () => breakdownModal.classList.remove('active'));
    breakdownModal.addEventListener('click', (e) => {
        if (e.target === breakdownModal) {
            breakdownModal.classList.remove('active');
        }
    });
}

function handleInputChange() {
    currentState.onRoadPrice = parseFloat(onRoadPriceInput.value) || 0;
    currentState.downPayment = parseFloat(downPaymentInput.value) || 0;
    currentState. tenure = parseInt(tenureInput.value) || 1;
    
    // Validate inputs
    if (currentState. downPayment > currentState.onRoadPrice) {
        currentState.downPayment = currentState.onRoadPrice;
        downPaymentInput.value = currentState.downPayment;
    }
}

function handleInterestRateChange() {
    currentState.interestRate = parseFloat(interestRateInput.value) || 0;
    
    if (currentState.rateType === 'flat') {
        currentState.flatRate = currentState.interestRate;
        currentState.reducingRate = convertFlatToReducing(
            currentState.flatRate,
            currentState.tenure
        );
    } else {
        currentState.reducingRate = currentState.interestRate;
        currentState.flatRate = convertReducingToFlat(
            currentState.reducingRate,
            currentState.tenure
        );
    }
}

// Interest Rate Conversion Functions
function convertFlatToReducing(flatRate, tenure) {
    // Reducing rate ≈ (2 × Flat rate) / (Tenure + 1)
    return (2 * flatRate) / (tenure + 1);
}

function convertReducingToFlat(reducingRate, tenure) {
    // Flat rate ≈ (Reducing rate × (Tenure + 1)) / 2
    return (reducingRate * (tenure + 1)) / 2;
}

function updateRateTypeLabel() {
    const label = currentState.rateType === 'flat' ? 'Flat Rate' : 'Reducing Rate';
    rateTypeLabel.textContent = label;
}

// EMI Calculation
function calculateEMI() {
    handleInputChange();
    handleInterestRateChange();

    const loanAmount = currentState.onRoadPrice - currentState.downPayment;
    const monthlyRate = currentState.reducingRate / 100 / 12;
    const tenure = currentState.tenure;

    // Reducing Interest Rate EMI Calculation
    const reducingEMI = calculateReducingEMI(
        loanAmount,
        currentState.reducingRate,
        tenure
    );

    // Flat Interest Rate EMI Calculation
    const flatEMI = calculateFlatEMI(
        loanAmount,
        currentState. flatRate,
        tenure
    );

    // Calculate totals
    const flatTotalPayable = flatEMI * tenure;
    const flatTotalInterest = flatTotalPayable - loanAmount;

    const reducingTotalPayable = reducingEMI * tenure;
    const reducingTotalInterest = reducingTotalPayable - loanAmount;

    currentState.results = {
        loanAmount,
        flatRate: currentState.flatRate,
        reducingRate: currentState. reducingRate,
        flatEMI,
        reducingEMI,
        flatTotalInterest,
        reducingTotalInterest,
        flatTotalPayable,
        reducingTotalPayable,
        tenure
    };

    updateUI();
}

function calculateFlatEMI(principal, rate, months) {
    // Flat EMI = (Principal + (Principal × Rate × Tenure)) / Tenure
    const totalInterest = principal * (rate / 100) * (months / 12);
    return (principal + totalInterest) / months;
}

function calculateReducingEMI(principal, rate, months) {
    // Reducing EMI = (Principal × Rate × (1 + Rate)^Tenure) / ((1 + Rate)^Tenure - 1)
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
    const denominator = Math.pow(1 + monthlyRate, months) - 1;
    return numerator / denominator;
}

// UI Update
function updateUI() {
    const results = currentState.results;
    
    // Update Flat Rate Card
    document.getElementById('flatRateBadge').textContent = `${results.flatRate.toFixed(2)}%`;
    document.getElementById('flatLoanAmount').textContent = formatCurrency(results.loanAmount);
    document.getElementById('flatEmi').textContent = formatCurrency(results.flatEMI);
    document.getElementById('flatTotalInterest').textContent = formatCurrency(results.flatTotalInterest);
    document.getElementById('flatTotalPayable').textContent = formatCurrency(results.flatTotalPayable);

    // Update Reducing Rate Card
    document.getElementById('reducingRateBadge').textContent = `${results.reducingRate.toFixed(2)}%`;
    document.getElementById('reducingLoanAmount').textContent = formatCurrency(results.loanAmount);
    document.getElementById('reducingEmi').textContent = formatCurrency(results.reducingEMI);
    document.getElementById('reducingTotalInterest').textContent = formatCurrency(results.reducingTotalInterest);
    document.getElementById('reducingTotalPayable').textContent = formatCurrency(results. reducingTotalPayable);

    // Show results section
    resultsSection. style.display = 'block';

    // Update chart
    updateComparisonChart();
}

// Comparison Chart
function updateComparisonChart() {
    const results = currentState.results;
    const ctx = document.getElementById('comparisonChart').getContext('2d');

    // Destroy existing chart
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['EMI Amount', 'Total Interest', 'Total Payable'],
            datasets: [
                {
                    label:  `Flat (${results.flatRate.toFixed(2)}%)`,
                    data: [results.flatEMI, results.flatTotalInterest, results.flatTotalPayable],
                    backgroundColor:  'rgba(255, 149, 0, 0.6)',
                    borderColor: 'rgba(255, 149, 0, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                },
                {
                    label:  `Reducing (${results.reducingRate.toFixed(2)}%)`,
                    data: [results.reducingEMI, results.reducingTotalInterest, results.reducingTotalPayable],
                    backgroundColor: 'rgba(52, 199, 89, 0.6)',
                    borderColor: 'rgba(52, 199, 89, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document. documentElement).getPropertyValue('--text-primary'),
                        font: { size: 12, weight: '600' }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary'),
                        callback: (value) => '₹' + value.toLocaleString()
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--glass-border')
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Breakdown Modal
function showBreakdownModal(rateType) {
    const results = currentState.results;
    const isFlat = rateType === 'flat';
    
    document.getElementById('modalRateType').textContent = isFlat ? 'Flat Rate' : 'Reducing Rate';

    const schedule = isFlat
        ? generateFlatAmortizationSchedule()
        : generateReducingAmortizationSchedule();

    populateTable(schedule);
    breakdownModal.classList.add('active');
}

function generateFlatAmortizationSchedule() {
    const results = currentState.results;
    const monthlyRate = results.flatRate / 100 / 12;
    const loanAmount = results.loanAmount;
    const tenure = results. tenure;
    const emi = results.flatEMI;

    const schedule = [];
    let remainingBalance = loanAmount;
    const totalInterest = results.flatTotalInterest;
    const monthlyInterest = totalInterest / tenure;

    for (let month = 1; month <= tenure; month++) {
        const interest = monthlyInterest;
        const principal = emi - interest;
        remainingBalance -= principal;

        schedule.push({
            month,
            emi,
            principal,
            interest,
            balance: Math.max(0, remainingBalance)
        });
    }

    return schedule;
}

function generateReducingAmortizationSchedule() {
    const results = currentState.results;
    const monthlyRate = results.reducingRate / 100 / 12;
    const loanAmount = results.loanAmount;
    const tenure = results.tenure;
    const emi = results.reducingEMI;

    const schedule = [];
    let remainingBalance = loanAmount;

    for (let month = 1; month <= tenure; month++) {
        const interest = remainingBalance * monthlyRate;
        const principal = emi - interest;
        remainingBalance -= principal;

        schedule.push({
            month,
            emi,
            principal,
            interest,
            balance: Math.max(0, remainingBalance)
        });
    }

    return schedule;
}

function populateTable(schedule) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    schedule.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.month}</td>
            <td>${formatCurrency(row.emi)}</td>
            <td>${formatCurrency(row.principal)}</td>
            <td>${formatCurrency(row.interest)}</td>
            <td>${formatCurrency(row.balance)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Download CSV
document.getElementById('downloadBtn').addEventListener('click', () => {
    const rateType = document.getElementById('modalRateType').textContent. includes('Flat') ? 'flat' : 'reducing';
    const schedule = rateType === 'flat'
        ? generateFlatAmortizationSchedule()
        : generateReducingAmortizationSchedule();

    let csv = 'Month,EMI,Principal,Interest,Remaining Balance\n';
    schedule.forEach(row => {
        csv += `${row.month},${row.emi. toFixed(2)},${row.principal.toFixed(2)},${row.interest.toFixed(2)},${row.balance.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document. createElement('a');
    a.href = url;
    a. download = `emi-schedule-${rateType}-rate.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
});

// Utility Functions
function formatCurrency(value) {
    return '₹' + value.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}