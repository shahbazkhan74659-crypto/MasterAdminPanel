import { z } from "zod";

// Duplicated from frontend/src/loginSchema.ts -- no shared package exists between
// the two isolated npm packages (no workspace, no root package.json), so this is
// kept in sync by hand. See DECISIONS.md for the drift-risk tradeoff.
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "At least one uppercase letter")
    .regex(/[a-z]/, "At least one lowercase letter")
    .regex(/[0-9]/, "At least one number")
    .regex(/[^A-Za-z0-9]/, "At least one special character"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
