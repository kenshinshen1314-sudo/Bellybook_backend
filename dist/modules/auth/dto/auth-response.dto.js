"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthResponseDto = exports.UserResponseDto = void 0;
class UserResponseDto {
    id;
    username;
    email;
    displayName;
    bio;
    avatarUrl;
    subscriptionTier;
    createdAt;
}
exports.UserResponseDto = UserResponseDto;
class AuthResponseDto {
    user;
    accessToken;
    refreshToken;
    expiresIn;
}
exports.AuthResponseDto = AuthResponseDto;
//# sourceMappingURL=auth-response.dto.js.map