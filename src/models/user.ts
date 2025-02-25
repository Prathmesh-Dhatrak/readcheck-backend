import { db } from "../db/client.ts";
import { User } from "../types/index.ts";
import { hashPassword, comparePasswords } from "../utils/password.ts";
import { DatabaseError, ConflictError } from "../utils/errors.ts";

export async function findUserById(id: number): Promise<User | null> {
    try {
        const result = await db.query(
            "SELECT id, email FROM users WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0] as User;
    } catch (error) {
        throw new DatabaseError(`Error finding user by ID: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function findUserByEmail(email: string): Promise<User | null> {
    try {
        const result = await db.query(
            "SELECT id, email FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0] as User;
    } catch (error) {
        throw new DatabaseError(`Error finding user by email: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function createUser(email: string, password: string): Promise<User> {
    const hashedPassword = await hashPassword(password);

    try {
        const result = await db.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );

        return result.rows[0] as User;
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message.includes("duplicate key")) {
                throw new ConflictError("Email already in use");
            }
            throw new DatabaseError(`Error creating user: ${error.message}`);
        }
        throw new DatabaseError(`Unknown error creating user: ${String(error)}`);
    }
}

export async function validateUser(email: string, password: string): Promise<User | null> {
    try {
        const result = await db.query(
            "SELECT id, email, password_hash FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return null;
        }

        // Define the type for the database result including password_hash
        interface UserWithPassword {
            id: number;
            email: string;
            password_hash: string;
        }

        const user = result.rows[0] as UserWithPassword;
        const isValid = await comparePasswords(password, user.password_hash);

        if (!isValid) {
            return null;
        }

        return { id: user.id, email: user.email };
    } catch (error) {
        throw new DatabaseError(`Error validating user: ${error instanceof Error ? error.message : String(error)}`);
    }
}