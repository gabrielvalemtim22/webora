import{test}from'node:test';import assert from'node:assert/strict';import{crc16,pixPayload}from'../api/pix.mjs';
test('CRC-16/CCITT standard vector',()=>assert.equal(crc16('123456789'),'29B1'));
test('Pix encodes exact cents, CNPJ and order identifier',()=>{const payload=pixPayload({key:'63371209000181',amount:8999,name:'WEBORA',city:'SÃO PAULO',txid:'WB123'});assert.match(payload,/011463371209000181/);assert.match(payload,/540589.99/);assert.match(payload,/SAO PAULO/);assert.equal(payload.slice(-4),crc16(payload.slice(0,-4)));assert.match(payload,/WB123/);});
test('Invalid and fractional amounts are rejected',()=>{for(const amount of[-1,0,1.5,NaN])assert.throws(()=>pixPayload({key:'63371209000181',amount,name:'WEBORA',city:'SAO PAULO',txid:'WB123'}));});
