import {randomBytes,createHash}from'node:crypto';
import QRCode from'qrcode';
import{pixPayload}from'./pix.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(message,status=400){throw Object.assign(Error(message),{status});}
function safeUrl(s){if(!s)return'';try{const u=new URL(s);if(u.protocol!=='https:')fail('Use um link HTTPS');return u.href;}catch{fail('Link inválido');}}
async function db(path,{method='GET',body}={}){const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});const t=await r.text();if(!r.ok){console.error('Database request failed',r.status,path.split('?')[0]);fail('Não foi possível salvar. Confira os dados e tente novamente.',502);}return t?JSON.parse(t):null;}
async function settings(){return(await db('settings?id=eq.1'))[0]?.data||{};}
function cookie(req,name){return(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);}
async function staff(req){const access=cookie(req,'wb_access');if(!access)fail('Entre na sua conta',401);const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:'Bearer '+access}});if(!r.ok)fail('Sessão expirada. Entre novamente.',401);const user=await r.json();const profile=(await db('staff?id=eq.'+user.id))[0];if(!profile?.active)fail('Acesso desativado',403);return profile;}
function supreme(profile){if(profile.role!=='supreme')fail('Apenas Gabriel pode realizar esta ação',403);}
async function orderFor(req,id,body){if(!UUID.test(id||''))fail('Pedido inválido');const token=body.token||req.query?.token;if(typeof token!=='string'||token.length<32)fail('Acesso ao pedido inválido',403);const rows=await db('orders?id=eq.'+id+'&access_hash=eq.'+hash(token));if(!rows[0])fail('Pedido não encontrado',404);return rows[0];}
function publicOrder(o){const{access_hash,...rest}=o;return rest;}
async function audit(profile,action,details){await db('audit',{method:'POST',body:{actor:profile.id,action,details}});}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');let body=req.body||{};if(typeof body==='string'){try{body=JSON.parse(body);}catch{return res.status(400).json({error:'Dados inválidos'});}}
 const url=new URL(req.url,'https://webora.local');const action=url.searchParams.get('action')||req.query?.action||'config';req.query=Object.fromEntries(url.searchParams);
 try{
  if(req.method==='POST'){const origin=req.headers.origin;if(origin&&origin!==`https://${req.headers.host}`&&origin!==`http://${req.headers.host}`)fail('Origem inválida',403);}
  const ready=!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.SUPABASE_ANON_KEY);
  if(action==='config')return res.status(200).json({ready,mode:process.env.APP_MODE||'shop',shop_url:process.env.SHOP_URL||'/',...(ready?await settings():{banner_title:'Seu próximo achado está aqui.',banner_image:'/assets/banner.webp',pix_key:'63371209000181'})});
  if(!ready)fail('O banco de dados ainda não foi conectado. A loja está em preparação.',503);
  const reads=['products','order','messages','me','dashboard','admin-products','admin-orders','leads','requests','team','admin-messages','payment-details'];if(reads.includes(action)&&req.method!=='GET')fail('Método inválido',405);if(!reads.includes(action)&&req.method!=='POST')fail('Método inválido',405);
  if(action==='products')return res.status(200).json(await db('products?active=eq.true&order=created_at.desc'));
  if(action==='login'){
   const username=String(body.username||'').toLowerCase().trim();if(!['gabriel','ademar'].includes(username))fail('Login ou senha incorretos',401);
   const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:process.env.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:username+'@staff.webora.invalid',password:body.password})});const data=await r.json();if(!r.ok)fail('Login ou senha incorretos',401);
   const profile=(await db('staff?id=eq.'+data.user.id))[0];if(!profile?.active)fail('Acesso desativado',403);
   res.setHeader('Set-Cookie',`wb_access=${data.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`);return res.status(200).json(profile);
  }
  if(action==='logout'){res.setHeader('Set-Cookie','wb_access=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return res.status(200).json({ok:true});}
  if(action==='create-order'){
   const c=body.customer||{};for(const key of['name','phone','cep','street','number','district','city','state'])if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>200)fail('Preencha o endereço completo');if(!/^\d{8}$/.test(c.cep.replace(/\D/g,'')))fail('CEP inválido');if(c.state.toUpperCase()!=='SP')fail('No momento entregamos apenas no estado de São Paulo');
   if(!['pix','credit','debit'].includes(body.method))fail('Pagamento inválido');if(!Array.isArray(body.items))fail('Carrinho inválido');
   const s=await settings();let cardUrl=null;
   if(body.method!=='pix'){
    const base=safeUrl(s.yampi_base);if(!base)fail('Cartão ainda não está habilitado. Escolha Pix.');const u=new URL(base);if(!u.hostname.endsWith('.yampi.com.br'))fail('Configure um domínio de checkout Yampi válido');
    const parts=[];for(const item of body.items){if(!UUID.test(item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)fail('Carrinho inválido');const p=(await db('products?id=eq.'+item.id+'&active=eq.true'))[0];if(!p?.yampi_id||! /^[A-Za-z0-9]+$/.test(p.yampi_id))fail('Este produto ainda não está vinculado à Yampi');parts.push(p.yampi_id+':'+item.quantity);}u.pathname='/r/'+parts.join(',');u.search='';cardUrl=u.href;
   }
   if(body.method==='pix')pixPayload({key:s.pix_key,amount:1,name:s.pix_name||'WEBORA',city:s.pix_city||'SAO PAULO',txid:'CHECK'});
   const token=randomBytes(32).toString('hex');const seller=body.seller&&UUID.test(body.seller)?body.seller:null;
   const order=await db('rpc/create_shop_order',{method:'POST',body:{p_access_hash:hash(token),p_customer:c,p_items:body.items,p_seller:seller,p_method:body.method}});
   const pix=body.method==='pix'?pixPayload({key:s.pix_key,amount:order.total,name:s.pix_name||'WEBORA',city:s.pix_city||'SAO PAULO',txid:'WB'+order.number}):null;
   if(pix)await db('orders?id=eq.'+order.id,{method:'PATCH',body:{pix_payload:pix}});
   return res.status(200).json({order,token,card_url:cardUrl,pix,qr:pix?await QRCode.toDataURL(pix,{width:320,margin:2}):null});
  }
  if(['order','messages','send-message','receipt','payment-details'].includes(action)){
   const o=await orderFor(req,body.order_id||req.query.id,body);
   if(action==='payment-details'){if(!o.pix_payload)fail('Pix não disponível para este pedido');return res.status(200).json({order:publicOrder(o),pix:o.pix_payload,qr:await QRCode.toDataURL(o.pix_payload,{width:320,margin:2})});}
   if(action==='order')return res.status(200).json(publicOrder(o));
   if(action==='messages')return res.status(200).json(await db('messages?order_id=eq.'+o.id+'&order=created_at.asc&limit=200'));
   if(action==='send-message'){const text=String(body.body||'').trim();if(!text||text.length>2000)fail('Mensagem inválida');await db('messages',{method:'POST',body:{order_id:o.id,sender:'customer',body:text}});return res.status(200).json({ok:true});}
   if(action==='receipt'){const path=String(body.path||'');if(!path.startsWith(o.id+'/'))fail('Comprovante inválido');await db('orders?id=eq.'+o.id,{method:'PATCH',body:{receipt:path,...(o.status==='pending'?{status:'review'}:{})}});return res.status(200).json({ok:true});}
  }
  if(action==='upload-receipt'){
   const o=await orderFor(req,body.order_id,body);const type=body.type;const ext={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'}[type];if(!ext)fail('Envie JPG, PNG ou PDF');const path=o.id+'/'+randomBytes(12).toString('hex')+'.'+ext;return res.status(200).json(await signedUpload('receipts',path));
  }
  const p=await staff(req);const own=p.role==='seller'?'&seller_id=eq.'+p.id:'';
  if(action==='me')return res.status(200).json(p);
  if(action==='dashboard'){
   const orders=await db('orders?select=id,total,status,created_at'+own);const leads=await db('leads?select=id'+own);const requests=await db('sales_requests?select=id,status,amount'+own);
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());const paid=orders.filter(o=>['paid','prepared','shipped','transit','delivered'].includes(o.status));const today=paid.filter(o=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(o.created_at))===day);
   return res.status(200).json({sales:today.length,revenue:today.reduce((n,o)=>n+o.total,0),leads:leads.length,pending:requests.filter(r=>r.status==='pending').length,total_sales:paid.length});
  }
  if(action==='admin-products'){supreme(p);return res.status(200).json(await db('products?order=created_at.desc'));}
  if(action==='save-product'){
   supreme(p);const v=body.product||{};if(!v.name||v.name.length>150||!Number.isInteger(v.price)||v.price<1||!Number.isInteger(v.stock)||v.stock<0)fail('Confira nome, preço e estoque');for(const list of[v.images||[],v.videos||[]]){if(!Array.isArray(list)||list.length>8)fail('Máximo de 8 arquivos por tipo');list.forEach(safeUrl);}
   const row={name:v.name,category:v.category||'Tecnologia',sku:v.sku||null,price:v.price,old_price:v.old_price||null,stock:v.stock,description:String(v.description||'').slice(0,10000),images:v.images||[],videos:v.videos||[],yampi_id:v.yampi_id||null,active:!!v.active,featured:!!v.featured,free_sp:!!v.free_sp};
   if(v.id&&!UUID.test(v.id))fail('Produto inválido');const result=await db(v.id?'products?id=eq.'+v.id:'products',{method:v.id?'PATCH':'POST',body:row});await audit(p,'save-product',{id:result[0].id});return res.status(200).json(result[0]);
  }
  if(action==='delete-product'){supreme(p);if(!UUID.test(body.id))fail('Produto inválido');await db('products?id=eq.'+body.id,{method:'DELETE'});await audit(p,'delete-product',{id:body.id});return res.status(200).json({ok:true});}
  if(action==='save-settings'){supreme(p);const d=body.settings||{};for(const k of['yampi_base','banner_image'])if(d[k]&&!d[k].startsWith('/assets/'))d[k]=safeUrl(d[k]);if(d.yampi_base&&!new URL(d.yampi_base).hostname.endsWith('.yampi.com.br'))fail('Use o endereço *.yampi.com.br do checkout');if(!d.pix_key||!d.pix_name||!d.pix_city)fail('Preencha os dados Pix');const allowed={pix_key:d.pix_key,pix_name:d.pix_name,pix_city:d.pix_city,yampi_base:d.yampi_base||'',whatsapp:String(d.whatsapp||'').replace(/\D/g,''),banner_title:String(d.banner_title||'').slice(0,100),banner_image:d.banner_image||'/assets/banner.webp',cashback_enabled:false};await db('settings?id=eq.1',{method:'PATCH',body:{data:allowed}});await audit(p,'settings',{});return res.status(200).json({ok:true});}
  if(action==='admin-orders')return res.status(200).json((await db('orders?order=created_at.desc'+own)).map(publicOrder));
  if(action==='update-order'){
   supreme(p);if(!UUID.test(body.id))fail('Pedido inválido');const status=body.status;if(!['pending','review','paid','prepared','shipped','transit','delivered','cancelled'].includes(status))fail('Status inválido');if(status==='cancelled')await db('rpc/cancel_shop_order',{method:'POST',body:{p_id:body.id}});else{const prev=(await db('orders?id=eq.'+body.id))[0];if(!prev||prev.status==='cancelled')fail('Pedido cancelado não pode ser reaberto');await db('orders?id=eq.'+body.id,{method:'PATCH',body:{status,tracking_code:String(body.tracking_code||''),tracking_url:safeUrl(body.tracking_url),carrier:String(body.carrier||'')}});}await audit(p,'update-order',{id:body.id,status});return res.status(200).json({ok:true});
  }
  if(action==='leads')return res.status(200).json(await db('leads?order=created_at.desc'+own));
  if(action==='save-lead'){if(!body.name||!body.phone)fail('Informe nome e WhatsApp');await db('leads',{method:'POST',body:{seller_id:p.id,name:String(body.name).slice(0,150),phone:String(body.phone).replace(/\D/g,'').slice(0,15),notes:String(body.notes||'').slice(0,2000)}});return res.status(200).json({ok:true});}
  if(action==='requests')return res.status(200).json(await db('sales_requests?order=created_at.desc'+own));
  if(action==='sales-request'){if(!body.customer_name||!Number.isInteger(body.amount)||body.amount<1)fail('Informe cliente e valor');const id=body.order_id||null;if(id){if(!UUID.test(id))fail('Pedido inválido');const o=(await db('orders?id=eq.'+id))[0];if(!o||o.seller_id!==p.id)fail('O pedido não pertence ao seu acesso',403);}await db('sales_requests',{method:'POST',body:{seller_id:p.id,order_id:id,customer_name:String(body.customer_name).slice(0,150),amount:body.amount,notes:String(body.notes||'').slice(0,2000)}});return res.status(200).json({ok:true});}
  if(action==='review-request'){supreme(p);if(!UUID.test(body.id)||!['approved','rejected'].includes(body.status))fail('Solicitação inválida');await db('sales_requests?id=eq.'+body.id+'&status=eq.pending',{method:'PATCH',body:{status:body.status}});await audit(p,'review-request',{id:body.id,status:body.status});return res.status(200).json({ok:true});}
  if(action==='team'){supreme(p);return res.status(200).json(await db('staff?select=id,username,role,active'));}
  if(action==='toggle-seller'){supreme(p);if(!UUID.test(body.id))fail('Usuário inválido');await db('staff?id=eq.'+body.id+'&role=eq.seller',{method:'PATCH',body:{active:!!body.active}});await audit(p,'toggle-seller',{id:body.id,active:!!body.active});return res.status(200).json({ok:true});}
  if(action==='admin-messages'){const id=req.query.id;if(!UUID.test(id||''))fail('Pedido inválido');const o=(await db('orders?id=eq.'+id+own))[0];if(!o)fail('Acesso negado',403);return res.status(200).json(await db('messages?order_id=eq.'+id+'&order=created_at.asc&limit=200'));}
  if(action==='reply'){if(!UUID.test(body.order_id||''))fail('Pedido inválido');const o=(await db('orders?id=eq.'+body.order_id+own))[0];if(!o)fail('Acesso negado',403);const text=String(body.body||'').trim();if(!text||text.length>2000)fail('Mensagem inválida');await db('messages',{method:'POST',body:{order_id:o.id,sender:'staff',body:text}});return res.status(200).json({ok:true});}
  if(action==='upload-media'){supreme(p);const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'}[body.type];if(!ext)fail('Arquivo não suportado');return res.status(200).json(await signedUpload('product-media',randomBytes(16).toString('hex')+'.'+ext));}
  if(action==='receipt-url'){supreme(p);const o=(await db('orders?id=eq.'+body.id))[0];if(!o?.receipt)fail('Sem comprovante');const r=await fetch(process.env.SUPABASE_URL+'/storage/v1/object/sign/receipts/'+o.receipt,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120})});if(!r.ok)fail('Não foi possível abrir o comprovante');const d=await r.json();return res.status(200).json({url:process.env.SUPABASE_URL+'/storage/v1'+d.signedURL});}
  fail('Ação não encontrada',404);
 }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'Ocorreu um erro. Tente novamente.'});}
}
async function signedUpload(bucket,path){const r=await fetch(process.env.SUPABASE_URL+'/storage/v1/object/upload/sign/'+bucket+'/'+path,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:'{}'});if(!r.ok)fail('Upload indisponível');const d=await r.json();return{path,upload_url:process.env.SUPABASE_URL+'/storage/v1'+d.url,public_url:bucket==='product-media'?process.env.SUPABASE_URL+'/storage/v1/object/public/'+bucket+'/'+path:null};}
