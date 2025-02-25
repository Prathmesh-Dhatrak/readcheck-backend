export interface User {
    id: string; // Changed from number to string for UUID
    email: string;
}

export interface Article {
    id: string; // Changed from number to string for UUID
    user_id: string; // Changed from number to string for UUID
    url: string;
    title: string;
    question: string;
    answer: string;
    is_read: boolean;
    created_at: Date;
}