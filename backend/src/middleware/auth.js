import { currentUserFromRequest } from "../services/users.js";

export function requireAuth(handler) {
  return async (context) => {
    const user = await currentUserFromRequest(context.req);
    return handler({ ...context, user });
  };
}
