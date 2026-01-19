"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorResponse = exports.SuccessResponse = exports.responseSchema = void 0;
const zod_1 = require("zod");
exports.responseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
    data: zod_1.z.any().optional(),
    error: zod_1.z.string().optional(),
});
class SuccessResponse {
    success;
    data;
    message;
    constructor(data, message) {
        this.success = true;
        this.data = data;
        this.message = message;
    }
}
exports.SuccessResponse = SuccessResponse;
class ErrorResponse {
    success;
    error;
    message;
    constructor(error, message) {
        this.success = false;
        this.error = error;
        this.message = message;
    }
}
exports.ErrorResponse = ErrorResponse;
//# sourceMappingURL=response.dto.js.map