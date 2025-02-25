import { Router } from "../deps.ts";
import { signup, login } from "../controllers/auth.ts";
import { 
  getArticles, 
  getArticle, 
  saveArticle, 
  updateArticleController, 
  deleteArticleController,
  verifyArticle 
} from "../controllers/article.ts";
import { authMiddleware, AuthContext } from "../middleware/auth.ts";

const router = new Router();

// Auth routes
router.post("/api/auth/signup", signup);
router.post("/api/auth/login", login);

// Article routes (protected)
router.get("/api/articles", authMiddleware(), getArticles);
router.get("/api/articles/:id", authMiddleware(), getArticle);
router.post("/api/articles", authMiddleware(), saveArticle);
router.patch("/api/articles/:id", authMiddleware(), updateArticleController);
router.delete("/api/articles/:id", authMiddleware(), deleteArticleController);
router.post("/api/articles/:id/verify", authMiddleware(), verifyArticle);

// User info route
router.get("/api/user", authMiddleware(), (ctx) => {
  // Fix: Cast context to AuthContext
  const authContext = ctx as AuthContext;
  
  // Now we can safely access user
  if (!authContext.user) {
    ctx.response.status = 401;
    ctx.response.body = { status: "error", message: "Unauthorized" };
    return;
  }
  
  ctx.response.body = { status: "success", data: { user: authContext.user } };
});

export default router;