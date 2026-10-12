/**
 * @type {Readonly<{ [key: string]: string }>}
 */
export const EVENTS = {
    startTask: 'start-task',
    saveTask: 'save-task',
    finishTask: 'finish-task',

    logEdit: 'log-edit',
    logCancelEdit: 'cancel-log-edit',
    logDelete: 'log-delete',
    logSelect: 'log-select',
    logReRender: 'log-re-render',

    filterClear: 'filter-clear',
    filterChanged: 'filter-changed'
}


/**
 * @type {{[event: string]: Function[]}}
 */
const subscribers = {};

/**
 * @type {{[event: string]: *[]}}
 */
const lasCallArgs = {}

export const EventBus = Object.freeze({
    emit(event, ...args) {
        const handlers = subscribers[event];

        lasCallArgs[event] = args;

        if (handlers) {
            handlers.forEach(handler => handler(...args));
        }
    },
    postponeEmit(event, ...args) {
        setTimeout(() => this.emit(event, ...args), 0);
    },
    subscribe(event, handler) {
        if (!subscribers[event]) {
            subscribers[event] = [];
        }

        subscribers[event].push(handler);

        return { lastEmission: () =>  handler(...lasCallArgs[event])}
    },
    getLastEmissionArgs(event) {
        return structuredClone(lasCallArgs[event] ?? []);
    },
    unsubscribe(event, handler) {
        const handlers = subscribers[event];

        if (!handlers) {
         return;
        }

        const index = handlers.indexOf(handler);
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    },
});
