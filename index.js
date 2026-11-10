import express from 'express';
import cors from 'cors';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import ipaddr from 'ipaddr.js';

const app=express();
const PORT=process.env.PORT||8787;
const allowedOrigin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
app.use(cors({origin:allowedOrigin.split(',').map(s=>s.trim()),methods:['GET','POST'],allowedHeaders:['Content-Type']}));
app.use(express.json({limit:'20kb'}));

function isPublicAddress(address){
  if(!ipaddr.isValid(address)) return false;
  const parsed=ipaddr.parse(address);
  return parsed.range()==='unicast';
}
async function validateUrl(raw){
  let u;
  try{u=new URL(raw)}catch{throw new Error('Please provide a valid URL.')}
  if(!['http:','https:'].includes(u.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if(u.username||u.password) throw new Error('URLs containing credentials are not accepted.');
  const hostname=u.hostname.toLowerCase();
  if(hostname==='localhost'||hostname.endsWith('.localhost')) throw new Error('Local network addresses are not accepted.');
  if(net.isIP(hostname)){
    if(!isPublicAddress(hostname)) throw new Error('Private or reserved IP addresses are blocked.');
  }else{
    let records;
    try{records=await dns.lookup(hostname,{all:true,verbatim:true})}catch{throw new Error('The host could not be resolved.')}
    if(!records.length||records.some(r=>!isPublicAddress(r.address))) throw new Error('This host resolves to a private or reserved address and is blocked.');
  }
  return u;
}
function allowedMediaType(type=''){
  return /^(video\/(mp4|webm|ogg|quicktime|x-m4v)|application\/octet-stream)/i.test(type);
}
function filenameFrom(url,type=''){
  const raw=path.basename(decodeURIComponent(url.pathname))||'video-download';
  if(/\.(mp4|webm|ogg|mov|m4v)$/i.test(raw))return raw;
  const ext=type.includes('webm')?'.webm':type.includes('ogg')?'.ogg':type.includes('quicktime')?'.mov':'.mp4';
  return raw+ext;
}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'universal-video-downloader-api'}));
app.post('/api/inspect',async(req,res)=>{
  try{
    const url=await validateUrl(req.body?.url);
    const response=await fetch(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(12000)});
    if(response.status>=300&&response.status<400) return res.status(400).json({error:'Redirected media URLs are not supported by this starter API. Use the final direct media URL.'});
    if(!response.ok) return res.status(400).json({error:`Source returned HTTP ${response.status}.`});
    const type=(response.headers.get('content-type')||'').split(';')[0];
    if(!allowedMediaType(type)) return res.status(415).json({error:'This does not appear to be a supported direct video file. Website pages and protected streams are not supported.'});
    const size=Number(response.headers.get('content-length'))||0;
    res.json({filename:filenameFrom(url,type),contentType:type,size,sizeLabel:size?`${(size/1024/1024).toFixed(1)} MB`:'Size unknown',format:type.split('/')[1]||'original'});
  }catch(e){res.status(400).json({error:e.message||'Unable to inspect URL.'})}
});
app.get('/api/download',async(req,res)=>{
  try{
    const url=await validateUrl(req.query.url);
    const upstream=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(upstream.status>=300&&upstream.status<400) return res.status(400).json({error:'Redirected downloads are not supported. Supply the final direct media URL.'});
    if(!upstream.ok) return res.status(400).json({error:`Source returned HTTP ${upstream.status}.`});
    const type=(upstream.headers.get('content-type')||'').split(';')[0];
    if(!allowedMediaType(type))return res.status(415).json({error:'Only supported direct video files can be downloaded.'});
    const name=filenameFrom(url,type).replace(/["\r\n]/g,'_');
    res.setHeader('Content-Type',type||'application/octet-stream');
    res.setHeader('Content-Disposition',`attachment; filename="${name}"`);
    const len=upstream.headers.get('content-length');if(len)res.setHeader('Content-Length',len);
    if(!upstream.body)return res.status(502).end('Empty upstream response');
    for await (const chunk of upstream.body) { if(res.destroyed)break; if(!res.write(Buffer.from(chunk))) await new Promise(resolve=>res.once('drain',resolve)); }
    res.end();
  }catch(e){if(!res.headersSent)res.status(400).json({error:e.message||'Download failed.'});else res.destroy(e)}
});
app.listen(PORT,'0.0.0.0',()=>console.log(`API listening on ${PORT}`));
