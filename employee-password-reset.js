import { json, db, bcrypt, requireUser, handlerError } from "./_clock.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const user = requireUser(req);
    const newPassword = String(req.body?.newPassword || "");

    if (newPassword.length < 8) {
      return json(res, 400, { error: "Password must contain at least 8 characters." });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    if (user.role === "admin") {
      const employeeRecordId = String(req.body?.pageId || "").trim();
      if (!employeeRecordId) return json(res, 400, { error: "Employee is required." });

      const { error } = await db().from("employees").update({
        password_hash: hash,
        must_change_password: req.body?.requirePasswordChange === true,
        updated_at: new Date().toISOString()
      }).eq("id", employeeRecordId);
      if (error) throw error;
      return json(res, 200, { success: true });
    }

    if (user.role === "employee") {
      const { data: employee, error: lookupError } = await db()
        .from("employees")
        .select("id,active,time_clock_enabled,must_change_password")
        .eq("id", user.sub)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!employee || !employee.active || !employee.time_clock_enabled) {
        return json(res, 403, { error: "Employee is not authorized to use Time Clock." });
      }
      if (!employee.must_change_password) {
        return json(res, 409, { error: "A password change is not currently required." });
      }

      const { error } = await db().from("employees").update({
        password_hash: hash,
        must_change_password: false,
        updated_at: new Date().toISOString()
      }).eq("id", user.sub);
      if (error) throw error;
      return json(res, 200, { success: true });
    }

    return json(res, 401, { error: "Unauthorized" });
  } catch (e) {
    return handlerError(res, e);
  }
}
