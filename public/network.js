export function parseIPv4(value){
  const parts=String(value).trim().split('.');
  if(parts.length!==4||parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))throw Error('Enter a valid IPv4 address, such as 192.168.1.10.');
  return parts.reduce((n,p)=>n*256+Number(p),0);
}
export const ipv4=n=>[24,16,8,0].map(bits=>(n>>>bits)&255).join('.');
export function parsePrefix(value){
  const s=String(value).trim();
  if(/^\/?\d{1,2}$/.test(s)){const n=Number(s.replace('/',''));if(n>=0&&n<=32)return n;}
  if(s.includes('.')){
    const bits=parseIPv4(s).toString(2).padStart(32,'0');
    if(/^1*0*$/.test(bits))return bits.indexOf('0')===-1?32:bits.indexOf('0');
  }
  throw Error('Use a prefix from 0 to 32 or a contiguous subnet mask.');
}
export function subnet(address,prefix){
  const input=String(address).trim().split('/');
  if(input.length>2)throw Error('Use one CIDR prefix.');
  const ip=parseIPv4(input[0]),cidr=parsePrefix(input[1]??prefix);
  const block=2**(32-cidr),network=Math.floor(ip/block)*block,last=network+block-1;
  const firstOctet=ip>>>24;
  const klass=firstOctet<128?'A':firstOctet<192?'B':firstOctet<224?'C':firstOctet<240?'D (multicast)':'E (reserved)';
  const privateIP=(ip>=0x0a000000&&ip<=0x0affffff)||(ip>=0xac100000&&ip<=0xac1fffff)||(ip>=0xc0a80000&&ip<=0xc0a8ffff);
  const kind=privateIP?'Private':firstOctet===127?'Loopback':firstOctet===0?'Reserved':(ip>>>16)===0xa9fe?'Link-local':firstOctet>=224?'Multicast / reserved':'Public range';
  return {ip:ipv4(ip),cidr,network:ipv4(network),broadcast:cidr<31?ipv4(last):null,last:ipv4(last),mask:ipv4(2**32-block),hosts:cidr>=31?block:block-2,first:ipv4(cidr>=31?network:network+1),lastHost:ipv4(cidr>=31?last:last-1),klass,kind,block,
    binary:ip.toString(2).padStart(32,'0').match(/.{8}/g).join(' . ')};
}
export function findPath(nodes,links,start,end){
  if(!nodes.some(n=>n.id===start)||!nodes.some(n=>n.id===end))throw Error('Choose existing devices.');
  const queue=[[start]],seen=new Set([start]);
  while(queue.length){const route=queue.shift(),id=route.at(-1);if(id===end)return route;for(const l of links){const next=l.a===id?l.b:l.b===id?l.a:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...route,next]);}}}
  return null;
}
export function validateTopology(value){
  if(!value||!Array.isArray(value.nodes)||!Array.isArray(value.links)||value.nodes.length>30||value.links.length>100)throw Error('Choose a topology with up to 30 devices and 100 links.');
  const ids=new Set();
  for(const n of value.nodes){if(typeof n.id!=='string'||!n.id||ids.has(n.id)||!['Router','Switch','PC','Server'].includes(n.type)||typeof n.name!=='string'||n.name.length>40||!Number.isFinite(n.x)||!Number.isFinite(n.y)||n.x<45||n.x>755||n.y<45||n.y>365)throw Error('Invalid device in topology.');ids.add(n.id);}
  for(const l of value.links)if(!ids.has(l.a)||!ids.has(l.b)||l.a===l.b)throw Error('Invalid connection in topology.');
  return structuredClone(value);
}
