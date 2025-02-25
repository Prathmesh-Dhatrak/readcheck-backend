import { db } from "../db/client.ts";
import { Article } from "../types/index.ts";
import { DatabaseError } from "../utils/errors.ts";

export async function findArticleById(id: number): Promise<Article | null> {
  try {
    const result = await db.query(
      "SELECT * FROM blog WHERE id = $1",
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as Article;
  } catch (error) {
    throw new DatabaseError(`Error finding article: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function findArticlesByUserId(userId: number): Promise<Article[]> {
  try {
    const result = await db.query(
      "SELECT * FROM blog WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    
    return result.rows as Article[];
  } catch (error) {
    throw new DatabaseError(`Error finding user articles: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createArticle(
  userId: number,
  url: string,
  title: string,
  question: string,
  answer: string
): Promise<Article> {
  try {
    const result = await db.query(
      `INSERT INTO blog (user_id, url, title, question, answer, is_read) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, url, title, question, answer, false]
    );
    
    return result.rows[0] as Article;
  } catch (error) {
    throw new DatabaseError(`Error creating article: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateArticle(
  id: number,
  userId: number,
  updates: Partial<Article>
): Promise<Article | null> {
  try {
    // Create SET clause dynamically based on provided updates
    const setEntries = Object.entries(updates)
      .filter(([key, _]) => key !== "id" && key !== "user_id" && key !== "created_at")
      .map(([key, _], index) => `${key} = $${index + 3}`);
    
    if (setEntries.length === 0) {
      return await findArticleById(id);
    }
    
    const setClause = setEntries.join(", ");
    const values = Object.entries(updates)
      .filter(([key, _]) => key !== "id" && key !== "user_id" && key !== "created_at")
      .map(([_, value]) => value);
    
    const query = `
      UPDATE blog 
      SET ${setClause} 
      WHERE id = $1 AND user_id = $2 
      RETURNING *
    `;
    
    const result = await db.query(
      query,
      [id, userId, ...values]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as Article;
  } catch (error) {
    throw new DatabaseError(`Error updating article: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteArticle(id: number, userId: number): Promise<boolean> {
  try {
    const result = await db.query(
      "DELETE FROM blog WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    throw new DatabaseError(`Error deleting article: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function markArticleAsRead(id: number, userId: number): Promise<Article | null> {
  try {
    const result = await db.query(
      "UPDATE blog SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as Article;
  } catch (error) {
    throw new DatabaseError(`Error marking article as read: ${error instanceof Error ? error.message : String(error)}`);
  }
}