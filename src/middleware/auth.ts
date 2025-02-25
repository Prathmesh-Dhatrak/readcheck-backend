import { Context, Middleware } from "../../deps.ts";
import { createJWT, verifyJWT } from "../utils/jwt.ts";
import { User } from "../types/index.ts";
import { UnauthorizedError } from "../utils/errors.ts";

export interface AuthContext extends Context {
    user?: User;
}

export function authMiddleware(): Middleware {
    return async (ctx: Context, next) => {
        const authContext = ctx as AuthContext;
        const authHeader = ctx.request.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedError("Missing or invalid token");
        }

        const token = authHeader.split(" ")[1];

        try {
            const payload = await verifyJWT(token);
            
            // Validate that the payload has the required User properties
            if (
                typeof payload.id === 'string' && 
                typeof payload.email === 'string'
            ) {
                // Now it's safe to cast to User
                authContext.user = {
                    id: payload.id,
                    email: payload.email
                };
                await next();
            } else {
                throw new UnauthorizedError("Invalid token payload structure");
            }
        } catch (error: unknown) {
            throw new UnauthorizedError(
                error instanceof Error ? error.message : "Invalid token"
            );
        }
    };
}

export async function generateToken(user: User): Promise<string> {
    return await createJWT({ id: user.id, email: user.email });
}