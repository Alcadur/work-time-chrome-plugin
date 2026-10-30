import { getWorklogs } from "../storageUtils.js";
import { formatLocalDateOnly } from "../timeUtils.js";
import { buildTempoCsv, downloadCsv } from "../csvUtils.js";

const template = document.createElement('template');
template.innerHTML = `
    <link rel="stylesheet" href="popup.css">
    <style>
        :host {
            width: auto;
            padding: 0;
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
`

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
    }

    cacheDOM() {
        this.exportFrom = this.shadowRoot.getElementById('exportFrom');
        this.exportTo = this.shadowRoot.getElementById('exportTo');
        this.exportBtn = this.shadowRoot.getElementById('exportBtn');
    }

    bindEvents() {
        this.exportBtn.addEventListener('click', () => this.export());
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
