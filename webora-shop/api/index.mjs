export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const host=req.headers.host;
 const origin=req.headers.origin;
 if(origin&&origin!=='https://'+host&&origin!=='http://'+host)return res.status(403).json({error:'Origem inválida'});
 if(!process.env.WEBORA_BACKEND_URL||!process.env.WEBORA_GATEWAY_TOKEN)return res.status(503).json({error:'Conexão em preparação'});
 try{
  const u=new URL(req.url,'https://webora.local');
  const r=await fetch(process.env.WEBORA_BACKEND_URL+u.search,{
   method:req.method,
   headers:{'Content-Type':'application/json','x-webora-gateway':process.env.WEBORA_GATEWAY_TOKEN,'x-webora-host':host,...(origin?{origin}:{}),...(req.headers.cookie?{cookie:req.headers.cookie}:{})},
   body:['GET','HEAD'].includes(req.method)?undefined:JSON.stringify(typeof req.body==='string'?JSON.parse(req.body):req.body||{})
  });
  res.setHeader('Content-Type','application/json');
  const cookies=typeof r.headers.getSetCookie==='function'?r.headers.getSetCookie():[r.headers.get('set-cookie')||''];const cookie=cookies.find(c=>c.startsWith('wb_access='));if(cookie)res.setHeader('Set-Cookie',cookie.split(/,\s*__cf_bm=/)[0]);
  return res.status(r.status).send(await r.text());
 }catch{return res.status(502).json({error:'Não foi possível conectar. Tente novamente.'});}
}
