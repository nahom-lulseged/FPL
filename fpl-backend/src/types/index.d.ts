declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        authUserId: string;
        aal: 'aal1' | 'aal2';
        accessToken: string;
      };
      auditBefore?: unknown;
    }

    interface Locals {
      validatedQuery?: unknown;
    }
  }
}

export {};
