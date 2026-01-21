"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKeyUtil = exports.CacheKeyType = void 0;
var CacheKeyType;
(function (CacheKeyType) {
    CacheKeyType["CUISINE_MASTERS"] = "cuisine_masters";
    CacheKeyType["LEADERBOARD"] = "leaderboard";
    CacheKeyType["STATS"] = "stats";
    CacheKeyType["GOURMETS"] = "gourmets";
    CacheKeyType["DISH_EXPERTS"] = "dish_experts";
})(CacheKeyType || (exports.CacheKeyType = CacheKeyType = {}));
class CacheKeyUtil {
    static build(type, period, suffix) {
        const parts = [type, period];
        if (suffix)
            parts.push(suffix);
        return parts.join(':');
    }
    static cuisineMasters(period, cuisineName) {
        return this.build(CacheKeyType.CUISINE_MASTERS, period, cuisineName);
    }
    static leaderboard(period, tier) {
        return this.build(CacheKeyType.LEADERBOARD, period, tier);
    }
    static stats(period) {
        return this.build(CacheKeyType.STATS, period);
    }
    static gourmets(period) {
        return this.build(CacheKeyType.GOURMETS, period);
    }
    static dishExperts(period) {
        return this.build(CacheKeyType.DISH_EXPERTS, period);
    }
}
exports.CacheKeyUtil = CacheKeyUtil;
//# sourceMappingURL=cache-key.util.js.map