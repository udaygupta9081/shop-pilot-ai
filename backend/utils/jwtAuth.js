// Routes/chatRoutes.js imports { verifyToken } from here.
// The project now uses server-side sessions (see middleware/requireAuth.js), so this file
// simply re-exports that middleware under the old name. chatRoutes.js did not need to change.
export { requireAuth as verifyToken } from "../middleware/requireAuth.js";
