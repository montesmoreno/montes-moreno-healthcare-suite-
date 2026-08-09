import { json, db, requireRole, handlerError } from "./_clock.js";
export default async function handler(req,res){
  if(req.method!=="GET") return json(res,405,{error:"Method not allowed"});
  try{ requireRole(req,"admin"); const {data,error}=await db().from("employees").select("id,employee_id,full_name,hourly_rate,active,must_change_password,hire_date,notes").order("employee_id"); if(error)throw error;
    const employees=(data||[]).map(x=>({pageId:x.id,id:String(x.employee_id),employeeId:String(x.employee_id),name:x.full_name,employeeName:x.full_name,rate:Number(x.hourly_rate),hourlyRate:Number(x.hourly_rate),active:x.active,mustChangePassword:x.must_change_password,hireDate:x.hire_date,notes:x.notes||""}));
    return json(res,200,{employees,total:employees.length});
  }catch(e){return handlerError(res,e);}
}
