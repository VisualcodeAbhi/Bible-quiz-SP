import{j as e}from"./index-q0HHQ2T-.js";const c=({isOpen:r,title:n,message:i,onConfirm:a,onCancel:l,confirmText:s="Confirm",cancelText:d="Cancel",isDanger:t=!1,showCancel:x=!0,icon:o=null})=>r?e.jsxs("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(0, 0, 0, 0.6)",backdropFilter:"blur(5px)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:99999,animation:"fadeIn 0.2s ease-out"},children:[e.jsxs("div",{style:{background:"rgba(255, 255, 255, 0.95)",padding:"25px",borderRadius:"20px",width:"85%",maxWidth:"350px",textAlign:"center",boxShadow:"0 10px 40px rgba(0,0,0,0.4)",animation:"scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"},children:[e.jsx("div",{style:{fontSize:"40px",marginBottom:"15px"},children:o||(t?"⚠️":"❓")}),e.jsx("h2",{style:{margin:"0 0 10px 0",color:"#333",fontSize:"22px"},children:n}),e.jsx("p",{style:{color:"#666",marginBottom:"25px",fontSize:"16px",lineHeight:"1.5"},children:i}),e.jsxs("div",{style:{display:"flex",gap:"15px",justifyContent:"center"},children:[x&&e.jsx("button",{onClick:l,style:{flex:1,padding:"12px",border:"none",background:"#f0f0f0",color:"#333",borderRadius:"12px",fontWeight:"600",fontSize:"16px",cursor:"pointer"},children:d}),e.jsx("button",{onClick:a,style:{flex:1,padding:"12px",border:"none",background:t?"#ff4d4d":"#4CAF50",color:"white",borderRadius:"12px",fontWeight:"600",fontSize:"16px",cursor:"pointer",boxShadow:t?"0 4px 15px rgba(255, 77, 77, 0.3)":"0 4px 15px rgba(76, 175, 80, 0.3)"},children:s})]})]}),e.jsx("style",{children:`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `})]}):null;export{c as C};
