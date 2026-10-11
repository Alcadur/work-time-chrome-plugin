import { EventBus, EVENTS } from "../events.js";
import {
    clearActiveTask,
    getActiveTask,
    getWorklog,
    getWorklogs,
    saveActiveTask,
    saveWorklogs
} from "../storageUtils.js";
import {
    formatFinalTime,
    getDateFromIso,
    getDateTimeFieldFormat,
    getDateWithoutS,
    getTimeFromIso
} from "../timeUtils.js";

const SUBMIT_LABEL = 'Begin';

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="popup.css">
  <style>
    :host {
      width: auto;
      padding: 0;
    }
  </style>

  <form id="timeForm">
    <input type="hidden" id="editIndex" value="-1">

    <div id="taskFields">
      <label>Task (ex. XYZ-123):</label>
      <input type="text" id="taskKey" placeholder="XYZ-123" required>

      <label>Start:</label>
      <input type="datetime-local" id="workDate" required>

      <div id="editTimeDiv" class="hidden">
        <input type="hidden" id="manualTime">

        <label>End:</label>
        <input type="datetime-local" id="manualEndDate">
      </div>

      <button type="submit" id="submitBtn">${SUBMIT_LABEL}</button>
      <button type="button" id="cancelBtn" class="hidden">Cancel</button>
    </div>

    <div id="activeTaskView" class="hidden">
      <p><strong id="activeTaskName"></strong></p>
      <p>Start: <span id="activeTaskStart"></span></p>
      <button type="button" id="finishActiveBtn" class="action-btn stop-btn">Finish</button>
    </div>
  </form>
