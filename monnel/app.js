(() => {
  'use strict';
  const config = window.MONNEL_CONFIG || {};
  const money = cents => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(cents / 100);
  const number = n => new Intl.NumberFormat('pt-BR').format(n);
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const networks = {
    instagram:{name:'Instagram',domains:['instagram.com'],services:['followers','likes','views','comments']},
    tiktok:{name:'TikTok',domains:['tiktok.com'],services:['followers','likes','views','comments']},
    youtube:{name:'YouTube',domains:['youtube.com','youtu.be'],services:['followers','likes','views','comments']},
    facebook:{name:'Facebook',domains:['facebook.com','fb.watch'],services:['followers','likes','views','comments']},
    x:{name:'X (Twitter)',domains:['x.com','twitter.com'],services:['followers','likes','views','comments']},
    kwai:{name:'Kwai',domains:['kwai.com'],services:['followers','likes','views','comments']}
  };
  const quantities={followers:[100,500,1000,5000],likes:[100,500,1000,5000],views:[1000,5000,10000,50000],comments:[10,25,50,100]};
  const serviceLabels={followers:'seguidores',likes:'curtidas',views:'visualizações',comments:'comentários'};
  const state={network:'instagram',service:'followers',origin:'brazil',quantity:500};
  let order=null,toastTimer=null;
  const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const hasOrigin=()=>state.network==='instagram'&&state.service==='followers';
  const label=()=>state.network==='youtube'&&state.service==='followers'?'inscritos':serviceLabels[state.service];
  const priceKey=()=>`${state.network}:${state.service}:${hasOrigin()?state.origin:'all'}`;
  const unitPrice=quantity=>{
    const value=config.prices?.[priceKey()]?.[quantity];
    return Number.isSafeInteger(value)&&value>0?value:null;
  };
  const originLabel=()=>hasOrigin()?(state.origin==='brazil'?'brasileiros':'mundiais'):'';
  const packageName=()=>`${number(state.quantity)} ${label()}${originLabel()?' '+originLabel():''}`;
  const verifiedWhatsapp=()=>typeof config.whatsappNumber==='string'&&/^55\d{10,11}$/.test(config.whatsappNumber)?config.whatsappNumber:'';
  const whatsappUrl=text=>`https://wa.me/${verifiedWhatsapp()}?text=${encodeURIComponent(text)}`;
  function toast(message){$('#toast').textContent=message;$('#toast').classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('is-visible'),3500);}
  function renderPackages(){
    const root=$('#packages');root.replaceChildren();
    quantities[state.service].forEach(quantity=>{
      const price=unitPrice(quantity),selected=quantity===state.quantity;
      const button=document.createElement('button');button.type='button';button.className='package'+(selected?' is-selected':'');button.dataset.quantity=quantity;button.setAttribute('aria-pressed',String(selected));
      button.setAttribute('aria-label',`${number(quantity)} ${label()}, ${price===null?'valor sob consulta':money(price)}`);
      const priceHtml=price===null?'Consultar valor':`<span class="currency">R$</span> ${money(price).replace(/^R\$\s*/, '')}`;
      button.innerHTML=`${quantity===500&&price!==null?'<span class="package-recommendation">EM DESTAQUE</span>':''}<span class="package-quantity">${number(quantity)}</span><span class="package-service">${label()}</span><span class="package-price${price===null?' quote':''}">${priceHtml}</span><span class="package-radio">${icon('check')}</span>`;
      button.addEventListener('click',()=>{state.quantity=quantity;renderSelection();$(`[data-quantity="${quantity}"]`).focus({preventScroll:true});});root.append(button);
    });
  }
  function renderSelection(){
    $$('.network').forEach(button=>{const active=button.dataset.network===state.network;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    $$('.service').forEach(button=>{const active=button.dataset.service===state.service;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));if(button.dataset.service==='followers')button.querySelector('span').textContent=state.network==='youtube'?'Inscritos':'Seguidores';});
    $$('[data-origin]').forEach(button=>{const active=button.dataset.origin===state.origin;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    $('#origin-row').hidden=!hasOrigin();
    $('.service-network').textContent=`NO ${networks[state.network].name.toUpperCase()}`;
    $('#selection-caption').textContent=`${networks[state.network].name} · ${label()[0].toUpperCase()+label().slice(1)}${originLabel()?' '+originLabel():''}`;
    const price=unitPrice(state.quantity);
    $('#summary-description').textContent=packageName();$('#summary-network').textContent=networks[state.network].name;$('#summary-price').textContent=price===null?'Sob consulta':money(price);
    $('#mobile-summary').textContent=`${number(state.quantity)} ${label()}`;$('#mobile-price').textContent=price===null?'Sob consulta':money(price);
    $('#catalog-note').textContent=price===null?'Consulte o valor e a disponibilidade deste serviço antes de confirmar o pedido.':'Preço por pacote. Confirme prazo, disponibilidade e condições de reposição no atendimento.';
    renderPackages();
  }
  function setSelection(patch){
    if(patch.network!==undefined&&!networks[patch.network])throw new Error('Rede social inválida.');
    if(patch.service!==undefined&&!Object.hasOwn(quantities,patch.service))throw new Error('Serviço inválido.');
    if(patch.origin!==undefined&&!['brazil','world'].includes(patch.origin))throw new Error('Origem inválida.');
    const next={...state,...patch};
    if(patch.quantity!==undefined&&!quantities[next.service].includes(patch.quantity))throw new Error('Quantidade inválida para o serviço.');
    if(!quantities[next.service].includes(next.quantity))next.quantity=quantities[next.service][1];
    Object.assign(state,next);renderSelection();return selectionSummary();
  }
  function selectionSummary(){return {network:state.network,service:state.service,origin:hasOrigin()?state.origin:null,quantity:state.quantity,priceCents:unitPrice(state.quantity),currency:'BRL',description:packageName()};}
  $$('.network').forEach(button=>button.addEventListener('click',()=>setSelection({network:button.dataset.network})));
  $$('.service').forEach(button=>button.addEventListener('click',()=>setSelection({service:button.dataset.service})));
  $$('[data-origin]').forEach(button=>button.addEventListener('click',()=>setSelection({origin:button.dataset.origin})));

  const nav=$('#mobile-nav'),menu=$('.menu-toggle');
  function closeMenu(){nav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');menu.innerHTML=icon('menu');}
  menu.addEventListener('click',()=>{const open=nav.hidden;nav.hidden=!open;menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');menu.innerHTML=icon(open?'close':'menu');});
  $$('#mobile-nav a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('click',event=>{if(!nav.hidden&&!event.target.closest('.header'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!nav.hidden){closeMenu();menu.focus();}});

  function openDialog(dialog){closeMenu();dialog.showModal();document.body.classList.add('modal-open');}
  $$('dialog').forEach(dialog=>{
    dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');if(dialog.id==='order-dialog')order=null;});
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>dialog.close());
  });
  function profileStep(){
    $('#order-form').hidden=false;$('#order-review').hidden=true;$('#progress-review').classList.remove('is-active');$('#order-title').textContent='Só falta o seu perfil.';$('#order-subtitle').textContent='Conte para onde vai o seu impulso.';
    $('#profile-error').textContent='';$('#profile-input').removeAttribute('aria-invalid');$('#copy-fallback').hidden=true;
  }
  function startOrder(){
    order={...selectionSummary(),networkName:networks[state.network].name};profileStep();$('#order-form').reset();
    $('#order-product-name').textContent=order.description;$('#order-product-detail').textContent=order.networkName;$('#order-product-price').textContent=order.priceCents===null?'Sob consulta':money(order.priceCents);
    const isProfile=order.service==='followers';$('#profile-label').textContent=isProfile?'@ do perfil ou link':'Link da publicação ou vídeo';$('#profile-input').placeholder=isProfile?'@seuperfil':`https://${networks[order.network].domains[0]}/...`;
    $('#profile-help').textContent=isProfile?'Confira o perfil antes de continuar. Não informe sua senha.':'Use o link completo da publicação que receberá o serviço.';
    openDialog($('#order-dialog'));return {stage:'profile',selection:order};
  }
  $$('[data-order]').forEach(button=>button.addEventListener('click',startOrder));
  function validateTarget(raw){
    const value=raw.trim();if(!value)return {error:'Informe o perfil ou link para continuar.'};
    if(/\s/.test(value))return {error:'Remova os espaços do perfil ou do link.'};
    const isProfile=order.service==='followers';
    if(isProfile&&!value.includes('/')&&!value.includes(':')){
      const handle=value.replace(/^@/,'');
      const max=order.network==='instagram'?30:order.network==='x'?15:100;
      if(!new RegExp(`^[\\p{L}\\p{N}_.-]{1,${max}}$`,'u').test(handle))return {error:'Digite um @ válido ou o link completo do perfil.'};
      return {value:'@'+handle};
    }
    let url;try{url=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);}catch{return {error:'Informe um link válido da rede selecionada.'};}
    const validDomain=networks[order.network].domains.some(domain=>url.hostname===domain||url.hostname.endsWith('.'+domain));
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!validDomain||url.pathname==='/')return {error:`Use um link de ${order.networkName} que leve ao perfil ou à publicação.`};
    url.protocol='https:';return {value:url.href};
  }
  function orderText(){return ['Olá, Monnel! Gostaria de solicitar este pacote:','',`Rede: ${order.networkName}`,`Serviço: ${order.description}`,`Perfil ou publicação: ${order.target}`,`Valor do pacote: ${order.priceCents===null?'consultar':money(order.priceCents)}`,'','Podem confirmar disponibilidade, prazo, reposição e forma de pagamento?'].join('\n');}
  function safePaymentLink(){
    if(order.priceCents===null)return null;
    const key=`${order.network}:${order.service}:${order.origin||'all'}:${order.quantity}`;
    const value=config.checkoutLinks?.[key]||config.checkoutByPrice?.[order.priceCents];if(typeof value!=='string')return null;
    try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
  }
  function reviewOrder(){
    const validation=validateTarget($('#profile-input').value);
    if(validation.error){$('#profile-error').textContent=validation.error;$('#profile-input').setAttribute('aria-invalid','true');$('#profile-input').focus();return false;}
    order.target=validation.value;$('#order-form').hidden=true;$('#order-review').hidden=false;$('#progress-review').classList.add('is-active');$('#order-title').textContent='Tudo certo com seu pedido?';$('#order-subtitle').textContent='Confira os detalhes antes de compartilhar.';
    $('#review-profile').textContent=order.target;$('#review-price').textContent=order.priceCents===null?'A confirmar no atendimento':money(order.priceCents);
    $('#whatsapp-order').href=whatsappUrl(orderText());$('#whatsapp-order span').textContent=verifiedWhatsapp()?'Enviar pedido à Monnel':'Compartilhar no WhatsApp';$('#share-help').hidden=Boolean(verifiedWhatsapp());
    const payment=safePaymentLink();$('#payment-link').hidden=!payment;
    if(payment){
      $('#payment-link').href=payment;
      $('#payment-link').innerHTML=`Pagar ${money(order.priceCents)} ${icon('arrow')}`;
      $('#review-info').textContent='Após pagar, envie o resumo e o comprovante pelo WhatsApp para identificarmos seu perfil. A Monnel confirma o pagamento e o prazo no atendimento.';
    }else{
      $('#payment-link').removeAttribute('href');
      $('#review-info').textContent='Confira valor, disponibilidade, prazo e pagamento no atendimento. Seu pedido só será confirmado pela Monnel.';
    }
    $('#whatsapp-order').focus();return true;
  }
  $('#order-form').addEventListener('submit',event=>{event.preventDefault();reviewOrder();});
  $('#profile-input').addEventListener('input',()=>{$('#profile-error').textContent='';$('#profile-input').removeAttribute('aria-invalid');});
  $('#edit-order').addEventListener('click',()=>{profileStep();$('#profile-input').focus();});
  $('#copy-order').addEventListener('click',async()=>{
    const text=orderText();
    try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast('Resumo copiado. Envie para a Monnel.');}
    catch{const field=$('#copy-fallback');field.value=text;field.hidden=false;field.focus();field.select();let copied=false;try{copied=document.execCommand('copy');}catch{}if(copied){field.hidden=true;toast('Resumo copiado. Envie para a Monnel.');}else toast('Selecione e copie o resumo exibido abaixo.');}
  });
  function openContact(){
    $('#contact-link').href=whatsappUrl('Olá, Monnel! Gostaria de conhecer os pacotes para minhas redes sociais.');
    $('#contact-explanation').textContent=verifiedWhatsapp()?'Tire suas dúvidas sobre pacotes, prazos e pagamento diretamente com a Monnel.':'Já tem a conversa da Monnel? Abra o WhatsApp e selecione esse contato para enviar sua mensagem.';
    openDialog($('#contact-dialog'));
  }
  $$('[data-contact]').forEach(button=>button.addEventListener('click',openContact));
  $('#contact-to-packages').addEventListener('click',()=>{$('#contact-dialog').close();$('#pacotes').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  $('#year').textContent=new Date().getFullYear();renderSelection();

  // Progressive enhancement: exposes the same selection used by the visible UI.
  // These tools only read or stage a package; they never submit or pay an order.
  if(document.modelContext?.registerTool){
    const lifecycle=new AbortController();
    const shared={annotations:{readOnlyHint:false,untrustedContentHint:false}};
    const definitions=[
      {name:'read_monnel_selection',title:'Ler pacote Monnel',description:'Read the visible selected package, including price or a null price when consultation is required.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>selectionSummary()},
      {...shared,name:'configure_monnel_package',title:'Selecionar pacote Monnel',description:'Stage a package in the visible selector. This does not create an order or perform payment.',inputSchema:{type:'object',properties:{network:{type:'string',enum:Object.keys(networks)},service:{type:'string',enum:Object.keys(quantities)},origin:{type:'string',enum:['brazil','world']},quantity:{type:'integer'}},additionalProperties:false},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Seleção inválida.');if(Object.keys(input).some(key=>!['network','service','origin','quantity'].includes(key)))throw new Error('Campo inválido.');return setSelection(input);}}
    ];
    for(const definition of definitions){try{Promise.resolve(document.modelContext.registerTool(definition,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
