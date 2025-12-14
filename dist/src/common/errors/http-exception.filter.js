"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const error_codes_enum_1 = require("./error-codes.enum");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = error_codes_enum_1.ErrorCode.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let details;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const responseObj = exceptionResponse;
                code = responseObj.code || this.getErrorCodeFromStatus(status);
                message = responseObj.message || exception.message;
                details = responseObj.details;
            }
            else {
                message = exception.message;
                code = this.getErrorCodeFromStatus(status);
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        const errorResponse = {
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                path: request.url,
                ...(details && { details }),
            },
        };
        response.status(status).json(errorResponse);
    }
    getErrorCodeFromStatus(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return error_codes_enum_1.ErrorCode.BAD_REQUEST;
            case common_1.HttpStatus.NOT_FOUND:
                return error_codes_enum_1.ErrorCode.ORDER_NOT_FOUND;
            case common_1.HttpStatus.CONFLICT:
                return error_codes_enum_1.ErrorCode.ORDER_CONFLICT;
            default:
                return error_codes_enum_1.ErrorCode.INTERNAL_SERVER_ERROR;
        }
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map