`;

class TrackerForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.activeTask = null;

        this.cacheDOM();
        this.bindEvents();
    }

    connectedCallback() {
        this.workDateInput.value = getDateTimeFieldFormat(new Date());
        this.activeTask = getActiveTask();
        this.updateActiveView();
        this.fetchActiveJiraTask();
    }

    cacheDOM() {
        this.form = this.shadowRoot.getElementById('timeForm');
        this.taskFields = this.shadowRoot.getElementById('taskFields');
        this.taskKeyInput = this.shadowRoot.getElementById('taskKey');
        this.manualTimeInput = this.shadowRoot.getElementById('manualTime');
        this.manualEndDateInput = this.shadowRoot.getElementById('manualEndDate');
        this.editTimeDiv = this.shadowRoot.getElementById('editTimeDiv');
        this.workDateInput = this.shadowRoot.getElementById('workDate');
        this.editIndexInput = this.shadowRoot.getElementById('editIndex');
        this.submitBtn = this.shadowRoot.getElementById('submitBtn');
        this.cancelBtn = this.shadowRoot.getElementById('cancelBtn');
        this.activeTaskView = this.shadowRoot.getElementById('activeTaskView');
        this.activeTaskName = this.shadowRoot.getElementById('activeTaskName');
        this.activeTaskStart = this.shadowRoot.getElementById('activeTaskStart');
        this.finishActiveBtn = this.shadowRoot.getElementById('finishActiveBtn');
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            this.handleSubmit(e)
        });
        this.cancelBtn.addEventListener('click', () => this.cancelEdit());
        this.finishActiveBtn.addEventListener('click', () => this.finishTask());

        // Recalculate work time while editing when the start or end date changes
        this.workDateInput.addEventListener('change', () => this.syncManualTimeFromDates());
        this.manualEndDateInput.addEventListener('change', () => this.syncManualTimeFromDates());

        EventBus.subscribe(EVENTS.logEdit, (index) => this.startEdit(index));
        EventBus.subscribe(EVENTS.logSelect, (index) => this.setTaskName(index));
        EventBus.subscribe(EVENTS.logCancelEdit, () => this.cancelEdit());
    }

    get editIndex() {
        return parseInt(this.editIndexInput.value, 10);
    }

    finishTask() {
        const activeTask = getActiveTask();

        if (!activeTask) {
            return;
        }

        const now = new Date();
        const timeDiff = now.getTime() - activeTask.startTimestamp;
        const allLogs = getWorklogs();

        allLogs.unshift({
            task: activeTask.task,
            time: formatFinalTime(timeDiff),
            date: activeTask.date,
            endDate: getDateTimeFieldFormat(now)
        });

        saveWorklogs(allLogs);
        clearActiveTask();
        this.activeTask = null;
        this.updateActiveView()

        EventBus.emit(EVENTS.logReRender)
    }

    // Inserts the task name into the "Task" field
    setTaskName(index) {
        const log = getWorklog(index);

        this.taskKeyInput.value = log?.task ?? '';
        this.taskKeyInput.focus();
    }

    // Switches the form view between "new task" and "active task"
    updateActiveView() {
        const activeTask = this.activeTask;
        const isEditing = this.editIndex >= 0;

        if (activeTask && !isEditing) {
            this.taskFields.classList.add('hidden');
            this.activeTaskView.classList.remove('hidden');
            this.activeTaskName.textContent = activeTask.task;
            this.activeTaskStart.textContent = `${getDateFromIso(activeTask.date)} ${getTimeFromIso(activeTask.date)}`;
        } else {
            this.taskFields.classList.remove('hidden');
            this.activeTaskView.classList.add('hidden');
        }
    }

    // TODO: encapsulate
    // Chrome API - fetch the task
    fetchActiveJiraTask() {
        if (chrome && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const currentTab = tabs[0];
                const isJira = (currentTab.url ?? '').includes('jira') || (currentTab.url ?? '').includes('atlassian.net');

                if (currentTab && currentTab.url && isJira) {
                    const search = new URLSearchParams(currentTab.url.split('?')[1]);
                    let taskNumber = search.get('selectedIssue');

                    if (!taskNumber) {
                        taskNumber = currentTab.url.split('?')[0].split('/').at(-1);
                    }

                    if (taskNumber && !this.taskKeyInput.value) {
                        this.taskKeyInput.value = `[${taskNumber}] `;
                        this.fetchIssueSummary(currentTab.id);
                    }
                }
            });
        }
    }

    fetchIssueSummary(tabId) {
        if (!chrome.scripting) return;

        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const el = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]');
                return el ? el.textContent.trim() : '';
            }
        }, (results) => {
            const summary = results && results[0] && results[0].result;
            if (summary) {
                this.taskKeyInput.value += summary;
            }
        });
    }

    syncManualTimeFromDates() {
        if (this.editTimeDiv.classList.contains('hidden')) return;

        const startMs = new Date(this.workDateInput.value).getTime();
        const endMs = new Date(this.manualEndDateInput.value).getTime();
        if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return;

        this.manualTimeInput.value = formatFinalTime(endMs - startMs);
    }

    handleSubmit(e) {
        e.preventDefault();
        const editIndex = this.editIndex;
        const taskName = this.taskKeyInput.value.trim();
        const dateVal = this.workDateInput.value;

        if (editIndex >= 0) {
            const logs = getWorklogs()
            const timeDiff = new Date(this.manualEndDateInput.value).getTime() - new Date(dateVal).getTime();

            logs[editIndex] = {
                task: taskName,
                time: formatFinalTime(timeDiff),
                date: dateVal,
                endDate: this.manualEndDateInput.value
            };

            saveWorklogs(logs)
            this.cancelEdit();
            EventBus.emit(EVENTS.logReRender)
        } else {
            const task = { task: taskName, startTimestamp: getDateWithoutS(new Date(dateVal)).getTime(), date: dateVal }
            saveActiveTask(task);
            this.activeTask = task
            this.updateActiveView()

            this.form.reset();
            this.workDateInput.value = getDateTimeFieldFormat(getDateWithoutS());
        }
    }

    startEdit(index) {
        const log = getWorklog(index)

        this.taskKeyInput.value = log.task;
        this.manualTimeInput.value = log.time;
        this.workDateInput.value = log.date;
        this.manualEndDateInput.value = log.endDate || '';
        this.editIndexInput.value = index;

        this.editTimeDiv.classList.remove('hidden');
        this.submitBtn.textContent = 'Save';
        this.cancelBtn.classList.remove('hidden');
        this.updateActiveView();
    }

    cancelEdit() {
        this.form.reset();
        this.workDateInput.value = getDateTimeFieldFormat(new Date());
        this.editIndexInput.value = '-1';

        this.editTimeDiv.classList.add('hidden');
        this.submitBtn.textContent = SUBMIT_LABEL;
        this.cancelBtn.classList.add('hidden');

        this.fetchActiveJiraTask();
        this.updateActiveView();
    }
}

customElements.define('tracker-form', TrackerForm);
