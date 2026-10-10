import {Buffer} from 'node:buffer';
export function crc16(text){let crc=0xffff;for(const byte of Buffer.from(text)){crc^=byte<<8;for(let i=0;i<8;i++)crc=((crc&0x8000)?(crc<<1)^0x1021:crc<<1)&0xffff;}return crc.toString(16).toUpperCase().padStart(4,'0');}
const field=(id,value)=>id+String(Buffer.byteLength(value)).padStart(2,'0')+value;
const clean=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').toUpperCase();
export function pixPayload({key,amount,name,city,txid}){if(!key||!Number.isInteger(amount)||amount<1)throw Error('Pix inválido');const text=field('00','01')+field('26',field('00','br.gov.bcb.pix')+field('01',key))+field('52','0000')+field('53','986')+field('54',(amount/100).toFixed(2))+field('58','BR')+field('59',clean(name).slice(0,25))+field('60',clean(city).slice(0,15))+field('62',field('05',txid.replace(/[^A-Za-z0-9]/g,'').slice(0,25)))+'6304';return text+crc16(text);}
