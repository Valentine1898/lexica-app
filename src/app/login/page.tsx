"use client";
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [status, setStatus] = useState<'idle'|'loading'|'error'>('idle');
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) setStatus('error');
  }, []);

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',padding:'20px'}}>
      <h1 style={{color:'white',fontSize:'2rem',fontWeight:'bold',marginBottom:'8px'}}>Lexica</h1>
      <p style={{color:'#888',marginBottom:'32px',textAlign:'center'}}>Your personal vocabulary trainer</p>
      
      <div style={{background:'#1a1a1a',borderRadius:'16px',padding:'32px',maxWidth:'360px',width:'100%',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🤖</div>
        <h2 style={{color:'white',fontSize:'1.25rem',marginBottom:'8px'}}>Login via Telegram</h2>
        <p style={{color:'#666',fontSize:'0.875rem',marginBottom:'24px'}}>
          Open <strong style={{color:'#fff'}}>@velaskesword_bot</strong> in Telegram and send <code style={{background:'#333',padding:'2px 6px',borderRadius:'4px',color:'#7dd3fc'}}>/login</code>
        </p>
        <p style={{color:'#555',fontSize:'0.75rem'}}>You will receive a login link. Click it to access your vocabulary.</p>
        
        {status === 'error' && (
          <p style={{color:'#f87171',marginTop:'16px',fontSize:'0.875rem'}}>
            Login link expired or invalid. Please try again.
          </p>
        )}
        
        <a href="https://t.me/velaskesword_bot" target="_blank"
           style={{display:'block',marginTop:'24px',background:'#2481cc',color:'white',padding:'12px',borderRadius:'12px',textDecoration:'none',fontWeight:'500'}}>
          Open @velaskesword_bot
        </a>
      </div>
    </div>
  );
}