import { json, db, bcrypt, signEmployee, handlerError } from "./_clock.js";
export default async function handler(req,res){
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  try{
    const id=String(req.body?.employeeId||"").trim(); const password=String(req.body?.password||"");
    const {data,error}=await db().from("employees").select("*").eq("employee_id",id).maybeSingle(); if(error) throw error;
    if(!data||!data.active||!data.time_clock_enabled||!data.password_hash||!(await bcrypt.compare(password,data.password_hash))) return json(res,401,{error:"Invalid Employee ID or password"});
    return json(res,200,{success:true,token:signEmployee(data),employee:{id:data.employee_id,name:data.full_name,mustChangePassword:data.must_change_password}});
  }catch(e){return handlerError(res,e);}
}
