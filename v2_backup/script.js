// Configuration & Assumptions
const CONFIG = {
    minEmails: 25000,
    maxEmails: 1000000,
    costPerMailbox: 3.25,
    emailsPerMailbox: 100,
    baseOpsCost: 800,
    scrapingCostPer10k: 50
};

// Presets Definition
const PRESETS = {
    low: { emailsPerLeadNum: 4, replyRateNum: 1.0, positiveReplyRateNum: 5, bookingRateNum: 15, showUpRateNum: 60, closeRateNum: 10, ticketSizeNum: 2000, clientLtvMonthsNum: 4 },
    realistic: { emailsPerLeadNum: 3, replyRateNum: 1.5, positiveReplyRateNum: 10, bookingRateNum: 25, showUpRateNum: 70, closeRateNum: 20, ticketSizeNum: 2500, clientLtvMonthsNum: 6 },
    high: { emailsPerLeadNum: 2, replyRateNum: 2.5, positiveReplyRateNum: 15, bookingRateNum: 35, showUpRateNum: 80, closeRateNum: 30, ticketSizeNum: 4000, clientLtvMonthsNum: 12 }
};

// DOM Elements - Inputs
const inputs = {
    totalEmails: { slider: document.getElementById('totalEmails'), num: document.getElementById('totalEmailsNum') },
    emailsPerLead: { slider: document.getElementById('emailsPerLead'), num: document.getElementById('emailsPerLeadNum') },
    replyRate: { slider: document.getElementById('replyRate'), num: document.getElementById('replyRateNum') },
    positiveReplyRate: { slider: document.getElementById('positiveReplyRate'), num: document.getElementById('positiveReplyRateNum') },
    bookingRate: { slider: document.getElementById('bookingRate'), num: document.getElementById('bookingRateNum') },
    showUpRate: { slider: document.getElementById('showUpRate'), num: document.getElementById('showUpRateNum') },
    closeRate: { slider: document.getElementById('closeRate'), num: document.getElementById('closeRateNum') },
    ticketSize: { slider: document.getElementById('ticketSize'), num: document.getElementById('ticketSizeNum') },
    clientLtvMonths: { slider: document.getElementById('clientLtvMonths'), num: document.getElementById('clientLtvMonthsNum') }
};

const termRadios = document.querySelectorAll('input[name="termLength"]');
const revShareRadios = document.querySelectorAll('input[name="revShare"]');
const funnelInfographic = document.getElementById('funnelInfographic');

const els = {
    totalMrrAdded: document.getElementById('totalMrrAdded'),
    totalTcv: document.getElementById('totalTcv'),
    totalOpsCost: document.getElementById('totalOpsCost'),
    totalRevShareCost: document.getElementById('totalRevShareCost'),
    totalCost: document.getElementById('totalCost'),
    netProfit: document.getElementById('netProfit'),
    roiPercent: document.getElementById('roiPercent'),
    termDisplays: document.querySelectorAll('.term-display'),
    costBreakdownList: document.getElementById('costBreakdownList'),
    monthlyTotalValue: document.getElementById('monthlyTotalValue')
};

// Holds CountUp instances
let counters = {};

function init() {
    // Sync sliders and number inputs
    Object.keys(inputs).forEach(key => {
        const { slider, num } = inputs[key];
        slider.addEventListener('input', (e) => { num.value = e.target.value; calculate(); });
        num.addEventListener('input', (e) => { slider.value = e.target.value; calculate(); });
    });

    // Radio logic
    const updateRadios = (radios, groupSelector) => {
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll(`${groupSelector} .radio-btn`).forEach(lbl => lbl.classList.remove('active'));
                e.target.closest('.radio-btn').classList.add('active');
                calculate();
            });
        });
    };
    updateRadios(termRadios, '#termLengthGroup');
    updateRadios(revShareRadios, '#revShareGroup');

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.preset);
        });
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    calculate();
}

function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    Object.keys(preset).forEach(key => {
        const inputObj = inputs[key.replace('Num', '')];
        if (inputObj) {
            inputObj.num.value = preset[key];
            inputObj.slider.value = preset[key];
        }
    });
    calculate();
}

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(val));
const formatNumber = (val) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(val));

// Helper for animations
function animateValue(el, val, isCurrency = false, isPercent = false) {
    if (!window.countUp) {
        // Fallback if countup not loaded
        el.textContent = isCurrency ? formatCurrency(val) : (isPercent ? val.toFixed(1) + '%' : formatNumber(val));
        return;
    }

    const domId = el.id;
    if (!domId) return; // Need IDs for CountUp lib

    let options = {
        decimalPlaces: isPercent ? 1 : 0,
        duration: 1.5,
        useGrouping: true
    };
    if (isCurrency) { options.prefix = '$'; }
    if (isPercent) { options.suffix = '%'; }

    if (!counters[domId]) {
        counters[domId] = new countUp.CountUp(domId, val, options);
    } else {
        counters[domId].update(val);
    }
}


