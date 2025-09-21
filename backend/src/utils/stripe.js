"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripe = getStripe;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("../config/env");
let stripeClient = null;
function getStripe() {
    if (!env_1.env.STRIPE_SECRET_KEY)
        return null;
    if (!stripeClient) {
        // Omit apiVersion to use the package's default pinned version
        stripeClient = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY);
    }
    return stripeClient;
}
//# sourceMappingURL=stripe.js.map