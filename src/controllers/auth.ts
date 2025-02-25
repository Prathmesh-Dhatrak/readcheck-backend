import { RouterMiddleware } from "../../deps.ts";
import { createUser, validateUser } from "../models/user.ts";
import { generateToken } from "../middleware/auth.ts";
import { 
  BadRequestError,
  ConflictError,
  UnauthorizedError
} from "../utils/errors.ts";

export const signup: RouterMiddleware<string> = async (ctx) => {
  const body = await ctx.request.body().value;
  
  if (!body.email || !body.password) {
    throw new BadRequestError("Email and password are required");
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw new BadRequestError("Invalid email format");
  }
  
  // Validate password strength (e.g., minimum 8 characters)
  if (body.password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters");
  }
  
  try {
    const user = await createUser(body.email, body.password);
    const token = await generateToken(user);
    
    ctx.response.status = 201; // Created
    ctx.response.body = { 
      status: "success", 
      data: { 
        user: { id: user.id, email: user.email },
        token 
      } 
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Email already in use")) {
        throw new ConflictError(error.message);
      }
      throw error; // Let the error middleware handle other errors
    }
    throw new Error(`Unknown error: ${String(error)}`);
  }
};

export const login: RouterMiddleware<string> = async (ctx) => {
  const body = await ctx.request.body().value;
  
  if (!body.email || !body.password) {
    throw new BadRequestError("Email and password are required");
  }
  
  const user = await validateUser(body.email, body.password);
  
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }
  
  const token = await generateToken(user);
  
  ctx.response.body = { 
    status: "success", 
    data: { 
      user: { id: user.id, email: user.email },
      token 
    } 
  };
};