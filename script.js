// Configuration
const CONFIG = {
    minEmails: 12500,
    maxEmails: 1000000,
    baseOpsCost: 201, // Mathematical floor for the pricing curve
    opsCostPerEmail: 0.05332 // Derived slope from founder's $2867 at 50k emails
};

// State: The assumed funnel metrics driven by Presets
let currentAssumptions = {
    emailsPerLead: 3,
    replyRate: 2.5,
    positiveReplyRate: 15,
    bookingRate: 30,
    showUpRate: 70,
    closeRate: 20
};

// Presets Definition
const PRESETS = {
    low: { emailsPerLead: 4, replyRate: 2.0, positiveReplyRate: 5, bookingRate: 20, showUpRate: 60, closeRate: 10 },
    realistic: { emailsPerLead: 3, replyRate: 2.5, positiveReplyRate: 15, bookingRate: 30, showUpRate: 70, closeRate: 20 },
    high: { emailsPerLead: 2, replyRate: 3.5, positiveReplyRate: 25, bookingRate: 40, showUpRate: 80, closeRate: 30 }
};

// DOM Elements
const inputs = {
    totalEmails: { slider: document.getElementById('totalEmails'), num: document.getElementById('totalEmailsNum') },
    ticketSize: { slider: document.getElementById('ticketSize'), num: document.getElementById('ticketSizeNum') },
    clientLtvMonths: { slider: document.getElementById('clientLtvMonths'), num: document.getElementById('clientLtvMonthsNum') }
};

const assumptionDisplays = {
    emailsPerLead: document.getElementById('disp_emailsPerLead'),
    replyRate: document.getElementById('disp_replyRate'),
    positiveReplyRate: document.getElementById('disp_positiveReplyRate'),
    bookingRate: document.getElementById('disp_bookingRate'),
    showUpRate: document.getElementById('disp_showUpRate'),
    closeRate: document.getElementById('disp_closeRate')
};

const termRadios = document.querySelectorAll('input[name="termLength"]');
const funnelInfographic = document.getElementById('funnelInfographic');

const els = {
    // Outputs - ROI
    roiPercent: document.getElementById('roiPercent'),
    netProfit: document.getElementById('netProfit'),
    totalMrrAdded: document.getElementById('totalMrrAdded'),
    termDisplays: document.querySelectorAll('.term-display'),

    // Outputs - Costs (Restored Bento Grid IDs)
    monthlyTotalValue: document.getElementById('monthlyTotalValue'),
    revShareDisplay: document.getElementById('revShareDisplay'),
    valMailboxes: document.getElementById('valMailboxes'),
    valServers: document.getElementById('valServers'),
    valSourcing: document.getElementById('valSourcing'),
    valEnrich: document.getElementById('valEnrich'),
    valAi: document.getElementById('valAi'),
    dynamicMailboxCount: document.getElementById('dynamicMailboxCount'),
    dynamicMailboxUnitCost: document.getElementById('dynamicMailboxUnitCost')
};

let counters = {};

function init() {
    // Force inputs to 50k on load in case of browser cache
    inputs.totalEmails.slider.value = 50000;
    inputs.totalEmails.num.value = 50000;

    // Sync sliders and number inputs
    Object.keys(inputs).forEach(key => {
        const { slider, num } = inputs[key];
        slider.addEventListener('input', (e) => { num.value = e.target.value; calculate(); });
        num.addEventListener('input', (e) => { slider.value = e.target.value; calculate(); });
    });

    // Radio logic
    termRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('#termLengthGroup .radio-btn').forEach(lbl => lbl.classList.remove('active'));
            e.target.closest('.radio-btn').classList.add('active');
            calculate();
        });
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.preset);
        });
    });

    // Tab Logic (Removed - Now using 4 Grid layout)

    applyPreset('realistic'); // Initialize with realistic
}