function calculate() {
    const totalEmails = Math.max(CONFIG.minEmails, parseFloat(inputs.totalEmails.num.value) || 0);
    const emailsPerLead = parseFloat(inputs.emailsPerLead.num.value) || 1;
    const replyRate = (parseFloat(inputs.replyRate.num.value) || 0) / 100;
    const positiveReplyRate = (parseFloat(inputs.positiveReplyRate.num.value) || 0) / 100;
    const bookingRate = (parseFloat(inputs.bookingRate.num.value) || 0) / 100;
    const showUpRate = (parseFloat(inputs.showUpRate.num.value) || 0) / 100;
    const closeRate = (parseFloat(inputs.closeRate.num.value) || 0) / 100;
    const ticketSize = parseFloat(inputs.ticketSize.num.value) || 0;
    const clientLtvMonths = parseFloat(inputs.clientLtvMonths.num.value) || 1;

    const termLength = parseInt(document.querySelector('input[name="termLength"]:checked').value);
    const revShare = parseInt(document.querySelector('input[name="revShare"]:checked').value) / 100;

    els.termDisplays.forEach(el => el.textContent = `${termLength} Mo.`);

    // Funnel Math
    const leadsContacted = totalEmails / emailsPerLead;
    const replies = leadsContacted * replyRate;
    const positiveReplies = replies * positiveReplyRate;
    const appointments = positiveReplies * bookingRate;
    const showUps = appointments * showUpRate;
    const closedDeals = showUps * closeRate;

    // Build Centered SVG-like Infographic Funnel
    const funnelSteps = [
        { label: 'Emails', val: totalEmails, format: formatNumber },
        { label: 'Leads', val: leadsContacted, format: formatNumber },
        { label: 'Replies', val: replies, format: formatNumber },
        { label: 'Interested', val: positiveReplies, format: formatNumber },
        { label: 'Appointments', val: appointments, format: formatNumber },
        { label: 'Show-Ups', val: showUps, format: formatNumber },
        { label: 'Closed Deals', val: closedDeals, format: formatNumber }
    ];

    const maxLog = Math.log10(Math.max(1, totalEmails));
    funnelInfographic.innerHTML = funnelSteps.map((step, idx) => {
        let widthPct = 100;
        if (idx > 0) {
            const safeVal = Math.max(1, step.val);
            const logVal = Math.log10(safeVal);
            widthPct = Math.max(10, (logVal / maxLog) * 100);
        }

        return `
        <div class="funnel-layer" style="width: ${widthPct}%;">
            <div class="funnel-layer-col" style="text-align: left;">
                <span class="funnel-layer-label">${step.label}</span>
            </div>
            <div class="funnel-layer-col" style="text-align: right;">
                <span class="funnel-layer-val">${step.format(step.val)}</span>
            </div>
        </div>
        `;
    }).join('');


    // Costs
    const mailboxesRequired = Math.ceil(totalEmails / CONFIG.emailsPerMailbox);
    const mailboxCostMonthly = mailboxesRequired * CONFIG.costPerMailbox;
    const scrapingCostMonthly = (totalEmails / 10000) * CONFIG.scrapingCostPer10k;
    const totalMonthlyOpsCost = CONFIG.baseOpsCost + mailboxCostMonthly + scrapingCostMonthly;

    // Cost Breakdown Table
    els.costBreakdownList.innerHTML = `
        <div class="cost-row">
            <div class="cost-info">
                <span class="cost-info-title">Infrastructure & Mailboxes</span>
                <span class="cost-info-desc">${formatNumber(mailboxesRequired)} mailboxes @ $${CONFIG.costPerMailbox}/ea</span>
            </div>
            <div class="cost-amount mono-font">${formatCurrency(mailboxCostMonthly)}</div>
        </div>
        <div class="cost-row">
            <div class="cost-info">
                <span class="cost-info-title">Data & Scraping</span>
                <span class="cost-info-desc">$${CONFIG.scrapingCostPer10k} per 10k leads volume</span>
            </div>
            <div class="cost-amount mono-font">${formatCurrency(scrapingCostMonthly)}</div>
        </div>
        <div class="cost-row">
            <div class="cost-info">
                <span class="cost-info-title">Base Operational Support</span>
                <span class="cost-info-desc">Platform and deliverability monitoring</span>
            </div>
            <div class="cost-amount mono-font">${formatCurrency(CONFIG.baseOpsCost)}</div>
        </div>
    `;

    // Updates using CountUp wrapper if DOM ids exist
    animateValue(els.monthlyTotalValue, totalMonthlyOpsCost, true);


    // ROI & Revenue
    const mrrAdded = closedDeals * ticketSize;
    const totalClientsAcquired = closedDeals * termLength;
    const totalTcv = totalClientsAcquired * ticketSize * clientLtvMonths;
    const termMrrAdded = mrrAdded * termLength;

    const totalOpsCostOverTerm = totalMonthlyOpsCost * termLength;
    const revShareAmount = totalTcv * revShare;
    const totalCosts = totalOpsCostOverTerm + revShareAmount;

    const netProfit = totalTcv - totalCosts;
    const roi = totalCosts > 0 ? ((netProfit / totalCosts) * 100) : 0; // * 100 to pass plain percentage logic

    animateValue(els.netProfit, netProfit, true);
    animateValue(els.roiPercent, roi, false, true);
    animateValue(els.totalTcv, totalTcv, true);
    animateValue(els.totalMrrAdded, termMrrAdded, true);
    animateValue(els.totalCost, totalCosts, true);
    animateValue(els.totalOpsCost, totalOpsCostOverTerm, true);
    animateValue(els.totalRevShareCost, revShareAmount, true);
}


document.addEventListener('DOMContentLoaded', init);
