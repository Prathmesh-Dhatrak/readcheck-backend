/**
 * Generates a UUID v4
 * Note: In production, you'd typically let the database generate UUIDs,
 * but this function can be useful for client-side ID generation
 */
export function generateUUID(): string {
    return crypto.randomUUID();
  }
  
  /**
   * Validates if a string is a valid UUID
   */
  export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }