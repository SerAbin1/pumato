import { z } from "zod";

export const FEEDBACK_MAX_LENGTH = 1000;

export const FeedbackSchema = z.object({
    message: z.string().trim().min(1).max(FEEDBACK_MAX_LENGTH),
    userId: z.string().nullable(),
    userEmail: z.string().nullable(),
    page: z.string(),
    status: z.enum(["new", "handled"]),
    createdAt: z.any(),
});
