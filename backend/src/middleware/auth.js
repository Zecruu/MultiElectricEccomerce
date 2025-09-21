"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.requireRole = requireRole;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
function requireAuth() {
    return async (req, res, next) => {
        const token = req.cookies?.accessToken;
        if (!token)
            return res.status(401).json({ error: 'Unauthorized' });
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
            // Ensure token version is current
            const user = await User_1.User.findById(payload.sub).select('refreshTokenVersion role');
            if (!user)
                return res.status(401).json({ error: 'Unauthorized' });
            if (user.refreshTokenVersion !== payload.ver)
                return res.status(401).json({ error: 'Unauthorized' });
            req.user = { id: String(user._id), role: user.role };
            next();
        }
        catch {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    };
}
function optionalAuth() {
    return async (req, _res, next) => {
        const token = req.cookies?.accessToken;
        if (!token)
            return next();
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
            const user = await User_1.User.findById(payload.sub).select('refreshTokenVersion role');
            if (!user)
                return next();
            if (user.refreshTokenVersion !== payload.ver)
                return next();
            req.user = { id: String(user._id), role: user.role };
        }
        catch { }
        return next();
    };
}
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (role === 'employee') {
            if (req.user.role === 'employee' || req.user.role === 'admin')
                return next();
            return res.status(403).json({ error: 'Forbidden' });
        }
        else if (role === 'admin') {
            if (req.user.role === 'admin')
                return next();
            return res.status(403).json({ error: 'Forbidden' });
        }
        return res.status(403).json({ error: 'Forbidden' });
    };
}
//# sourceMappingURL=auth.js.map