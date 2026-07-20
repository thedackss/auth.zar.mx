import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
    data: T | null;
    message: string;
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
    return (
        typeof value === "object" &&
        value !== null &&
        "data" in value &&
        "message" in value
    );
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>>
{
    intercept(
        _context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((response) => {
                if (isApiResponse<T>(response)) return response;
                return {
                    data: (response as T | null) ?? null,
                    message: "Operation successful",
                };
            }),
        );
    }
}
