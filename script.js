// Clean, robust script for EMI calculator
(() => {
  // DOM refs
  const onRoadPriceEl = document.getElementById('onRoadPrice');
  const downPaymentEl = document.getElementById('downPayment');
  const tenureEl = document.getElementById('tenure');
  const interestRateEl = document.getElementById('interestRate');
  const rateButtons = Array.from(document.querySelectorAll('.rate-btn'));
  const rateTypeLabel = document.getElementById('rateTypeLabel');
  const calculateBtn = document.getElementById('calculateBtn');
  const resultsSection = document.getElementById('resultsSection');
  const flatRateBadge = document.getElementById('flatRateBadge');
  const reducingRateBadge = document.getElementById('reducingRateBadge');
  const flatLoanAmountEl = document.getElementById('flatLoanAmount');
  const reducingLoanAmountEl = document.getElementById('reducingLoanAmount');
  const flatEmiEl = document.getElementById('flatEmi');
  const reducingEmiEl = document.getElementById('reducingEmi');
  const flatTotalInterestEl = document.getElementById('flatTotalInterest');
  const reducingTotalInterestEl = document.getElementById('reducingTotalInterest');
  const flatTotalPayableEl = document.getElementById('flatTotalPayable');
  const reducingTotalPayableEl = document.getElementById('reducingTotalPayable');
  const breakdownBtns = Array.from(document.querySelectorAll('.breakdown-btn'));
  const modal = document.getElementById('breakdownModal');
  const closeModal = document.getElementById('closeModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const tableBody = document.getElementById('tableBody');
  const modalRateTypeEl = document.getElementById('modalRateType');
  const downloadBtn = document.getElementById('downloadBtn');
  const themeToggle = document.getElementById('themeToggle');
  const comparisonCanvas = document.getElementById('comparisonChart');

  let currentRateType = 'flat';
  let chart = null;
  let lastResults = null;

  // init
  function init() {
    // load theme
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-theme');
      themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    // rate buttons
    rateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        rateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRateType = btn.dataset.type;
        rateTypeLabel.textContent = currentRateType === 'flat' ? 'Flat' : 'Reducing';
        // when switching, interpret current input as the selected rate type
        // immediate conversion to show both rates
        convertRatesFromInput();
      });
    });

    // input listeners
    [onRoadPriceEl, downPaymentEl, tenureEl].forEach(el => el.addEventListener('input', validateInputs));
    interestRateEl.addEventListener('input', convertRatesFromInput);

    calculateBtn.addEventListener('click', calculateEMIs);

    // breakdown modal
    breakdownBtns.forEach(b => b.addEventListener('click', () => openModal(b.dataset.rate)));
    closeModal.addEventListener('click', closeModalFn);
    closeModalBtn.addEventListener('click', closeModalFn);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModalFn(); });

    downloadBtn.addEventListener('click', downloadCSV);

    themeToggle.addEventListener('click', toggleTheme);

    // initial conversion & calculation
    convertRatesFromInput();
    calculateEMIs();
  }

  // theme toggle
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    // redraw chart colors if present
    if (chart) chart.update();
  }

  function validateInputs() {
    const onRoad = Number(onRoadPriceEl.value) || 0;
    let down = Number(downPaymentEl.value) || 0;
    const tenure = parseInt(tenureEl.value, 10) || 1;

    if (down > onRoad) {
      down = onRoad;
      downPaymentEl.value = down;
    }
    if (tenure < 1) tenureEl.value = 1;
  }

  function convertRatesFromInput() {
    validateInputs();
    const inputRate = Number(interestRateEl.value) || 0;
    const tenure = parseInt(tenureEl.value, 10) || 1;

    let flatRate, reducingRate;
    if (currentRateType === 'flat') {
      flatRate = inputRate;
      // approximation: reducing ≈ (2 × flat) / (tenureMonths + 1)
      reducingRate = (2 * flatRate) / (tenure + 1);
    } else {
      reducingRate = inputRate;
      flatRate = (reducingRate * (tenure + 1)) / 2;
    }

    // update pills / badges
    rateTypeLabel.textContent = currentRateType === 'flat' ? 'Flat' : 'Reducing';
    // set a display-only badge for user clarity in inputs (do not overwrite input field)
    flatRateBadge.textContent = flatRate.toFixed(2) + '%';
    reducingRateBadge.textContent = reducingRate.toFixed(2) + '%';

    // store result for calculate
    lastResults = { flatRate, reducingRate };
  }

  function calculateEMIs() {
    validateInputs();
    if (!lastResults) convertRatesFromInput();

    const onRoad = Number(onRoadPriceEl.value) || 0;
    const down = Number(downPaymentEl.value) || 0;
    const principal = Math.max(0, onRoad - down);
    const tenure = parseInt(tenureEl.value, 10) || 1;

    const flatRate = lastResults.flatRate;
    const reducingRate = lastResults.reducingRate;

    // flat EMI
    // totalInterest (flat) = Principal * (flatRate/100) * (years)
    const years = tenure / 12;
    const totalFlatInterest = principal * (flatRate / 100) * years;
    const flatEMI = (principal + totalFlatInterest) / tenure;
    const flatTotalPayable = flatEMI * tenure;

    // reducing EMI (standard amortization formula)
    const monthlyReducingRate = (reducingRate / 100) / 12;
    let reducingEMI;
    if (monthlyReducingRate === 0) {
      reducingEMI = principal / tenure;
    } else {
      const r = monthlyReducingRate;
      const numerator = principal * r * Math.pow(1 + r, tenure);
      const denominator = Math.pow(1 + r, tenure) - 1;
      reducingEMI = numerator / denominator;
    }
    const reducingTotalPayable = reducingEMI * tenure;

    // totals
    const reducingTotalInterest = reducingTotalPayable - principal;
    const flatTotalInterestRounded = totalFlatInterest;

    // update UI
    flatLoanAmountEl.textContent = formatCurrency(principal);
    reducingLoanAmountEl.textContent = formatCurrency(principal);

    flatEmiEl.textContent = formatCurrency(flatEMI);
    reducingEmiEl.textContent = formatCurrency(reducingEMI);

    flatTotalInterestEl.textContent = formatCurrency(flatTotalInterestRounded);
    reducingTotalInterestEl.textContent = formatCurrency(reducingTotalInterest);

    flatTotalPayableEl.textContent = formatCurrency(flatTotalPayable);
    reducingTotalPayableEl.textContent = formatCurrency(reducingTotalPayable);

    // show results
    resultsSection.classList.remove('hidden');

    // keep results for schedule / download
    lastResults = {
      ...lastResults,
      principal,
      tenure,
      flatEMI,
      reducingEMI,
      flatTotalInterest: flatTotalInterestRounded,
      reducingTotalInterest,
      flatTotalPayable,
      reducingTotalPayable
    };

    renderComparisonChart(lastResults);
  }

  function formatCurrency(value) {
    if (Number.isNaN(value)) value = 0;
    return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  // Chart
  function renderComparisonChart(data) {
    const labels = ['Monthly EMI', 'Total Interest', 'Total Payable'];
    const flatDataset = [data.flatEMI, data.flatTotalInterest, data.flatTotalPayable];
    const reducingDataset = [data.reducingEMI, data.reducingTotalInterest, data.reducingTotalPayable];

    if (chart) chart.destroy();

    chart = new Chart(comparisonCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `Flat (${data.flatRate.toFixed(2)}%)`,
            data: flatDataset.map(v => Number(v.toFixed(2))),
            backgroundColor: getComputedStyle(document.body).classList.contains('dark-theme') ? 'rgba(255,186,119,0.9)' : 'rgba(255,149,0,0.9)',
          },
          {
            label: `Reducing (${data.reducingRate.toFixed(2)}%)`,
            data: reducingDataset.map(v => Number(v.toFixed(2))),
            backgroundColor: 'rgba(52,199,89,0.85)',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: getComputedStyle(document.body).color } }
        },
        scales: {
          y: { ticks: { callback: v => '₹' + Number(v).toLocaleString() } },
          x: { ticks: { color: getComputedStyle(document.body).color } }
        }
      }
    });
  }

  // Breakdown modal (flat or reducing)
  function openModal(type) {
    if (!lastResults) return;
    modal.setAttribute('aria-hidden', 'false');
    modalRateTypeEl.textContent = type === 'flat' ? 'Flat Rate Schedule' : 'Reducing Rate Schedule';

    // generate schedule
    const schedule = type === 'flat' ? generateFlatSchedule(lastResults) : generateReducingSchedule(lastResults);

    // populate table
    tableBody.innerHTML = '';
    schedule.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${row.month}</td>
                      <td style="text-align:right">${formatCurrency(row.emi)}</td>
                      <td style="text-align:right">${formatCurrency(row.principal)}</td>
                      <td style="text-align:right">${formatCurrency(row.interest)}</td>
                      <td style="text-align:right">${formatCurrency(row.balance)}</td>`;
      tableBody.appendChild(tr);
    });

    // store current modal type for download
    modal.dataset.type = type;
  }

  function closeModalFn() {
    modal.setAttribute('aria-hidden', 'true');
    tableBody.innerHTML = '';
  }

  function generateFlatSchedule(results) {
    const { principal, tenure, flatEMI, flatTotalInterest } = results;
    const monthlyInterest = flatTotalInterest / tenure;
    let remaining = principal;
    const out = [];
    for (let m = 1; m <= tenure; m++) {
      const interest = monthlyInterest;
      const principalPaid = Math.min(remaining, flatEMI - interest);
      remaining = Math.max(0, remaining - principalPaid);
      out.push({ month: m, emi: flatEMI, principal: principalPaid, interest, balance: remaining });
    }
    return out;
  }

  function generateReducingSchedule(results) {
    const { principal, tenure, reducingEMI, reducingRate } = results;
    const monthlyRate = (reducingRate / 100) / 12;
    let remaining = principal;
    const out = [];
    for (let m = 1; m <= tenure; m++) {
      const interest = remaining * monthlyRate;
      const principalPaid = reducingEMI - interest;
      remaining = Math.max(0, remaining - principalPaid);
      out.push({ month: m, emi: reducingEMI, principal: principalPaid, interest, balance: remaining });
    }
    return out;
  }

  function downloadCSV() {
    const type = modal.dataset.type || 'flat';
    const schedule = type === 'flat' ? generateFlatSchedule(lastResults) : generateReducingSchedule(lastResults);

    let csv = 'Month,EMI,Principal,Interest,Balance\n';
    schedule.forEach(r => {
      csv += `${r.month},${Number(r.emi).toFixed(2)},${Number(r.principal).toFixed(2)},${Number(r.interest).toFixed(2)},${Number(r.balance).toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `emi_schedule_${type}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // start
  init();
})();
