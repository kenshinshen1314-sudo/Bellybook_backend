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
exports.LeaderboardQueryDto = exports.CuisineMastersQueryDto = exports.RankingPeriod = void 0;
const class_validator_1 = require("class-validator");
var RankingPeriod;
(function (RankingPeriod) {
    RankingPeriod["WEEKLY"] = "WEEKLY";
    RankingPeriod["MONTHLY"] = "MONTHLY";
    RankingPeriod["YEARLY"] = "YEARLY";
    RankingPeriod["ALL_TIME"] = "ALL_TIME";
})(RankingPeriod || (exports.RankingPeriod = RankingPeriod = {}));
class CuisineMastersQueryDto {
    cuisineName;
    period;
}
exports.CuisineMastersQueryDto = CuisineMastersQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CuisineMastersQueryDto.prototype, "cuisineName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RankingPeriod),
    __metadata("design:type", String)
], CuisineMastersQueryDto.prototype, "period", void 0);
class LeaderboardQueryDto {
    period;
    tier;
}
exports.LeaderboardQueryDto = LeaderboardQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RankingPeriod),
    __metadata("design:type", String)
], LeaderboardQueryDto.prototype, "period", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaderboardQueryDto.prototype, "tier", void 0);
//# sourceMappingURL=ranking-query.dto.js.map