function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    currentAssumptions = { ...preset };

    // Update display grids
    assumptionDisplays.emailsPerLead.textContent = currentAssumptions.emailsPerLead;
    assumptionDisplays.replyRate.textContent = currentAssumptions.replyRate.toFixed(1) + '%';
    assumptionDisplays.positiveReplyRate.textContent = currentAssumptions.positiveReplyRate + '%';
    assumptionDisplays.bookingRate.textContent = currentAssumptions.bookingRate + '%';
    assumptionDisplays.showUpRate.textContent = currentAssumptions.showUpRate + '%';
    assumptionDisplays.closeRate.textContent = currentAssumptions.closeRate + '%';

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
    const emailsPerLead = currentAssumptions.emailsPerLead;
    const replyRate = currentAssumptions.replyRate / 100;
    const positiveReplyRate = currentAssumptions.positiveReplyRate / 100;
    const bookingRate = currentAssumptions.bookingRate / 100;
    const showUpRate = currentAssumptions.showUpRate / 100;
    const closeRate = currentAssumptions.closeRate / 100;
    const ticketSize = parseFloat(inputs.ticketSize.num.value) || 0;
    const clientLtvMonths = parseFloat(inputs.clientLtvMonths.num.value) || 1;

    const termLength = parseInt(document.querySelector('input[name="termLength"]:checked').value);

    // Core V4 Logic: Link Term Length to Rev Share Percentage
    let revSharePct = 10;
    if (termLength === 4) revSharePct = 20;
    if (termLength === 6) revSharePct = 15;
    if (termLength === 9) revSharePct = 10;
    if (termLength === 12) revSharePct = 5;

    const revShare = revSharePct / 100;

    els.termDisplays.forEach(el => el.textContent = `${termLength} Mo.`);
    if (els.revShareDisplay) {
        els.revShareDisplay.textContent = `${revSharePct}%`;
    }

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
    let lastWidth = 105; // Initialize safely above 100
    funnelInfographic.className = "funnel-infographic";
    funnelInfographic.innerHTML = funnelSteps.map((step, idx) => {
        let widthPct = 100;
        if (idx > 0) {
            const safeVal = Math.max(1, step.val);
            const logVal = Math.log10(safeVal);

            // Map strictly decreasing log curve smoothly between 35% and 100% 
            // This ensures text fits neatly inside the solid background while visually narrowing every step
            widthPct = 35 + ((logVal / maxLog) * 65);

            // Failsafe validation against unexpected math bumps
            if (widthPct >= lastWidth) {
                widthPct = lastWidth - 3;
            }
        }
        lastWidth = widthPct;

        const isClosedDeals = idx === funnelSteps.length - 1;
        const bgGradient = isClosedDeals
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(127, 86, 217, 0.2) 0%, rgba(127, 86, 217, 0.05) 100%)';
        const borderColor = isClosedDeals ? 'rgba(16, 185, 129, 0.4)' : 'rgba(127, 86, 217, 0.3)';
        const labelColor = isClosedDeals ? 'var(--success)' : 'var(--text-muted)';
        const valColor = isClosedDeals ? 'var(--success)' : 'white';

        return `
        <div class="funnel-layer" style="width: ${widthPct}%; background: ${bgGradient}; border-color: ${borderColor};">
            <div class="funnel-layer-col" style="text-align: left;">
                <span class="funnel-layer-label" style="color: ${labelColor};">${step.label}</span>
            </div>
            <div class="funnel-layer-col" style="text-align: right;">
                <span class="funnel-layer-val" style="color: ${valColor}; font-weight: 800;">${step.format(step.val)}</span>
            </div>
        </div>
        `;
    }).join('');


    // Exact Mathematical Pricing Scale
    const totalMonthlyOpsCost = Math.round(CONFIG.baseOpsCost + (totalEmails * CONFIG.opsCostPerEmail));

    // Distribute into Exact 5 Buckets
    const mailboxCost = totalMonthlyOpsCost * 0.406;
    const serverCost = totalMonthlyOpsCost * 0.118;
    const sourcingCost = totalMonthlyOpsCost * 0.128;
    const enrichCost = totalMonthlyOpsCost * 0.213;
    const aiCost = totalMonthlyOpsCost * 0.135;

    // Restored Bento Grid Value Distribution
    animateValue(els.valMailboxes, mailboxCost, true);
    animateValue(els.valServers, serverCost, true);
    animateValue(els.valSourcing, sourcingCost, true);
    animateValue(els.valEnrich, enrichCost, true);
    animateValue(els.valAi, aiCost, true);

    animateValue(els.monthlyTotalValue, totalMonthlyOpsCost, true);

    const mailboxCount = Math.max(1, Math.round(totalEmails / 100));
    const mailboxUnitCost = mailboxCount > 0 ? (mailboxCost / mailboxCount) : 0;

    if (els.dynamicMailboxCount && els.dynamicMailboxUnitCost) {
        els.dynamicMailboxCount.textContent = formatNumber(mailboxCount);
        els.dynamicMailboxUnitCost.textContent = '$' + mailboxUnitCost.toFixed(2);
    }


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

    animateValue(els.roiPercent, roi, false, true);
    animateValue(els.netProfit, netProfit, true);
    animateValue(els.totalMrrAdded, termMrrAdded, true);
}


document.addEventListener('DOMContentLoaded', init);


