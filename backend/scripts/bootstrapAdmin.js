"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("../src/db/mongoose");
const User_1 = require("../src/models/User");
const bcrypt_1 = require("bcrypt");
async function main() {
    const email = (process.argv[2] || '').toLowerCase();
    const passwordArg = (process.argv[3] || '');
    if (!email) {
        console.error('Usage: npm run bootstrap:admin -- <email> [password]');
        process.exit(1);
    }
    await (0, mongoose_1.connectMongo)();
    let user = await User_1.User.findOne({ email, deletedAt: null });
    if (!user) {
        const plain = passwordArg || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const passwordHash = await bcrypt_1.default.hash(plain, 12);
        user = await User_1.User.create({ name: 'Admin', email, passwordHash, role: 'admin', emailVerified: true });
        console.log(`Created new admin user ${email}. ${passwordArg ? 'Password set from arg.' : 'Temp password: ' + plain}`);
    }
    else {
        user.role = 'admin';
        user.emailVerified = true;
        if (passwordArg) {
            user.passwordHash = await bcrypt_1.default.hash(passwordArg, 12);
            user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
            console.log('Password updated for existing user.');
        }
        await user.save();
        console.log(`Promoted ${email} to admin.`);
    }
    process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=bootstrapAdmin.js.map