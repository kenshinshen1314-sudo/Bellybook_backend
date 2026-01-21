"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorResponseDto = exports.PaginatedResponseDto = exports.PaginationMetaDto = exports.ApiResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ApiResponseDto {
    success;
    data;
    message;
    code;
}
exports.ApiResponseDto = ApiResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '是否成功',
        example: true,
    }),
    __metadata("design:type", Boolean)
], ApiResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '响应数据',
        required: false,
    }),
    __metadata("design:type", Object)
], ApiResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '错误消息',
        required: false,
        example: '操作成功',
    }),
    __metadata("design:type", String)
], ApiResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '错误代码',
        required: false,
    }),
    __metadata("design:type", String)
], ApiResponseDto.prototype, "code", void 0);
class PaginationMetaDto {
    page;
    limit;
    total;
    totalPages;
    hasMore;
}
exports.PaginationMetaDto = PaginationMetaDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '当前页码',
        example: 1,
    }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '每页数量',
        example: 20,
    }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '总记录数',
        example: 100,
    }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '总页数',
        example: 5,
    }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "totalPages", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '是否有下一页',
        example: true,
    }),
    __metadata("design:type", Boolean)
], PaginationMetaDto.prototype, "hasMore", void 0);
class PaginatedResponseDto {
    data;
    meta;
}
exports.PaginatedResponseDto = PaginatedResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '数据列表',
        isArray: true,
    }),
    __metadata("design:type", Array)
], PaginatedResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '分页元数据',
        type: PaginationMetaDto,
    }),
    __metadata("design:type", PaginationMetaDto)
], PaginatedResponseDto.prototype, "meta", void 0);
class ErrorResponseDto {
    statusCode;
    message;
    code;
    errors;
    timestamp;
    path;
}
exports.ErrorResponseDto = ErrorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'HTTP 状态码',
        example: 400,
    }),
    __metadata("design:type", Number)
], ErrorResponseDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '错误消息',
        example: 'Bad Request',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '错误代码',
        required: false,
        example: 'BAD_REQUEST',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '错误详情（验证失败时）',
        required: false,
        example: ['username must be a string'],
    }),
    __metadata("design:type", Array)
], ErrorResponseDto.prototype, "errors", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '时间戳',
        example: '2024-01-01T00:00:00.000Z',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '请求路径',
        example: '/api/v1/auth/login',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "path", void 0);
//# sourceMappingURL=swagger.dto.js.map