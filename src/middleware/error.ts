import { Context, Status } from "../../deps.ts";
import { config } from "../../config.ts";

// Enhanced error interface
interface ErrorWithStatus extends Error {
    status?: number;
}

export async function errorMiddleware(
    ctx: Context,
    next: () => Promise<unknown>
) {
    try {
        await next();
    } catch (err: unknown) {
        // Narrow the type by checking if it's an Error instance
        let status = Status.InternalServerError;
        let message = "Internal Server Error";

        if (err instanceof Error) {
            const error = err as ErrorWithStatus;
            status = error.status || Status.InternalServerError;
            message = error.message || "Internal Server Error";

            if (status === Status.InternalServerError) {
                console.error(`Error: ${error.message}`);
                console.error(error.stack);
            }
        } else {
            // If it's not an Error instance, log it as is
            console.error("Unknown error type:", err);
        }

        ctx.response.status = status;
        ctx.response.body = {
            status: "error",
            message: config.ENV === "production" && status === Status.InternalServerError
                ? "Internal Server Error"
                : message
        };
    }
}