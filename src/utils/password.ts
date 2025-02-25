export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Generate salt (16 random bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Hash the password with the salt
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array([...salt, ...data])
    );
    
    // Convert to base64 strings
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const saltArray = Array.from(salt);
    
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    const saltBase64 = btoa(String.fromCharCode(...saltArray));
    
    // Return salt and hash combined
    return `${saltBase64}:${hashBase64}`;
  }
  
  export async function comparePasswords(
    password: string,
    storedHash: string
  ): Promise<boolean> {
    const [saltBase64, hashBase64] = storedHash.split(":");
    
    // Decode the salt
    const saltString = atob(saltBase64);
    const salt = new Uint8Array(saltString.length);
    for (let i = 0; i < saltString.length; i++) {
      salt[i] = saltString.charCodeAt(i);
    }
    
    // Hash the input password with the same salt
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array([...salt, ...data])
    );
    
    // Convert to base64 string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const newHashBase64 = btoa(String.fromCharCode(...hashArray));
    
    // Compare hashes
    return newHashBase64 === hashBase64;
  }