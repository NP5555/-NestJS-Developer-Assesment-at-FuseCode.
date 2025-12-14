"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["ORDER_NOT_FOUND"] = "ORDER_NOT_FOUND";
    ErrorCode["ORDER_CONFLICT"] = "ORDER_CONFLICT";
    ErrorCode["IDEMPOTENCY_KEY_CONFLICT"] = "IDEMPOTENCY_KEY_CONFLICT";
    ErrorCode["VERSION_MISMATCH"] = "VERSION_MISMATCH";
    ErrorCode["INVALID_STATUS_TRANSITION"] = "INVALID_STATUS_TRANSITION";
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=error-codes.enum.js.map