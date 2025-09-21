"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
async function connectMongo() {
    if (mongoose_1.default.connection.readyState === 1)
        return;
    mongoose_1.default.set('strictQuery', true);
    await mongoose_1.default.connect(env_1.env.MONGO_URI);
}
//# sourceMappingURL=mongoose.js.map