import { config } from "../../config.ts";

export async function createJWT(payload: Record<string, unknown>): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  const signature = await createSignature(`${encodedHeader}.${encodedPayload}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyJWT(token: string): Promise<Record<string, unknown>> {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  
  const expectedSignature = await createSignature(`${encodedHeader}.${encodedPayload}`);
  
  if (signature !== expectedSignature) {
    throw new Error("Invalid signature");
  }
  
  try {
    const payload = JSON.parse(atob(encodedPayload));
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error("Token expired");
    }
    
    return payload;
  } catch (_error) {
    throw new Error("Invalid token");
  }
}

async function createSignature(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(input)
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}