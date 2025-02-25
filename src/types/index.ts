export interface User {
    id: number;
    email: string;
}

export interface Article {
    id: number;
    user_id: number;
    url: string;
    title: string;
    question: string;
    answer: string;
    is_read: boolean;
    created_at: Date;
}
