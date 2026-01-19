"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedResponse = exports.paginationSchema = void 0;
const zod_1 = require("zod");
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    offset: zod_1.z.coerce.number().int().nonnegative().optional(),
});
class PaginatedResponse {
    data;
    total;
    page;
    limit;
    hasMore;
    constructor(data, total, page, limit) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.hasMore = page * limit < total;
    }
}
exports.PaginatedResponse = PaginatedResponse;
//# sourceMappingURL=pagination.dto.js.map