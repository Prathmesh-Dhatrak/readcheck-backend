import { RouterMiddleware } from "../deps.ts";
import { findArticleById, findArticlesByUserId, createArticle, updateArticle, deleteArticle, markArticleAsRead } from "../models/article.ts";
import { analyzeContent, fetchWebContent } from "../services/openai.ts";
import { AuthContext } from "../middleware/auth.ts";
import { 
  UnauthorizedError, 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError,
  ExternalServiceError
} from "../utils/errors.ts";

export const getArticles: RouterMiddleware<string> = async (ctx) => {
  const authContext = ctx as AuthContext;
  
  if (!authContext.user) {
    throw new UnauthorizedError("User authentication required");
  }
  
  const articles = await findArticlesByUserId(authContext.user.id);
  
  ctx.response.body = { 
    status: "success", 
    data: { articles } 
  };
};

export const getArticle: RouterMiddleware<string> = async (ctx) => {
  const authContext = ctx as AuthContext;
  
  if (!authContext.user) {
    throw new UnauthorizedError("User authentication required");
  }
  
  const id = Number(ctx.params.id);
  
  if (isNaN(id)) {
    throw new BadRequestError("Invalid article ID");
  }
  
  const article = await findArticleById(id);
  
  if (!article) {
    throw new NotFoundError("Article not found");
  }
  
  if (article.user_id !== authContext.user.id) {
    throw new ForbiddenError("You don't have permission to access this article");
  }
  
  ctx.response.body = { 
    status: "success", 
    data: { article } 
  };
};

export const saveArticle: RouterMiddleware<string> = async (ctx) => {
  const authContext = ctx as AuthContext;
  
  if (!authContext.user) {
    throw new UnauthorizedError("User authentication required");
  }
  
  const body = await ctx.request.body().value;
  
  if (!body.url || !body.title) {
    throw new BadRequestError("URL and title are required");
  }
  
  try {
    // Fetch content from URL
    const content = await fetchWebContent(body.url);
    
    // Analyze content using OpenAI API
    const analysis = await analyzeContent(body.url, body.title, content);
    
    // Save article to database
    const article = await createArticle(
      authContext.user.id,
      body.url,
      body.title,
      analysis.question,
      analysis.answer
    );
    
    ctx.response.status = 201; // Created
    ctx.response.body = { 
      status: "success", 
      data: { article } 
    };
  } catch (error: unknown) {
    throw new ExternalServiceError(`Failed to save article: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const updateArticleController: RouterMiddleware<string> = async (ctx) => {
  const authContext = ctx as AuthContext;
  
  if (!authContext.user) {
    throw new UnauthorizedError("User authentication required");
  }
  
  const id = Number(ctx.params.id);
  
  if (isNaN(id)) {
    throw new BadRequestError("Invalid article ID");
  }
  
  const body = await ctx.request.body().value;
  
  // Only allow updating certain fields
  const allowedUpdates = ["title", "is_read"];
  const updates: Record<string, unknown> = {};
  
  for (const field of allowedUpdates) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }
  
  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("No valid fields to update");
  }
  
  const article = await updateArticle(id, authContext.user.id, updates);
  
  if (!article) {
    throw new NotFoundError("Article not found or unauthorized");
  }
  
  ctx.response.body = { 
    status: "success", 
    data: { article } 
  };
};

export const deleteArticleController: RouterMiddleware<string> = async (ctx) => {
  const authContext = ctx as AuthContext;
  
  if (!authContext.user) {
    throw new UnauthorizedError("User authentication required");
  }
  
  const id = Number(ctx.params.id);
  
  if (isNaN(id)) {
    throw new BadRequestError("Invalid article ID");
  }
  
  const success = await deleteArticle(id, authContext.user.id);
  
  if (!success) {
    throw new NotFoundError("Article not found or unauthorized");
  }
  
  ctx.response.body = { 
    status: "success", 
    message: "Article deleted successfully" 
  };
};

export const verifyArticle: RouterMiddleware<string> = async (ctx) => {
  const authContext = ctx as AuthContext;
  
  if (!authContext.user) {
    throw new UnauthorizedError("User authentication required");
  }
  
  const id = Number(ctx.params.id);
  
  if (isNaN(id)) {
    throw new BadRequestError("Invalid article ID");
  }
  
  const body = await ctx.request.body().value;
  
  if (!body.answer) {
    throw new BadRequestError("Answer is required");
  }
  
  // Get the article to check the answer
  const article = await findArticleById(id);
  
  if (!article) {
    throw new NotFoundError("Article not found");
  }
  
  if (article.user_id !== authContext.user.id) {
    throw new ForbiddenError("You don't have permission to access this article");
  }
  
  // Simple string comparison for now - could be enhanced with AI-based answer verification
  const isCorrect = body.answer.toLowerCase().includes(article.answer.toLowerCase()) || 
                    article.answer.toLowerCase().includes(body.answer.toLowerCase());
  
  if (isCorrect) {
    // Mark as read if answer is correct
    const updatedArticle = await markArticleAsRead(id, authContext.user.id);
    
    ctx.response.body = { 
      status: "success", 
      data: { 
        verified: true,
        message: "Correct answer! Article marked as read.",
        article: updatedArticle
      } 
    };
  } else {
    ctx.response.body = { 
      status: "success", 
      data: { 
        verified: false,
        message: "Incorrect answer. Try again.",
        article
      } 
    };
  }
};