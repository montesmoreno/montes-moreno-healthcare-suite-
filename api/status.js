import { json, db, requireRole, centralDate, payrollDates, mapRecord, handlerError } from "./_clock.js";
export default async function handler(req,res){
  if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
  try{const user=requireRole(req,"employee"); const period=payrollDates(); const {data,error}=await db().from("time_records").select("*,clinic:clinics(name)").eq("employee_record_id",user.sub).gte("work_date",period.start).lte("work_date",period.end).order("work_date",{ascending:false}); if(error)throw error; const records=(data||[]).map(mapRecord); return json(res,200,{employee:{id:user.employeeId,name:user.name},current:records.find(x=>x.workDate===centralDate())||null,period,records});}catch(e){return handlerError(res,e);}
}
