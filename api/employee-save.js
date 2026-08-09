import { json, db, bcrypt, requireRole, handlerError } from "./_clock.js";
export default async function handler(req,res){
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  try{ requireRole(req,"admin"); const b=req.body||{}; const employeeId=String(b.employeeId||"").trim(); const name=String(b.name||"").trim(); const rate=Number(b.hourlyRate); const password=String(b.password||"");
    if(!employeeId||!name||!Number.isFinite(rate)||rate<=0||password.length<8) return json(res,400,{error:"Complete all required fields. Password must contain at least 8 characters."});
    const {data:org,error:oe}=await db().from("organizations").select("id").eq("name","Montes Moreno Healthcare Associates").single(); if(oe)throw oe;
    const passwordHash=await bcrypt.hash(password,12);
    const {data,error}=await db().from("employees").insert({organization_id:org.id,employee_id:employeeId,full_name:name,hourly_rate:rate,password_hash:passwordHash,active:b.active!==false,time_clock_enabled:true,must_change_password:b.mustChangePassword!==false,hire_date:b.hireDate||null,notes:String(b.notes||"").trim()||null}).select("id,employee_id,full_name").single();
    if(error?.code==="23505") return json(res,409,{error:"That Employee ID already exists."}); if(error)throw error;
    return json(res,201,{success:true,employee:{pageId:data.id,id:data.employee_id,name:data.full_name}});
  }catch(e){return handlerError(res,e);}
}
