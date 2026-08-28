import { json, db, requireRole, employeeById, clinicByName, centralDate, payrollDates, payableClockIn, handlerError } from "./_clock.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const user = requireRole(req, "employee");
    const employee = await employeeById(user.employeeId);
    if (!employee || !employee.active || !employee.time_clock_enabled) return json(res, 403, { error: "Employee is not authorized to use Time Clock." });
    const clinic = await clinicByName(String(req.body?.workClinic || ""), employee.organization_id);
    if (!clinic) return json(res, 400, { error: "Please select a valid work clinic." });
    const { data: assignment, error: assignmentError } = await db().from("employee_clinics").select("clinic_id").eq("employee_id", employee.id).eq("clinic_id", clinic.id).maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment) return json(res, 403, { error: "This clinic is not assigned to your employee account." });
    const employeeNote = String(req.body?.employeeNote || "").trim().slice(0, 1000);
    const workDate = centralDate();
    const { data: existing, error: existingError } = await db().from("time_records").select("id").eq("employee_record_id", employee.id).eq("work_date", workDate).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return json(res, 409, { error: "A time record already exists for today." });
    const period = payrollDates(workDate);
    const actualClockIn = new Date();
    const paidClockIn = payableClockIn(actualClockIn, clinic.name);
    const { data, error } = await db().from("time_records").insert({
      organization_id: employee.organization_id, employee_record_id: employee.id, clinic_id: clinic.id,
      employee_id: employee.employee_id, employee_name: employee.full_name, work_date: workDate,
      actual_clock_in: actualClockIn.toISOString(), clock_in: paidClockIn,
      hourly_rate_snapshot: employee.hourly_rate, status: "clocked_in", employee_note: employeeNote,
      pay_period_start: period.start, pay_period_end: period.end, pay_date: period.payDate, source_system: "supabase"
    }).select().single();
    if (error) throw error;
    return json(res, 200, { ok: true, message: "Arrival recorded successfully.", actualClockIn: actualClockIn.toISOString(), paidClockIn, record: data });
  } catch (error) { return handlerError(res, error); }
}
