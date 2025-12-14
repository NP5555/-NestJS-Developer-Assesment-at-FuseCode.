export declare const redisConfigKey = "redis";
declare const _default: (() => {
    host: string;
    port: number;
    password: string;
    ttl: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    host: string;
    port: number;
    password: string;
    ttl: number;
}>;
export default _default;
