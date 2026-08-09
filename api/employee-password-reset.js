import { json, db, bcrypt, requireRole, handlerError } from "./_clock.js";
export default async function handler(req,res){
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  try{requireRole(req,"admin"); const p=String(req.body?.newPassword||""); if(p.length<8)return json(res,400,{error:"Password must contain at least 8 characters."}); const hash=await bcrypt.hash(p,12); const {error}=await db().from("employees").update({password_hash:hash,must_change_password:req.body?.requirePasswordChange===true,updated_at:new Date().toISOString()}).eq("id",String(req.body?.pageId||"")); if(error)throw error; return json(res,200,{success:true});}catch(e){return handlerError(res,e);}
}
