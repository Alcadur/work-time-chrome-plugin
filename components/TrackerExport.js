import { getWorklogs } from "../storageUtils.js";
import { formatFinalTime, formatLocalDateOnly, getDateFromIso, logTimeToMs } from "../timeUtils.js";
import { buildTempoCsv, downloadCsv } from "../csvUtils.js";

const template = document.createElement('template');
template.innerHTML = `
    <link rel="stylesheet" href="popup.css">
    <style>
        :host {
            width: auto;
            padding: 0;
        }
        
        .summary-section {
            margin-top: 12px;
            border: 1px solid #dfe1e6;
            border-radius: 4px;
            overflow: hidden;
            font-size: 13px;
        }

        .summary-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            background: #f4f5f7;
            border-bottom: 1px solid #dfe1e6;
            font-weight: 600;
            color: #42526e;
        }

        .total-time {
            font-size: 15px;
            font-weight: bold;
            color: var(--main-color);
        }

        .summary-list {
            max-height: 220px;
            overflow-y: auto;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 10px;
            border-bottom: 1px solid #f4f5f7;
        }

        .summary-row:last-child {
            border-bottom: none;
        }

        .summary-row:nth-child(even) {
            background: #fafbfc;
        }

        .summary-row:hover {
            background: #ebecf0;
        }

        .summary-date {
            color: #6b778c;
            font-variant-numeric: tabular-nums;
        }

        .summary-time {
            font-weight: 600;
            color: #172b4d;
            font-variant-numeric: tabular-nums;
        }

        .summary-list:empty::after {
            content: 'No entries.';
            display: block;
            padding: 8px 10px;
            text-align: center;
            color: #6b778c;
        }
    </style>

    <h2>CSV View</h2>
    
    <div class="filter-section export-section">
        <label for="exportFrom">From:</label>
        <input type="date" id="exportFrom">
        <label for="exportTo">To:</label>
        <input type="date" id="exportTo">
    </div>
    
    <button type="button" id="exportBtn" title="Export logs to Tempo CSV" style="width: 100%">Export CVS</button>
    
    <section id="summary" class="summary-section">
        <div class="summary-header">
            <span>Total</span>
            <span id="total" class="total-time"></span>
        </div>
        <div id="summaryByDate" class="summary-list"></div>
    </section>
`

const summaryByDateTemplate = document.createElement('template');
summaryByDateTemplate.innerHTML = `<div class="summary-row"><span class="summary-date"></span><span class="summary-time"></span></div>`

class TrackerExport extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.cacheDOM();
        this.bindEvents();
    }

    connectedCallback() {
        const today = new Date();

        this.exportFrom.value = formatLocalDateOnly(today);
        this.exportTo.value = formatLocalDateOnly(today);

        this.updateSummary()
    }

    cacheDOM() {
        this.exportFrom = this.shadowRoot.getElementById('exportFrom');
        this.exportTo = this.shadowRoot.getElementById('exportTo');
        this.exportBtn = this.shadowRoot.getElementById('exportBtn');

        this.summaryByDate = this.shadowRoot.getElementById('summaryByDate');
        this.total = this.shadowRoot.getElementById('total');
    }

    bindEvents() {
        this.exportBtn.addEventListener('click', () => this.export());
        this.exportFrom.addEventListener('change', () => this.updateSummary());
        this.exportTo.addEventListener('change', () => this.updateSummary());
    }

    updateSummary() {
        const logs = getWorklogs()
        const from = this.exportFrom.value
        const to = this.exportTo.value
        this.summaryByDate.innerHTML = ''
        const groupedLogsTime = logs.filter(log => {
                const date = getDateFromIso(log.date);
                return log.endDate && (!from || date >= from) && (!to || date <= to);
            })
            .sort((a, b) => a.date.localeCompare(b.date))
            .reduce((acc, log) => {
                const date = getDateFromIso(log.date);
                acc[date] = (acc[date] || 0) + logTimeToMs(log.time)
                return acc;
            }, {})

        let totalTime = 0

        Object.entries(groupedLogsTime).forEach(([date, time]) => {
            const summaryByDate = summaryByDateTemplate.content.cloneNode(true);
            summaryByDate.querySelector('.summary-date').textContent = date;
            summaryByDate.querySelector('.summary-time').textContent = formatFinalTime(time);

            totalTime += time

            this.summaryByDate.appendChild(summaryByDate);
        })

        this.total.textContent = formatFinalTime(totalTime)
    }

    export() {
        const from = this.exportFrom.value;
        const to = this.exportTo.value;

        if (from && to && from > to) {
            alert('"From" date must be before "To" date.');
            return;
        }

        const { csv, exported, skipped } = buildTempoCsv(getWorklogs(), from, to);

        if (exported === 0) {
            alert('No logs with a Jira issue key in the selected range.');
            return;
        }

        downloadCsv(csv, `tempo-worklogs_${from || 'all'}_${to || 'all'}.csv`);

        if (skipped > 0) {
            alert(`Skipped ${skipped} log(s) without a Jira issue key (ex. XYZ-123).`);
        }
    }
}

window.customElements.define('tracker-export', TrackerExport);
