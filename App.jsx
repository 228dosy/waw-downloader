import React, {useEffect, useMemo, useState} from 'react';
import {Search, Download, History, Settings, HelpCircle, Home, ExternalLink, Monitor, Globe, Plus, X, ArrowLeft, ArrowRight, RotateCw, ShieldCheck, Zap, FileVideo, CheckCircle2, AlertCircle, Clock, Menu, Play, Pause, FolderDown} from 'lucide-react';

const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
const isHttp = (s) => /^https?:\/\//i.test(s);
const isDirectMedia = (s) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(s);

export default function App(){
  const [input,setInput]=useState('');
  const [address,setAddress]=useState('https://example.com');
  const [tabs,setTabs]=useState([{id:1,title:'Welcome',url:'https://example.com'}]);
  const [active,setActive]=useState(1);
  const [mode,setMode]=useState('built-in');
  const [mediaUrl,setMediaUrl]=useState('');
  const [media,setMedia]=useState(null);
  const [inspectError,setInspectError]=useState('');
  const [busy,setBusy]=useState(false);
  const [downloads,setDownloads]=useState([]);
  const [section,setSection]=useState('Home');
  const [mobileNav,setMobileNav]=useState(false);
  const [notice,setNotice]=useState('Paste a website URL to browse, or a direct video file URL to inspect it.');
  const activeTab=tabs.find(t=>t.id===active)||tabs[0];

  useEffect(()=>{ if(isDirectMedia(address)) {setMediaUrl(address); inspect(address);} },[]);
  function navigate(raw){
    let url=raw.trim(); if(!url)return;
    if(!isHttp(url)) url='https://'+url;
    try{new URL(url)}catch{setNotice('Please enter a valid web address.');return}
    setAddress(url);
    setTabs(old=>old.map(t=>t.id===active?{...t,url,title:(new URL(url)).hostname.replace(/^www\./,'')}:t));
    setInput('');
    if(isDirectMedia(url)){setMediaUrl(url);inspect(url)} else {setMedia(null);setInspectError('');}
    setNotice('Website preview depends on whether the destination allows embedding.');
  }
  function addTab(){const id=Date.now();setTabs(v=>[...v,{id,title:'New tab',url:'https://example.com'}]);setActive(id);setAddress('https://example.com');setMedia(null)}
  function closeTab(id){if(tabs.length===1)return;const next=tabs.filter(t=>t.id!==id);setTabs(next);if(active===id){const t=next[next.length-1];setActive(t.id);setAddress(t.url)}}
  async function inspect(url){
    setBusy(true);setInspectError('');setMedia(null);
    try{
      const r=await fetch(`${API}/api/inspect`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const data=await r.json(); if(!r.ok)throw new Error(data.error||'Could not inspect this media URL.');
      setMedia(data);setNotice('Direct media file detected. You can download the source file.');
    }catch(e){setInspectError(e.message);setNotice('No downloadable direct media file was confirmed.');}
    finally{setBusy(false)}
  }
  async function startDownload(){
    if(!mediaUrl)return;
    const id=Date.now(); const name=(media?.filename||'video-download').replace(/[\\/:*?"<>|]/g,'_');
    setDownloads(v=>[{id,name,status:'Starting',progress:0,url:mediaUrl,controller:null},...v]);
    try{
      const response=await fetch(`${API}/api/download?url=${encodeURIComponent(mediaUrl)}`);
      if(!response.ok) {const d=await response.json().catch(()=>({}));throw new Error(d.error||'Download failed');}
      const total=Number(response.headers.get('content-length'))||0;
      const reader=response.body.getReader();let received=0;const chunks=[];
      while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;setDownloads(v=>v.map(x=>x.id===id?{...x,status:'Downloading',progress:total?Math.round(received/total*100):null}:x));}
      const blob=new Blob(chunks,{type:response.headers.get('content-type')||'application/octet-stream'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
      setDownloads(v=>v.map(x=>x.id===id?{...x,status:'Completed',progress:100}:x));
    }catch(e){setDownloads(v=>v.map(x=>x.id===id?{...x,status:'Failed: '+e.message}:x))}
  }
  const host=useMemo(()=>{try{return new URL(address).hostname}catch{return 'your browser'}},[address]);
  return <div className="app">
    <aside className={`sidebar ${mobileNav?'show':''}`}>
      <div className="brand"><div className="brand-icon">▶</div><div><b>Universal</b><b>Video Downloader</b><small>Search · Browse · Download</small></div></div>
      <nav>{[[Home,'Home'],[Download,'Downloads'],[History,'History'],[Settings,'Settings'],[HelpCircle,'Help & Support']].map(([Icon,label])=><button key={label} className={section===label?'nav active':'nav'} onClick={()=>{setSection(label);setMobileNav(false)}}><Icon size={19}/>{label}</button>)}</nav>
      <div className="pro"><div>♛</div><b>Built for flexibility</b><span>Direct media downloads<br/>and browser preview</span></div>
      <div className="side-note"><ShieldCheck size={16}/> Only download content you’re authorized to save.</div>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setMobileNav(!mobileNav)}><Menu/></button>
        <div className="searchbar"><Globe size={19}/><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&navigate(input)} placeholder="Paste a URL or search the web..."/>{input&&<button onClick={()=>setInput('')}><X size={17}/></button>}<button className="search-btn" onClick={()=>navigate(input)}><Search size={18}/> Search</button></div>
        <div className="mode-switch"><button className={mode==='built-in'?'selected':''} onClick={()=>setMode('built-in')}><Monitor size={17}/> Built-in Browser</button><button className={mode==='external'?'selected':''} onClick={()=>setMode('external')}><ExternalLink size={17}/> External Browser</button></div>
        <a className="top-download" href="#downloads" title="Downloads"><Download/></a>
      </header>
      <div className="workspace">
        <section className="browser">
          <div className="tabs">{tabs.map(t=><button key={t.id} onClick={()=>{setActive(t.id);setAddress(t.url)}} className={active===t.id?'tab active-tab':'tab'}><span className="tab-dot"/> {t.title}<X size={14} onClick={e=>{e.stopPropagation();closeTab(t.id)}}/></button>)}<button className="add-tab" onClick={addTab}><Plus/></button></div>
          <div className="addressbar"><button className="icon-btn"><ArrowLeft/></button><button className="icon-btn"><ArrowRight/></button><button className="icon-btn" onClick={()=>navigate(address)}><RotateCw/></button><div className="address"><ShieldCheck size={15}/><input value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==='Enter'&&navigate(address)}/></div><button className="icon-btn" onClick={()=>mode==='external'&&window.open(address,'_blank','noopener,noreferrer')}><ExternalLink/></button></div>
          {mode==='external'?<div className="external-state"><ExternalLink size={34}/><h2>Open in your external browser</h2><p>This opens the current address in a new browser tab. A regular website cannot inspect media playing in other browser tabs.</p><button className="primary" onClick={()=>window.open(address,'_blank','noopener,noreferrer')}>Open {host} <ExternalLink size={16}/></button></div>:
          <div className="webview">
            {isDirectMedia(address)?<video className="direct-player" src={address} controls playsInline/>:
            <div className="embed-wrap"><iframe title="Website preview" src={address} sandbox="allow-scripts allow-forms allow-same-origin allow-popups" referrerPolicy="no-referrer" allow="autoplay; fullscreen; picture-in-picture" /><div className="embed-hint"><AlertCircle size={14}/> If this site refuses to display, use External Browser or paste an authorized direct video URL above.</div></div>}
          </div>}
        </section>
        <section className="right-panel">
          <div className="panel-head"><div><span className="eyebrow">MEDIA DETECTION</span><h2>Video detector</h2></div><span className="live-dot">● Ready</span></div>
          <div className={`detect-card ${media?'detected':''}`}>
            <div className="detect-icon">{media?<CheckCircle2/>:<FileVideo/>}</div>
            <div><b>{busy?'Inspecting source…':media?'Direct video detected':'Waiting for a video'}</b><p>{media?'A direct media file is available.': 'Paste a direct .mp4, .webm, .mov or .ogg URL to inspect.'}</p></div>
          </div>
          <label className="field-label">Direct media URL</label>
          <div className="media-input"><input value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} placeholder="https://example.com/video.mp4"/><button onClick={()=>inspect(mediaUrl)} disabled={busy||!mediaUrl}><Search size={17}/></button></div>
          {inspectError&&<div className="error"><AlertCircle size={15}/>{inspectError}</div>}
          {media&&<div className="media-details"><div className="file-row"><FileVideo/><div><b>{media.filename}</b><small>{media.sizeLabel} · {media.contentType}</small></div></div><div className="select-row"><div><label className="field-label">Available source</label><div className="quality">Original file <small>Source quality</small></div></div><div><label className="field-label">Format</label><div className="quality">{media.format?.toUpperCase()||'Original'}</div></div></div><button className="primary download-action" onClick={startDownload}><Download size={18}/> Download video <Zap size={16}/></button></div>}
          {!media&&<div className="quality-placeholder"><div className="placeholder-ring"><Play/></div><b>Quality options appear here</b><span>Only source formats and resolutions actually provided by the file will be shown.</span></div>}
          <div className="notice"><ShieldCheck size={17}/><span>Protected streams, DRM content, and sites that block access are not bypassed.</span></div>
        </section>
      </div>
      <section className="downloads" id="downloads">
        <div className="downloads-head"><div><span className="eyebrow">YOUR FILES</span><h2><FolderDown size={21}/> Download manager</h2></div><button className="clear-btn" onClick={()=>setDownloads([])}>Clear all</button></div>
        {downloads.length===0?<div className="empty"><Download size={24}/><span>Your downloads will appear here</span><small>Start with an authorized direct media URL.</small></div>:downloads.map(d=><div className="download-row" key={d.id}><div className="file-thumb"><FileVideo/></div><div className="file-info"><b>{d.name}</b><div className="progress"><i style={{width:(d.progress??5)+'%'}}/></div></div><span className={d.status==='Completed'?'success':'status'}>{d.status}</span><button className="icon-btn" onClick={()=>setDownloads(v=>v.filter(x=>x.id!==d.id))}><X/></button></div>)}
      </section>
      <footer><span><Zap/> Fast direct downloads</span><span><ShieldCheck/> Safer URL handling</span><span><Monitor/> Desktop & mobile</span><span className="footer-note">Download only content you have permission to save.</span></footer>
    </main>
  </div>
}
