const WORKLOGS_KEY = 'jira_worklogs';
const ACTIVE_TASK_KEY = 'jira_active_task';

export const getWorklogs = () => JSON.parse(localStorage.getItem(WORKLOGS_KEY)) || [];

export const getWorklog = (index) => getWorklogs()[index];

export const saveWorklogs = (logs) => localStorage.setItem(WORKLOGS_KEY, JSON.stringify(logs));

export const getActiveTask = () => JSON.parse(localStorage.getItem(ACTIVE_TASK_KEY));

export const saveActiveTask = (task) => localStorage.setItem(ACTIVE_TASK_KEY, JSON.stringify(task));

export const clearActiveTask = () => localStorage.removeItem(ACTIVE_TASK_KEY);
