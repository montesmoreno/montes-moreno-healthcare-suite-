import { json, db, requireRole, handlerError } from "./_clock.js";
export default async function handler(req,res){
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  try{requireRole(req,"admin"); const id=String(req.body?.pageId||"").trim(); const {data,error}=await db().from("employees").update({active:req.body?.active===true,updated_at:new Date().toISOString()}).eq("id",id).select("id").single(); if(error)throw error; return json(res,200,{success:true,pageId:data.id});}catch(e){return handlerError(res,e);}
}
