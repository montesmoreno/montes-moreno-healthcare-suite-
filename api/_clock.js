import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

export const CLINICS = ["Goliad", "San Pedro", "West Texas", "Odessa", "Rundberg", "Walzem"];

export function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function secret() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing");
  return process.env.JWT_SECRET;
}

export function signEmployee(employee) {
  return jwt.sign({ sub: employee.id, employeeId: employee.employee_id, name: employee.full_name, role: "employee" }, secret(), { expiresIn: "12h" });
}

export function requireRole(req, role) {
  const value = String(req.headers.authorization || "");
  if (!value.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  try {
    const claims = jwt.verify(value.slice(7), secret());
    if (claims.role !== role) throw new Error();
    return claims;
  } catch { throw new Error("UNAUTHORIZED"); }
}

export function signAdmin() {
  return jwt.sign({ sub: "admin", role: "admin", name: "Administrator" }, secret(), { expiresIn: "4h" });
}

export function payrollDates(value = centralDate()) {
  const anchor = Date.UTC(2026, 6, 27);
  const date = new Date(`${value}T12:00:00Z`);
  const days = Math.floor((date.getTime() - anchor) / 86400000);
  const period = Math.floor(days / 14);
  const start = new Date(anchor + period * 14 * 86400000);
  const end = new Date(start.getTime() + 13 * 86400000);
  const pay = new Date(end.getTime() + 5 * 86400000);
  const iso = d => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), payDate: iso(pay) };
}

export function centralDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function hoursBetween(start, end) {
  return Math.round(((new Date(end) - new Date(start)) / 3600000) * 100) / 100;
}

export function mapRecord(row) {
  return {
    id: row.id, pageId: row.id, employeeId: String(row.employee_id), employeeName: row.employee_name,
    workDate: row.work_date, clockIn: row.clock_in, clockOut: row.clock_out,
    hoursWorked: row.hours_worked == null ? null : Number(row.hours_worked),
    hourlyRate: Number(row.hourly_rate_snapshot || 0), grossPay: row.gross_pay == null ? null : Number(row.gross_pay),
    status: row.status, notes: row.notes || "", employeeNote: row.employee_note || "", payPeriodStart: row.pay_period_start,
    payPeriodEnd: row.pay_period_end, payDate: row.pay_date, workClinic: row.clinic?.name || ""
  };
}

export async function employeeById(employeeId) {
  const { data, error } = await db().from("employees").select("*").eq("employee_id", String(employeeId)).maybeSingle();
  if (error) throw error;
  return data;
}

export async function clinicByName(name, organizationId) {
  if (!CLINICS.includes(name)) return null;
  const { data, error } = await db().from("clinics").select("id,organization_id,name").eq("organization_id", organizationId).eq("name", name).eq("active", true).maybeSingle();
  if (error) throw error;
  return data;
}

export async function handlerError(res, error) {
  console.error(error);
  return json(res, error.message === "UNAUTHORIZED" ? 401 : 500, { error: error.message === "UNAUTHORIZED" ? "Unauthorized" : "Unable to complete the request." });
}

export { bcrypt };
