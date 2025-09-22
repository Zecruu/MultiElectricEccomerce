"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripe = getStripe;
const stripe_1 = require("stripe");
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