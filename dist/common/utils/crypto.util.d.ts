export declare class CryptoUtil {
    private static readonly SALT_ROUNDS;
    static hashPassword(password: string): Promise<string>;
    static comparePassword(password: string, hash: string): Promise<boolean>;
    static generateRandomToken(): string;
}
