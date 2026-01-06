// EMI calculator script with tabs and conversions
(() => {
  // DOM refs
  const modeTabs = Array.from(document.querySelectorAll('.tab'));
  const onRoadEl = document.getElementById('onRoadPrice');
  const downEl = document.getElementById('downPayment');
  const tenureEl = document.getElementById('tenure');
  const interestInput = document.getElementById('interestRate'); // not present in new UI; we'll manage via tabs
  const chipEmi = document.getElementById('chipEmi');
  const chipReducing = document.getElementById('chipReducing');
  const chipFlat = document.getElementById('chipFlat');
  const inputTag = document.getElementById('inputTag');
  const calculateBtn = document.getElementById('calculateBtn');
  const resultsSection = document.getElementById('resultsSection');
  const summaryPrincipal = document.getElementById('summaryPrincipal');
  const summaryTotal = document.getElementById('summaryTotal');
  const summaryInterest = document.getElementById('summaryInterest');
  const calcMethod = document.getElementById('calcMethod');
  const comparisonCanvas = document.getElementById('comparisonChart');
  const themeToggle = document.getElementById('themeToggle');

  // modal refs
  const modal = document.getElementById('breakdownModal');
  const closeModal = document.getElementById('closeModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const tableBody = document.getElementById('tableBody');
  const modalRateType = document.getElementById('modalRateType');
  const downloadBtn = document.getElementById('downloadBtn');

  // Input values that are active depending on mode:
  // - emiMode: user inputs EMI (we will prompt user for EMI via a small prompt for simplicity)
  // - reducingMode: user inputs reducing % (we will show a browser prompt)
  // - flatMode: user inputs flat % (we will show a browser prompt)
  // To keep UI compact and similar to reference, we accept the typed values via prompt on Calculate.
  let mode = 'flat'; // default to flat as ref example; can be 'emi'|'reducing'|'flat'
  let chart = null;
  let lastResults = null;

  // theme
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (chart) chart.update();
  });

  // Tab handling
  modeTabs.forEach(t => t.addEventListener('click', () => {
    modeTabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    mode = t.dataset.mode;
    // Update input tag visibility/Text
    if (mode === 'flat') inputTag.textContent = 'INPUT';
    else inputTag.textContent = 'RESULT';
    // reset chips
    chipEmi.textContent = '—';
    chipReducing.textContent = '—';
    chipFlat.textContent = '—';
    resultsSection.classList.add('hidden');
  }));

  // utility functions
  function formatCurr(v){ return '₹' + Number(v || 0).toLocaleString('en-IN', {maximumFractionDigits:0}); }

  function calculateFromFlat(flatAnnual) {
    const P = Math.max(0, Number(onRoadEl.value) - Number(downEl.value));
    const n = Math.max(1, parseInt(tenureEl.value, 10));
    const years = n/12;
    const totalInterest = P * (flatAnnual/100) * years;
    const emi = (P + totalInterest)/n;
    const reducingApprox = (2 * flatAnnual) / (n + 1); // approximation
    const reducingEmi = computeReducingEMI(P, reducingApprox, n);
    return {
      principal: P, tenure: n, flatAnnual, reducingAnnual: reducingApprox,
      flatEMI: emi, reducingEMI, flatTotalInterest: totalInterest, reducingTotalInterest: reducingEmi*n - P
    };
  }

  function calculateFromReducing(reducingAnnual) {
    const P = Math.max(0, Number(onRoadEl.value) - Number(downEl.value));
    const n = Math.max(1, parseInt(tenureEl.value, 10));
    const reducingEMI = computeReducingEMI(P, reducingAnnual, n);
    const flatApprox = (reducingAnnual * (n + 1)) / 2;
    const years = n/12;
    const totalFlatInterest = P * (flatApprox/100) * years;
    return {
      principal: P, tenure: n, flatAnnual: flatApprox, reducingAnnual,
      flatEMI: (P + totalFlatInterest)/n, reducingEMI, flatTotalInterest: totalFlatInterest, reducingTotalInterest: reducingEMI*n - P
    };
  }

  function calculateFromEmi(userEmi) {
    const P = Math.max(0, Number(onRoadEl.value) - Number(downEl.value));
    const n = Math.max(1, parseInt(tenureEl.value, 10));
    // solve monthly rate r s.t. EMI = P*r*(1+r)^n / ((1+r)^n-1)
    const monthlyRate = solveMonthlyRate(P, userEmi, n);
    const reducingAnnual = monthlyRate * 12 * 100;
    // flat approx
    const flatApprox = (reducingAnnual * (n + 1)) / 2;
    const flatTotalInterest = P * (flatApprox/100) * (n/12);
    return {
      principal: P, tenure: n, flatAnnual: flatApprox, reducingAnnual,
      flatEMI: (P + flatTotalInterest)/n, reducingEMI: userEmi, flatTotalInterest, reducingTotalInterest: userEmi*n - P
    };
  }

  // amortization functions
  function computeReducingEMI(P, annualRate, n){
    const r = (annualRate / 100) / 12;
    if (r === 0) return P/n;
    const num = P * r * Math.pow(1+r,n);
    const den = Math.pow(1+r,n) - 1;
    return num/den;
  }

  function solveMonthlyRate(P, emi, n){
    // Use binary search over monthly rate [0, 1] to match EMI
    if (emi <= P/n) return 0;
    let lo = 0, hi = 1, mid;
    for (let i=0;i<60;i++){
      mid = (lo+hi)/2;
      const calc = (P * mid * Math.pow(1+mid,n)) / (Math.pow(1+mid,n)-1);
      if (calc > emi) hi = mid; else lo = mid;
    }
    return (lo+hi)/2;
  }

  // UI update
  function updateUI(results, inputModeUsed) {
    chipEmi.textContent = Math.round(results.reducingEMI).toLocaleString('en-IN');
    chipReducing.textContent = results.reducingAnnual.toFixed(2);
    chipFlat.textContent = results.flatAnnual.toFixed(2);
    // mark which chip is input
    inputTag.textContent = (inputModeUsed === 'flat') ? 'INPUT' : 'RESULT';
    // summary
    summaryPrincipal.textContent = formatCurr(results.principal);
    summaryTotal.textContent = formatCurr((results.flatTotalPayable||results.reducingEMI*results.tenure) || 0);
    summaryInterest.textContent = formatCurr(results.flatTotalInterest || results.reducingTotalInterest || 0);
    calcMethod.textContent = inputModeUsed === 'flat'
      ? 'Based on Flat Rate input.'
      : inputModeUsed === 'reducing'
        ? 'Based on Reducing Rate input.'
        : 'Based on EMI input.';
    resultsSection.classList.remove('hidden');
    lastResults = results;
    renderChart(results);
  }

  function renderChart(results) {
    const labels = ['Monthly EMI','Total Interest','Total Payable'];
    const flatTotalPayable = (results.flatEMI) ? results.flatEMI * results.tenure : 0;
    const reducingTotalPayable = (results.reducingEMI) ? results.reducingEMI * results.tenure : 0;
    const flatTotalInterest = results.flatTotalInterest || (flatTotalPayable - results.principal);
    const reducingTotalInterest = results.reducingTotalInterest || (reducingTotalPayable - results.principal);

    if (chart) chart.destroy();
    chart = new Chart(comparisonCanvas.getContext('2d'), {
      type:'bar',
      data:{
        labels,
        datasets:[
          { label:`Flat (${results.flatAnnual.toFixed(2)}%)`, data:[results.flatEMI, flatTotalInterest, flatTotalPayable], backgroundColor:'#ff8a3d' },
          { label:`Reducing (${results.reducingAnnual.toFixed(2)}%)`, data:[results.reducingEMI, reducingTotalInterest, reducingTotalPayable], backgroundColor:'#16a34a' }
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        scales:{ y:{ ticks:{ callback:v => '₹' + Number(v).toLocaleString() } } }
      }
    });
  }

  // calculate flow
  calculateBtn.addEventListener('click', () => {
    const modeNow = mode;
    // validate base inputs
    const onRoad = Number(onRoadEl.value) || 0;
    let down = Number(downEl.value) || 0;
    const tenure = Math.max(1, parseInt(tenureEl.value,10) || 1);
    if (down > onRoad) { down = onRoad; downEl.value = down; }

    if (modeNow === 'flat') {
      // ask user for flat rate
      const input = prompt('Enter Flat Annual Rate (%)', '13.5');
      if (input === null) return;
      const flat = Math.max(0, parseFloat(input) || 0);
      const res = calculateFromFlat(flat);
      // include convenience fields
      res.flatTotalPayable = res.flatEMI * res.tenure;
      res.reducingTotalPayable = res.reducingEMI * res.tenure;
      updateUI(res, 'flat');
    } else if (modeNow === 'reducing') {
      const input = prompt('Enter Reducing Annual Rate (%)', '24.12');
      if (input === null) return;
      const reducing = Math.max(0, parseFloat(input) || 0);
      const res = calculateFromReducing(reducing);
      res.flatTotalPayable = res.flatEMI * res.tenure;
      res.reducingTotalPayable = res.reducingEMI * res.tenure;
      updateUI(res, 'reducing');
    } else {
      // EMI mode – user supplies EMI
      const input = prompt('Enter Monthly EMI (₹)', '2539');
      if (input === null) return;
      const emi = Math.max(0, parseFloat(input) || 0);
      const res = calculateFromEmi(emi);
      res.flatTotalPayable = res.flatEMI * res.tenure;
      res.reducingTotalPayable = res.reducingEMI * res.tenure;
      updateUI(res, 'emi');
    }
  });

  // modal handling (download schedule)
  function generateFlatSchedule(res) {
    const { principal, tenure, flatEMI, flatTotalInterest } = res;
    const monthlyInterest = (flatTotalInterest || 0) / tenure;
    let remaining = principal;
    const out = [];
    for (let m=1;m<=tenure;m++){
      const interest = monthlyInterest;
      const principalPaid = Math.min(remaining, flatEMI - interest);
      remaining = Math.max(0, remaining - principalPaid);
      out.push({ month:m, emi:flatEMI, principal:principalPaid, interest, balance:remaining });
    }
    return out;
  }
  function generateReducingSchedule(res) {
    const { principal, tenure, reducingEMI, reducingAnnual } = res;
    const r = (reducingAnnual/100)/12;
    let remaining = principal;
    const out = [];
    for (let m=1;m<=tenure;m++){
      const interest = remaining * r;
      const principalPaid = reducingEMI - interest;
      remaining = Math.max(0, remaining - principalPaid);
      out.push({ month:m, emi:reducingEMI, principal:principalPaid, interest, balance:remaining });
    }
    return out;
  }

  // open modal and populate
  document.addEventListener('click', (e) => {
    if (e.target.closest('.chip') && lastResults) {
      // open modal for the clicked chip type
      const chip = e.target.closest('.chip');
      // determine type: map index of chip to flat/reducing/emi
      const idx = Array.from(chip.parentElement.children).indexOf(chip);
      const type = idx === 0 ? 'reducing' : (idx === 1 ? 'reducing' : 'flat');
      openSchedule(type);
    }
  });

  function openSchedule(type) {
    if (!lastResults) return;
    modal.setAttribute('aria-hidden','false');
    modalRateType.textContent = type === 'flat' ? 'Flat Rate Schedule' : 'Reducing Rate Schedule';
    tableBody.innerHTML = '';
    const schedule = (type === 'flat') ? generateFlatSchedule(lastResults) : generateReducingSchedule(lastResults);
    schedule.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.month}</td><td style="text-align:right">${Number(r.emi).toFixed(2)}</td><td style="text-align:right">${Number(r.principal).toFixed(2)}</td><td style="text-align:right">${Number(r.interest).toFixed(2)}</td><td style="text-align:right">${Number(r.balance).toFixed(2)}</td>`;
      tableBody.appendChild(tr);
    });
    modal.dataset.type = type;
  }

  closeModal.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true'));
  closeModalBtn.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true'));
  modal.addEventListener('click', (e)=> { if (e.target === modal) modal.setAttribute('aria-hidden','true'); });

  downloadBtn.addEventListener('click', () => {
    const type = modal.dataset.type || 'flat';
    const schedule = (type === 'flat') ? generateFlatSchedule(lastResults) : generateReducingSchedule(lastResults);
    let csv = 'Month,EMI,Principal,Interest,Balance\n';
    schedule.forEach(r => csv += `${r.month},${r.emi.toFixed(2)},${r.principal.toFixed(2)},${r.interest.toFixed(2)},${r.balance.toFixed(2)}\n`);
    const blob = new Blob([csv], {type:'text/csv'}), a=document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `schedule_${type}.csv`; document.body.appendChild(a); a.click(); a.remove();
  });

  // initialize chips with default values (example from reference)
  chipEmi.textContent = '2539';
  chipReducing.textContent = '24.12';
  chipFlat.textContent = '13.5';

})();
