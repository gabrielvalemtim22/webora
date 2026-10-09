create extension if not exists pgcrypto;
create table public.staff(id uuid primary key references auth.users(id),username text unique not null,role text not null check(role in ('supreme','seller')),active boolean not null default true);
create table public.products(id uuid primary key default gen_random_uuid(),name text not null,category text not null default 'Tecnologia',sku text unique,price integer not null check(price>0),old_price integer,stock integer not null default 0 check(stock>=0),description text not null default '',images jsonb not null default '[]',videos jsonb not null default '[]',yampi_id text,active boolean not null default false,featured boolean not null default false,free_sp boolean not null default true,created_at timestamptz default now());
create table public.settings(id integer primary key check(id=1),data jsonb not null);
insert into public.settings values(1,'{"pix_key":"63371209000181","pix_name":"WEBORA","pix_city":"SAO PAULO","yampi_base":"","whatsapp":"","banner_title":"Seu próximo achado está aqui.","banner_image":"/assets/banner.webp","cashback_enabled":false}');
create table public.leads(id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.staff(id),name text not null,phone text not null,notes text default '',created_at timestamptz default now());
create table public.orders(id uuid primary key default gen_random_uuid(),number bigint generated always as identity unique,access_hash text unique not null,customer jsonb not null,items jsonb not null,total integer not null check(total>0),seller_id uuid references public.staff(id),method text not null check(method in ('pix','credit','debit')),status text not null default 'pending' check(status in ('pending','review','paid','prepared','shipped','transit','delivered','cancelled')),receipt text,pix_payload text,tracking_code text,tracking_url text,carrier text,created_at timestamptz default now());
create table public.sales_requests(id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.staff(id),order_id uuid references public.orders(id),customer_name text not null,amount integer not null check(amount>0),receipt text,notes text default '',status text not null default 'pending' check(status in ('pending','approved','rejected')),created_at timestamptz default now());
create table public.messages(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),sender text not null check(sender in ('customer','staff')),body text not null check(length(body) between 1 and 2000),created_at timestamptz default now());
create table public.audit(id bigint generated always as identity primary key,actor uuid references public.staff(id),action text not null,details jsonb,created_at timestamptz default now());
alter table public.staff enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.leads enable row level security;
alter table public.orders enable row level security;
alter table public.sales_requests enable row level security;
alter table public.messages enable row level security;
alter table public.audit enable row level security;
revoke all on public.staff,public.products,public.settings,public.leads,public.orders,public.sales_requests,public.messages,public.audit from anon,authenticated;
grant all on public.staff,public.products,public.settings,public.leads,public.orders,public.sales_requests,public.messages,public.audit to service_role;
grant usage,select on all sequences in schema public to service_role;
create index orders_seller_date on public.orders(seller_id,created_at);
create index leads_seller on public.leads(seller_id);
create index messages_order on public.messages(order_id,created_at);
create or replace function public.create_shop_order(p_access_hash text,p_customer jsonb,p_items jsonb,p_seller uuid,p_method text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_item jsonb; v_product products; v_items jsonb:='[]';v_total integer:=0;v_qty integer;v_order orders;
begin
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'Carrinho inválido';end if;
 if p_seller is not null and not exists(select 1 from staff where id=p_seller and active and role='seller')then raise exception 'Vendedor indisponível';end if;
 for v_item in select value from jsonb_array_elements(p_items) order by value->>'id' loop
  v_qty:=(v_item->>'quantity')::integer;if v_qty<1 or v_qty>99 then raise exception 'Quantidade inválida';end if;
  select * into v_product from products where id=(v_item->>'id')::uuid and active for update;
  if not found or v_product.stock<v_qty then raise exception 'Produto sem estoque';end if;
  update products set stock=stock-v_qty where id=v_product.id;
  v_total:=v_total+v_product.price*v_qty;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('id',v_product.id,'name',v_product.name,'price',v_product.price,'quantity',v_qty,'image',v_product.images->>0,'yampi_id',v_product.yampi_id));
 end loop;
 insert into orders(access_hash,customer,items,total,seller_id,method)values(p_access_hash,p_customer,v_items,v_total,p_seller,p_method) returning * into v_order;
 return to_jsonb(v_order)-'access_hash';
end;$$;
revoke all on function public.create_shop_order(text,jsonb,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.create_shop_order(text,jsonb,jsonb,uuid,text) to service_role;
create or replace function public.cancel_shop_order(p_id uuid)returns void language plpgsql security invoker set search_path=public as $$
declare v_order orders;v_item jsonb;
begin
 select * into v_order from orders where id=p_id for update;
 if not found or v_order.status='cancelled' then return;end if;
 if v_order.status not in ('pending','review')then raise exception 'Somente pedidos pendentes podem ser cancelados';end if;
 for v_item in select value from jsonb_array_elements(v_order.items)loop update products set stock=stock+(v_item->>'quantity')::integer where id=(v_item->>'id')::uuid;end loop;
 update orders set status='cancelled'where id=p_id;
end;$$;
revoke all on function public.cancel_shop_order(uuid)from public,anon,authenticated;
grant execute on function public.cancel_shop_order(uuid)to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('product-media','product-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),('receipts','receipts',false,10485760,array['image/jpeg','image/png','application/pdf'])on conflict(id)do nothing;
