import { EventBus, EVENTS } from "../events.js";
import { formatLocalDateOnly } from "../timeUtils.js";

const template = document.createElement('template');
template.innerHTML = `
    <link rel="stylesheet" href="popup.css">
    
    <div class="filter-section">
        <label>Filter:</label>
        <input type="date" id="filterDate">
        <button type="button" id="clearFilterBtn" class="action-btn hidden">❌</button>
    </div>
`

class TrackerFilter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.cacheDOM();
        this.bindEvents();
    }

    connectedCallback() {
        this.filterDate.value = formatLocalDateOnly(new Date());
        this.showClearButton();
        EventBus.postponeEmit(EVENTS.filterChanged, this.filterDate.value);
    }

    hideClearButton() {
        this.clearFilterBtn.classList.add('hidden');
    }

    showClearButton() {
        this.clearFilterBtn.classList.remove('hidden');
    }

    cacheDOM() {
        this.filterDate = this.shadowRoot.getElementById('filterDate');
        this.clearFilterBtn = this.shadowRoot.getElementById('clearFilterBtn');
    }

    bindEvents() {
        this.clearFilterBtn.addEventListener('click', () => {
            this.filterDate.value = '';
            this.hideClearButton()
            EventBus.emit(EVENTS.filterChanged, '');
        });

        this.filterDate.addEventListener('change', (e) => {
            EventBus.emit(EVENTS.filterChanged, e.target.value)
            this.showClearButton();
        });
    }
}

window.customElements.define('tracker-filter', TrackerFilter);
