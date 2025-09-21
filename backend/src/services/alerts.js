"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.push = push;
exports.getRecent = getRecent;
const express_1 = require("express");
const recent = [];
const clients = new Set();
function send(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
function subscribe(res) {
    clients.add(res);
    // Send hello + recent items
    send(res, 'hello', { t: Date.now() });
    send(res, 'prime', { recent });
}
function unsubscribe(res) {
    clients.delete(res);
}
function push(alert) {
    recent.unshift(alert);
    if (recent.length > 50)
        recent.pop();
    for (const c of clients) {
        try {
            send(c, 'alert', alert);
        }
        catch { }
    }
}
function getRecent() {
    return recent;
}
//# sourceMappingURL=alerts.js.map