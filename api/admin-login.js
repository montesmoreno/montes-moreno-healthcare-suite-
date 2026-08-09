import crypto from "crypto";
import { json, signAdmin, handlerError } from "./_clock.js";
const same = (a,b) => { const x=Buffer.from(String(a||"")); const y=Buffer.from(String(b||"")); return x.length===y.length && crypto.timingSafeEqual(x,y); };
export default async function handler(req,res) {
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  try {
    if(!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) throw new Error("Administrator credentials are not configured");
    if(!same(req.body?.username,process.env.ADMIN_USERNAME)||!same(req.body?.password,process.env.ADMIN_PASSWORD)) return json(res,401,{error:"Invalid username or password"});
    return json(res,200,{success:true,token:signAdmin(),admin:{username:process.env.ADMIN_USERNAME,name:"Administrator"}});
  } catch(e){ return handlerError(res,e); }
}
