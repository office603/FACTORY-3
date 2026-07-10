import { useState, useMemo, useRef, useEffect } from "react";

const STATUSES = [
  { id:"plans",     label:"בניית תכניות",            color:"#6366f1", bg:"#eef2ff" },
  { id:"materials", label:"הזמנת חומרים",            color:"#f59e0b", bg:"#fffbeb" },
  { id:"cutting",   label:"בחיתוך",                  color:"#ef4444", bg:"#fef2f2" },
  { id:"assembly",  label:"הרכבה",                   color:"#3b82f6", bg:"#eff6ff" },
  { id:"paint",     label:"צבע",                     color:"#8b5cf6", bg:"#f5f3ff" },
  { id:"ready",     label:"מוכן להתקנה",             color:"#10b981", bg:"#ecfdf5" },
  { id:"finishing", label:"סיום השלמות",             color:"#f97316", bg:"#fff7ed" },
  { id:"completed", label:"עבודה הסתיימה בהצלחה",   color:"#059669", bg:"#d1fae5" },
];

const EVENT_TYPES = [
  { id:"delivery",     label:"הובלה",              color:"#3b82f6", icon:"🚚", calendar:"factory" },
  { id:"installation", label:"התקנה",              color:"#10b981", icon:"🔧", calendar:"factory" },
  { id:"completion",   label:"סיום התקנה",          color:"#f97316", icon:"✅", calendar:"factory" },
  { id:"meeting",      label:"פגישה",              color:"#8b5cf6", icon:"🤝", calendar:"showroom" },
  { id:"meeting_exec", label:"פגישות הורדה לביצוע", color:"#f59e0b", icon:"📋", calendar:"showroom" },
  { id:"unavailable",  label:"לא זמין",             color:"#ef4444", icon:"🚫", calendar:"showroom" },
  { id:"designer",     label:"פגישת מעצב/ת",       color:"#ec4899", icon:"✏️", calendar:"showroom" },
  { id:"tour",         label:"סיור בתצוגה",         color:"#06b6d4", icon:"🏠", calendar:"showroom" },
  { id:"other_show",   label:"אחר",                color:"#94a3b8", icon:"📅", calendar:"showroom" },
];

const HE_DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

const ALL_PERMISSIONS = [
  { id:"change_status", label:"שינוי סטטוס הזמנה" },
  { id:"add_order",     label:"הוספת הזמנה חדשה" },
  { id:"edit_order",    label:"עריכת הזמנה" },
  { id:"delete_order",  label:"מחיקת הזמנה" },
  { id:"add_event",     label:"הוספת אירוע ביומן" },
  { id:"edit_event",    label:"עריכת אירוע ביומן" },
  { id:"delete_event",  label:"מחיקת אירוע ביומן" },
  { id:"add_report",    label:"יצירת דוח התקנה/סיום" },
];

const ROLE_PRESETS = {
  admin:     { label:"מנהל מפעל",        color:"#6366f1", permissions:["change_status","add_order","edit_order","delete_order","add_event","edit_event","delete_event","add_report"] },
  purchasing:{ label:"מנהל רכש והזמנות", color:"#f59e0b", permissions:["add_order","edit_order","change_status"] },
  installer: { label:"מתקין",            color:"#f97316", permissions:["change_status","add_report"] },
  office:    { label:"מנהלת משרד",       color:"#10b981", permissions:["add_event","edit_event","delete_event","change_status","add_order","edit_order"] },
  designer:  { label:"מעצבת מטבחים",    color:"#ec4899", permissions:["add_order","edit_order"] },
  viewer:    { label:"צפייה בלבד",       color:"#94a3b8", permissions:[] },
};

const INIT_USERS = [
  { id:"u1", name:"יוסי מנהל", username:"admin", password:"1234", role:"admin",     active:true },
  { id:"u2", name:"שרה",       username:"sara",  password:"1234", role:"office",    active:true },
  { id:"u3", name:"דני מתקין", username:"dani",  password:"1234", role:"installer", active:true },
];

const INIT_ORDERS = [
  { id:"ORD-001", client:"משפחת לוי",   address:"רחוב הרצל 12, תל אביב",   phone:"054-1234567", status:"assembly", files:["תכנית מטבח.pdf"], reports:[], notes:"מטבח L עם אי מרכזי", created:"2026-06-10" },
  { id:"ORD-002", client:"דוד כהן",     address:"שדרות בן גוריון 5, חיפה", phone:"052-9876543", status:"ready",    files:[], reports:[], notes:"ארון קיר", created:"2026-06-05" },
  { id:"ORD-003", client:"רונית אברהם", address:"רחוב ויצמן 33, באר שבע",  phone:"050-5555555", status:"plans",    files:[], reports:[], notes:"", created:"2026-06-25" },
];

const INIT_EVENTS = [
  { id:"EVT-001", type:"installation", orderId:"ORD-002", date:"2026-06-30", time:"09:00", team:"צוות א", notes:"" },
];

function getStatus(id) { return STATUSES.find(function(s){ return s.id===id; }) || STATUSES[0]; }
function getEvType(id) { return EVENT_TYPES.find(function(t){ return t.id===id; }) || EVENT_TYPES[0]; }

function weekStart(d) {
  var x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0,0,0,0);
  return x;
}
function addDays(d, n) {
  var x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toISO(d) { return d.toISOString().slice(0,10); }
function fmtDate(s) {
  var parts = s.split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}
function makeId(prefix) {
  return prefix + "-" + String(Math.floor(Math.random()*9000)+1000);
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function downloadHTML(html, filename) {
  try {
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    return true;
  } catch(err) {
    return false;
  }
}

// ===== Supabase Configuration =====
var SUPABASE_URL = "https://natnqmcpevyjcnftmpbm.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdG5xbWNwZXZ5amNuZnRtcGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjQ4NDYsImV4cCI6MjA5ODc0MDg0Nn0.lzWqenbj6lsmNaEL87iJTpDsWjIYzQTStPzhW0T_3ts";

var sbHeaders = {
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
};

function sbUrl(table) {
  return SUPABASE_URL + "/rest/v1/" + table;
}

// Table name mapping: localStorage key → supabase table + id field
var TABLE_MAP = {
  "fac_orders":          { table:"fac_orders",          isArray:true,  idField:"id" },
  "fac_events":          { table:"fac_events",          isArray:true,  idField:"id" },
  "fac_purchase_orders": { table:"fac_purchase_orders", isArray:true,  idField:"id" },
  "fac_quotes":          { table:"fac_quotes",          isArray:true,  idField:"id" },
  "fac_customers":       { table:"fac_customers",       isArray:true,  idField:"id" },
  "fac_users":           { table:"fac_users",           isArray:true,  idField:"id" },
  "fac_price_catalog":   { table:"fac_price_catalog",   isArray:false, idField:"key" },
  "fac_name":            { table:"fac_settings",        isArray:false, idField:"key", settingKey:"fac_name" },
};

async function sbLoadArray(table) {
  var res = await fetch(sbUrl(table) + "?select=id,data", { headers: sbHeaders });
  if (!res.ok) throw new Error("load failed: " + res.status);
  var rows = await res.json();
  return rows.map(function(r){ return r.data; });
}

async function sbSaveArray(table, items) {
  var rows = items.map(function(item){ return { id:item.id, data:item }; });
  var res = await fetch(sbUrl(table), {
    method:"POST",
    headers: Object.assign({}, sbHeaders, {"Prefer":"resolution=merge-duplicates,return=minimal"}),
    body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error("save array failed: " + res.status);
}

async function sbLoadCatalog() {
  var res = await fetch(sbUrl("fac_price_catalog") + "?select=key,data", { headers: sbHeaders });
  if (!res.ok) throw new Error("load catalog failed");
  var rows = await res.json();
  var obj = {};
  rows.forEach(function(r){ obj[r.key] = r.data; });
  return obj;
}

async function sbSaveCatalog(catalog) {
  var rows = Object.keys(catalog).map(function(k){ return { key:k, data:catalog[k] }; });
  if (rows.length === 0) return;
  var res = await fetch(sbUrl("fac_price_catalog"), {
    method:"POST",
    headers: Object.assign({}, sbHeaders, {"Prefer":"resolution=merge-duplicates,return=minimal"}),
    body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error("save catalog failed");
}

async function sbLoadSetting(key) {
  var res = await fetch(sbUrl("fac_settings") + "?key=eq." + key + "&select=value", { headers: sbHeaders });
  if (!res.ok) return null;
  var rows = await res.json();
  return rows.length > 0 ? rows[0].value : null;
}

async function sbSaveSetting(key, value) {
  var res = await fetch(sbUrl("fac_settings"), {
    method:"POST",
    headers: Object.assign({}, sbHeaders, {"Prefer":"resolution=merge-duplicates,return=minimal"}),
    body: JSON.stringify([{ key:key, value:value }])
  });
  if (!res.ok) throw new Error("save setting failed");
}

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(function() {
    try {
      var s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch(e) { return initial; }
  });
  const [synced, setSynced] = useState(false);

  // Load from Supabase on mount
  useEffect(function() {
    var map = TABLE_MAP[key];
    if (!map) return;
    var cancelled = false;
    (async function() {
      try {
        var loaded;
        if (map.settingKey) {
          loaded = await sbLoadSetting(map.settingKey);
          if (loaded === null) loaded = initial;
        } else if (map.isArray) {
          loaded = await sbLoadArray(map.table);
          if (!loaded || loaded.length === 0) {
            // If Supabase empty, try to seed from localStorage
            var local = localStorage.getItem(key);
            if (local) {
              var localData = JSON.parse(local);
              if (localData && localData.length > 0) {
                await sbSaveArray(map.table, localData);
                loaded = localData;
              }
            }
          }
        } else {
          loaded = await sbLoadCatalog();
          if (!loaded || Object.keys(loaded).length === 0) {
            var local = localStorage.getItem(key);
            if (local) {
              var localData = JSON.parse(local);
              if (localData && Object.keys(localData).length > 0) {
                await sbSaveCatalog(localData);
                loaded = localData;
              }
            }
          }
        }
        if (!cancelled && loaded !== null && loaded !== undefined) {
          // For arrays: only update if loaded data is non-empty, otherwise keep initial
          if (Array.isArray(loaded) && loaded.length === 0) {
            // Supabase returned empty — seed with initial data
            setSynced(true);
          } else if (typeof loaded === 'object' && !Array.isArray(loaded) && Object.keys(loaded).length === 0 && map.isArray === false) {
            setSynced(true);
          } else {
            setVal(loaded);
            localStorage.setItem(key, JSON.stringify(loaded));
            setSynced(true);
          }
        }
      } catch(e) {
        console.warn("Supabase load failed, using localStorage:", e);
        setSynced(true);
      }
    })();
    return function(){ cancelled = true; };
  }, [key]);

  function set(upd) {
    setVal(function(prev) {
      var next = typeof upd === "function" ? upd(prev) : upd;
      // Save to localStorage immediately
      try { localStorage.setItem(key, JSON.stringify(next)); } catch(e) {}
      // Save to Supabase async
      var map = TABLE_MAP[key];
      if (map) {
        (async function() {
          try {
            if (map.settingKey) {
              await sbSaveSetting(map.settingKey, next);
            } else if (map.isArray) {
              await sbSaveArray(map.table, next);
            } else {
              await sbSaveCatalog(next);
            }
          } catch(e) {
            console.warn("Supabase save failed:", e);
          }
        })();
      }
      return next;
    });
  }
  return [val, set];
}

var inpStyle = {
  width:"100%", padding:"9px 12px", borderRadius:8, fontSize:14,
  border:"1.5px solid #e2e8f0", outline:"none",
  boxSizing:"border-box", fontFamily:"inherit", direction:"rtl", background:"#fff"
};

function PrintableMaterials(props) {
  var order = props.order;
  if (!order) return null;
  var materials = order.materials || [];
  var total = materials.reduce(function(sum,m){ return sum + (Number(m.price)||0)*(Number(m.qty)||0); }, 0);

  var rowsHtml = materials.map(function(m){
    var lineTotal = (Number(m.price)||0) * (Number(m.qty)||0);
    return "<tr><td>" + esc(m.name) + "</td><td>" + esc(m.company) + "</td><td>" + esc(m.price) + "</td><td>" + esc(m.qty) + "</td><td><b>" + lineTotal.toLocaleString() + "</b></td></tr>";
  }).join("");
  var docHtml = "<!DOCTYPE html><html dir=\"rtl\" lang=\"he\"><head><meta charset=\"utf-8\"><title>" + esc(order.id) + "</title><style>"
    + "body{font-family:Arial,'Segoe UI',sans-serif;direction:rtl;color:#0f172a;margin:30px;}"
    + ".header{display:flex;justify-content:space-between;border-bottom:3px solid #4338ca;padding-bottom:14px;margin-bottom:20px;}"
    + ".header h1{margin:0;font-size:20px;color:#1e1b4b;}"
    + "table{width:100%;border-collapse:collapse;margin-top:10px;}"
    + "th{background:#4338ca;color:#fff;padding:8px 10px;font-size:12px;text-align:right;}"
    + "td{padding:8px 10px;font-size:13px;border-bottom:1px solid #e2e8f0;}"
    + ".total{display:flex;justify-content:space-between;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;margin-top:14px;font-size:15px;font-weight:bold;}"
    + "</style></head><body>"
    + "<div class=\"header\"><div><h1>" + esc(props.factoryName) + "</h1><div>רשימת פלטות ופרזול</div></div><div>" + esc(toISO(new Date())) + "</div></div>"
    + "<div style=\"display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap;font-size:13px;\">"
    + "<div><b>מספר הזמנה:</b> " + esc(order.id) + "</div><div><b>לקוח:</b> " + esc(order.client) + "</div><div><b>כתובת:</b> " + esc(order.address) + "</div></div>"
    + (materials.length === 0 ? "<p>אין חומרים רשומים בהזמנה זו.</p>" :
      "<table><thead><tr><th>שם</th><th>חברה</th><th>מחיר</th><th>כמות</th><th>סה\"כ</th></tr></thead><tbody>" + rowsHtml + "</tbody></table>"
      + "<div class=\"total\"><span>סה\"כ חומרים</span><span>\u20aa" + total.toLocaleString() + "</span></div>")
    + "<div style=\"margin-top:30px;font-size:11px;color:#94a3b8;text-align:center;\">נוצר אוטומטית ממערכת ניהול ההזמנות</div>"
    + "</body></html>";
  var dataHref = "data:text/html;charset=utf-8," + encodeURIComponent(docHtml);

  return (
    <div id="print-materials-root" style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#fff",zIndex:9999,overflow:"auto",padding:30,direction:"rtl",fontFamily:"Arial, 'Segoe UI', sans-serif",color:"#0f172a"}}>
      <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}} className="no-print">
        <a href={dataHref} target="_blank" rel="noopener noreferrer" download={order.id + "-חומרים.html"} style={{padding:"10px 20px",background:"#4338ca",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14,textDecoration:"none",display:"inline-block"}}>פתח / שתף מסמך</a>
        <button onClick={props.onClose} style={{padding:"10px 20px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14}}>סגור</button>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"3px solid #4338ca",paddingBottom:14,marginBottom:20}}>
        <div>
          <h1 style={{margin:0,fontSize:20,color:"#1e1b4b"}}>{props.factoryName}</h1>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>רשימת פלטות ופרזול</div>
        </div>
        <div style={{fontSize:12,color:"#64748b"}}>{toISO(new Date())}</div>
      </div>
      <div style={{display:"flex",gap:24,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{fontSize:13}}><b style={{color:"#475569",fontSize:11,display:"block",marginBottom:2}}>מספר הזמנה</b>{order.id}</div>
        <div style={{fontSize:13}}><b style={{color:"#475569",fontSize:11,display:"block",marginBottom:2}}>לקוח</b>{order.client}</div>
        <div style={{fontSize:13}}><b style={{color:"#475569",fontSize:11,display:"block",marginBottom:2}}>כתובת</b>{order.address}</div>
        <div style={{fontSize:13}}><b style={{color:"#475569",fontSize:11,display:"block",marginBottom:2}}>טלפון</b>{order.phone}</div>
      </div>
      {materials.length === 0 ?
        <p style={{color:"#94a3b8",fontSize:13}}>אין חומרים רשומים בהזמנה זו.</p>
      :
        <div>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:10}}>
            <thead>
              <tr>
                <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>שם</th>
                <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>חברה</th>
                <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>מחיר</th>
                <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>כמות</th>
                <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>{"סה\"כ"}</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(function(m,i){
                var lineTotal = (Number(m.price)||0) * (Number(m.qty)||0);
                return (
                  <tr key={i} style={{background: i % 2 === 1 ? "#f8fafc" : "#fff"}}>
                    <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0",unicodeBidi:"plaintext"}}>{m.name}</td>
                    <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0"}}>{m.company}</td>
                    <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0"}}>{m.price}</td>
                    <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0"}}>{m.qty}</td>
                    <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0",fontWeight:700}}>{lineTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{display:"flex",justifyContent:"space-between",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,padding:"12px 16px",marginTop:14,fontSize:15,fontWeight:700}}>
            <span>{"סה\"כ חומרים"}</span>
            <span>{"\u20aa" + total.toLocaleString()}</span>
          </div>
        </div>
      }
      <div style={{marginTop:30,fontSize:11,color:"#94a3b8",textAlign:"center"}}>נוצר אוטומטית ממערכת ניהול ההזמנות</div>
      <style dangerouslySetInnerHTML={{__html:
        "@media print { body * { visibility: hidden; } #print-materials-root, #print-materials-root * { visibility: visible; } #print-materials-root { position: absolute; top:0; left:0; } .no-print { display: none !important; } }"
      }} />
    </div>
  );
}


function PrintablePurchaseOrder(props) {
  var po = props.po;
  if (!po) return null;
  var items = po.items || [];

  var rowsHtml = items.map(function(it){
    return "<tr><td>" + esc(it.name) + "</td><td>" + esc(it.qty) + "</td><td>" + esc(it.notes) + "</td></tr>";
  }).join("");
  var docHtml = "<!DOCTYPE html><html dir=\"rtl\" lang=\"he\"><head><meta charset=\"utf-8\"><title>" + esc(po.id) + "</title><style>"
    + "body{font-family:Arial,'Segoe UI',sans-serif;direction:rtl;color:#0f172a;margin:30px;}"
    + ".header{display:flex;justify-content:space-between;border-bottom:3px solid #4338ca;padding-bottom:14px;margin-bottom:20px;}"
    + ".header h1{margin:0;font-size:20px;color:#1e1b4b;}"
    + "table{width:100%;border-collapse:collapse;margin-top:10px;}"
    + "th{background:#4338ca;color:#fff;padding:8px 10px;font-size:12px;text-align:right;}"
    + "td{padding:8px 10px;font-size:13px;border-bottom:1px solid #e2e8f0;}"
    + ".notes{margin-top:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;}"
    + "</style></head><body>"
    + "<div class=\"header\"><div><h1>" + esc(props.factoryName) + "</h1><div>הזמנת רכש</div></div><div>" + esc(toISO(new Date())) + "</div></div>"
    + "<div style=\"display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap;font-size:13px;\">"
    + "<div><b>ספק:</b> " + esc(po.supplier) + "</div>"
    + (po.supplierPhone ? "<div><b>טלפון ספק:</b> " + esc(po.supplierPhone) + "</div>" : "")
    + (po.linkedOrderId ? "<div><b>הזמנת לקוח מקושרת:</b> " + esc(po.linkedOrderId) + "</div>" : "")
    + "</div>"
    + (items.length === 0 ? "<p>אין פריטים בהזמנה זו.</p>" :
      "<table><thead><tr><th>שם פריט</th><th>כמות</th><th>הערות</th></tr></thead><tbody>" + rowsHtml + "</tbody></table>")
    + (po.notes ? "<div class=\"notes\"><b>הערות להזמנה:</b><br>" + esc(po.notes) + "</div>" : "")
    + "<div style=\"margin-top:30px;font-size:11px;color:#94a3b8;text-align:center;\">נוצר אוטומטית ממערכת ניהול ההזמנות</div>"
    + "</body></html>";

  var [showIframe, setShowIframe] = useState(false);
  var blobUrl = useRef(null);

  function openDoc() {
    try {
      var blob = new Blob([docHtml], {type:"text/html;charset=utf-8"});
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = URL.createObjectURL(blob);
      window.open(blobUrl.current, "_blank");
    } catch(e) {
      setShowIframe(true);
    }
  }

  return (
    <div id="print-po-root" style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#fff",zIndex:9999,overflow:"auto",padding:30,direction:"rtl",fontFamily:"Arial, 'Segoe UI', sans-serif",color:"#0f172a"}}>
      <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}} className="no-print">
        <button onClick={function(){setShowIframe(true);}} style={{padding:"10px 20px",background:"#4338ca",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14}}>📄 הצג מסמך</button>
        <button onClick={props.onClose} style={{padding:"10px 20px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14}}>סגור</button>
      </div>
      {showIframe ?
        <div style={{position:"fixed",inset:0,background:"#fff",zIndex:10002,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"10px 16px",background:"#4338ca",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:14}}>{po.id + " — " + po.supplier}</span>
            <button onClick={function(){setShowIframe(false);}} style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700}}>סגור</button>
          </div>
          <iframe srcDoc={docHtml} style={{flex:1,border:"none",width:"100%"}} title="תצוגה מקדימה" />
        </div>
      : null}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"3px solid #4338ca",paddingBottom:14,marginBottom:20}}>
        <div>
          <h1 style={{margin:0,fontSize:20,color:"#1e1b4b"}}>{props.factoryName}</h1>
          <div style={{fontSize:12,color:"#64748b",marginTop:4}}>הזמנת רכש</div>
        </div>
        <div style={{fontSize:12,color:"#64748b"}}>{toISO(new Date())}</div>
      </div>
      <div style={{display:"flex",gap:24,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{fontSize:13}}><b style={{color:"#475569",fontSize:11,display:"block",marginBottom:2}}>ספק</b>{po.supplier}</div>
        {po.supplierPhone ? <div style={{fontSize:13}}><b style={{color:"#475569",fontSize:11,display:"block",marginBottom:2}}>טלפון ספק</b>{po.supplierPhone}</div> : null}
        {po.linkedOrderId ? <div style={{fontSize:13}}><b style={{color:"#475569",fontSize:11,display:"block",marginBottom:2}}>הזמנת לקוח מקושרת</b>{po.linkedOrderId}</div> : null}
      </div>
      {items.length === 0 ?
        <p style={{color:"#94a3b8",fontSize:13}}>אין פריטים בהזמנה זו.</p>
      :
        <table style={{width:"100%",borderCollapse:"collapse",marginTop:10}}>
          <thead>
            <tr>
              <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>שם פריט</th>
              <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>כמות</th>
              <th style={{background:"#4338ca",color:"#fff",padding:"8px 10px",fontSize:12,textAlign:"right"}}>הערות</th>
            </tr>
          </thead>
          <tbody>
            {items.map(function(it,i){
              return (
                <tr key={i} style={{background: i % 2 === 1 ? "#f8fafc" : "#fff"}}>
                  <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0",unicodeBidi:"plaintext"}}>{it.name}</td>
                  <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0"}}>{it.qty}</td>
                  <td style={{padding:"8px 10px",fontSize:13,borderBottom:"1px solid #e2e8f0",color:"#64748b"}}>{it.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      }
      {po.notes ?
        <div style={{marginTop:20,background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"12px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:4}}>הערות להזמנה</div>
          <div style={{fontSize:13,color:"#78350f"}}>{po.notes}</div>
        </div>
      : null}
      <div style={{marginTop:30,fontSize:11,color:"#94a3b8",textAlign:"center"}}>נוצר אוטומטית ממערכת ניהול ההזמנות</div>
      <style dangerouslySetInnerHTML={{__html:
        "@media print { body * { visibility: hidden; } #print-po-root, #print-po-root * { visibility: visible; } #print-po-root { position: absolute; top:0; left:0; } .no-print { display: none !important; } }"
      }} />
    </div>
  );
}


function AutocompleteInput(props) {
  var [open, setOpen] = useState(false);
  var suggestions = props.suggestions || [];
  var val = props.value || "";

  var filtered = val.trim()
    ? suggestions.filter(function(s){ return s.toLowerCase().indexOf(val.trim().toLowerCase()) >= 0; })
    : suggestions;

  function select(s) {
    props.onChange(s);
    setOpen(false);
    if (props.onSelect) props.onSelect(s);
  }

  return (
    <div style={{position:"relative",flex:props.flex||1}}>
      <input
        value={val}
        onChange={function(e){ props.onChange(e.target.value); setOpen(true); }}
        onFocus={function(){ setOpen(true); }}
        onBlur={function(){ setTimeout(function(){ setOpen(false); if(props.onBlur) props.onBlur(); }, 150); }}
        style={props.style||Object.assign({},inpStyle,{width:"100%",fontWeight:700,fontSize:15,padding:"9px 12px",unicodeBidi:"plaintext"})}
        placeholder={props.placeholder||""}
      />
      {open && filtered.length > 0 ?
        <div style={{position:"absolute",top:"100%",right:0,left:0,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:1000,maxHeight:200,overflowY:"auto",direction:"rtl"}}>
          {filtered.slice(0,8).map(function(s){
            return (
              <div key={s} onMouseDown={function(){select(s);}} style={{padding:"10px 14px",cursor:"pointer",fontSize:14,fontWeight:600,color:"#0f172a",unicodeBidi:"plaintext",borderBottom:"1px solid #f1f5f9"}}
                onMouseEnter={function(e){e.currentTarget.style.background="#f1f5f9";}}
                onMouseLeave={function(e){e.currentTarget.style.background="#fff";}}>
                {s}
              </div>
            );
          })}
        </div>
      : null}
    </div>
  );
}

function WABtn(props) {
  return (
    <a href={props.href} target="_blank" rel="noopener noreferrer"
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:8,background:"#25D366",textDecoration:"none",flexShrink:0}}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  );
}

function PhoneBtn(props) {
  return (
    <a href={props.href}
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:8,background:"#3b82f6",textDecoration:"none",flexShrink:0}}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
      </svg>
    </a>
  );
}

function WazeBtn(props) {
  return (
    <a href={props.href} target="_blank" rel="noopener noreferrer"
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:8,background:"#ffffff",border:"1.5px solid #e2e8f0",textDecoration:"none",flexShrink:0}}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="28" height="28">
        <ellipse cx="32" cy="38" rx="26" ry="20" fill="#00BFFF"/>
        <ellipse cx="32" cy="36" rx="24" ry="18" fill="#33CCFF"/>
        <circle cx="22" cy="32" r="5" fill="white"/>
        <circle cx="42" cy="32" r="5" fill="white"/>
        <circle cx="22" cy="32" r="3" fill="#1a1a2e"/>
        <circle cx="42" cy="32" r="3" fill="#1a1a2e"/>
        <path d="M24 42 Q32 48 40 42" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <ellipse cx="32" cy="20" rx="6" ry="8" fill="#33CCFF"/>
        <ellipse cx="32" cy="14" rx="4" ry="4" fill="#00BFFF"/>
      </svg>
    </a>
  );
}

function PDFViewer(props) {
  if (!props.src) return null;
  return (
    <div onClick={props.onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:10001,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"0"}}>
      <div style={{width:"100%",background:"#1e1b4b",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{color:"#fff",fontWeight:700,fontSize:14}}>{"📄 " + (props.name||"קובץ")}</span>
        <div style={{display:"flex",gap:8}}>
          <a href={props.src} download={props.name} onClick={function(e){e.stopPropagation();}} style={{padding:"6px 14px",background:"rgba(255,255,255,0.15)",color:"#fff",borderRadius:8,fontSize:13,fontWeight:700,textDecoration:"none"}}>הורד</a>
          <button onClick={props.onClose} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:13}}>סגור</button>
        </div>
      </div>
      <div onClick={function(e){e.stopPropagation();}} style={{flex:1,width:"100%",overflow:"hidden"}}>
        <iframe src={props.src} style={{width:"100%",height:"100%",border:"none"}} title={props.name} />
      </div>
    </div>
  );
}

function ImageLightbox(props) {
  if (!props.src) return null;
  return (
    <div onClick={props.onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <button onClick={props.onClose} style={{position:"absolute",top:20,left:20,background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:"50%",width:40,height:40,cursor:"pointer",fontSize:20,fontWeight:700}}>x</button>
      <img src={props.src} onClick={function(e){e.stopPropagation();}} style={{maxWidth:"100%",maxHeight:"90vh",objectFit:"contain",borderRadius:8}} />
    </div>
  );
}

function Modal(props) {
  return (
    <div onClick={props.onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={function(e){e.stopPropagation();}} style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:props.wide?820:620,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.18)",direction:"rtl"}}>
        {props.children}
      </div>
    </div>
  );
}

function StatusBadge(props) {
  var s = getStatus(props.statusId);
  return (
    <span style={{background:s.bg,color:s.color,border:"1px solid "+s.color+"33",borderRadius:20,padding:props.small?"2px 10px":"4px 14px",fontSize:props.small?11:12,fontWeight:700,whiteSpace:"nowrap"}}>
      {s.label}
    </span>
  );
}

var CUSTOMER_SOURCES = ["המלצה","פייסבוק","גוגל","אתר","וואטסאפ","מעצב/ת","אחר"];

function DesignerCard(props) {
  var d = props.designer;
  var customerCount = props.customerCount || 0;
  return (
    <div onClick={function(){props.onClick(d);}} style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 12px rgba(30,41,59,0.07)",cursor:"pointer",border:"1.5px solid #e2e8f0",direction:"rtl"}}
      onMouseEnter={function(e){e.currentTarget.style.boxShadow="0 6px 24px rgba(30,41,59,0.13)";}}
      onMouseLeave={function(e){e.currentTarget.style.boxShadow="0 2px 12px rgba(30,41,59,0.07)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{fontSize:16,fontWeight:800,color:"#0f172a",marginBottom:4}}>{d.name}</div>
        <span style={{background:"#fdf2f8",color:"#db2777",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{customerCount + " לקוחות"}</span>
      </div>
      {d.phone ? <div style={{fontSize:13,color:"#64748b"}}>{"📞 " + d.phone}</div> : null}
      {d.company ? <div style={{fontSize:12,color:"#6366f1",marginTop:4}}>{d.company}</div> : null}
      {d.notes ? <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{d.notes}</div> : null}
    </div>
  );
}

function DesignerDetail(props) {
  var d = props.designer;
  var relatedCustomers = props.relatedCustomers || [];
  return (
    <Modal onClose={props.onClose}>
      <div style={{padding:"28px 28px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <h2 style={{margin:"0 0 4px",fontSize:22,fontWeight:900,color:"#0f172a"}}>{d.name}</h2>
            {d.company ? <div style={{fontSize:13,color:"#6366f1",fontWeight:600}}>{d.company}</div> : null}
          </div>
          <button onClick={props.onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:"#64748b"}}>x</button>
        </div>
      </div>
      <div style={{padding:"16px 28px 28px"}}>
        {d.phone ? <div style={{fontSize:13,color:"#64748b",marginBottom:8}}>{"📞 " + d.phone}</div> : null}
        {d.notes ? <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:13,color:"#92400e"}}>{"📝 " + d.notes}</div> : null}

        <div style={{marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:10}}>{"לקוחות שהגיעו דרך " + d.name + " (" + relatedCustomers.length + ")"}</div>
          {relatedCustomers.length === 0 ?
            <div style={{padding:"20px",textAlign:"center",color:"#94a3b8",fontSize:13,background:"#f8fafc",borderRadius:10}}>אין עדיין לקוחות שהגיעו דרך מעצב/ת זה</div>
          :
            relatedCustomers.map(function(c){
              return (
                <div key={c.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{c.name}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
                      {c.phone}
                      {c.sourceNote && c.sourceNote !== d.name ? <span style={{color:"#94a3b8"}}>{" · " + c.sourceNote}</span> : null}
                    </div>
                  </div>
                  {c.address ? <div style={{fontSize:11,color:"#94a3b8",textAlign:"left"}}>{c.address}</div> : null}
                </div>
              );
            })
          }
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <button onClick={function(){props.onEdit(d);}} style={{padding:"10px 20px",background:"linear-gradient(135deg,#ec4899,#db2777)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>ערוך פרטים</button>
        </div>
      </div>
    </Modal>
  );
}

function DesignersView(props) {
  var designers = props.designers || [];
  var customers = props.customers || [];
  var [showForm, setShowForm] = useState(false);
  var [editing, setEditing] = useState(null);
  var [selectedDesigner, setSelectedDesigner] = useState(null);
  var [confirmDelete, setConfirmDelete] = useState(null);
  var [form, setForm] = useState({id:"",name:"",phone:"",company:"",notes:""});
  var [errors, setErrors] = useState({});

  function openNew() {
    setForm({id:makeId("DSG"),name:"",phone:"",company:"",notes:""});
    setEditing(null);
    setErrors({});
    setShowForm(true);
  }
  function openEdit(d) {
    setSelectedDesigner(null);
    setForm(Object.assign({},d));
    setEditing(d.id);
    setErrors({});
    setShowForm(true);
  }
  function setF(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }
  function save() {
    var e = {};
    if (!form.name.trim()) e.name = "חובה";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    props.onSave(form);
    setShowForm(false);
  }

  function customersForDesigner(d) {
    return customers.filter(function(c){
      return c.sourceDesignerId === d.id || (c.source === "מעצב/ת" && c.sourceNote === d.name);
    });
  }
  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 28px",direction:"rtl"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>מאגר מעצבים ומעצבות</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#64748b"}}>מעצבים חיצוניים שמפנים אלינו לקוחות</p>
        </div>
      </div>
      {designers.length === 0 && !showForm ?
        <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>✏️</div>
          <div style={{fontSize:16,fontWeight:600}}>אין מעצבים במאגר עדיין</div>
          <button onClick={openNew} style={{marginTop:16,padding:"11px 24px",background:"linear-gradient(135deg,#ec4899,#db2777)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>+ הוסף מעצב/ת</button>
        </div>
      :
        <div>
          <button onClick={openNew} style={{marginBottom:16,padding:"10px 20px",background:"linear-gradient(135deg,#ec4899,#db2777)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:13}}>+ הוסף מעצב/ת</button>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
            {designers.map(function(d){
              return <DesignerCard key={d.id} designer={d} customerCount={customersForDesigner(d).length} onClick={function(des){ setSelectedDesigner(des); }} />;
            })}
          </div>
        </div>
      }

      {showForm ?
        <Modal onClose={function(){setShowForm(false);}}>
          <div style={{padding:28}}>
            <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:800,color:"#0f172a"}}>{editing ? "עריכת מעצב/ת" : "מעצב/ת חדש/ה"}</h2>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם *</label>
              <input value={form.name} onChange={function(e){setF("name",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.name?"#ef4444":"#e2e8f0")})} placeholder="שם מלא" />
              {errors.name ? <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.name}</div> : null}
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>טלפון</label>
              <input value={form.phone} onChange={function(e){setF("phone",e.target.value);}} style={inpStyle} placeholder="05X-XXXXXXX" />
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>חברה / סטודיו</label>
              <input value={form.company} onChange={function(e){setF("company",e.target.value);}} style={inpStyle} placeholder="שם הסטודיו (אופציונלי)" />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הערות</label>
              <textarea value={form.notes} onChange={function(e){setF("notes",e.target.value);}} rows={2} style={Object.assign({},inpStyle,{resize:"vertical"})} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {editing ?
                <button onClick={function(){setConfirmDelete(form.id);setShowForm(false);}} style={{padding:"10px 16px",background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>מחק</button>
              : <div />}
              <div style={{display:"flex",gap:10}}>
                <button onClick={function(){setShowForm(false);}} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
                <button onClick={save} style={{padding:"11px 24px",background:"linear-gradient(135deg,#ec4899,#db2777)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור</button>
              </div>
            </div>
          </div>
        </Modal>
      : null}

      {confirmDelete ?
        <Modal onClose={function(){setConfirmDelete(null);}}>
          <div style={{padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🗑️</div>
            <h2 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"#0f172a"}}>למחוק מעצב/ת זה?</h2>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={function(){setConfirmDelete(null);}} style={{padding:"11px 24px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={function(){ props.onDelete(confirmDelete); setConfirmDelete(null); }} style={{padding:"11px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>מחק</button>
            </div>
          </div>
        </Modal>
      : null}

      {selectedDesigner ?
        <DesignerDetail
          designer={selectedDesigner}
          relatedCustomers={customersForDesigner(selectedDesigner)}
          onClose={function(){setSelectedDesigner(null);}}
          onEdit={openEdit}
        />
      : null}
    </div>
  );
}

function InstallerWorkloadView(props) {
  var users = props.users || [];
  var orders = props.orders || [];
  var installers = users.filter(function(u){ return u.role==="installer" && u.active; });

  function ordersFor(userId) {
    return orders.filter(function(o){
      var open = o.status !== "completed";
      var assigned = (o.assignedInstallers||[]).some(function(a){ return a.userId===userId; });
      return open && assigned;
    });
  }

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 28px",direction:"rtl"}}>
      <h2 style={{margin:"0 0 4px",fontSize:22,fontWeight:900,color:"#0f172a"}}>עומס עבודה לפי מתקין</h2>
      <p style={{margin:"0 0 20px",fontSize:13,color:"#64748b"}}>הזמנות פתוחות המשויכות לכל מתקין</p>

      {installers.length === 0 ?
        <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>👷</div>
          <div style={{fontSize:16,fontWeight:600}}>אין מתקינים פעילים במערכת</div>
          <div style={{fontSize:13,marginTop:4}}>ניתן להוסיף משתמש עם תפקיד "מתקין" בטאב ניהול משתמשים</div>
        </div>
      :
        <div style={{display:"grid",gap:16}}>
          {installers.map(function(inst){
            var myOrders = ordersFor(inst.id);
            return (
              <div key={inst.id} style={{background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"#fff7ed",borderBottom:"1px solid #fdba74"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#f9731688,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{inst.name[0]}</div>
                    <span style={{fontWeight:800,fontSize:16,color:"#c2410c"}}>{inst.name}</span>
                  </div>
                  <span style={{background:"#fff",border:"1px solid #fdba74",borderRadius:20,padding:"4px 14px",fontSize:13,fontWeight:700,color:"#c2410c"}}>{myOrders.length + " הזמנות פתוחות"}</span>
                </div>
                {myOrders.length === 0 ?
                  <div style={{padding:"16px",textAlign:"center",color:"#cbd5e1",fontSize:13}}>אין הזמנות פתוחות משויכות</div>
                :
                  <div style={{padding:"10px 14px"}}>
                    {myOrders.map(function(o){
                      var st = getStatus(o.status);
                      var myAssignment = (o.assignedInstallers||[]).find(function(a){ return a.userId===inst.id; });
                      return (
                        <div key={o.id} onClick={function(){props.onOrderClick(o);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 8px",borderBottom:"1px solid #f8fafc",cursor:"pointer"}}
                          onMouseEnter={function(e){e.currentTarget.style.background="#f8fafc";}}
                          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:"#0f172a",unicodeBidi:"plaintext"}}>{o.client}</div>
                            <div style={{fontSize:11,color:"#94a3b8"}}>{o.id + (myAssignment&&myAssignment.note ? " · " + myAssignment.note : "")}</div>
                          </div>
                          <span style={{background:st.bg,color:st.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

function CustomerCard(props) {
  var c = props.customer;
  var orderCount = props.orderCount || 0;
  return (
    <div onClick={function(){props.onClick(c);}} style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 12px rgba(30,41,59,0.07)",cursor:"pointer",border:"1.5px solid #e2e8f0",direction:"rtl"}}
      onMouseEnter={function(e){e.currentTarget.style.boxShadow="0 6px 24px rgba(30,41,59,0.13)";}}
      onMouseLeave={function(e){e.currentTarget.style.boxShadow="0 2px 12px rgba(30,41,59,0.07)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{fontSize:16,fontWeight:800,color:"#0f172a",unicodeBidi:"plaintext"}}>{c.name}</div>
        {c.source ? <span style={{background:"#eff6ff",color:"#1d4ed8",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{c.source + (c.sourceNote ? " · " + c.sourceNote : "")}</span> : null}
      </div>
      <div style={{fontSize:13,color:"#64748b",marginBottom:4}}>{"📞 " + c.phone}</div>
      {c.address ? <div style={{fontSize:13,color:"#64748b",marginBottom:8}}>{"📍 " + c.address}</div> : null}
      <div style={{fontSize:12,color:"#94a3b8",borderTop:"1px solid #f1f5f9",paddingTop:8,marginTop:4}}>{orderCount + " הזמנות"}</div>
    </div>
  );
}

function CustomerForm(props) {
  var designers = props.designers || [];
  var [form, setForm] = useState(props.initial || {
    id: makeId("CUST"),
    name: "",
    phone: "",
    extraPhones: [],
    address: "",
    source: "",
    sourceNote: "",
    sourceDesignerId: "",
    notes: "",
    created: toISO(new Date())
  });
  var [errors, setErrors] = useState({});
  function set(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }

  var extraPhones = form.extraPhones || [];
  function addPhone() { set("extraPhones", extraPhones.concat([{name:"",phone:""}])); }
  function setPhone(i,k,v) { set("extraPhones", extraPhones.map(function(p,idx){ return idx===i?Object.assign({},p,{[k]:v}):p; })); }
  function removePhone(i) { set("extraPhones", extraPhones.filter(function(_,idx){ return idx!==i; })); }

  function validate() {
    var e = {};
    if (!form.name.trim()) e.name = "חובה";
    if (!form.phone.trim()) e.phone = "חובה";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div style={{padding:28}}>
      <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>{props.initial ? "עריכת לקוח" : "לקוח חדש"}</h2>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם *</label>
        <input value={form.name} onChange={function(e){set("name",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.name?"#ef4444":"#e2e8f0")})} placeholder="שם הלקוח" />
        {errors.name ? <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.name}</div> : null}
      </div>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>טלפון ראשי *</label>
        <input value={form.phone} onChange={function(e){set("phone",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.phone?"#ef4444":"#e2e8f0")})} placeholder="05X-XXXXXXX" />
        {errors.phone ? <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.phone}</div> : null}
      </div>

      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>אנשי קשר נוספים</label>
          <button onClick={addPhone} style={{padding:"4px 10px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>+ הוסף</button>
        </div>
        {extraPhones.map(function(p,i){
          return (
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6,marginBottom:6}}>
              <input value={p.name} onChange={function(e){setPhone(i,"name",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px"})} placeholder="שם" />
              <input value={p.phone} onChange={function(e){setPhone(i,"phone",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px"})} placeholder="טלפון" />
              <button onClick={function(){removePhone(i);}} style={{background:"#fef2f2",border:"none",color:"#ef4444",cursor:"pointer",borderRadius:8,padding:"7px 10px",fontWeight:700}}>הסר</button>
            </div>
          );
        })}
      </div>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>כתובת</label>
        <input value={form.address} onChange={function(e){set("address",e.target.value);}} style={inpStyle} placeholder="רחוב, מספר, עיר" />
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>מקור הלקוח</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          {CUSTOMER_SOURCES.map(function(src){
            return (
              <button key={src} onClick={function(){set("source",src); set("sourceNote",""); set("sourceDesignerId","");}}
                style={{padding:"8px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:form.source===src?"2px solid #4338ca":"2px solid #e2e8f0",background:form.source===src?"#eef2ff":"#f8fafc",color:form.source===src?"#4338ca":"#64748b"}}>
                {src}
              </button>
            );
          })}
        </div>

        {form.source === "מעצב/ת" ?
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#6366f1",display:"block",marginBottom:5}}>בחר/י מעצב/ת</label>
            {designers.length === 0 ?
              <div style={{fontSize:12,color:"#94a3b8",padding:"8px 12px",background:"#f8fafc",borderRadius:8}}>אין מעצבים במאגר — הוסף מטאב "מעצבים"</div>
            :
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                {designers.map(function(d){
                  var sel = form.sourceDesignerId === d.id;
                  return (
                    <button key={d.id} onClick={function(){set("sourceDesignerId",d.id); set("sourceNote",d.name);}}
                      style={{padding:"7px 14px",borderRadius:20,cursor:"pointer",fontWeight:700,fontSize:13,border:sel?"2px solid #ec4899":"2px solid #e2e8f0",background:sel?"#fdf2f8":"#f8fafc",color:sel?"#db2777":"#64748b"}}>
                      {"✏️ " + d.name}
                    </button>
                  );
                })}
              </div>
            }
            <input value={form.sourceNote} onChange={function(e){set("sourceNote",e.target.value);}} style={Object.assign({},inpStyle,{marginTop:6})} placeholder="הערה על המעצב/ת (אופציונלי)" />
          </div>
        : form.source === "אחר" ?
          <input value={form.sourceNote} onChange={function(e){set("sourceNote",e.target.value);}} style={inpStyle} placeholder="פרט את המקור..." />
        : form.source ?
          <input value={form.sourceNote} onChange={function(e){set("sourceNote",e.target.value);}} style={inpStyle} placeholder={"הערה על " + form.source + " (אופציונלי)"} />
        : null}
      </div>

      <div style={{marginBottom:24}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הערות</label>
        <textarea value={form.notes} onChange={function(e){set("notes",e.target.value);}} rows={3} style={Object.assign({},inpStyle,{resize:"vertical"})} placeholder="הערות כלליות על הלקוח..." />
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={props.onCancel} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
        <button onClick={function(){if(validate()) props.onSave(form);}} style={{padding:"11px 28px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור לקוח</button>
      </div>
    </div>
  );
}

function CustomerDetail(props) {
  var c = props.customer;
  var relatedOrders = props.relatedOrders || [];
  var [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Modal onClose={props.onClose}>
      <div style={{padding:"28px 28px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:900,color:"#0f172a",unicodeBidi:"plaintext"}}>{c.name}</h2>
            {c.source ? <span style={{background:"#eff6ff",color:"#1d4ed8",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{c.source}</span> : null}
          </div>
          <button onClick={props.onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:"#64748b"}}>x</button>
        </div>
      </div>
      <div style={{padding:"16px 28px 28px"}}>
        <div style={{marginBottom:14}}>
          <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:6}}>טלפון ראשי</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{c.phone}</span>
              <div style={{display:"flex",gap:6}}>
                <a href={"https://wa.me/972" + c.phone.replace(/^0/,"").replace(/[-\s]/g,"")} target="_blank" rel="noopener noreferrer"
                  style={{textDecoration:"none"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                <a href={"tel:" + c.phone}
                  style={{textDecoration:"none"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></a>
              </div>
            </div>
          </div>

          {(c.extraPhones||[]).map(function(p,i){
            return (
              <div key={i} style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:6}}>{p.name || ("איש קשר " + (i+1))}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{p.phone}</span>
                  <div style={{display:"flex",gap:6}}>
                    <a href={"https://wa.me/972" + p.phone.replace(/^0/,"").replace(/[-\s]/g,"")} target="_blank" rel="noopener noreferrer"
                      style={{textDecoration:"none"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                    <a href={"tel:" + p.phone}
                      style={{textDecoration:"none"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {c.address ?
          <a href={"https://waze.com/ul?q=" + encodeURIComponent(c.address) + "&navigate=yes"} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:10,padding:"10px 14px",marginBottom:14,textDecoration:"none"}}>
            <div>
              <div style={{fontSize:11,color:"#0369a1",fontWeight:700,marginBottom:3}}>כתובת</div>
              <div style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{c.address}</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 48 48" fill="#05c8f0"><path d="M24 4C13 4 4 13 4 24c0 4.8 1.7 9.2 4.5 12.7L7 42l5.5-1.4C15.5 42.7 19.6 44 24 44c11 0 20-9 20-20S35 4 24 4zm0 36c-3.7 0-7.2-1.1-10.1-3l-.7-.4-4.4 1.1 1.2-4.2-.5-.7C7.9 30.1 7 27.1 7 24 7 14.6 14.6 7 24 7s17 7.6 17 17-7.6 16-17 16zm-2-22a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4zm-4 12c-4 0-7.4-2.6-8.6-6.2l2.8-.9c.8 2.5 3.1 4.1 5.8 4.1s5-1.6 5.8-4.1l2.8.9C33.4 27.4 30 30 26 30z"/></svg>
          </a>
        : null}

        {c.notes ? <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:13,color:"#92400e"}}>{"📝 " + c.notes}</div> : null}

        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:8}}>{"היסטוריית הזמנות (" + relatedOrders.length + ")"}</div>
          {relatedOrders.length === 0 ?
            <div style={{padding:"16px",textAlign:"center",color:"#94a3b8",fontSize:13,background:"#f8fafc",borderRadius:10}}>אין עדיין הזמנות ללקוח זה</div>
          :
            relatedOrders.map(function(o){
              var st = getStatus(o.status);
              return (
                <div key={o.id} onClick={function(){props.onOrderClick(o);}} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={function(e){e.currentTarget.style.background="#f8fafc";}}
                  onMouseLeave={function(e){e.currentTarget.style.background="#fff";}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{o.id}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{fmtDate(o.created)}</div>
                  </div>
                  <span style={{background:st.color+"15",color:st.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{st.label}</span>
                </div>
              );
            })
          }
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={function(){setConfirmDelete(true);}} style={{padding:"10px 16px",background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>מחק</button>
          <button onClick={function(){props.onEdit(c);}} style={{padding:"10px 20px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>ערוך</button>
        </div>
      </div>

      {confirmDelete ?
        <Modal onClose={function(){setConfirmDelete(false);}}>
          <div style={{padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🗑️</div>
            <h2 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"#0f172a"}}>למחוק את הלקוח?</h2>
            <p style={{margin:"0 0 24px",fontSize:13,color:"#64748b"}}>{"\"" + c.name + "\" יימחק לצמיתות. ההזמנות הקשורות לא יימחקו."}</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={function(){setConfirmDelete(false);}} style={{padding:"11px 24px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={function(){ setConfirmDelete(false); props.onDelete(c.id); }} style={{padding:"11px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>מחק</button>
            </div>
          </div>
        </Modal>
      : null}
    </Modal>
  );
}

function SignaturePad(props) {
  var canvasRef = useRef();
  var drawing = useRef(false);
  var hasSignature = useRef(false);
  var lastPoint = useRef(null);

  function getPos(e, canvas) {
    var rect = canvas.getBoundingClientRect();
    var clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function start(e) {
    e.preventDefault();
    var canvas = canvasRef.current;
    var pos = getPos(e, canvas);
    drawing.current = true;
    lastPoint.current = pos;
  }
  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    var canvas = canvasRef.current;
    var ctx = canvas.getContext("2d");
    var pos = getPos(e, canvas);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
    hasSignature.current = true;
  }
  function end(e) {
    drawing.current = false;
  }
  function clear() {
    var canvas = canvasRef.current;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature.current = false;
  }
  function getDataUrl() {
    return hasSignature.current && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null;
  }

  if (props.useImperativeRef) props.useImperativeRef({ clear: clear, getDataUrl: getDataUrl });

  return (
    <div style={{border:"2px dashed #cbd5e1", borderRadius:10, overflow:"hidden", background:"#fff", width:"100%", height:"100%"}}>
      <canvas
        ref={canvasRef}
        width={props.width||500}
        height={props.height||180}
        style={{width:"100%", height:"100%", touchAction:"none", display:"block", cursor:"crosshair"}}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
    </div>
  );
}

function SignatureModal(props) {
  var padApi = useRef({});
  function handleClear() { if (padApi.current.clear) padApi.current.clear(); }
  function handleSave() {
    var dataUrl = padApi.current.getDataUrl ? padApi.current.getDataUrl() : null;
    if (!dataUrl) { window.alert("יש לחתום לפני השמירה"); return; }
    props.onSave(dataUrl);
  }
  return (
    <div style={{position:"fixed",inset:0,background:"#fff",zIndex:10001,display:"flex",flexDirection:"column",direction:"rtl"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0,fontSize:17,fontWeight:800,color:"#0f172a"}}>חתימת לקוח</h2>
        <button onClick={props.onCancel} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:"#64748b"}}>x</button>
      </div>
      <div style={{flex:1,padding:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:"100%",height:"100%",maxWidth:700}}>
          <SignaturePad width={900} height={500} useImperativeRef={function(api){padApi.current=api;}} />
        </div>
      </div>
      <div style={{padding:16,borderTop:"1px solid #e2e8f0",display:"flex",gap:10}}>
        <button onClick={handleClear} style={{flex:1,padding:14,background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:15}}>נקה</button>
        <button onClick={handleSave} style={{flex:2,padding:14,background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:15}}>שמור חתימה</button>
      </div>
    </div>
  );
}

var DEFECT_TYPES = {
  panel:        { label:"דופן",        fields:["bondergel","material"] },
  door_front:   { label:"חזית דלת",    fields:["hinges","material"] },
  drawer_front: { label:"חזית מגירה",  fields:["material"] },
  drawer:       { label:"מגירה",       fields:["drawerSpecial"] },
  closure:      { label:"סגירה",       fields:["height","width","material"] },
  cabinet:      { label:"ארון",        fields:["cabinetSpecial"] },
  shelf:        { label:"מדף",         fields:["shelfSpecial"] },
  hardware:     { label:"פרזול",       fields:["freeDesc","qty"] },
  socle:        { label:"צוקל",        fields:["height","width","material"] },
  other:        { label:"אחר",         fields:["freeDesc","qty"] }
};

var DEFECT_FIELD_LABELS = {
  height: "גובה (ס\"מ)",
  width: "רוחב (ס\"מ)",
  depth: "עומק (ס\"מ)",
  material: "חומר",
  hinges: "מידות צירים (מלמעלה/מלמטה)",
  freeDesc: "תיאור",
  qty: "כמות"
};

function ItemSketch(props) {
  var item = props.item;
  var set = props.set;
  var showDepth = props.showDepth || false;
  var hasHinges = props.hasHinges || false;

  var W = 180; var H = 220; var PAD = 60;
  var SVG_W = W + PAD*2; var SVG_H = H + PAD*2;
  var rx = PAD; var ry = PAD;

  var width = item.width || "";
  var height = item.height || "";
  var depth = item.depth || "";
  var hingesList = item.hingesList || [];

  function syncOpposite(k, v) {
    if (v !== "") {
      if (k === "width" && (item.widthB === item.width || !item.widthB)) set("widthB", v);
      if (k === "widthB" && (item.width === item.widthB || !item.width)) set("width", v);
      if (k === "height" && (item.heightR === item.height || !item.heightR)) set("heightR", v);
      if (k === "heightR" && (item.height === item.heightR || !item.height)) set("height", v);
    }
    set(k, v);
  }

  var widthB = item.widthB !== undefined ? item.widthB : width;
  var heightR = item.heightR !== undefined ? item.heightR : height;

  // Calculate hinge Y positions on SVG
  function hingeY(h) {
    var pct = 0;
    if (h.measurement && height) {
      pct = Number(h.measurement) / Number(height);
      if (h.position === "bottom") pct = 1 - pct;
    } else {
      pct = h.position === "top" ? 0.15 : 0.85;
    }
    return ry + H * Math.min(Math.max(pct, 0.05), 0.95);
  }

  var hingesLeft = hasHinges && (item.hingesSide === "left" || !item.hingesSide);
  var hingesRight = hasHinges && item.hingesSide === "right";
  var hingeX = hingesLeft ? rx : rx + W;

  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:8,position:"relative"}}>
        <svg width={SVG_W} height={SVG_H} style={{overflow:"visible"}}>
          {/* Main rectangle */}
          <rect x={rx} y={ry} width={W} height={H} fill="#f8fafc" stroke="#334155" strokeWidth={2} rx={4} />

          {/* Depth lines (3D effect) if showDepth */}
          {showDepth && depth ?
            <g>
              <line x1={rx} y1={ry} x2={rx-16} y2={ry-16} stroke="#94a3b8" strokeWidth={1.5} />
              <line x1={rx+W} y1={ry} x2={rx+W-16} y2={ry-16} stroke="#94a3b8" strokeWidth={1.5} />
              <line x1={rx-16} y1={ry-16} x2={rx+W-16} y2={ry-16} stroke="#94a3b8" strokeWidth={1.5} />
              <text x={rx+W/2-16} y={ry-22} textAnchor="middle" fontSize={11} fill="#6366f1" fontWeight="700">{depth + " ס\"מ"}</text>
            </g>
          : null}

          {/* Hinge circles and arrows inside rectangle */}
          {hasHinges && hingesList.length > 0 ? (function(){
            var insideX = hingesLeft ? rx + 28 : rx + W - 28;
            var textX = hingesLeft ? rx + 40 : rx + W - 40;
            var textAnchor = hingesLeft ? "start" : "end";

            return (
              <g>
                <defs>
                  <marker id="arrTop" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#f97316" />
                  </marker>
                  <marker id="arrBot" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="270">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
                  </marker>
                </defs>

                {hingesList.map(function(h,i){
                  var cy = hingeY(h);
                  var isTop = h.position === "top";
                  var arrowColor = isTop ? "#f97316" : "#10b981";
                  var markerId = isTop ? "arrTop" : "arrBot";
                  // Arrow goes FROM hinge circle TOWARD the edge
                  var arrowY1 = cy;
                  var arrowY2 = isTop ? ry + 8 : ry + H - 8;
                  return (
                    <g key={h.id||i}>
                      {/* Hinge circle */}
                      <circle cx={hingeX} cy={cy} r={7} fill="#4338ca" stroke="#fff" strokeWidth={2} />
                      {/* Arrow from hinge toward edge */}
                      <line x1={insideX} y1={arrowY1} x2={insideX} y2={arrowY2}
                        stroke={arrowColor} strokeWidth={1.5} markerEnd={"url(#" + markerId + ")"} strokeDasharray="4,2" />
                      {/* Measurement label */}
                      {h.measurement ?
                        <text x={textX} y={cy - 6} textAnchor={textAnchor} fontSize={10} fill={arrowColor} fontWeight="800">{h.measurement + " ס\"מ"}</text>
                      : null}
                    </g>
                  );
                })}
              </g>
            );
          })() : null}

          {/* Dimension lines and labels */}
          {/* Top - width */}
          <line x1={rx} y1={ry-20} x2={rx+W} y2={ry-20} stroke="#6366f1" strokeWidth={1.5} markerEnd="url(#arr)" markerStart="url(#arr)" />
          <text x={rx+W/2} y={ry-26} textAnchor="middle" fontSize={11} fill="#4338ca" fontWeight="700">{width ? width + " ס\"מ" : "רוחב"}</text>

          {/* Bottom - widthB */}
          <line x1={rx} y1={ry+H+20} x2={rx+W} y2={ry+H+20} stroke="#6366f1" strokeWidth={1.5} />
          <text x={rx+W/2} y={ry+H+34} textAnchor="middle" fontSize={11} fill="#4338ca" fontWeight="700">{widthB ? widthB + " ס\"מ" : "רוחב תחתון"}</text>

          {/* Right - height */}
          <line x1={rx+W+20} y1={ry} x2={rx+W+20} y2={ry+H} stroke="#059669" strokeWidth={1.5} />
          <text x={rx+W+36} y={ry+H/2+4} textAnchor="start" fontSize={11} fill="#059669" fontWeight="700">{height ? height + " ס\"מ" : "גובה"}</text>

          {/* Left - heightR */}
          <line x1={rx-20} y1={ry} x2={rx-20} y2={ry+H} stroke="#059669" strokeWidth={1.5} />
          <text x={rx-22} y={ry+H/2+4} textAnchor="end" fontSize={11} fill="#059669" fontWeight="700">{heightR ? heightR + " ס\"מ" : "גובה"}</text>
        </svg>
      </div>

      {/* Input fields for 4 sides */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <div>
          <div style={{fontSize:10,color:"#4338ca",fontWeight:700,marginBottom:3,textAlign:"center"}}>רוחב עליון</div>
          <input type="number" min="0" value={width} onChange={function(e){syncOpposite("width",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center",fontSize:13})} placeholder="ס״מ" />
        </div>
        <div>
          <div style={{fontSize:10,color:"#4338ca",fontWeight:700,marginBottom:3,textAlign:"center"}}>רוחב תחתון</div>
          <input type="number" min="0" value={widthB} onChange={function(e){syncOpposite("widthB",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center",fontSize:13})} placeholder="ס״מ" />
        </div>
        <div>
          <div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:3,textAlign:"center"}}>גובה שמאל</div>
          <input type="number" min="0" value={height} onChange={function(e){syncOpposite("height",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center",fontSize:13})} placeholder="ס״מ" />
        </div>
        <div>
          <div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:3,textAlign:"center"}}>גובה ימין</div>
          <input type="number" min="0" value={heightR} onChange={function(e){syncOpposite("heightR",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center",fontSize:13})} placeholder="ס״מ" />
        </div>
        {showDepth ?
          <div style={{gridColumn:"1/-1"}}>
            <div style={{fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:3,textAlign:"center"}}>עומק</div>
            <input type="number" min="0" value={depth} onChange={function(e){set("depth",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center",fontSize:13})} placeholder="ס״מ" />
          </div>
        : null}
      </div>

      {/* Hinge side selector */}
      {hasHinges && hingesList.length > 0 ?
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <div style={{fontSize:11,fontWeight:700,color:"#475569",padding:"8px 0"}}>צד הצירים:</div>
          <button onClick={function(){set("hingesSide","left");}}
            style={{flex:1,padding:"7px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:(!item.hingesSide||item.hingesSide==="left")?"2px solid #4338ca":"2px solid #e2e8f0",background:(!item.hingesSide||item.hingesSide==="left")?"#eef2ff":"#f8fafc",color:(!item.hingesSide||item.hingesSide==="left")?"#4338ca":"#64748b"}}>
            שמאל
          </button>
          <button onClick={function(){set("hingesSide","right");}}
            style={{flex:1,padding:"7px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.hingesSide==="right"?"2px solid #4338ca":"2px solid #e2e8f0",background:item.hingesSide==="right"?"#eef2ff":"#f8fafc",color:item.hingesSide==="right"?"#4338ca":"#64748b"}}>
            ימין
          </button>
        </div>
      : null}
    </div>
  );
}

function DefectItemForm(props) {
  var item = props.item;
  var typeConfig = DEFECT_TYPES[item.defectType] || DEFECT_TYPES.other;
  var fileRef = useRef();
  var [lightbox, setLightbox] = useState(null);

  function set(k,v){ props.onChange(Object.assign({}, item, {[k]:v})); }

  function compressImg(dataUrl, callback) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 800;
      var scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = dataUrl;
  }

  function handlePhoto(e) {
    var file = (e.target.files||[])[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){ compressImg(ev.target.result, function(c){ set("photo", c); }); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  function handleSketch(e) {
    var file = (e.target.files||[])[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){ compressImg(ev.target.result, function(c){ set("sketch", c); }); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  var hingesList = item.hingesList || [];
  var hasSketch = (item.defectType==="panel"||item.defectType==="door_front"||item.defectType==="drawer_front"||item.defectType==="closure"||item.defectType==="socle");
  function addHinge() {
    set("hingesList", hingesList.concat([{ id:makeId("HNG"), position:"top", measurement:"" }]));
  }
  function updateHinge(i, field, value) {
    set("hingesList", hingesList.map(function(h,idx){ return idx===i ? Object.assign({},h,{[field]:value}) : h; }));
  }
  function removeHinge(i) {
    set("hingesList", hingesList.filter(function(_,idx){ return idx!==i; }));
  }

  return (
    <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:12,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <select value={item.defectType} onChange={function(e){
          var newType = e.target.value;
          var blank = { defectType:newType, height:"",width:"",depth:"",material:"",hingesList:[],freeDesc:"",qty:1,photo:item.photo,sketch:item.sketch };
          props.onChange(blank);
        }} style={Object.assign({},inpStyle,{flex:1,fontWeight:700,cursor:"pointer"})}>
          {Object.keys(DEFECT_TYPES).map(function(key){
            return <option key={key} value={key}>{DEFECT_TYPES[key].label}</option>;
          })}
        </select>
        <button onClick={props.onRemove} style={{marginRight:8,background:"#fef2f2",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:"8px 10px",borderRadius:8,fontWeight:700}}>הסר</button>
      </div>

      {hasSketch ?
        <ItemSketch
          item={item}
          set={set}
          showDepth={item.defectType==="closure"}
          hasHinges={item.defectType==="door_front"}
        />
      : null}

      {/* מגירה - טופס מיוחד */}
      {item.defectType === "drawer" ?
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>גובה מגירה</div>
              {["גבוהה","נמוכה","עץ"].map(function(v){ return <button key={v} onClick={function(){set("drawerHeight",v);}} style={{display:"block",width:"100%",marginBottom:4,padding:"7px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.drawerHeight===v?"2px solid #4338ca":"2px solid #e2e8f0",background:item.drawerHeight===v?"#eef2ff":"#f8fafc",color:item.drawerHeight===v?"#4338ca":"#64748b"}}>{v}</button>; })}
            </div>
            <div>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>צבע מגירה</div>
              {["לבן","גרפיט","סנדוויץ'"].map(function(v){ return <button key={v} onClick={function(){set("drawerColor",v);}} style={{display:"block",width:"100%",marginBottom:4,padding:"7px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.drawerColor===v?"2px solid #4338ca":"2px solid #e2e8f0",background:item.drawerColor===v?"#eef2ff":"#f8fafc",color:item.drawerColor===v?"#4338ca":"#64748b"}}>{v}</button>; })}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>חזית</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["פנימית פח","פנימית זכוכית","חיצונית","עץ"].map(function(v){ return <button key={v} onClick={function(){set("drawerFront",v);}} style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.drawerFront===v?"2px solid #4338ca":"2px solid #e2e8f0",background:item.drawerFront===v?"#eef2ff":"#f8fafc",color:item.drawerFront===v?"#4338ca":"#64748b"}}>{v}</button>; })}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>סוג מגירה</div>
            <input value={item.drawerType||""} onChange={function(e){set("drawerType",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px",fontSize:13})} placeholder="פרט סוג..." />
          </div>
          <div>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>דפנות</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["זכוכית","פח","גלריה"].map(function(v){ return <button key={v} onClick={function(){set("drawerSides",v);}} style={{padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.drawerSides===v?"2px solid #4338ca":"2px solid #e2e8f0",background:item.drawerSides===v?"#eef2ff":"#f8fafc",color:item.drawerSides===v?"#4338ca":"#64748b"}}>{v}</button>; })}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>עומק מגירה</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["25","27","30","35","40","45","50","55","60","70"].map(function(v){ return <button key={v} onClick={function(){set("drawerDepth",v);}} style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.drawerDepth===v?"2px solid #4338ca":"2px solid #e2e8f0",background:item.drawerDepth===v?"#eef2ff":"#f8fafc",color:item.drawerDepth===v?"#4338ca":"#64748b"}}>{v}</button>; })}
            </div>
            {item.drawerDepth ? <div style={{marginTop:4,fontSize:12,color:"#4338ca",fontWeight:700}}>{"נבחר: " + item.drawerDepth + " ס\"מ"}</div> : null}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>רוחב מגירה</div>
              <input type="number" value={item.drawerWidth||""} onChange={function(e){set("drawerWidth",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
            <div>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>גובה גב</div>
              <input type="number" value={item.drawerBackH||""} onChange={function(e){set("drawerBackH",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:4}}>רוחב חיצוני ארון</div>
              <input type="number" value={item.drawerCabinetW||""} onChange={function(e){set("drawerCabinetW",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
          </div>
        </div>
      : null}

      {/* ארון - טופס מיוחד */}
      {item.defectType === "cabinet" ?
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
            <svg width="200" height="200" style={{overflow:"visible"}}>
              <rect x="40" y="20" width="120" height="150" fill="#f8fafc" stroke="#334155" strokeWidth={2} rx={4} />
              <line x1="160" y1="20" x2="185" y2="0" stroke="#94a3b8" strokeWidth={1.5} />
              <line x1="40" y1="20" x2="65" y2="0" stroke="#94a3b8" strokeWidth={1.5} />
              <line x1="65" y1="0" x2="185" y2="0" stroke="#94a3b8" strokeWidth={1.5} />
              {item.cabinetDepth ? <text x="125" y="12" textAnchor="middle" fontSize={11} fill="#6366f1" fontWeight="700">{item.cabinetDepth + " ס\"מ"}</text> : <text x="125" y="12" textAnchor="middle" fontSize={10} fill="#94a3b8">עומק</text>}
              {item.cabinetH ? <text x="175" y="100" textAnchor="start" fontSize={11} fill="#059669" fontWeight="700">{item.cabinetH}</text> : null}
              {item.cabinetW ? <text x="100" y="185" textAnchor="middle" fontSize={11} fill="#4338ca" fontWeight="700">{item.cabinetW}</text> : null}
            </svg>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:3}}>גובה</div>
              <input type="number" value={item.cabinetH||""} onChange={function(e){set("cabinetH",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
            <div>
              <div style={{fontSize:10,color:"#4338ca",fontWeight:700,marginBottom:3}}>רוחב</div>
              <input type="number" value={item.cabinetW||""} onChange={function(e){set("cabinetW",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
            <div>
              <div style={{fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:3}}>עומק</div>
              <input type="number" value={item.cabinetDepth||""} onChange={function(e){set("cabinetDepth",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
            <div>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3}}>גובה רגל</div>
              <input type="number" value={item.cabinetLeg||""} onChange={function(e){set("cabinetLeg",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
          </div>
        </div>
      : null}

      {/* מדף - טופס מיוחד */}
      {item.defectType === "shelf" ?
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#4338ca",fontWeight:700,marginBottom:3}}>רוחב</div>
              <input type="number" value={item.shelfW||""} onChange={function(e){set("shelfW",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
            <div style={{paddingTop:16}}>
              <button onClick={function(){set("shelfKantW",!item.shelfKantW);}} style={{padding:"7px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.shelfKantW?"2px solid #4338ca":"2px solid #e2e8f0",background:item.shelfKantW?"#eef2ff":"#fff",color:item.shelfKantW?"#4338ca":"#64748b",whiteSpace:"nowrap"}}>
                {item.shelfKantW ? "✓ קנט" : "בלי קנט"}
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:3}}>עומק</div>
              <input type="number" value={item.shelfDepth||""} onChange={function(e){set("shelfDepth",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px",textAlign:"center"})} placeholder="ס״מ" />
            </div>
            <div style={{paddingTop:16}}>
              <button onClick={function(){set("shelfKantD",!item.shelfKantD);}} style={{padding:"7px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.shelfKantD?"2px solid #6366f1":"2px solid #e2e8f0",background:item.shelfKantD?"#eef2ff":"#fff",color:item.shelfKantD?"#6366f1":"#64748b",whiteSpace:"nowrap"}}>
                {item.shelfKantD ? "✓ קנט" : "בלי קנט"}
              </button>
            </div>
          </div>
        </div>
      : null}

      {/* בונדרגל לדופן */}
      {item.defectType === "panel" ?
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#475569"}}>בונדרגל</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){set("bondergel","עם");}} style={{padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.bondergel==="עם"?"2px solid #4338ca":"2px solid #e2e8f0",background:item.bondergel==="עם"?"#eef2ff":"#fff",color:item.bondergel==="עם"?"#4338ca":"#64748b"}}>עם</button>
            <button onClick={function(){set("bondergel","בלי");}} style={{padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,border:item.bondergel==="בלי"?"2px solid #94a3b8":"2px solid #e2e8f0",background:item.bondergel==="בלי"?"#f1f5f9":"#fff",color:item.bondergel==="בלי"?"#475569":"#64748b"}}>בלי</button>
          </div>
        </div>
      : null}

      <div style={{display:"grid",gridTemplateColumns: typeConfig.fields.length>2 ? "1fr 1fr" : "1fr",gap:8,marginBottom:10}}>
        {typeConfig.fields.filter(function(f){
          if (hasSketch && (f==="height"||f==="width"||f==="depth")) return false;
          if (f==="bondergel"||f==="drawerSpecial"||f==="cabinetSpecial"||f==="shelfSpecial") return false;
          return true;
        }).map(function(f){
          if (f === "freeDesc") {
            return (
              <div key={f} style={{gridColumn:"1 / -1"}}>
                <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3}}>{DEFECT_FIELD_LABELS[f]}</div>
                <input value={item[f]||""} onChange={function(e){set(f,e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px",fontSize:13})} placeholder="תיאור הפריט" />
              </div>
            );
          }
          if (f === "qty") {
            return (
              <div key={f}>
                <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3}}>{DEFECT_FIELD_LABELS[f]}</div>
                <input type="number" min="1" value={item[f]||1} onChange={function(e){set(f,e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px",fontSize:13,textAlign:"center"})} />
              </div>
            );
          }
          if (f === "material") {
            return (
              <div key={f} style={{gridColumn:typeConfig.fields.length>2 && typeConfig.fields.indexOf(f)===typeConfig.fields.length-1 ? "1 / -1" : "auto"}}>
                <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3}}>{DEFECT_FIELD_LABELS[f]}</div>
                <input value={item[f]||""} onChange={function(e){set(f,e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px",fontSize:13})} placeholder="לדוגמה: MDF לבן" />
              </div>
            );
          }
          if (f === "hinges") {
            return (
              <div key={f} style={{gridColumn:"1 / -1"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700}}>צירים</div>
                  <button onClick={addHinge} style={{padding:"3px 10px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:11}}>+ הוסף ציר</button>
                </div>
                {hingesList.length === 0 ?
                  <div style={{fontSize:11,color:"#cbd5e1",textAlign:"center",padding:"6px 0"}}>אין צירים מוגדרים</div>
                :
                  hingesList.map(function(h,i){
                    return (
                      <div key={h.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:8,marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span style={{fontSize:12,color:"#475569",fontWeight:700,minWidth:40}}>{"ציר " + (i+1)}</span>
                          <button onClick={function(){updateHinge(i,"position","top");}}
                            style={{flex:1,padding:"6px 8px",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12,border:h.position==="top"?"2px solid #3b82f6":"2px solid #e2e8f0",background:h.position==="top"?"#eff6ff":"#fff",color:h.position==="top"?"#1d4ed8":"#64748b"}}>
                            מלמעלה
                          </button>
                          <button onClick={function(){updateHinge(i,"position","bottom");}}
                            style={{flex:1,padding:"6px 8px",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12,border:h.position==="bottom"?"2px solid #3b82f6":"2px solid #e2e8f0",background:h.position==="bottom"?"#eff6ff":"#fff",color:h.position==="bottom"?"#1d4ed8":"#64748b"}}>
                            מלמטה
                          </button>
                          <button onClick={function(){removeHinge(i);}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16,padding:"0 4px"}}>x</button>
                        </div>
                        <input type="number" min="0" value={h.measurement||""} onChange={function(e){updateHinge(i,"measurement",e.target.value);}}
                          style={Object.assign({},inpStyle,{padding:"6px 10px",fontSize:12})} placeholder={"מרחק מ" + (h.position==="top"?"מעלה":"מטה") + " (ס\"מ)"} />
                      </div>
                    );
                  })
                }
              </div>
            );
          }
          return (
            <div key={f}>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3}}>{DEFECT_FIELD_LABELS[f]}</div>
              <input type="number" min="0" value={item[f]||""} onChange={function(e){set(f,e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px",fontSize:13,textAlign:"center"})} />
            </div>
          );
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto} />
          <button onClick={function(){fileRef.current.click();}} style={{width:"100%",padding:8,background:"#eff6ff",border:"1.5px dashed #93c5fd",borderRadius:8,cursor:"pointer",color:"#1d4ed8",fontWeight:700,fontSize:12}}>
            {item.photo ? "📷 תמונה הוספה ✓" : "📷 צלם פריט"}
          </button>
        </div>
        <div>
          <input id={"sketch-"+item.id} type="file" accept="image/*" style={{display:"none"}} onChange={handleSketch} />
          <button onClick={function(){document.getElementById("sketch-"+item.id).click();}} style={{width:"100%",padding:8,background:"#f5f3ff",border:"1.5px dashed #c4b5fd",borderRadius:8,cursor:"pointer",color:"#6d28d9",fontWeight:700,fontSize:12}}>
            {item.sketch ? "✏️ שרטוט הוסף ✓" : "✏️ הוסף שרטוט"}
          </button>
        </div>
      </div>
      {(item.photo || item.sketch) ?
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {item.photo ?
            <div style={{position:"relative",display:"inline-block"}}>
              <img src={item.photo} onClick={function(){setLightbox(item.photo);}} style={{width:80,height:80,objectFit:"cover",borderRadius:8,cursor:"pointer"}} />
              <button onClick={function(){set("photo",null);}} style={{position:"absolute",top:-6,left:-6,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,fontWeight:700}}>x</button>
            </div>
          : null}
          {item.sketch ?
            <div style={{position:"relative",display:"inline-block"}}>
              <img src={item.sketch} onClick={function(){setLightbox(item.sketch);}} style={{width:80,height:80,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"1px dashed #c4b5fd"}} />
              <button onClick={function(){set("sketch",null);}} style={{position:"absolute",top:-6,left:-6,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",fontSize:11,fontWeight:700}}>x</button>
            </div>
          : null}
        </div>
      : null}
      <ImageLightbox src={lightbox} onClose={function(){setLightbox(null);}} />
    </div>
  );
}

function DefectsList(props) {
  var items = props.items || [];
  function addItem() {
    props.onChange(items.concat([{ id:makeId("DEF"), defectType:"door_front", height:"",width:"",depth:"",material:"",hingesList:[],freeDesc:"",qty:1,photo:null,sketch:null }]));
  }
  function updateItem(i, newItem) {
    props.onChange(items.map(function(it,idx){ return idx===i ? newItem : it; }));
  }
  function removeItem(i) {
    props.onChange(items.filter(function(_,idx){ return idx!==i; }));
  }
  return (
    <div>
      {items.map(function(item,i){
        return <DefectItemForm key={item.id} item={item} onChange={function(ni){updateItem(i,ni);}} onRemove={function(){removeItem(i);}} />;
      })}
      <button onClick={addItem} style={{width:"100%",padding:10,background:"#fff7ed",border:"2px dashed #fdba74",borderRadius:10,cursor:"pointer",color:"#c2410c",fontWeight:700,fontSize:13}}>+ הוסף פריט לרשימת חוסרים</button>
    </div>
  );
}

var REPORT_TYPES = {
  continuation: { label:"המשך עבודה", color:"#3b82f6" },
  completion:   { label:"דוח סיום",   color:"#059669" }
};

function InstallationReportForm(props) {
  var order = props.order;
  var [form, setForm] = useState({
    id: makeId("RPT"),
    orderId: order.id,
    type: "continuation",
    description: "",
    issues: "",
    defects: [],
    photos: [],
    signature: null,
    signerName: "",
    installerName: props.currentUserName || "",
    created: toISO(new Date()),
    createdTime: new Date().toISOString()
  });
  var [errors, setErrors] = useState({});
  var [showSignatureModal, setShowSignatureModal] = useState(false);
  var fileRef = useRef();

  function set(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }

  function compressImage(dataUrl, callback) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 800;
      var scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = dataUrl;
  }

  function handlePhotoUpload(e) {
    var files = Array.from(e.target.files || []);
    files.forEach(function(file){
      var reader = new FileReader();
      reader.onload = function(ev){
        compressImage(ev.target.result, function(compressed){
          set("photos", (form.photos||[]).concat([compressed]));
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }
  function removePhoto(i) {
    set("photos", form.photos.filter(function(_,idx){ return idx!==i; }));
  }

  function validate() {
    var e = {};
    if (!form.description.trim()) e.description = "חובה";
    if (!form.signature) e.signature = "נדרשת חתימת לקוח";
    if (!form.signerName.trim()) e.signerName = "חובה";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div style={{padding:28}}>
      <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:800,color:"#0f172a"}}>דוח התקנה / סיום עבודה</h2>
      <p style={{margin:"0 0 20px",fontSize:13,color:"#64748b"}}>{order.id + " · " + order.client}</p>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>סוג הדוח</label>
        <div style={{display:"flex",gap:8}}>
          {Object.keys(REPORT_TYPES).map(function(key){
            var t = REPORT_TYPES[key];
            return (
              <button key={key} onClick={function(){set("type",key);}}
                style={{flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,border:form.type===key?"2px solid "+t.color:"2px solid #e2e8f0",background:form.type===key?t.color+"15":"#f8fafc",color:form.type===key?t.color:"#64748b"}}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>תיאור העבודה שבוצעה *</label>
        <textarea value={form.description} onChange={function(e){set("description",e.target.value);}} rows={4} style={Object.assign({},inpStyle,{resize:"vertical",border:"1.5px solid "+(errors.description?"#ef4444":"#e2e8f0")})} placeholder="תיאור מפורט של העבודה..." />
        {errors.description ? <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.description}</div> : null}
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הערות / בעיות שהתגלו</label>
        <textarea value={form.issues} onChange={function(e){set("issues",e.target.value);}} rows={3} style={Object.assign({},inpStyle,{resize:"vertical"})} placeholder="אם אין, ניתן להשאיר ריק..." />
      </div>

      {form.type === "continuation" ?
        <div style={{marginBottom:18}}>
          <label style={{fontSize:13,fontWeight:800,color:"#0f172a",display:"block",marginBottom:8}}>מה נשאר להשלים / חוסרים</label>
          <DefectsList items={form.defects} onChange={function(items){set("defects",items);}} />
        </div>
      : null}

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>תמונות העבודה</label>
        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{display:"none"}} onChange={handlePhotoUpload} />
        <button onClick={function(){fileRef.current.click();}} style={{width:"100%",padding:14,background:"#eff6ff",border:"2px dashed #93c5fd",borderRadius:10,cursor:"pointer",color:"#1d4ed8",fontWeight:700,fontSize:14}}>📷 צלם / העלה תמונות</button>
        {(form.photos||[]).length > 0 ?
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>
            {form.photos.map(function(p,i){
              return (
                <div key={i} style={{position:"relative",borderRadius:8,overflow:"hidden",aspectRatio:"1"}}>
                  <img src={p} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                  <button onClick={function(){removePhoto(i);}} style={{position:"absolute",top:4,left:4,background:"rgba(239,68,68,0.9)",color:"#fff",border:"none",borderRadius:6,width:22,height:22,cursor:"pointer",fontSize:13,fontWeight:700}}>x</button>
                </div>
              );
            })}
          </div>
        : null}
      </div>

      <div style={{marginBottom:18,paddingTop:14,borderTop:"2px solid #f1f5f9"}}>
        <label style={{fontSize:13,fontWeight:800,color:"#0f172a",display:"block",marginBottom:5}}>שם החותם *</label>
        <input value={form.signerName} onChange={function(e){set("signerName",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.signerName?"#ef4444":"#e2e8f0")})} placeholder="שם הלקוח החותם" />
        {errors.signerName ? <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.signerName}</div> : null}
      </div>

      <div style={{marginBottom:24}}>
        <label style={{fontSize:13,fontWeight:800,color:"#0f172a",display:"block",marginBottom:8}}>חתימת לקוח *</label>
        {form.signature ?
          <div style={{border:"1px solid #bbf7d0",background:"#f0fdf4",borderRadius:10,padding:12}}>
            <img src={form.signature} style={{maxWidth:240,display:"block",margin:"0 auto 10px"}} />
            <button onClick={function(){setShowSignatureModal(true);}} style={{width:"100%",padding:10,background:"#fff",border:"1.5px solid #cbd5e1",borderRadius:8,cursor:"pointer",color:"#475569",fontWeight:700,fontSize:13}}>חתום מחדש</button>
          </div>
        :
          <button onClick={function(){setShowSignatureModal(true);}} style={{width:"100%",padding:18,background:"#fff7ed",border:"2px dashed #fdba74",borderRadius:10,cursor:"pointer",color:"#c2410c",fontWeight:800,fontSize:15}}>✍️ לחץ כאן לחתימת הלקוח</button>
        }
        {errors.signature ? <div style={{fontSize:11,color:"#ef4444",marginTop:6}}>{errors.signature}</div> : null}
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={props.onCancel} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
        <button onClick={function(){if(validate()) props.onSave(form);}} style={{padding:"11px 28px",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור דוח עם חתימה</button>
      </div>

      {showSignatureModal ?
        <SignatureModal
          onSave={function(dataUrl){ set("signature",dataUrl); setShowSignatureModal(false); }}
          onCancel={function(){setShowSignatureModal(false);}}
        />
      : null}
    </div>
  );
}

function ReportViewer(props) {
  var r = props.report;
  var t = REPORT_TYPES[r.type] || REPORT_TYPES.continuation;
  var defects = r.defects || [];
  var [lightbox, setLightbox] = useState(null);
  return (
    <Modal onClose={props.onClose} wide={true}>
      <div style={{padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <span style={{background:t.color+"15",color:t.color,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{t.label}</span>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:6}}>{fmtDate(r.created) + " · " + (r.installerName || "")}</div>
          </div>
          <button onClick={props.onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:"#64748b"}}>x</button>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>תיאור העבודה</div>
          <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",fontSize:14,color:"#0f172a",whiteSpace:"pre-wrap"}}>{r.description}</div>
        </div>

        {r.issues ?
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>הערות / בעיות</div>
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#92400e",whiteSpace:"pre-wrap"}}>{r.issues}</div>
          </div>
        : null}

        {defects.length > 0 ?
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>{"מה נשאר להשלים (" + defects.length + ")"}</div>
            {defects.map(function(d,i){
              var dt = DEFECT_TYPES[d.defectType] || DEFECT_TYPES.other;
              var hingesList = d.hingesList || [];
              return (
                <div key={d.id||i} style={{background:"#fff7ed",border:"1px solid #fdba74",borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#c2410c",marginBottom:4}}>{dt.label}</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:"#7c2d12"}}>
                    {d.height ? <span>{"גובה: " + d.height}</span> : null}
                    {d.width ? <span>{"רוחב: " + d.width}</span> : null}
                    {d.depth ? <span>{"עומק: " + d.depth}</span> : null}
                    {d.material ? <span>{"חומר: " + d.material}</span> : null}
                    {d.freeDesc ? <span>{d.freeDesc}</span> : null}
                    {d.qty ? <span>{"כמות: " + d.qty}</span> : null}
                  </div>
                  {hingesList.length > 0 ?
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
                      {hingesList.map(function(h,hi){
                        return <span key={h.id||hi} style={{fontSize:11,background:"#fff",border:"1px solid #fdba74",borderRadius:20,padding:"2px 10px",color:"#c2410c",fontWeight:700}}>{"ציר " + (hi+1) + ": " + (h.position==="top"?"מלמעלה":"מלמטה") + (h.measurement ? " (" + h.measurement + " ס\"מ)" : "")}</span>;
                      })}
                    </div>
                  : null}
                  {(d.photo || d.sketch) ?
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      {d.photo ? <img src={d.photo} onClick={function(){setLightbox(d.photo);}} style={{width:60,height:60,objectFit:"cover",borderRadius:6,cursor:"pointer"}} /> : null}
                      {d.sketch ? <img src={d.sketch} onClick={function(){setLightbox(d.sketch);}} style={{width:60,height:60,objectFit:"cover",borderRadius:6,border:"1px dashed #c4b5fd",cursor:"pointer"}} /> : null}
                    </div>
                  : null}
                </div>
              );
            })}
          </div>
        : null}

        {(r.photos||[]).length > 0 ?
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>{"תמונות (" + r.photos.length + ")"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {r.photos.map(function(p,i){
                return <img key={i} src={p} onClick={function(){setLightbox(p);}} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,cursor:"pointer"}} />;
              })}
            </div>
          </div>
        : null}

        <div style={{marginTop:20,paddingTop:16,borderTop:"2px solid #f1f5f9"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:8}}>{"חתימת " + (r.signerName||"לקוח")}</div>
          {r.signature ?
            <div style={{border:"1px solid #e2e8f0",borderRadius:10,padding:10,background:"#fff",display:"inline-block"}}>
              <img src={r.signature} style={{maxWidth:280,display:"block"}} />
            </div>
          : null}
        </div>
      </div>
      <ImageLightbox src={lightbox} onClose={function(){setLightbox(null);}} />
    </Modal>
  );
}

function OrderCard(props) {
  var order = props.order;
  var s = getStatus(order.status);
  var idx = STATUSES.findIndex(function(x){ return x.id===order.status; });
  var pct = Math.round((idx+1)/STATUSES.length*100);
  var isUrgent = order.urgent === true;
  var isCompleted = order.status === "completed";

  // Check if stuck more than 7 days in same status
  var isStuck = false;
  if (!isCompleted && order.statusUpdatedAt) {
    var daysDiff = Math.floor((new Date() - new Date(order.statusUpdatedAt)) / (1000*60*60*24));
    if (daysDiff >= 7) isStuck = true;
  }

  var borderColor = isUrgent ? "#ef4444" : isStuck ? "#f97316" : "#e2e8f0";
  var cardBg = isUrgent ? "#fff5f5" : isStuck ? "#fff7ed" : "#fff";

  return (
    <div onClick={function(){props.onClick(order);}}
      style={{background:cardBg,borderRadius:14,padding:"18px 20px",boxShadow:"0 2px 12px rgba(30,41,59,0.07)",cursor:"pointer",border:"2px solid "+borderColor,direction:"rtl"}}
      onMouseEnter={function(e){e.currentTarget.style.boxShadow="0 6px 24px rgba(30,41,59,0.13)";}}
      onMouseLeave={function(e){e.currentTarget.style.boxShadow="0 2px 12px rgba(30,41,59,0.07)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{order.id}</div>
            {isUrgent ? <span style={{background:"#ef4444",color:"#fff",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:800}}>🔴 דחוף</span> : null}
            {isStuck && !isUrgent ? <span style={{background:"#f97316",color:"#fff",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:800}}>⏰ תקוע</span> : null}
          </div>
          <div style={{fontSize:17,fontWeight:800,color:"#0f172a"}}>{order.client}</div>
        </div>
        <StatusBadge statusId={order.status} small={true} />
      </div>
      <div style={{fontSize:13,color:"#64748b",marginBottom:4}}>{"📍 " + order.address}</div>
      <div style={{fontSize:13,color:"#64748b",marginBottom:12}}>{"📞 " + order.phone}</div>
      <div style={{background:"#f1f5f9",borderRadius:99,height:5,overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,"+s.color+"88,"+s.color+")",borderRadius:99}} />
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#94a3b8"}}>
        <span>{pct}% הושלם</span>
        <span>{(order.files||[]).length + " קבצים · " + (order.installationReports||[]).length + " דוחות"}</span>
      </div>
    </div>
  );
}

function OrderForm(props) {
  var initial = props.initial;
  var [form, setForm] = useState(initial || {id:makeId("ORD"),client:"",address:"",phone:"",status:"plans",files:[],reports:[],materials:[],assignedInstallers:[],hasPaint:null,missingItems:[],notes:"",created:toISO(new Date())});
  var [errors, setErrors] = useState({});
  var fileRef = useRef();
  var repRef = useRef();
  var installersList = (props.users||[]).filter(function(u){ return u.role==="installer" && u.active; });

  function set(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }

  function upload(e,k) {
    var files = Array.from(e.target.files);
    files.forEach(function(file){
      var reader = new FileReader();
      reader.onload = function(ev){
        var fileObj = { name:file.name, type:file.type, data:ev.target.result };
        set(k, form[k].concat([fileObj]));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  var assignedInstallers = form.assignedInstallers || [];
  function addInstaller(userId) {
    if (assignedInstallers.some(function(a){ return a.userId===userId; })) return;
    set("assignedInstallers", assignedInstallers.concat([{ userId:userId, note:"" }]));
  }
  function removeInstaller(userId) {
    set("assignedInstallers", assignedInstallers.filter(function(a){ return a.userId!==userId; }));
  }
  function setInstallerNote(userId, note) {
    set("assignedInstallers", assignedInstallers.map(function(a){ return a.userId===userId ? Object.assign({},a,{note:note}) : a; }));
  }

  var materials = form.materials || [];
  var priceCatalog = props.priceCatalog || {};
  var knownCompanies = [];
  var catalogNames = [];
  Object.keys(priceCatalog).forEach(function(k){
    var entry = priceCatalog[k];
    var c = entry && typeof entry === "object" ? entry.company : "";
    var n = entry && typeof entry === "object" ? entry.name : k;
    if (c && knownCompanies.indexOf(c) < 0) knownCompanies.push(c);
    if (n && catalogNames.indexOf(n) < 0) catalogNames.push(n);
  });
  knownCompanies.sort();
  catalogNames.sort();

  function catalogKey(name) {
    return (name||"").trim().toLowerCase();
  }

  function setMaterial(i,k,v) {
    var next = materials.map(function(m,idx){ return idx===i ? Object.assign({},m,{[k]:v}) : m; });

    if (k === "name") {
      var item = next[i];
      var key = catalogKey(item.name);
      var known = priceCatalog[key];

      if (known !== undefined) {
        var knownPrice = typeof known === "object" ? known.price : known;
        var knownCompany = typeof known === "object" ? known.company : "";
        if (!item.price || Number(item.price) === 0) {
          next[i] = Object.assign({}, next[i], { price: knownPrice });
        }
        if (!item.company && knownCompany) {
          next[i] = Object.assign({}, next[i], { company: knownCompany });
        }
      }
    }

    set("materials", next);
  }

  function syncMaterialToCatalog(i) {
    var item = materials[i];
    if (!item) return;
    var key = catalogKey(item.name);
    if (key && item.name && Number(item.price) > 0) {
      props.onPriceUpdate(key, { name:item.name, company:item.company||"", price:Number(item.price) });
    }
  }

  function addMaterial() {
    set("materials", materials.concat([{name:"",company:"",price:0,qty:1}]));
  }
  function removeMaterial(i) {
    set("materials", materials.filter(function(_,idx){ return idx!==i; }));
  }
  var materialsTotal = materials.reduce(function(sum,m){ return sum + (Number(m.price)||0) * (Number(m.qty)||0); }, 0);

  function validate() {
    var e = {};
    if (!form.client.trim()) e.client = "חובה";
    if (!form.address.trim()) e.address = "חובה";
    if (!form.phone.trim()) e.phone = "חובה";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div style={{padding:28}}>
      <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>{initial ? "עריכת הזמנה" : "הזמנה חדשה"}</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>מספר הזמנה</label>
          <input value={form.id} onChange={function(e){set("id",e.target.value);}} style={inpStyle} />
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם לקוח *</label>
          <input value={form.client} onChange={function(e){set("client",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.client?"#ef4444":"#e2e8f0")})} placeholder="ישראל ישראלי" />
          {errors.client && <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.client}</div>}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>כתובת *</label>
        <input value={form.address} onChange={function(e){set("address",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.address?"#ef4444":"#e2e8f0")})} placeholder="רחוב, מספר, עיר" />
        {errors.address && <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.address}</div>}
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>טלפון *</label>
        <input value={form.phone} onChange={function(e){set("phone",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.phone?"#ef4444":"#e2e8f0")})} placeholder="05X-XXXXXXX" />
        {errors.phone && <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.phone}</div>}
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>סטטוס</label>
        <select value={form.status} onChange={function(e){set("status",e.target.value);}} style={Object.assign({},inpStyle,{cursor:"pointer"})}>
          {STATUSES.map(function(s){ return <option key={s.id} value={s.id}>{s.label}</option>; })}
        </select>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>קבצים / תכניות</label>
        <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={function(e){upload(e,"files");}} />
        <button onClick={function(){fileRef.current.click();}} style={{width:"100%",padding:10,background:"#eff6ff",border:"2px dashed #93c5fd",borderRadius:8,cursor:"pointer",color:"#1d4ed8",fontWeight:700,fontSize:13}}>העלאת קבצים</button>
        {form.files.map(function(f,i){
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginTop:6,padding:"6px 10px",background:"#eff6ff",borderRadius:7,fontSize:13}}>
              <span style={{flex:1}}>{"📎 " + f}</span>
              <button onClick={function(){set("files",form.files.filter(function(_,j){return j!==i;}));}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16}}>x</button>
            </div>
          );
        })}
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>דוחות התקנה</label>
        <input ref={repRef} type="file" multiple style={{display:"none"}} onChange={function(e){upload(e,"reports");}} />
        <button onClick={function(){repRef.current.click();}} style={{width:"100%",padding:10,background:"#f0fdf4",border:"2px dashed #86efac",borderRadius:8,cursor:"pointer",color:"#166534",fontWeight:700,fontSize:13}}>העלאת דוחות</button>
        {form.reports.map(function(r,i){
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginTop:6,padding:"6px 10px",background:"#f0fdf4",borderRadius:7,fontSize:13}}>
              <span style={{flex:1}}>{"📋 " + r}</span>
              <button onClick={function(){set("reports",form.reports.filter(function(_,j){return j!==i;}));}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16}}>x</button>
            </div>
          );
        })}
      </div>
      <div style={{marginBottom:14}}>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>פלטות ופרזול</label>
        </div>
        {materials.map(function(m,i){
          var lineTotal = (Number(m.price)||0) * (Number(m.qty)||0);
          return (
            <div key={i} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:10,marginBottom:8}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <AutocompleteInput
                  value={m.name}
                  suggestions={catalogNames}
                  placeholder="שם הפריט"
                  onChange={function(v){setMaterial(i,"name",v);}}
                  onSelect={function(v){setMaterial(i,"name",v);}}
                  onBlur={function(){syncMaterialToCatalog(i);}}
                />
                <button onClick={function(){removeMaterial(i);}} style={{background:"#fef2f2",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:"8px 10px",borderRadius:8,fontWeight:700,flexShrink:0}}>הסר</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 60px 80px",gap:6}}>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3,textAlign:"center"}}>חברה</div>
                  <input value={m.company} onChange={function(e){setMaterial(i,"company",e.target.value);}} onBlur={function(){syncMaterialToCatalog(i);}} style={Object.assign({},inpStyle,{padding:"7px 6px",textAlign:"center",fontSize:13})} list="order-companies-list" />
                  <datalist id="order-companies-list">
                    {knownCompanies.map(function(c){ return <option key={c} value={c} />; })}
                  </datalist>
                </div>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3,textAlign:"center"}}>מחיר</div>
                  <input type="number" min="0" value={m.price} onChange={function(e){setMaterial(i,"price",e.target.value);}} onBlur={function(){syncMaterialToCatalog(i);}} style={Object.assign({},inpStyle,{padding:"7px 4px",textAlign:"center",fontSize:13})} />
                </div>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3,textAlign:"center"}}>כמות</div>
                  <input type="number" min="0" value={m.qty} onChange={function(e){setMaterial(i,"qty",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 4px",textAlign:"center",fontSize:13})} />
                </div>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3,textAlign:"center"}}>{"סה\"כ"}</div>
                  <div style={{textAlign:"center",fontWeight:800,fontSize:14,color:"#0f172a",padding:"7px 4px"}}>{lineTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
        {materials.length > 0 ?
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginTop:8,border:"1px solid #e2e8f0"}}>
            <span style={{fontSize:13,fontWeight:700,color:"#475569"}}>{"סה\"כ חומרים:"}</span>
            <span style={{fontSize:15,fontWeight:900,color:"#0f172a"}}>{"\u20aa" + materialsTotal.toLocaleString()}</span>
          </div>
        : null}
        <button onClick={addMaterial} style={{width:"100%",marginTop:8,padding:"10px",background:"#eff6ff",color:"#1d4ed8",border:"1.5px dashed #93c5fd",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>+ הוסף שורה</button>
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>מתקינים משויכים</label>
        {installersList.length === 0 ?
          <div style={{fontSize:12,color:"#94a3b8",background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>אין מתקינים פעילים במערכת</div>
        :
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {installersList.filter(function(u){ return !assignedInstallers.some(function(a){return a.userId===u.id;}); }).map(function(u){
              return (
                <button key={u.id} onClick={function(){addInstaller(u.id);}} style={{padding:"7px 14px",background:"#eff6ff",color:"#1d4ed8",border:"1.5px dashed #93c5fd",borderRadius:20,cursor:"pointer",fontWeight:700,fontSize:13}}>
                  {"+ " + u.name}
                </button>
              );
            })}
          </div>
        }
        {assignedInstallers.map(function(a){
          var u = installersList.find(function(x){ return x.id===a.userId; }) || {name:"?"};
          return (
            <div key={a.userId} style={{background:"#fff7ed",border:"1px solid #fdba74",borderRadius:10,padding:10,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontWeight:800,fontSize:14,color:"#c2410c"}}>{u.name}</span>
                <button onClick={function(){removeInstaller(a.userId);}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:700}}>הסר</button>
              </div>
              <input value={a.note} onChange={function(e){setInstallerNote(a.userId,e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px",fontSize:13})} placeholder="הערה (אופציונלי)" />
            </div>
          );
        })}
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>צבע</label>
        <div style={{display:"flex",gap:8}}>
          <button onClick={function(){set("hasPaint",true);}}
            style={{flex:1,padding:"10px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,border:form.hasPaint===true?"2px solid #8b5cf6":"2px solid #e2e8f0",background:form.hasPaint===true?"#f5f3ff":"#f8fafc",color:form.hasPaint===true?"#6d28d9":"#64748b"}}>
            🎨 יש צבע
          </button>
          <button onClick={function(){set("hasPaint",false);}}
            style={{flex:1,padding:"10px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,border:form.hasPaint===false?"2px solid #94a3b8":"2px solid #e2e8f0",background:form.hasPaint===false?"#f1f5f9":"#f8fafc",color:form.hasPaint===false?"#475569":"#64748b"}}>
            ✖ אין צבע
          </button>
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>רשימת חוסרים</label>
          <button onClick={function(){set("missingItems",(form.missingItems||[]).concat([{id:makeId("MIS"),text:""}]));}} style={{padding:"5px 12px",background:"#fff7ed",color:"#c2410c",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>+ הוסף</button>
        </div>
        {(form.missingItems||[]).map(function(item,i){
          return (
            <div key={item.id} style={{display:"flex",gap:8,marginBottom:6}}>
              <input value={item.text} onChange={function(e){
                var next=(form.missingItems||[]).map(function(x,idx){return idx===i?Object.assign({},x,{text:e.target.value}):x;});
                set("missingItems",next);
              }} style={Object.assign({},inpStyle,{flex:1,padding:"8px 12px"})} placeholder={"חוסר " + (i+1)} />
              <button onClick={function(){set("missingItems",(form.missingItems||[]).filter(function(_,idx){return idx!==i;}));}} style={{background:"#fef2f2",border:"none",color:"#ef4444",cursor:"pointer",borderRadius:8,padding:"8px 10px",fontWeight:700}}>הסר</button>
            </div>
          );
        })}
        {!(form.missingItems||[]).length ?
          <div style={{fontSize:12,color:"#cbd5e1",textAlign:"center",padding:"8px 0"}}>אין חוסרים</div>
        : null}
      </div>

      <div style={{marginBottom:24}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הערות</label>
        <textarea value={form.notes} onChange={function(e){set("notes",e.target.value);}} rows={2} style={Object.assign({},inpStyle,{resize:"vertical"})} placeholder="הערות נוספות..." />
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={props.onCancel} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
        <button onClick={function(){
          if(validate()){
            materials.forEach(function(m){
              var key = catalogKey(m.name);
              if (key && m.name && Number(m.price) > 0) props.onPriceUpdate(key, { name:m.name, company:m.company, price:Number(m.price) });
            });
            props.onSave(form);
          }
        }} style={{padding:"11px 28px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור הזמנה</button>
      </div>
    </div>
  );
}

function OrderDetail(props) {
  var order = props.order;
  var s = getStatus(order.status);
  var idx = STATUSES.findIndex(function(x){ return x.id===order.status; });
  var pct = Math.round((idx+1)/STATUSES.length*100);
  var [confirmDelete, setConfirmDelete] = useState(false);
  var [viewingFile, setViewingFile] = useState(null);
  var canAddReport = props.canAddReport;
  var installReports = order.installationReports || [];
  return (
    <Modal onClose={props.onClose}>
      <div style={{padding:"28px 28px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:700}}>{order.id}</div>
            <h2 style={{margin:"4px 0 6px",fontSize:22,fontWeight:900,color:"#0f172a"}}>{order.client}</h2>
            <StatusBadge statusId={order.status} />
          </div>
          <button onClick={props.onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:"#64748b"}}>x</button>
        </div>
        <div style={{marginTop:16,overflowX:"auto",paddingBottom:4}}>
          <div style={{display:"flex",minWidth:480}}>
            {STATUSES.map(function(st,i){
              var done = i <= idx;
              var cur = i === idx;
              return (
                <button key={st.id} onClick={function(){props.onStatusChange(order.id, st.id);}}
                  style={{flex:1,padding:"8px 4px",border:"none",cursor:"pointer",background:cur?s.bg:done?"#f8fafc":"#f1f5f9",borderBottom:"3px solid "+(cur?s.color:done?s.color+"55":"#e2e8f0"),fontSize:10,fontWeight:cur?800:600,color:cur?s.color:done?"#64748b":"#94a3b8"}}>
                  {done && !cur ? "v " : ""}{st.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"12px 0"}}>
          <div style={{flex:1,background:"#f1f5f9",borderRadius:99,height:8}}>
            <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,"+s.color+"88,"+s.color+")",borderRadius:99}} />
          </div>
          <span style={{fontSize:13,fontWeight:700,color:s.color}}>{pct}%</span>
        </div>
      </div>
      <div style={{padding:"0 28px 28px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:8,margin:"12px 0"}}>
          <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:6}}>טלפון</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{order.phone}</span>
              <div style={{display:"flex",gap:6}}>
                <a href={"https://wa.me/972" + (order.phone||"").replace(/^0/,"").replace(/[-\s]/g,"")} target="_blank" rel="noopener noreferrer"
                  style={{textDecoration:"none"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                <a href={"tel:" + order.phone}
                  style={{textDecoration:"none"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></a>
              </div>
            </div>
          </div>
          {order.address ?
            <a href={"https://waze.com/ul?q=" + encodeURIComponent(order.address) + "&navigate=yes"} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:10,padding:"10px 14px",textDecoration:"none"}}>
              <div>
                <div style={{fontSize:11,color:"#0369a1",fontWeight:700,marginBottom:3}}>כתובת</div>
                <div style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{order.address}</div>
              </div>
              <svg width="24" height="24" viewBox="0 0 48 48" fill="#05c8f0"><path d="M24 4C13 4 4 13 4 24c0 4.8 1.7 9.2 4.5 12.7L7 42l5.5-1.4C15.5 42.7 19.6 44 24 44c11 0 20-9 20-20S35 4 24 4zm0 36c-3.7 0-7.2-1.1-10.1-3l-.7-.4-4.4 1.1 1.2-4.2-.5-.7C7.9 30.1 7 27.1 7 24 7 14.6 14.6 7 24 7s17 7.6 17 17-7.6 16-17 16zm-2-22a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4zm-4 12c-4 0-7.4-2.6-8.6-6.2l2.8-.9c.8 2.5 3.1 4.1 5.8 4.1s5-1.6 5.8-4.1l2.8.9C33.4 27.4 30 30 26 30z"/></svg>
            </a>
          : null}
        </div>
        {order.hasPaint !== null && order.hasPaint !== undefined ?
          <div style={{display:"inline-block",marginBottom:10,padding:"6px 14px",borderRadius:20,fontWeight:700,fontSize:13,background:order.hasPaint?"#f5f3ff":"#f1f5f9",color:order.hasPaint?"#6d28d9":"#475569"}}>
            {order.hasPaint ? "🎨 יש צבע" : "✖ אין צבע"}
          </div>
        : null}
        {(order.missingItems||[]).length > 0 ?
          <div style={{marginBottom:10,background:"#fff7ed",border:"1px solid #fdba74",borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#c2410c",marginBottom:6}}>{"רשימת חוסרים (" + order.missingItems.length + ")"}</div>
            {order.missingItems.map(function(item,i){
              return <div key={item.id||i} style={{fontSize:13,color:"#92400e",marginBottom:3}}>{"• " + item.text}</div>;
            })}
          </div>
        : null}
        {order.notes ? <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:13,color:"#92400e"}}>{"📝 " + order.notes}</div> : null}
        {(order.assignedInstallers||[]).length > 0 ?
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>מתקינים משויכים</div>
            {order.assignedInstallers.map(function(a){
              var u = (props.users||[]).find(function(x){ return x.id===a.userId; }) || {name:"?"};
              return (
                <div key={a.userId} style={{background:"#fff7ed",border:"1px solid #fdba74",borderRadius:10,padding:"8px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700,fontSize:13,color:"#c2410c"}}>{"👷 " + u.name}</span>
                  {a.note ? <span style={{fontSize:12,color:"#92400e"}}>{a.note}</span> : null}
                </div>
              );
            })}
          </div>
        : null}
        {order.files.length > 0 ?
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>קבצים</div>
            {order.files.map(function(f,i){
              var name = typeof f === "object" ? f.name : f;
              var data = typeof f === "object" ? f.data : null;
              return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#eff6ff",borderRadius:8,marginBottom:4}}>
                  <span style={{fontSize:13,color:"#1d4ed8"}}>{"📎 " + name}</span>
                  {data ?
                    <button onClick={function(){setViewingFile({src:data,name:name});}} style={{padding:"4px 10px",background:"#1d4ed8",color:"#fff",borderRadius:6,fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>פתח</button>
                  : null}
                </div>
              );
            })}
          </div>
        : null}
        {order.reports.length > 0 ?
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>דוחות</div>
            {order.reports.map(function(r,i){ return <div key={i} style={{padding:"6px 10px",background:"#f0fdf4",borderRadius:7,fontSize:13,color:"#166534",marginBottom:4}}>{"📋 " + r}</div>; })}
          </div>
        : null}
        {order.materials && order.materials.length > 0 ?
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:700,color:"#475569"}}>פלטות ופרזול</div>
              <button onClick={function(){props.onPrintMaterials(order);}} style={{padding:"6px 14px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>ייצוא PDF</button>
            </div>
            {order.materials.map(function(m,i){
              var lineTotal = (Number(m.price)||0) * (Number(m.qty)||0);
              return (
                <div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#0f172a",marginBottom:6,unicodeBidi:"plaintext"}}>{m.name}</div>
                  <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:12,color:"#64748b"}}>
                    {m.company ? <span>{"חברה: " + m.company}</span> : null}
                    <span>{"מחיר: " + m.price}</span>
                    <span>{"כמות: " + m.qty}</span>
                    <span style={{fontWeight:800,color:"#0f172a",marginRight:"auto"}}>{"סה\"כ: " + lineTotal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0",marginTop:6}}>
              <span style={{fontSize:13,fontWeight:700,color:"#475569"}}>{"סה\"כ חומרים:"}</span>
              <span style={{fontSize:15,fontWeight:900,color:"#0f172a"}}>
                {"\u20aa" + order.materials.reduce(function(sum,m){ return sum + (Number(m.price)||0)*(Number(m.qty)||0); }, 0).toLocaleString()}
              </span>
            </div>
          </div>
        : null}

        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:"#475569"}}>{"דוחות התקנה וסיום (" + installReports.length + ")"}</div>
            {canAddReport ?
              <button onClick={function(){props.onAddReport(order);}} style={{padding:"6px 14px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>+ דוח חדש</button>
            : null}
          </div>
          {installReports.length === 0 ?
            <div style={{padding:"14px",textAlign:"center",color:"#94a3b8",fontSize:13,background:"#f8fafc",borderRadius:10}}>אין עדיין דוחות להזמנה זו</div>
          :
            installReports.map(function(r){
              var t = REPORT_TYPES[r.type] || REPORT_TYPES.continuation;
              return (
                <div key={r.id} onClick={function(){props.onViewReport(r);}} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={function(e){e.currentTarget.style.background="#f8fafc";}}
                  onMouseLeave={function(e){e.currentTarget.style.background="#fff";}}>
                  <div>
                    <span style={{background:t.color+"15",color:t.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{t.label}</span>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{fmtDate(r.created) + (r.signature ? " · ✓ נחתם" : "")}</div>
                  </div>
                  {(r.photos||[]).length > 0 ? <span style={{fontSize:11,color:"#64748b"}}>{"📷 " + r.photos.length}</span> : null}
                </div>
              );
            })
          }
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16,flexWrap:"wrap"}}>
          <button onClick={function(){
            var updated = Object.assign({},order,{urgent:!order.urgent});
            props.onToggleUrgent(updated);
          }} style={{padding:"10px 16px",background:order.urgent?"#fef2f2":"#fff5f5",color:"#ef4444",border:"1px solid "+(order.urgent?"#fecaca":"#fecaca"),borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>
            {order.urgent ? "✓ דחוף — לחץ לביטול" : "🔴 סמן כדחוף"}
          </button>
          <button onClick={function(){setConfirmDelete(true);}} style={{padding:"10px 16px",background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>מחק</button>
          <button onClick={function(){props.onEdit(order);}} style={{padding:"10px 20px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>ערוך</button>
        </div>
      </div>

      {confirmDelete ?
        <Modal onClose={function(){setConfirmDelete(false);}}>
          <div style={{padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🗑️</div>
            <h2 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"#0f172a"}}>{"למחוק את הזמנה " + order.id + "?"}</h2>
            <p style={{margin:"0 0 24px",fontSize:13,color:"#64748b"}}>{"הזמנה זו של " + order.client + " תימחק לצמיתות. פעולה זו לא ניתנת לביטול."}</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={function(){setConfirmDelete(false);}} style={{padding:"11px 24px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={function(){ setConfirmDelete(false); props.onDelete(order.id); }} style={{padding:"11px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>מחק</button>
            </div>
          </div>
        </Modal>
      : null}
      {viewingFile ? <PDFViewer src={viewingFile.src} name={viewingFile.name} onClose={function(){setViewingFile(null);}} /> : null}
    </Modal>
  );
}

function EventForm(props) {
  var orders = props.orders;
  var users = props.users || [];
  var calendarType = props.calendarType || "factory";
  var availableTypes = EVENT_TYPES.filter(function(t){ return t.calendar === calendarType; });
  var installers = users.filter(function(u){ return u.role==="installer" && u.active; });
  var [form, setForm] = useState(props.initial || {id:makeId("EVT"),type:availableTypes[0]?availableTypes[0].id:"installation",orderId:"",date:"",time:"08:00",team:"",teamIds:[],notes:""});
  var [errors, setErrors] = useState({});
  function set(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }

  function toggleInstaller(userId, name) {
    var ids = form.teamIds || [];
    var newIds, newTeam;
    if (ids.indexOf(userId) >= 0) {
      newIds = ids.filter(function(id){ return id !== userId; });
    } else {
      newIds = ids.concat([userId]);
    }
    // Build team string from selected names
    newTeam = newIds.map(function(id){
      var u = users.find(function(x){ return x.id===id; });
      return u ? u.name : id;
    }).join(" + ");
    set("teamIds", newIds);
    set("team", newTeam);
  }

  function validate() {
    var e = {};
    if (!form.orderId) e.orderId = "חובה";
    if (!form.date) e.date = "חובה";
    if (!(form.teamIds||[]).length && !form.team.trim() && form.type !== "delivery" && calendarType !== "showroom") e.team = "חובה";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  var selOrder = orders.find(function(o){ return o.id === form.orderId; });
  return (
    <div style={{padding:28}}>
      <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>אירוע ביומן</h2>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {availableTypes.map(function(t){
          return (
            <button key={t.id} onClick={function(){set("type",t.id);}}
              style={{flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,border:form.type===t.id?"2px solid "+t.color:"2px solid #e2e8f0",background:form.type===t.id?t.color+"15":"#f8fafc",color:form.type===t.id?t.color:"#64748b"}}>
              {t.icon + " " + t.label}
            </button>
          );
        })}
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הזמנה *</label>
        <select value={form.orderId} onChange={function(e){set("orderId",e.target.value);}} style={Object.assign({},inpStyle,{cursor:"pointer",border:"1.5px solid "+(errors.orderId?"#ef4444":"#e2e8f0")})}>
          <option value="">-- בחר הזמנה --</option>
          {orders.map(function(o){ return <option key={o.id} value={o.id}>{o.id + " - " + o.client}</option>; })}
        </select>
        {selOrder ? <div style={{marginTop:6,padding:"6px 10px",background:"#f0f9ff",borderRadius:7,fontSize:12,color:"#0369a1"}}>{"📍 " + selOrder.address}</div> : null}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>תאריך *</label>
          <input type="date" value={form.date} onChange={function(e){set("date",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.date?"#ef4444":"#e2e8f0")})} />
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שעה</label>
          <input type="time" value={form.time} onChange={function(e){set("time",e.target.value);}} style={inpStyle} />
        </div>
      </div>
      {form.type !== "delivery" && calendarType !== "showroom" ?
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>צוות / מתקינים *{errors.team ? <span style={{color:"#ef4444",marginRight:6,fontWeight:400}}>{errors.team}</span> : null}</label>
          {installers.length > 0 ?
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              {installers.map(function(u){
                var selected = (form.teamIds||[]).indexOf(u.id) >= 0;
                return (
                  <button key={u.id} onClick={function(){toggleInstaller(u.id, u.name);}}
                    style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",fontWeight:700,fontSize:13,border:selected?"2px solid #f97316":"2px solid #e2e8f0",background:selected?"#fff7ed":"#f8fafc",color:selected?"#c2410c":"#64748b"}}>
                    {"👷 " + u.name}
                  </button>
                );
              })}
            </div>
          : null}
          <input value={form.team} onChange={function(e){set("team",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.team?"#ef4444":"#e2e8f0")})} placeholder="או הקלד ידנית..." />
          {(form.teamIds||[]).length > 0 ? <div style={{marginTop:6,fontSize:12,color:"#f97316",fontWeight:700}}>{"נבחרו: " + form.team}</div> : null}
        </div>
      : null}
      <div style={{marginBottom:24}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הערות</label>
        <textarea value={form.notes} onChange={function(e){set("notes",e.target.value);}} rows={2} style={Object.assign({},inpStyle,{resize:"vertical"})} placeholder="הוראות כניסה..." />
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={props.onCancel} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
        <button onClick={function(){if(validate()) props.onSave(form);}} style={{padding:"11px 28px",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור ביומן</button>
      </div>
    </div>
  );
}

function WeeklyCalendar(props) {
  var events = props.events;
  var orders = props.orders;
  var [viewMode, setViewMode] = useState("week");
  var [weekOf, setWeekOf] = useState(function(){ return weekStart(new Date()); });
  var [selectedDay, setSelectedDay] = useState(new Date());
  var [monthOf, setMonthOf] = useState(function(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); });
  var todayStr = toISO(new Date());
  var HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

  var days = [];
  for (var di=0; di<7; di++) { days.push(addDays(weekOf,di)); }
  var wStart = toISO(weekOf); var wEnd = toISO(addDays(weekOf,6));

  function evDay(ds) {
    return events.filter(function(e){ return e.date===ds; }).sort(function(a,b){ return a.time>b.time?1:-1; });
  }

  var dayStr = toISO(selectedDay);
  var monthYear = monthOf.getFullYear(); var monthMonth = monthOf.getMonth();
  var firstDay = new Date(monthYear, monthMonth, 1);
  var lastDay = new Date(monthYear, monthMonth+1, 0);
  var monthDays = [];
  for (var md=1; md<=lastDay.getDate(); md++) { monthDays.push(new Date(monthYear,monthMonth,md)); }

  function navigate(dir) {
    if (viewMode==="week") setWeekOf(function(w){return addDays(w,dir*7);});
    else if (viewMode==="day") setSelectedDay(function(d){return addDays(d,dir);});
    else setMonthOf(function(m){return new Date(m.getFullYear(),m.getMonth()+dir,1);});
  }

  function navLabel() {
    if (viewMode==="day") return fmtDate(dayStr);
    if (viewMode==="week") return fmtDate(wStart)+" - "+fmtDate(wEnd);
    return HE_MONTHS[monthMonth]+" "+monthYear;
  }

  function EvCard(ep) {
    var ev = ep.ev;
    var t = getEvType(ev.type);
    var ord = orders.find(function(o){return o.id===ev.orderId;});
    return (
      <div onClick={function(){props.onEditEvent(ev);}} style={{background:t.color+"18",borderRight:"3px solid "+t.color,borderRadius:8,padding:"8px 10px",marginBottom:6,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{t.icon+" "+t.label}</span>
          {ev.time?<span style={{fontSize:11,color:"#64748b"}}>{ev.time}</span>:null}
        </div>
        {ord?<div style={{fontSize:12,color:"#475569",marginTop:2}}>{ord.client}</div>:null}
        {ev.team?<div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{"👷 "+ev.team}</div>:null}
      </div>
    );
  }

  return (
    <div style={{direction:"rtl"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"#fff",borderBottom:"1px solid #e2e8f0",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:0,borderRadius:10,overflow:"hidden",border:"1.5px solid #e2e8f0"}}>
          {[{id:"day",label:"יומי"},{id:"week",label:"שבועי"},{id:"month",label:"חודשי"}].map(function(v){
            return <button key={v.id} onClick={function(){setViewMode(v.id);}} style={{padding:"7px 14px",background:viewMode===v.id?"#4f46e5":"#fff",color:viewMode===v.id?"#fff":"#64748b",border:"none",cursor:"pointer",fontWeight:700,fontSize:12}}>{v.label}</button>;
          })}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={function(){navigate(-1);}} style={{padding:"7px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,background:"#fff",cursor:"pointer",fontWeight:700,color:"#475569"}}>◀</button>
          <div style={{fontSize:13,fontWeight:800,color:"#0f172a",textAlign:"center",minWidth:140}}>{navLabel()}</div>
          <button onClick={function(){navigate(1);}} style={{padding:"7px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,background:"#fff",cursor:"pointer",fontWeight:700,color:"#475569"}}>▶</button>
        </div>
      </div>

      {viewMode==="day" ?
        <div style={{padding:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:15,color:"#0f172a"}}>{HE_DAYS[selectedDay.getDay()]+", "+selectedDay.getDate()+" "+HE_MONTHS[selectedDay.getMonth()]}</div>
            <button onClick={function(){props.onAddEvent(dayStr);}} style={{padding:"6px 12px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>+ הוסף</button>
          </div>
          {evDay(dayStr).length===0?<div style={{textAlign:"center",padding:"40px",color:"#94a3b8",fontSize:13}}>אין אירועים היום</div>:evDay(dayStr).map(function(ev){return <EvCard key={ev.id} ev={ev}/>;}) }
        </div>
      :null}

      {viewMode==="week" ?
        <div>
          <div style={{display:"flex",gap:6,padding:"10px 16px",background:"#fff",borderBottom:"1px solid #e2e8f0",overflowX:"auto"}}>
            {days.map(function(day,i){
              var ds=toISO(day); var isT=ds===todayStr; var cnt=evDay(ds).length;
              return (
                <div key={ds} onClick={function(){setSelectedDay(day);setViewMode("day");}} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:40,cursor:"pointer",opacity:i===6?0.4:1}}>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:600,marginBottom:3}}>{HE_DAYS[i]}</div>
                  <div style={{width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isT?"#4f46e5":"#f1f5f9",color:isT?"#fff":"#0f172a",fontWeight:800,fontSize:14}}>{day.getDate()}</div>
                  {cnt>0?<div style={{marginTop:3,background:"#ef4444",color:"#fff",borderRadius:99,fontSize:9,fontWeight:800,padding:"1px 5px"}}>{cnt}</div>:null}
                </div>
              );
            })}
          </div>
          <div style={{padding:"16px 16px 32px"}}>
            {days.map(function(day,i){
              if(i===6) return null;
              var ds=toISO(day); var isT=ds===todayStr; var devs=evDay(ds);
              if(devs.length===0) return null;
              return (
                <div key={ds} style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isT?"#4f46e5":"#e2e8f0",color:isT?"#fff":"#64748b",fontWeight:800,fontSize:13}}>{day.getDate()}</div>
                    <div style={{fontSize:13,fontWeight:700,color:isT?"#4f46e5":"#475569"}}>{HE_DAYS[i]}</div>
                  </div>
                  {devs.map(function(ev){return <EvCard key={ev.id} ev={ev}/>;}) }
                </div>
              );
            })}
            {events.filter(function(e){return e.date>=wStart&&e.date<=wEnd;}).length===0?<div style={{textAlign:"center",padding:"40px",color:"#94a3b8",fontSize:13}}>אין אירועים השבוע</div>:null}
          </div>
        </div>
      :null}

      {viewMode==="month" ?
        <div style={{padding:"12px 16px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
            {HE_DAYS.map(function(d,i){return <div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"#94a3b8",padding:"4px 0"}}>{d}</div>;})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {Array(firstDay.getDay()).fill(null).map(function(_,i){return <div key={"e"+i}/>;}) }
            {monthDays.map(function(day){
              var ds=toISO(day); var cnt=evDay(ds).length; var isT=ds===todayStr;
              return (
                <div key={ds} onClick={function(){setSelectedDay(day);setViewMode("day");}}
                  style={{minHeight:48,borderRadius:8,background:isT?"#eef2ff":"#f8fafc",border:"1px solid "+(isT?"#6366f1":"#e2e8f0"),cursor:"pointer",padding:4,position:"relative"}}>
                  <div style={{fontSize:12,fontWeight:800,color:isT?"#4f46e5":"#475569"}}>{day.getDate()}</div>
                  {cnt>0?<div style={{position:"absolute",top:3,left:3,background:"#ef4444",color:"#fff",borderRadius:"50%",width:15,height:15,fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{cnt}</div>:null}
                  {evDay(ds).slice(0,2).map(function(ev){
                    var t=getEvType(ev.type);
                    return <div key={ev.id} style={{fontSize:9,background:t.color+"22",color:t.color,borderRadius:3,padding:"1px 3px",marginTop:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{t.icon+" "+t.label}</div>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      :null}
    </div>
  );
}


function PurchaseOrderCard(props) {
  var po = props.po;
  var items = po.items || [];
  var itemCount = items.length;
  var receivedCount = items.filter(function(it){ return it.received; }).length;
  var allReceived = itemCount > 0 && receivedCount === itemCount;
  return (
    <div onClick={function(){props.onClick(po);}} style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 12px rgba(30,41,59,0.07)",cursor:"pointer",border:"1.5px solid #e2e8f0",direction:"rtl"}}
      onMouseEnter={function(e){e.currentTarget.style.boxShadow="0 6px 24px rgba(30,41,59,0.13)";}}
      onMouseLeave={function(e){e.currentTarget.style.boxShadow="0 2px 12px rgba(30,41,59,0.07)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{po.id}</div>
          <div style={{fontSize:16,fontWeight:800,color:"#0f172a",unicodeBidi:"plaintext"}}>{po.supplier}</div>
        </div>
        <span style={{background:"#eff6ff",color:"#1d4ed8",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{toISO(new Date(po.created))===toISO(new Date()) ? "היום" : fmtDate(po.created)}</span>
      </div>
      <div style={{fontSize:12,color:"#64748b"}}>{itemCount + " פריטים"}</div>
      {po.linkedOrderId ? <div style={{fontSize:12,color:"#6366f1",marginTop:4}}>{"🔗 " + po.linkedOrderId}</div> : null}
      {itemCount > 0 ?
        <span style={{display:"inline-block",marginTop:8,background:allReceived?"#d1fae5":"#fff7ed",color:allReceived?"#059669":"#c2410c",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>
          {allReceived ? "✓ הכל התקבל" : (receivedCount + "/" + itemCount + " התקבלו")}
        </span>
      : null}
    </div>
  );
}

function PurchaseOrderForm(props) {
  var orders = props.orders || [];
  var [form, setForm] = useState(props.initial || {
    id: makeId("PO"),
    supplier: "",
    supplierPhone: "",
    linkedOrderId: "",
    items: [{name:"",qty:1,notes:""}],
    notes: "",
    created: toISO(new Date())
  });
  var [errors, setErrors] = useState({});
  var items = form.items || [];

  function set(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }

  function setItem(i,k,v) {
    var next = items.map(function(it,idx){ return idx===i ? Object.assign({},it,{[k]:v}) : it; });
    set("items", next);
  }
  function addItem() {
    set("items", items.concat([{name:"",qty:1,notes:""}]));
  }
  function removeItem(i) {
    set("items", items.filter(function(_,idx){ return idx!==i; }));
  }

  function validate() {
    var e = {};
    if (!form.supplier.trim()) e.supplier = "חובה";
    var hasValidItem = items.some(function(it){ return it.name && it.name.trim(); });
    if (!hasValidItem) e.items = "נדרש לפחות פריט אחד עם שם";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div style={{padding:28}}>
      <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>{props.initial ? "עריכת הזמנת טובין" : "הזמנת טובין חדשה"}</h2>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם ספק *</label>
          <input value={form.supplier} onChange={function(e){set("supplier",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.supplier?"#ef4444":"#e2e8f0")})} placeholder="לדוגמה: דומיסיל" />
          {errors.supplier ? <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.supplier}</div> : null}
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>טלפון ספק</label>
          <input value={form.supplierPhone} onChange={function(e){set("supplierPhone",e.target.value);}} style={inpStyle} placeholder="05X-XXXXXXX" />
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>קישור להזמנת לקוח (אופציונלי)</label>
        <select value={form.linkedOrderId} onChange={function(e){set("linkedOrderId",e.target.value);}} style={Object.assign({},inpStyle,{cursor:"pointer"})}>
          <option value="">-- ללא קישור --</option>
          {orders.map(function(o){ return <option key={o.id} value={o.id}>{o.id + " - " + o.client}</option>; })}
        </select>
        {form.linkedOrderId && !props.initial ? <div style={{fontSize:11,color:"#6366f1",marginTop:5}}>הפריטים יתווספו אוטומטית לרשימת הפלטות ופרזול בהזמנה זו</div> : null}
      </div>

      <div style={{marginBottom:18}}>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>פריטים להזמנה</label>
        </div>
        {errors.items ? <div style={{fontSize:11,color:"#ef4444",marginBottom:8}}>{errors.items}</div> : null}
        {items.map(function(it,i){
          return (
            <div key={i} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:10,marginBottom:8}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <input value={it.name} onChange={function(e){setItem(i,"name",e.target.value);}} style={Object.assign({},inpStyle,{flex:1,fontWeight:700,fontSize:15,padding:"9px 12px",unicodeBidi:"plaintext"})} placeholder="שם הפריט" />
                <input type="number" min="1" value={it.qty} onChange={function(e){setItem(i,"qty",e.target.value);}} style={Object.assign({},inpStyle,{width:70,padding:"9px 6px",textAlign:"center"})} />
                <button onClick={function(){removeItem(i);}} style={{background:"#fef2f2",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:"8px 10px",borderRadius:8,fontWeight:700}}>הסר</button>
              </div>
              <input value={it.notes} onChange={function(e){setItem(i,"notes",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 10px",fontSize:13})} placeholder="הערה לפריט (אופציונלי)" />
            </div>
          );
        })}
        <button onClick={addItem} style={{width:"100%",marginTop:4,padding:"10px",background:"#eff6ff",color:"#1d4ed8",border:"1.5px dashed #93c5fd",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>+ הוסף שורה</button>
      </div>

      <div style={{marginBottom:24}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הערות להזמנה</label>
        <textarea value={form.notes} onChange={function(e){set("notes",e.target.value);}} rows={3} style={Object.assign({},inpStyle,{resize:"vertical"})} placeholder="הערות כלליות לספק..." />
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={props.onCancel} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
        <button onClick={function(){if(validate()) props.onSave(form);}} style={{padding:"11px 28px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור הזמנת טובין</button>
      </div>
    </div>
  );
}

function PurchaseOrderDetail(props) {
  var po = props.po;
  var [confirmDelete, setConfirmDelete] = useState(false);
  var [showPrint, setShowPrint] = useState(false);
  var items = po.items || [];
  var receivedCount = items.filter(function(it){ return it.received; }).length;
  var allReceived = items.length > 0 && receivedCount === items.length;

  function toggleReceived(i) {
    var updated = Object.assign({}, po, {
      items: items.map(function(it,idx){ return idx===i ? Object.assign({},it,{received:!it.received}) : it; })
    });
    props.onUpdate(updated);
  }

  return (
    <Modal onClose={props.onClose}>
      <div style={{padding:"28px 28px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:700}}>{po.id}</div>
            <h2 style={{margin:"4px 0 6px",fontSize:22,fontWeight:900,color:"#0f172a",unicodeBidi:"plaintext"}}>{po.supplier}</h2>
            {items.length > 0 ?
              <span style={{background:allReceived?"#d1fae5":"#fff7ed",color:allReceived?"#059669":"#c2410c",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>
                {allReceived ? "✓ הכל התקבל" : (receivedCount + "/" + items.length + " התקבלו")}
              </span>
            : null}
          </div>
          <button onClick={props.onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:"#64748b"}}>x</button>
        </div>
      </div>
      <div style={{padding:"16px 28px 28px"}}>
        {po.supplierPhone ? <div style={{fontSize:13,color:"#64748b",marginBottom:10}}>{"📞 " + po.supplierPhone}</div> : null}
        {po.linkedOrderId ? <div style={{fontSize:13,color:"#6366f1",marginBottom:10}}>{"🔗 מקושר להזמנה " + po.linkedOrderId}</div> : null}

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>פריטים</div>
          {items.map(function(it,i){
            return (
              <div key={i} onClick={function(){toggleReceived(i);}} style={{background:it.received?"#f0fdf4":"#f8fafc",border:"1px solid "+(it.received?"#bbf7d0":"#e2e8f0"),borderRadius:10,padding:"10px 12px",marginBottom:6,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(it.received?"#059669":"#cbd5e1"),background:it.received?"#059669":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:900,flexShrink:0}}>
                  {it.received ? "✓" : ""}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:14,fontWeight:700,color:it.received?"#166534":"#0f172a",unicodeBidi:"plaintext",textDecoration:it.received?"line-through":"none"}}>{it.name}</span>
                    <span style={{fontSize:13,color:"#64748b",fontWeight:700}}>{"x" + it.qty}</span>
                  </div>
                  {it.notes ? <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{it.notes}</div> : null}
                </div>
              </div>
            );
          })}
        </div>

        {po.notes ? <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:13,color:"#92400e"}}>{"📝 " + po.notes}</div> : null}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={function(){setConfirmDelete(true);}} style={{padding:"10px 16px",background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>מחק</button>
          <button onClick={function(){setShowPrint(true);}} style={{padding:"10px 20px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>ייצוא PDF</button>
        </div>
      </div>

      {showPrint ? <PrintablePurchaseOrder po={po} factoryName={props.factoryName} onClose={function(){setShowPrint(false);}} /> : null}

      {confirmDelete ?
        <Modal onClose={function(){setConfirmDelete(false);}}>
          <div style={{padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🗑️</div>
            <h2 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"#0f172a"}}>{"למחוק את הזמנת הטובין?"}</h2>
            <p style={{margin:"0 0 24px",fontSize:13,color:"#64748b"}}>{"ההזמנה מ-" + po.supplier + " תימחק לצמיתות."}</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={function(){setConfirmDelete(false);}} style={{padding:"11px 24px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={function(){ setConfirmDelete(false); props.onDelete(po.id); }} style={{padding:"11px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>מחק</button>
            </div>
          </div>
        </Modal>
      : null}
    </Modal>
  );
}

var QUOTE_STATUSES = {
  draft:    { label:"טיוטה",   color:"#94a3b8" },
  sent:     { label:"נשלחה",   color:"#3b82f6" },
  approved: { label:"אושרה",   color:"#059669" },
  rejected: { label:"נדחתה",   color:"#ef4444" }
};

function QuoteCard(props) {
  var q = props.quote;
  var st = QUOTE_STATUSES[q.status] || QUOTE_STATUSES.draft;
  var subtotal = (q.items||[]).reduce(function(s,it){ return s + (Number(it.price)||0)*(Number(it.qty)||0); }, 0);
  var total = Math.max(0, subtotal - (Number(q.discount)||0));
  return (
    <div onClick={function(){props.onClick(q);}} style={{background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 2px 12px rgba(30,41,59,0.07)",cursor:"pointer",border:"1.5px solid #e2e8f0",direction:"rtl"}}
      onMouseEnter={function(e){e.currentTarget.style.boxShadow="0 6px 24px rgba(30,41,59,0.13)";}}
      onMouseLeave={function(e){e.currentTarget.style.boxShadow="0 2px 12px rgba(30,41,59,0.07)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{q.id}</div>
          <div style={{fontSize:16,fontWeight:800,color:"#0f172a",unicodeBidi:"plaintext"}}>{q.client}</div>
        </div>
        <span style={{background:st.color+"15",color:st.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{st.label}</span>
      </div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>{(q.items||[]).length + " פריטים"}</div>
      <div style={{fontSize:16,fontWeight:900,color:"#0f172a"}}>{"\u20aa" + total.toLocaleString()}</div>
    </div>
  );
}

function QuoteForm(props) {
  var [form, setForm] = useState(props.initial || {
    id: makeId("QT"),
    client: "",
    phone: "",
    items: [{name:"",qty:1,price:0}],
    discount: 0,
    paymentTerms: "",
    notes: "",
    status: "draft",
    created: toISO(new Date())
  });
  var [errors, setErrors] = useState({});
  var items = form.items || [];

  function set(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }
  function setItem(i,k,v) {
    var next = items.map(function(it,idx){ return idx===i ? Object.assign({},it,{[k]:v}) : it; });
    set("items", next);
  }
  function addItem() { set("items", items.concat([{name:"",qty:1,price:0}])); }
  function removeItem(i) { set("items", items.filter(function(_,idx){ return idx!==i; })); }

  var subtotal = items.reduce(function(s,it){ return s + (Number(it.price)||0)*(Number(it.qty)||0); }, 0);
  var total = Math.max(0, subtotal - (Number(form.discount)||0));

  function validate() {
    var e = {};
    if (!form.client.trim()) e.client = "חובה";
    var hasValidItem = items.some(function(it){ return it.name && it.name.trim(); });
    if (!hasValidItem) e.items = "נדרש לפחות פריט אחד עם שם";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div style={{padding:28}}>
      <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>{props.initial ? "עריכת הצעת מחיר" : "הצעת מחיר חדשה"}</h2>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם לקוח *</label>
          <input value={form.client} onChange={function(e){set("client",e.target.value);}} style={Object.assign({},inpStyle,{border:"1.5px solid "+(errors.client?"#ef4444":"#e2e8f0")})} placeholder="שם הלקוח" />
          {errors.client ? <div style={{fontSize:11,color:"#ef4444",marginTop:3}}>{errors.client}</div> : null}
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>טלפון</label>
          <input value={form.phone} onChange={function(e){set("phone",e.target.value);}} style={inpStyle} placeholder="05X-XXXXXXX" />
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569"}}>פריטים</label>
        </div>
        {errors.items ? <div style={{fontSize:11,color:"#ef4444",marginBottom:8}}>{errors.items}</div> : null}
        {items.map(function(it,i){
          var lineTotal = (Number(it.price)||0) * (Number(it.qty)||0);
          return (
            <div key={i} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:10,marginBottom:8}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <input value={it.name} onChange={function(e){setItem(i,"name",e.target.value);}} style={Object.assign({},inpStyle,{flex:1,fontWeight:700,fontSize:15,padding:"9px 12px",unicodeBidi:"plaintext"})} placeholder="שם הפריט" />
                <button onClick={function(){removeItem(i);}} style={{background:"#fef2f2",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,padding:"8px 10px",borderRadius:8,fontWeight:700}}>הסר</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3,textAlign:"center"}}>כמות</div>
                  <input type="number" min="0" value={it.qty} onChange={function(e){setItem(i,"qty",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 4px",textAlign:"center",fontSize:13})} />
                </div>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3,textAlign:"center"}}>מחיר יח'</div>
                  <input type="number" min="0" value={it.price} onChange={function(e){setItem(i,"price",e.target.value);}} style={Object.assign({},inpStyle,{padding:"7px 4px",textAlign:"center",fontSize:13})} />
                </div>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:3,textAlign:"center"}}>סה"כ</div>
                  <div style={{textAlign:"center",fontWeight:800,fontSize:14,color:"#0f172a",padding:"7px 4px"}}>{lineTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={addItem} style={{width:"100%",marginTop:4,padding:"10px",background:"#eff6ff",color:"#1d4ed8",border:"1.5px dashed #93c5fd",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>+ הוסף שורה</button>
      </div>

      <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:14,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:13,color:"#475569"}}>סכום ביניים</span>
          <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{"\u20aa" + subtotal.toLocaleString()}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <label style={{fontSize:13,color:"#475569"}}>הנחה (בש"ח)</label>
          <input type="number" min="0" value={form.discount} onChange={function(e){set("discount",e.target.value);}} style={Object.assign({},inpStyle,{width:120,padding:"7px 8px",textAlign:"center"})} />
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #e2e8f0",paddingTop:10}}>
          <span style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>סה"כ לתשלום</span>
          <span style={{fontSize:18,fontWeight:900,color:"#4338ca"}}>{"\u20aa" + total.toLocaleString()}</span>
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>תנאי תשלום</label>
        <input value={form.paymentTerms} onChange={function(e){set("paymentTerms",e.target.value);}} style={inpStyle} placeholder="לדוגמה: 50% מקדמה, 50% בסיום" />
      </div>

      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>הערות</label>
        <textarea value={form.notes} onChange={function(e){set("notes",e.target.value);}} rows={3} style={Object.assign({},inpStyle,{resize:"vertical"})} placeholder="הערות נוספות..." />
      </div>

      <div style={{marginBottom:24}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>סטטוס</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.keys(QUOTE_STATUSES).map(function(key){
            var s = QUOTE_STATUSES[key];
            return (
              <button key={key} onClick={function(){set("status",key);}}
                style={{padding:"8px 16px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,border:form.status===key?"2px solid "+s.color:"2px solid #e2e8f0",background:form.status===key?s.color+"15":"#f8fafc",color:form.status===key?s.color:"#64748b"}}>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={props.onCancel} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
        <button onClick={function(){if(validate()) props.onSave(form);}} style={{padding:"11px 28px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור הצעת מחיר</button>
      </div>
    </div>
  );
}

function QuoteDetail(props) {
  var q = props.quote;
  var [confirmDelete, setConfirmDelete] = useState(false);
  var [confirmConvert, setConfirmConvert] = useState(false);
  var items = q.items || [];
  var st = QUOTE_STATUSES[q.status] || QUOTE_STATUSES.draft;
  var subtotal = items.reduce(function(s,it){ return s + (Number(it.price)||0)*(Number(it.qty)||0); }, 0);
  var total = Math.max(0, subtotal - (Number(q.discount)||0));

  return (
    <Modal onClose={props.onClose}>
      <div style={{padding:"28px 28px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:700}}>{q.id}</div>
            <h2 style={{margin:"4px 0 6px",fontSize:22,fontWeight:900,color:"#0f172a",unicodeBidi:"plaintext"}}>{q.client}</h2>
            <span style={{background:st.color+"15",color:st.color,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{st.label}</span>
          </div>
          <button onClick={props.onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:"#64748b"}}>x</button>
        </div>
      </div>
      <div style={{padding:"16px 28px 28px"}}>
        {q.phone ? <div style={{fontSize:13,color:"#64748b",marginBottom:10}}>{"📞 " + q.phone}</div> : null}

        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"#475569",marginBottom:6}}>פריטים</div>
          {items.map(function(it,i){
            var lineTotal = (Number(it.price)||0) * (Number(it.qty)||0);
            return (
              <div key={i} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#0f172a",unicodeBidi:"plaintext"}}>{it.name}</span>
                  <span style={{fontSize:13,color:"#64748b"}}>{it.qty + " x " + it.price}</span>
                </div>
                <div style={{textAlign:"left",fontSize:13,fontWeight:800,color:"#0f172a",marginTop:4}}>{lineTotal.toLocaleString()}</div>
              </div>
            );
          })}
        </div>

        <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:14,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#64748b",marginBottom:6}}>
            <span>סכום ביניים</span><span>{"\u20aa" + subtotal.toLocaleString()}</span>
          </div>
          {Number(q.discount) > 0 ?
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#64748b",marginBottom:6}}>
              <span>הנחה</span><span>{"-\u20aa" + Number(q.discount).toLocaleString()}</span>
            </div>
          : null}
          <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e2e8f0",paddingTop:8,fontWeight:800}}>
            <span style={{color:"#0f172a"}}>סה"כ</span><span style={{color:"#4338ca",fontSize:16}}>{"\u20aa" + total.toLocaleString()}</span>
          </div>
        </div>

        {q.paymentTerms ? <div style={{fontSize:13,color:"#64748b",marginBottom:10}}>{"💳 " + q.paymentTerms}</div> : null}
        {q.notes ? <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:13,color:"#92400e"}}>{"📝 " + q.notes}</div> : null}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16,flexWrap:"wrap"}}>
          <button onClick={function(){setConfirmDelete(true);}} style={{padding:"10px 16px",background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>מחק</button>
          <button onClick={function(){props.onEdit(q);}} style={{padding:"10px 16px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>ערוך</button>
          {q.status === "approved" && !q.convertedOrderId ?
            <button onClick={function(){setConfirmConvert(true);}} style={{padding:"10px 20px",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>המר להזמנה</button>
          : null}
          {q.convertedOrderId ?
            <span style={{padding:"10px 16px",background:"#f0fdf4",color:"#059669",borderRadius:10,fontWeight:700,fontSize:13}}>{"הומרה ל-" + q.convertedOrderId}</span>
          : null}
        </div>
      </div>

      {confirmDelete ?
        <Modal onClose={function(){setConfirmDelete(false);}}>
          <div style={{padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🗑️</div>
            <h2 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"#0f172a"}}>{"למחוק את הצעת המחיר?"}</h2>
            <p style={{margin:"0 0 24px",fontSize:13,color:"#64748b"}}>{"ההצעה ל-" + q.client + " תימחק לצמיתות."}</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={function(){setConfirmDelete(false);}} style={{padding:"11px 24px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={function(){ setConfirmDelete(false); props.onDelete(q.id); }} style={{padding:"11px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>מחק</button>
            </div>
          </div>
        </Modal>
      : null}

      {confirmConvert ?
        <Modal onClose={function(){setConfirmConvert(false);}}>
          <div style={{padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>✅</div>
            <h2 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"#0f172a"}}>להמיר להזמנה חדשה?</h2>
            <p style={{margin:"0 0 24px",fontSize:13,color:"#64748b"}}>{"תיווצר הזמנה חדשה עבור " + q.client + " עם הפריטים מהצעת המחיר."}</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={function(){setConfirmConvert(false);}} style={{padding:"11px 24px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={function(){ setConfirmConvert(false); props.onConvert(q); }} style={{padding:"11px 24px",background:"#059669",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>המר להזמנה</button>
            </div>
          </div>
        </Modal>
      : null}
    </Modal>
  );
}

function ReportsView(props) {
  var orders = props.orders || [];
  var purchaseOrders = props.purchaseOrders || [];
  var [supplierMonth, setSupplierMonth] = useState("all");

  // Monthly revenue from materials prices, grouped by order creation month
  var monthlyRevenue = {};
  orders.forEach(function(o){
    var month = (o.created||"").slice(0,7); // YYYY-MM
    if (!month) return;
    var orderTotal = (o.materials||[]).reduce(function(sum,m){ return sum + (Number(m.price)||0)*(Number(m.qty)||0); }, 0);
    monthlyRevenue[month] = (monthlyRevenue[month]||0) + orderTotal;
  });
  var monthKeys = Object.keys(monthlyRevenue).sort();
  var maxMonthly = monthKeys.reduce(function(max,k){ return Math.max(max, monthlyRevenue[k]); }, 1);
  var totalRevenue = monthKeys.reduce(function(sum,k){ return sum + monthlyRevenue[k]; }, 0);

  function monthLabel(ym) {
    var parts = ym.split("-");
    var monthNames = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
    var mi = parseInt(parts[1],10) - 1;
    return (monthNames[mi]||ym) + " " + parts[0];
  }

  // All available months in purchase orders
  var poMonths = [];
  purchaseOrders.forEach(function(po){
    var m = (po.created||"").slice(0,7);
    if (m && poMonths.indexOf(m) < 0) poMonths.push(m);
  });
  poMonths.sort().reverse();

  // Filter purchase orders by selected month
  var filteredPOs = supplierMonth === "all"
    ? purchaseOrders
    : purchaseOrders.filter(function(po){ return (po.created||"").slice(0,7) === supplierMonth; });

  // Orders per supplier (filtered)
  var supplierCounts = {};
  filteredPOs.forEach(function(po){
    var sup = po.supplier || "לא ידוע";
    supplierCounts[sup] = (supplierCounts[sup]||0) + 1;
  });
  var supplierKeys = Object.keys(supplierCounts).sort(function(a,b){ return supplierCounts[b]-supplierCounts[a]; });
  var maxSupplierCount = supplierKeys.reduce(function(max,k){ return Math.max(max, supplierCounts[k]); }, 1);

  var completedOrders = orders.filter(function(o){ return o.status === "completed"; });

  // Status breakdown
  var statusCounts = {};
  STATUSES.forEach(function(s){ statusCounts[s.id] = 0; });
  orders.forEach(function(o){ if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 28px",direction:"rtl"}}>
      <h2 style={{margin:"0 0 4px",fontSize:22,fontWeight:900,color:"#0f172a"}}>דוחות וסטטיסטיקות</h2>
      <p style={{margin:"0 0 24px",fontSize:13,color:"#64748b"}}>סקירה כללית של פעילות המפעל</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:28}}>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:6}}>סה"כ הזמנות</div>
          <div style={{fontSize:26,fontWeight:900,color:"#0f172a"}}>{orders.length}</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:6}}>הושלמו</div>
          <div style={{fontSize:26,fontWeight:900,color:"#059669"}}>{statusCounts.completed||0}</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:6}}>הזמנות טובין</div>
          <div style={{fontSize:26,fontWeight:900,color:"#0f172a"}}>{purchaseOrders.length}</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:6}}>{"\u20aa סה\"כ ערך חומרים"}</div>
          <div style={{fontSize:22,fontWeight:900,color:"#4338ca"}}>{"\u20aa" + totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"20px",marginBottom:20}}>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800,color:"#0f172a"}}>הכנסה חודשית (לפי ערך חומרים בהזמנות)</h3>
        {monthKeys.length === 0 ?
          <div style={{textAlign:"center",padding:"30px",color:"#94a3b8",fontSize:13}}>אין נתונים עדיין</div>
        :
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {monthKeys.map(function(m){
              var val = monthlyRevenue[m];
              var pct = Math.round((val/maxMonthly)*100);
              return (
                <div key={m}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}>
                    <span style={{fontWeight:700,color:"#475569"}}>{monthLabel(m)}</span>
                    <span style={{fontWeight:800,color:"#0f172a"}}>{"\u20aa" + val.toLocaleString()}</span>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:99,height:10,overflow:"hidden"}}>
                    <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#4338ca88,#4338ca)",borderRadius:99}} />
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>

      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"20px",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:800,color:"#0f172a"}}>הזמנות טובין לפי ספק</h3>
          <select value={supplierMonth} onChange={function(e){setSupplierMonth(e.target.value);}} style={Object.assign({},inpStyle,{width:"auto",padding:"7px 12px",fontSize:13,cursor:"pointer"})}>
            <option value="all">כל החודשים ({purchaseOrders.length})</option>
            {poMonths.map(function(m){
              var cnt = purchaseOrders.filter(function(po){ return (po.created||"").slice(0,7)===m; }).length;
              return <option key={m} value={m}>{monthLabel(m) + " (" + cnt + ")"}</option>;
            })}
          </select>
        </div>
        {supplierKeys.length === 0 ?
          <div style={{textAlign:"center",padding:"30px",color:"#94a3b8",fontSize:13}}>אין נתונים עדיין</div>
        :
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {supplierKeys.map(function(sup){
              var val = supplierCounts[sup];
              var pct = Math.round((val/maxSupplierCount)*100);
              return (
                <div key={sup}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}>
                    <span style={{fontWeight:700,color:"#475569",unicodeBidi:"plaintext"}}>{sup}</span>
                    <span style={{fontWeight:800,color:"#0f172a"}}>{val + " הזמנות"}</span>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:99,height:10,overflow:"hidden"}}>
                    <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#f9731688,#f97316)",borderRadius:99}} />
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>

      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"20px"}}>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800,color:"#0f172a"}}>פילוח הזמנות לפי סטטוס</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {STATUSES.map(function(s){
            var val = statusCounts[s.id]||0;
            var pct = orders.length ? Math.round((val/orders.length)*100) : 0;
            return (
              <div key={s.id}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}>
                  <span style={{fontWeight:700,color:"#475569"}}>{s.label}</span>
                  <span style={{fontWeight:800,color:"#0f172a"}}>{val}</span>
                </div>
                <div style={{background:"#f1f5f9",borderRadius:99,height:8,overflow:"hidden"}}>
                  <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,"+s.color+"88,"+s.color+")",borderRadius:99}} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard(props) {
  var users = props.users;
  var [editingUser, setEditingUser] = useState(null);
  var [showAdd, setShowAdd] = useState(false);
  function saveUser(u) {
    props.onUpdateUsers(function(prev){
      var idx = prev.findIndex(function(x){ return x.id===u.id; });
      return idx >= 0 ? prev.map(function(x){ return x.id===u.id ? u : x; }) : prev.concat([u]);
    });
    setEditingUser(null);
    setShowAdd(false);
  }
  function toggleActive(id) {
    props.onUpdateUsers(function(prev){ return prev.map(function(u){ return u.id===id ? Object.assign({},u,{active:!u.active}) : u; }); });
  }
  function removeUser(id) {
    if (window.confirm("להסיר?")) props.onUpdateUsers(function(prev){ return prev.filter(function(u){ return u.id!==id; }); });
  }
  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 28px",direction:"rtl"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>ניהול משתמשים</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#64748b"}}>הגדר הרשאות לכל משתמש</p>
        </div>
        <button onClick={function(){setShowAdd(true);}} style={{padding:"11px 22px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>+ הוסף משתמש</button>
      </div>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden"}}>
        {users.map(function(user){
          var role = ROLE_PRESETS[user.role] || ROLE_PRESETS.viewer;
          var perms = user.customPermissions || role.permissions;
          return (
            <div key={user.id} style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc",opacity:user.active?1:0.5}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,"+role.color+"33,"+role.color+"66)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:role.color}}>{user.name[0]}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{user.name}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{"@" + (user.username || "")}</div>
                    {!user.active ? <div style={{fontSize:11,color:"#ef4444"}}>מושהה</div> : null}
                  </div>
                </div>
                <span style={{background:role.color+"15",color:role.color,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700}}>{role.label}</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {perms.length === 0 ?
                  <span style={{fontSize:12,color:"#94a3b8"}}>צפייה בלבד</span>
                :
                  ALL_PERMISSIONS.filter(function(p){ return perms.indexOf(p.id) >= 0; }).map(function(p){
                    return <span key={p.id} style={{background:"#f1f5f9",color:"#475569",borderRadius:20,padding:"2px 8px",fontSize:11}}>{p.label}</span>;
                  })
                }
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){setEditingUser(user);}} style={{padding:"6px 12px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12}}>ערוך</button>
                <button onClick={function(){toggleActive(user.id);}} style={{padding:"6px 12px",background:user.active?"#fff7ed":"#f0fdf4",color:user.active?"#f97316":"#059669",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12}}>{user.active?"השהה":"הפעל"}</button>
                <button onClick={function(){removeUser(user.id);}} style={{padding:"6px 10px",background:"#fef2f2",color:"#ef4444",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12}}>הסר</button>
              </div>
            </div>
          );
        })}
      </div>
      {(showAdd || editingUser) ?
        <Modal onClose={function(){setShowAdd(false);setEditingUser(null);}} wide={true}>
          <UserForm initial={editingUser} onSave={saveUser} onCancel={function(){setShowAdd(false);setEditingUser(null);}} />
        </Modal>
      : null}
    </div>
  );
}

function UserForm(props) {
  var initial = props.initial;
  var [form, setForm] = useState(initial || {id:makeId("U"),name:"",username:"",password:"",role:"viewer",active:true});
  var [customPerms, setCustomPerms] = useState(null);
  var [showPass, setShowPass] = useState(false);
  var [uErr, setUErr] = useState("");
  function set(k,v){ setForm(function(f){ return Object.assign({},f,{[k]:v}); }); }
  var rolePerms = ROLE_PRESETS[form.role] ? ROLE_PRESETS[form.role].permissions : [];
  var effectivePerms = customPerms !== null ? customPerms : rolePerms;
  function togglePerm(pid) {
    var cur = customPerms !== null ? customPerms : rolePerms;
    if (cur.indexOf(pid) >= 0) {
      setCustomPerms(cur.filter(function(p){ return p !== pid; }));
    } else {
      setCustomPerms(cur.concat([pid]));
    }
  }
  function handleSave() {
    if (!form.name.trim() || !form.username.trim()) { setUErr("שם ושם משתמש חובה"); return; }
    if (!form.password.trim()) { setUErr("סיסמה חובה"); return; }
    setUErr("");
    props.onSave(Object.assign({},form,{customPermissions:customPerms}));
  }
  return (
    <div style={{padding:28}}>
      <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>{initial ? "עריכת משתמש" : "משתמש חדש"}</h2>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם מלא *</label>
        <input value={form.name} onChange={function(e){set("name",e.target.value);}} style={inpStyle} placeholder="ישראל ישראלי" />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם משתמש *</label>
          <input value={form.username} onChange={function(e){set("username",e.target.value.replace(/\s/g,""));setUErr("");}} style={inpStyle} placeholder="username" dir="ltr" />
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>סיסמה *</label>
          <div style={{position:"relative"}}>
            <input value={form.password} onChange={function(e){set("password",e.target.value);setUErr("");}} type={showPass?"text":"password"} style={Object.assign({},inpStyle,{paddingLeft:36})} placeholder="1234" dir="ltr" />
            <button onClick={function(){setShowPass(function(s){return !s;});}} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#94a3b8"}}>{showPass?"H":"S"}</button>
          </div>
        </div>
      </div>
      {uErr ? <div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>{uErr}</div> : null}
      <div style={{marginBottom:18}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>תפקיד</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {Object.keys(ROLE_PRESETS).map(function(key){
            var r = ROLE_PRESETS[key];
            return (
              <button key={key} onClick={function(){set("role",key);setCustomPerms(null);}}
                style={{padding:"10px 14px",borderRadius:10,cursor:"pointer",textAlign:"right",border:form.role===key?"2px solid "+r.color:"2px solid #e2e8f0",background:form.role===key?r.color+"12":"#f8fafc"}}>
                <div style={{fontWeight:800,fontSize:13,color:form.role===key?r.color:"#0f172a"}}>{r.label}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{marginBottom:24}}>
        <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:8}}>הרשאות</label>
        <div style={{background:"#f8fafc",borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:8}}>
          {ALL_PERMISSIONS.map(function(p){
            var on = effectivePerms.indexOf(p.id) >= 0;
            return (
              <div key={p.id} onClick={function(){togglePerm(p.id);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"7px 10px",borderRadius:8,background:on?"#eff6ff":"#fff",border:"1px solid "+(on?"#93c5fd":"#e2e8f0")}}>
                <span style={{fontSize:13,fontWeight:600,color:on?"#1d4ed8":"#475569"}}>{p.label}</span>
                <div style={{width:20,height:20,borderRadius:6,border:"2px solid "+(on?"#3b82f6":"#cbd5e1"),background:on?"#3b82f6":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:900}}>{on?"v":""}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={props.onCancel} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
        <button onClick={handleSave} style={{padding:"11px 28px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור משתמש</button>
      </div>
    </div>
  );
}

function CatalogView(props) {
  var catalog = props.priceCatalog || {};
  var [search, setSearch] = useState("");
  var [companyFilter, setCompanyFilter] = useState("all");
  var [editingItem, setEditingItem] = useState(null);
  var [editName, setEditName] = useState("");
  var [editCompany, setEditCompany] = useState("");
  var [editPrice, setEditPrice] = useState("");
  var [showAdd, setShowAdd] = useState(false);
  var [newName, setNewName] = useState("");
  var [newCompany, setNewCompany] = useState("");
  var [newPrice, setNewPrice] = useState("");
  var [testCount, setTestCount] = useState(0);
  var [confirmDeleteKey, setConfirmDeleteKey] = useState(null);

  var rows = Object.keys(catalog).map(function(key){
    var entry = catalog[key];
    var isObj = entry !== null && typeof entry === "object";
    return {
      key: key,
      name: isObj && entry.name ? entry.name : key,
      company: isObj ? (entry.company || "") : "",
      price: isObj ? entry.price : entry,
      updatedAt: isObj ? (entry.updatedAt || "") : ""
    };
  });

  rows.sort(function(a,b){ return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });

  var companies = [];
  rows.forEach(function(r){
    if (r.company && companies.indexOf(r.company) < 0) companies.push(r.company);
  });
  companies.sort();

  if (companyFilter !== "all") {
    rows = rows.filter(function(r){ return r.company === companyFilter; });
  }

  if (search.trim()) {
    var q = search.trim().toLowerCase();
    rows = rows.filter(function(r){ return r.name.toLowerCase().indexOf(q) >= 0 || (r.company||"").toLowerCase().indexOf(q) >= 0; });
  }

  function startEdit(r) {
    setEditingItem(r);
    setEditName(r.name);
    setEditCompany(r.company);
    setEditPrice(String(r.price));
  }
  function saveEdit() {
    var name = editName.trim();
    var price = Number(editPrice);
    if (!name || !(price > 0)) return;
    var newKey = catalogKeyLocal(name);
    if (newKey !== editingItem.key) {
      props.onRemovePrice(editingItem.key);
    }
    props.onUpdatePrice(newKey, { name:name, company:editCompany.trim(), price:price });
    setEditingItem(null);
  }
  function removeItem(key) {
    setConfirmDeleteKey(key);
  }

  function catalogKeyLocal(name) {
    return (name||"").trim().toLowerCase();
  }

  function handleAdd() {
    if (!newName.trim() || !(Number(newPrice) > 0)) return;
    var key = catalogKeyLocal(newName);
    props.onUpdatePrice(key, { name:newName.trim(), company:newCompany.trim(), price:Number(newPrice) });
    setNewName(""); setNewCompany(""); setNewPrice("");
    setShowAdd(false);
  }

  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 28px",direction:"rtl"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:"#0f172a"}}>מאגר חומרים</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#64748b"}}>מחירים אחרונים שנשמרו לכל פריט. עריכת מחיר כאן תעדכן את ברירת המחדל להזמנות הבאות.</p>
        </div>
        <button onClick={function(){setShowAdd(true);}} style={{padding:"11px 20px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>+ הוסף חומר</button>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="חיפוש לפי שם..." style={Object.assign({},inpStyle,{flex:1,minWidth:200})} />
        <select value={companyFilter} onChange={function(e){setCompanyFilter(e.target.value);}} style={Object.assign({},inpStyle,{width:"auto",minWidth:140,cursor:"pointer"})}>
          <option value="all">{"כל החברות (" + Object.keys(catalog).length + ")"}</option>
          {companies.map(function(c){
            var cnt = Object.keys(catalog).filter(function(k){
              var e = catalog[k];
              return e && typeof e === "object" && e.company === c;
            }).length;
            return <option key={c} value={c}>{c + " (" + cnt + ")"}</option>;
          })}
        </select>
        {companyFilter !== "all" ? <button onClick={function(){setCompanyFilter("all");}} style={{padding:"9px 14px",background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>נקה סינון</button> : null}
      </div>

      {rows.length === 0 ?
        <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>📦</div>
          <div style={{fontSize:16,fontWeight:600}}>{search || companyFilter !== "all" ? "לא נמצאו תוצאות" : "המאגר ריק"}</div>
          <div style={{fontSize:13,marginTop:4}}>פריטים יתווספו אוטומטית כשתוסיף חומרים להזמנות, או הוסף ידנית למעלה</div>
        </div>
      :
        <div style={{display:"grid",gap:8}}>
          {rows.map(function(r){
            return (
              <div key={r.key} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#0f172a",unicodeBidi:"plaintext"}}>{r.name}</div>
                  <div style={{display:"flex",gap:10,marginTop:2,flexWrap:"wrap"}}>
                    {r.company ? <span style={{fontSize:12,color:"#6366f1",fontWeight:600}}>{r.company}</span> : null}
                    {r.updatedAt ? <span style={{fontSize:12,color:"#94a3b8"}}>{"עודכן: " + fmtDate(r.updatedAt)}</span> : null}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div onClick={function(){startEdit(r);}} style={{fontSize:16,fontWeight:900,color:"#0f172a",cursor:"pointer",padding:"6px 12px",background:"#f8fafc",borderRadius:8,border:"1px dashed #cbd5e1"}}>
                    {"\u20aa" + Number(r.price).toLocaleString()}
                  </div>
                  <button onClick={function(){startEdit(r);}} style={{padding:"7px 10px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>ערוך</button>
                  <button onClick={function(e){ if(e&&e.stopPropagation) e.stopPropagation(); removeItem(r.key); }} style={{padding:"7px 10px",background:"#fef2f2",color:"#ef4444",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>מחק</button>
                </div>
              </div>
            );
          })}
        </div>
      }

      {showAdd ?
        <Modal onClose={function(){setShowAdd(false);}}>
          <div style={{padding:28}}>
            <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>הוספת חומר למאגר</h2>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם הפריט *</label>
              <input value={newName} onChange={function(e){setNewName(e.target.value);}} style={inpStyle} placeholder="לדוגמה: פלטה 3416" />
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>חברה</label>
              <input value={newCompany} onChange={function(e){setNewCompany(e.target.value);}} style={inpStyle} placeholder="שם החברה" list="catalog-companies-list" />
              <datalist id="catalog-companies-list">
                {companies.map(function(c){ return <option key={c} value={c} />; })}
              </datalist>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>מחיר *</label>
              <input type="number" min="0" value={newPrice} onChange={function(e){setNewPrice(e.target.value);}} style={inpStyle} />
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={function(){setShowAdd(false);}} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={handleAdd} style={{padding:"11px 28px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>הוסף למאגר</button>
            </div>
          </div>
        </Modal>
      : null}

      {confirmDeleteKey ?
        <Modal onClose={function(){setConfirmDeleteKey(null);}}>
          <div style={{padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>🗑️</div>
            <h2 style={{margin:"0 0 10px",fontSize:18,fontWeight:800,color:"#0f172a"}}>למחוק פריט זה מהמאגר?</h2>
            <p style={{margin:"0 0 24px",fontSize:13,color:"#64748b"}}>פעולה זו לא ניתנת לביטול.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={function(){setConfirmDeleteKey(null);}} style={{padding:"11px 24px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={function(){ props.onRemovePrice(confirmDeleteKey); setConfirmDeleteKey(null); }} style={{padding:"11px 24px",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>מחק</button>
            </div>
          </div>
        </Modal>
      : null}

      {editingItem ?
        <Modal onClose={function(){setEditingItem(null);}}>
          <div style={{padding:28}}>
            <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:"#0f172a"}}>עריכת פריט במאגר</h2>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>שם הפריט *</label>
              <input value={editName} onChange={function(e){setEditName(e.target.value);}} style={Object.assign({},inpStyle,{unicodeBidi:"plaintext"})} placeholder="לדוגמה: פלטה 3416" />
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>חברה</label>
              <input value={editCompany} onChange={function(e){setEditCompany(e.target.value);}} style={inpStyle} placeholder="שם החברה" list="catalog-companies-list" />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:5}}>מחיר *</label>
              <input type="number" min="0" value={editPrice} onChange={function(e){setEditPrice(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")saveEdit();}} style={inpStyle} />
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={function(){setEditingItem(null);}} style={{padding:"11px 22px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700}}>ביטול</button>
              <button onClick={saveEdit} style={{padding:"11px 28px",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800}}>שמור שינויים</button>
            </div>
          </div>
        </Modal>
      : null}
    </div>
  );
}


function LoginScreen(props) {
  var users = props.users;
  var saved = (function(){
    try {
      var s = localStorage.getItem("fac_saved_login");
      return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
  })();
  var [username, setUsername] = useState(saved ? saved.username : "");
  var [password, setPassword] = useState(saved ? saved.password : "");
  var [remember, setRemember] = useState(saved ? true : false);
  var [error, setError] = useState("");
  function handleLogin() {
    var user = users.find(function(u){ return u.username.toLowerCase()===username.toLowerCase() && u.password===password && u.active; });
    if (user) {
      try {
        if (remember) {
          localStorage.setItem("fac_saved_login", JSON.stringify({username:username,password:password}));
        } else {
          localStorage.removeItem("fac_saved_login");
        }
      } catch(e) {}
      props.onLogin(user);
    } else {
      var ex = users.find(function(u){ return u.username.toLowerCase()===username.toLowerCase(); });
      if (!ex) setError("שם המשתמש לא נמצא");
      else if (!ex.active) setError("משתמש מושהה");
      else setError("סיסמה שגויה");
    }
  }
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,padding:40,width:"100%",maxWidth:400,boxShadow:"0 32px 80px rgba(0,0,0,0.3)",direction:"rtl"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🪵</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:900,color:"#0f172a"}}>מערכת ניהול</h1>
          <p style={{margin:"8px 0 0",fontSize:14,color:"#64748b"}}>הכנס שם משתמש וסיסמה</p>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:6}}>שם משתמש</label>
          <input value={username} onChange={function(e){setUsername(e.target.value);setError("");}} onKeyDown={function(e){if(e.key==="Enter")handleLogin();}} style={inpStyle} placeholder="username" autoFocus={true} />
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:700,color:"#475569",display:"block",marginBottom:6}}>סיסמה</label>
          <input value={password} onChange={function(e){setPassword(e.target.value);setError("");}} onKeyDown={function(e){if(e.key==="Enter")handleLogin();}} type="password" style={inpStyle} placeholder="1234" />
        </div>
        <div onClick={function(){setRemember(function(r){return !r;});}} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:24}}>
          <div style={{width:18,height:18,borderRadius:5,border:"2px solid "+(remember?"#4f46e5":"#cbd5e1"),background:remember?"#4f46e5":"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:900}}>{remember?"v":""}</div>
          <span style={{fontSize:13,color:"#475569",fontWeight:600}}>זכור אותי</span>
        </div>
        {error ? <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#ef4444",fontWeight:600}}>{error}</div> : null}
        <button onClick={handleLogin} style={{width:"100%",padding:14,background:"linear-gradient(135deg,#4f46e5,#4338ca)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontWeight:800,fontSize:16}}>כניסה למערכת</button>
        
      </div>
    </div>
  );
}

export default function App() {
  var [currentUser, setCurrentUser] = useState(null);
  var [factoryName, setFactoryName] = useLocalStorage("fac_name", "מפעל הנגרות");
  var [editingName, setEditingName] = useState(false);
  var [nameInput, setNameInput] = useState("");
  var [tab, setTab] = useState(function(){
    var role = currentUser ? currentUser.role : "viewer";
    if (role === "installer") return "calendar";
    return "orders";
  });
  var [orders, setOrders] = useLocalStorage("fac_orders", INIT_ORDERS);
  var [events, setEvents] = useLocalStorage("fac_events", INIT_EVENTS);
  var [users, setUsers] = useLocalStorage("fac_users", INIT_USERS);
  var [priceCatalog, setPriceCatalog] = useLocalStorage("fac_price_catalog", {});
  var [syncStatus, setSyncStatus] = useState("syncing");

  // Auto-refresh from Supabase every 30 seconds
  useEffect(function(){
    setSyncStatus("syncing");
    var interval = setInterval(function(){
      (async function(){
        try {
          var [newOrders, newEvents, newPO, newQuotes, newCustomers, newCatalog] = await Promise.all([
            sbLoadArray("fac_orders"),
            sbLoadArray("fac_events"),
            sbLoadArray("fac_purchase_orders"),
            sbLoadArray("fac_quotes"),
            sbLoadArray("fac_customers"),
            sbLoadCatalog()
          ]);
          setOrders(function(){ return newOrders; });
          setEvents(function(){ return newEvents; });
          setPurchaseOrders(function(){ return newPO; });
          setQuotes(function(){ return newQuotes; });
          setCustomers(function(){ return newCustomers; });
          setPriceCatalog(function(){ return newCatalog; });
          setSyncStatus("ok");
        } catch(e) {
          setSyncStatus("offline");
        }
      })();
    }, 30000);
    // Initial status check
    setTimeout(function(){ setSyncStatus("ok"); }, 3000);
    return function(){ clearInterval(interval); };
  }, []);

  function updateCatalogPrice(key, entry) {
    setPriceCatalog(function(prev){
      var prevEntry = prev[key];
      var prevPrice = prevEntry && typeof prevEntry === "object" ? prevEntry.price : prevEntry;
      var newPrice = entry && typeof entry === "object" ? entry.price : entry;
      var priceChanged = prevPrice !== newPrice;
      var stamp = priceChanged || !prevEntry ? toISO(new Date()) : (prevEntry && prevEntry.updatedAt);
      var merged = typeof entry === "object" ? Object.assign({}, entry) : { price: entry };
      merged.updatedAt = stamp;
      if (prevEntry && !priceChanged) {
        if (!merged.company && prevEntry.company) merged.company = prevEntry.company;
      }
      var next = Object.assign({}, prev);
      next[key] = merged;
      return next;
    });
  }
  function removeCatalogPrice(key) {
    setPriceCatalog(function(prev){
      var next = Object.assign({}, prev);
      delete next[key];
      return next;
    });
  }

  var [selected, setSelected] = useState(null);
  var [editing, setEditing] = useState(null);
  var [showNew, setShowNew] = useState(false);
  var [search, setSearch] = useState("");
  var [filterStatus, setFilterStatus] = useState("all");
  var [editingEvent, setEditingEvent] = useState(null);
  var [newEventDate, setNewEventDate] = useState(null);
  var [calendarSubTab, setCalendarSubTab] = useState("factory");
  var [printingOrder, setPrintingOrder] = useState(null);
  var [addingReportTo, setAddingReportTo] = useState(null);
  var [viewingReport, setViewingReport] = useState(null);

  function saveInstallationReport(report) {
    setOrders(function(prev){
      return prev.map(function(o){
        if (o.id !== report.orderId) return o;
        var existing = o.installationReports || [];
        var updated = Object.assign({}, o, { installationReports: existing.concat([report]) });
        setSelected(function(sel){ return sel && sel.id===o.id ? updated : sel; });
        return updated;
      });
    });
    setAddingReportTo(null);
  }
  var [purchaseOrders, setPurchaseOrders] = useLocalStorage("fac_purchase_orders", []);
  var [showNewPO, setShowNewPO] = useState(false);
  var [selectedPO, setSelectedPO] = useState(null);

  function savePurchaseOrder(po) {
    var isNew = !purchaseOrders.some(function(x){ return x.id===po.id; });
    setPurchaseOrders(function(prev){
      var i = prev.findIndex(function(x){ return x.id===po.id; });
      return i>=0 ? prev.map(function(x){ return x.id===po.id?po:x; }) : [po].concat(prev);
    });

    if (isNew && po.linkedOrderId) {
      var newMaterials = (po.items||[])
        .filter(function(it){ return it.name && it.name.trim(); })
        .map(function(it){
          var catKey = (it.name||"").trim().toLowerCase();
          var known = priceCatalog[catKey];
          var knownPrice = known ? (typeof known === "object" ? known.price : known) : 0;
          var knownCompany = known && typeof known === "object" ? known.company : "";
          return {
            name: it.name,
            company: knownCompany || po.supplier,
            price: knownPrice || 0,
            qty: Number(it.qty)||1
          };
        });
      if (newMaterials.length > 0) {
        setOrders(function(prev){
          return prev.map(function(o){
            if (o.id !== po.linkedOrderId) return o;
            return Object.assign({}, o, { materials: (o.materials||[]).concat(newMaterials) });
          });
        });
      }
    }

    setShowNewPO(false);
  }
  function deletePurchaseOrder(id) {
    setPurchaseOrders(function(prev){ return prev.filter(function(p){ return p.id!==id; }); });
    setSelectedPO(null);
  }
  function updatePurchaseOrder(po) {
    setPurchaseOrders(function(prev){
      return prev.map(function(p){ return p.id===po.id ? po : p; });
    });
    setSelectedPO(po);
  }

  var [quotes, setQuotes] = useLocalStorage("fac_quotes", []);
  var [showNewQuote, setShowNewQuote] = useState(false);
  var [selectedQuote, setSelectedQuote] = useState(null);
  var [editingQuote, setEditingQuote] = useState(null);

  function saveQuote(q) {
    setQuotes(function(prev){
      var i = prev.findIndex(function(x){ return x.id===q.id; });
      return i>=0 ? prev.map(function(x){ return x.id===q.id?q:x; }) : [q].concat(prev);
    });
    setShowNewQuote(false);
    setEditingQuote(null);
    setSelectedQuote(null);
  }
  function deleteQuote(id) {
    setQuotes(function(prev){ return prev.filter(function(q){ return q.id!==id; }); });
    setSelectedQuote(null);
  }
  function convertQuoteToOrder(q) {
    var newOrderId = makeId("ORD");
    var newMaterials = (q.items||[])
      .filter(function(it){ return it.name && it.name.trim(); })
      .map(function(it){
        var catKey = (it.name||"").trim().toLowerCase();
        var known = priceCatalog[catKey];
        var knownCompany = known && typeof known === "object" ? known.company : "";
        return {
          name: it.name,
          company: knownCompany || "",
          price: Number(it.price)||0,
          qty: Number(it.qty)||1
        };
      });
    var newOrder = {
      id: newOrderId,
      client: q.client,
      address: "",
      phone: q.phone || "",
      status: "plans",
      files: [],
      reports: [],
      materials: newMaterials,
      notes: q.notes || "",
      created: toISO(new Date())
    };
    setOrders(function(prev){ return [newOrder].concat(prev); });
    setQuotes(function(prev){
      return prev.map(function(x){ return x.id===q.id ? Object.assign({},x,{convertedOrderId:newOrderId}) : x; });
    });
    setSelectedQuote(null);
    setTab("orders");
  }

  var [customers, setCustomers] = useLocalStorage("fac_customers", []);
  var [showNewCustomer, setShowNewCustomer] = useState(false);
  var [selectedCustomer, setSelectedCustomer] = useState(null);
  var [customerSearch, setCustomerSearch] = useState("");
  var [customerSourceFilter, setCustomerSourceFilter] = useState("all");
  var [editingCustomer, setEditingCustomer] = useState(null);
  var [designers, setDesigners] = useLocalStorage("fac_designers", []);

  function saveCustomer(c) {
    setCustomers(function(prev){
      var i = prev.findIndex(function(x){ return x.id===c.id; });
      return i>=0 ? prev.map(function(x){ return x.id===c.id?c:x; }) : [c].concat(prev);
    });
    setShowNewCustomer(false);
    setEditingCustomer(null);
  }
  function deleteCustomer(id) {
    setCustomers(function(prev){ return prev.filter(function(c){ return c.id!==id; }); });
    setSelectedCustomer(null);
  }
  function saveDesigner(d) {
    setDesigners(function(prev){
      var i = prev.findIndex(function(x){ return x.id===d.id; });
      return i>=0 ? prev.map(function(x){ return x.id===d.id?d:x; }) : [d].concat(prev);
    });
  }
  function deleteDesigner(id) {
    setDesigners(function(prev){ return prev.filter(function(d){ return d.id!==id; }); });
  }

  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} />;

  var isAdmin = currentUser.role === "admin";
  var currentRole = ROLE_PRESETS[currentUser.role] || ROLE_PRESETS.viewer;

  // Tabs visible per role
  var TAB_PERMISSIONS = {
    admin:      ["orders","calendar","catalog","po","quotes","customers","designers","installers","reports","admin"],
    purchasing: ["orders","calendar","catalog","po","quotes","customers","designers","installers"],
    installer:  ["calendar","installers"],
    office:     ["orders","calendar","quotes","customers","designers"],
    designer:   ["orders","calendar","quotes","customers","designers"],
    viewer:     ["orders","calendar","installers"],
  };

  var currentRoleKey = currentUser ? currentUser.role : "viewer";
  var allowedTabs = TAB_PERMISSIONS[currentRoleKey] || TAB_PERMISSIONS.viewer;

  var TABS = [
    {id:"orders",     label:"הזמנות"},
    {id:"calendar",   label:"יומן"},
    {id:"catalog",    label:"מאגר חומרים"},
    {id:"po",         label:"הזמנות טובין"},
    {id:"quotes",     label:"הצעות מחיר"},
    {id:"customers",  label:"לקוחות"},
    {id:"designers",  label:"מעצבים"},
    {id:"installers", label:"מתקינים"},
  ].filter(function(t){ return allowedTabs.indexOf(t.id) >= 0; });
  if (isAdmin) TABS.push({id:"reports", label:"דוחות"});
  if (isAdmin) TABS.push({id:"admin", label:"משתמשים"});

  var filteredOrders = orders.filter(function(o){
    var q = search.trim().toLowerCase();
    var ms = !q || o.client.toLowerCase().indexOf(q) >= 0 || o.id.toLowerCase().indexOf(q) >= 0 || (o.phone||"").indexOf(q) >= 0 || (o.address||"").toLowerCase().indexOf(q) >= 0;
    if (!ms) return false;
    if (filterStatus === "all") return true;
    if (filterStatus === "__prod__") return ["ready","finishing","completed"].indexOf(o.status) < 0;
    return o.status === filterStatus;
  }).sort(function(a,b){
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return 0;
  });

  var counts = {all: orders.length};
  STATUSES.forEach(function(s){ counts[s.id] = orders.filter(function(o){ return o.status===s.id; }).length; });

  var thisWeekEvs = (function(){
    var ws = toISO(weekStart(new Date()));
    var we = toISO(addDays(weekStart(new Date()), 6));
    return events.filter(function(e){ return e.date >= ws && e.date <= we; }).length;
  })();

  function saveOrder(o){
    setOrders(function(prev){ var i=prev.findIndex(function(x){return x.id===o.id;}); return i>=0?prev.map(function(x){return x.id===o.id?o:x;}):[o].concat(prev); });
    setShowNew(false); setEditing(null); setSelected(o);
  }
  function deleteOrder(id){ setOrders(function(prev){return prev.filter(function(o){return o.id!==id;});}); setSelected(null); }
  function statusChange(id,ns){ setOrders(function(prev){return prev.map(function(o){return o.id===id?Object.assign({},o,{status:ns,statusUpdatedAt:toISO(new Date())}):o;});}); setSelected(function(p){return p?Object.assign({},p,{status:ns,statusUpdatedAt:toISO(new Date())}):null;}); }
  function saveEvent(ev){ setEvents(function(prev){ var i=prev.findIndex(function(e){return e.id===ev.id;}); return i>=0?prev.map(function(e){return e.id===ev.id?ev:e;}):[ev].concat(prev); }); setEditingEvent(null); setNewEventDate(null); }
  function deleteEvent(id){ if(window.confirm("למחוק?")) setEvents(function(prev){return prev.filter(function(e){return e.id!==id;});}); }

  var statChips = [
    {label:"סה\"כ", val:orders.length, filter:"all"},
    {label:"בייצור", val:orders.filter(function(o){return ["ready","finishing","completed"].indexOf(o.status)<0;}).length, filter:"__prod__"},
    {label:"מוכן להתקנה", val:orders.filter(function(o){return o.status==="ready";}).length, filter:"ready"},
    {label:"הושלמו", val:orders.filter(function(o){return o.status==="completed";}).length, filter:"completed"},
    {label:"אירועים השבוע", val:thisWeekEvs, filter:null},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"'Segoe UI',Arial,sans-serif",direction:"rtl"}}>
      <div style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)",padding:"24px 28px 0",color:"#fff"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:11,letterSpacing:2,color:"#a5b4fc",fontWeight:700}}>מערכת ניהול</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {editingName ?
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input value={nameInput} onChange={function(e){setNameInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"){setFactoryName(nameInput||factoryName);setEditingName(false);}if(e.key==="Escape")setEditingName(false);}} autoFocus={true} style={{fontSize:22,fontWeight:900,background:"rgba(255,255,255,0.15)",border:"2px solid rgba(255,255,255,0.5)",borderRadius:8,color:"#fff",padding:"4px 10px",outline:"none",fontFamily:"inherit",direction:"rtl",width:220}} />
                    <button onClick={function(){setFactoryName(nameInput||factoryName);setEditingName(false);}} style={{background:"#fff",color:"#4338ca",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:800,fontSize:13}}>שמור</button>
                    <button onClick={function(){setEditingName(false);}} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:13}}>ביטול</button>
                  </div>
                :
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <h1 style={{margin:"2px 0 0",fontSize:26,fontWeight:900}}>{"🪵 " + factoryName}</h1>
                    {isAdmin ? <button onClick={function(){setNameInput(factoryName);setEditingName(true);}} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"5px 8px",cursor:"pointer",fontSize:14,color:"rgba(255,255,255,0.7)",marginTop:4}}>✏️</button> : null}
                  </div>
                }
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 14px"}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,"+currentRole.color+"88,"+currentRole.color+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>{currentUser.name[0]}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{currentUser.name}</div>
                  <div style={{fontSize:10,color:"#c7d2fe"}}>{currentRole.label}</div>
                </div>
              </div>
              {(tab === "orders" || tab === "calendar" || tab === "po" || tab === "quotes" || tab === "customers" || tab === "designers") && currentUser.role !== "installer" && currentUser.role !== "viewer" ?
                <button onClick={function(){if(tab==="orders")setShowNew(true);else if(tab==="calendar")setNewEventDate(toISO(new Date()));else if(tab==="po")setShowNewPO(true);else if(tab==="quotes")setShowNewQuote(true);else if(tab==="designers")setTab("designers");else setShowNewCustomer(true);}} style={{background:"#fff",color:"#4338ca",border:"none",borderRadius:12,padding:"11px 22px",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.2)"}}>
                  {tab === "orders" ? "+ הזמנה חדשה" : tab === "calendar" ? "+ אירוע ביומן" : tab === "po" ? "+ הזמנת טובין" : tab === "quotes" ? "+ הצעת מחיר" : tab === "designers" ? "+ מעצב/ת" : "+ לקוח חדש"}
                </button>
              : null}
              {syncStatus === "syncing" ? <span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>🔄 מסנכרן...</span> : syncStatus === "offline" ? <span style={{fontSize:11,color:"#fca5a5"}}>⚠️ לא מחובר</span> : <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>✓ מסונכרן</span>}
              <button onClick={function(){setCurrentUser(null);}} style={{background:"rgba(255,255,255,0.12)",color:"#fff",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>יציאה</button>
            </div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
            {statChips.map(function(chip){
              var isActive = (chip.filter==="all"&&filterStatus==="all"&&tab==="orders")||(chip.filter&&chip.filter!=="__prod__"&&filterStatus===chip.filter&&tab==="orders")||(chip.filter==="__prod__"&&filterStatus==="__prod__"&&tab==="orders")||(chip.filter===null&&tab==="calendar");
              return (
                <button key={chip.label} onClick={function(){if(chip.filter===null){setTab("calendar");}else{setTab("orders");setFilterStatus(chip.filter);}}} style={{background:isActive?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)",border:isActive?"2px solid rgba(255,255,255,0.5)":"2px solid transparent",borderRadius:10,padding:"10px 18px",cursor:"pointer",textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>{chip.val}</div>
                  <div style={{fontSize:11,color:isActive?"#fff":"#c7d2fe",marginTop:2}}>{chip.label}</div>
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {TABS.map(function(t){
              return <button key={t.id} onClick={function(){setTab(t.id);}} style={{padding:"12px 20px",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#4338ca":"rgba(255,255,255,0.7)",borderRadius:tab===t.id?"10px 10px 0 0":"0",marginLeft:4,whiteSpace:"nowrap",flexShrink:0}}>{t.label}</button>;
            })}
          </div>
        </div>
      </div>

      {tab === "orders" ?
        <div>
          <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"14px 28px"}}>
            <div style={{maxWidth:1100,margin:"0 auto",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="חיפוש לפי שם, מספר הזמנה..." style={{flex:1,minWidth:200,padding:"9px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,outline:"none",direction:"rtl"}} />
              <select value={filterStatus} onChange={function(e){setFilterStatus(e.target.value);}} style={{padding:"9px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:13,cursor:"pointer",direction:"rtl"}}>
                <option value="all">{"כל הסטטוסים (" + counts.all + ")"}</option>
                <option value="__prod__">בייצור</option>
                {STATUSES.map(function(s){ return <option key={s.id} value={s.id}>{s.label + " (" + (counts[s.id]||0) + ")"}</option>; })}
              </select>
              {filterStatus !== "all" ? <button onClick={function(){setFilterStatus("all");}} style={{padding:"9px 14px",background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>נקה סינון</button> : null}
            </div>
          </div>
          <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 28px"}}>
            {filteredOrders.length === 0 ?
              <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
                <div style={{fontSize:48,marginBottom:12}}>📭</div>
                <div style={{fontSize:16,fontWeight:600}}>לא נמצאו הזמנות</div>
              </div>
            :
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                {filteredOrders.map(function(order){ return <OrderCard key={order.id} order={order} onClick={setSelected} />; })}
              </div>
            }
          </div>
        </div>
      : null}

      {tab === "calendar" ?
        <div style={{maxWidth:1100,margin:"0 auto",paddingTop:8}}>
          <div style={{display:"flex",gap:0,margin:"0 28px 16px",borderRadius:12,overflow:"hidden",border:"1.5px solid #e2e8f0",width:"fit-content"}}>
            <button onClick={function(){setCalendarSubTab("factory");}} style={{padding:"10px 20px",background:calendarSubTab==="factory"?"#3b82f6":"#fff",color:calendarSubTab==="factory"?"#fff":"#64748b",border:"none",cursor:"pointer",fontWeight:700,fontSize:13}}>
              🚚 הובלות והתקנות
            </button>
            {currentUser.role !== "installer" ?
              <button onClick={function(){setCalendarSubTab("showroom");}} style={{padding:"10px 20px",background:calendarSubTab==="showroom"?"#8b5cf6":"#fff",color:calendarSubTab==="showroom"?"#fff":"#64748b",border:"none",cursor:"pointer",fontWeight:700,fontSize:13}}>
                🏠 יומן תצוגה
              </button>
            : null}
          </div>
          <WeeklyCalendar
            events={events.filter(function(e){
              var t = EVENT_TYPES.find(function(x){return x.id===e.type;});
              var cal = t ? t.calendar : "factory";
              return calendarSubTab === "showroom" ? cal==="showroom" : cal==="factory";
            })}
            orders={orders}
            onAddEvent={setNewEventDate}
            onEditEvent={setEditingEvent}
            onDeleteEvent={deleteEvent}
          />
        </div>
      : null}

      {tab === "catalog" ? <CatalogView priceCatalog={priceCatalog} onUpdatePrice={updateCatalogPrice} onRemovePrice={removeCatalogPrice} /> : null}

      {tab === "po" ?
        <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 28px"}}>
          {purchaseOrders.length === 0 ?
            <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
              <div style={{fontSize:48,marginBottom:12}}>📦</div>
              <div style={{fontSize:16,fontWeight:600}}>אין הזמנות טובין עדיין</div>
              <div style={{fontSize:13,marginTop:4}}>לחץ על "+ הזמנת טובין" כדי ליצור הזמנה לספק</div>
            </div>
          :
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
              {purchaseOrders.map(function(po){ return <PurchaseOrderCard key={po.id} po={po} onClick={setSelectedPO} />; })}
            </div>
          }
        </div>
      : null}

      {tab === "quotes" ?
        <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 28px"}}>
          {quotes.length === 0 ?
            <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
              <div style={{fontSize:48,marginBottom:12}}>💰</div>
              <div style={{fontSize:16,fontWeight:600}}>אין הצעות מחיר עדיין</div>
              <div style={{fontSize:13,marginTop:4}}>לחץ על "+ הצעת מחיר" כדי ליצור הצעה ללקוח</div>
            </div>
          :
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
              {quotes.map(function(q){ return <QuoteCard key={q.id} quote={q} onClick={setSelectedQuote} />; })}
            </div>
          }
        </div>
      : null}

      {tab === "customers" ?
        <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 28px"}}>
          {customers.length === 0 ?
            <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
              <div style={{fontSize:48,marginBottom:12}}>👥</div>
              <div style={{fontSize:16,fontWeight:600}}>אין לקוחות עדיין</div>
              <div style={{fontSize:13,marginTop:4}}>לחץ על "+ לקוח חדש" כדי להוסיף לקוח למאגר</div>
            </div>
          :
            <div>
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                <input
                  value={customerSearch||""}
                  onChange={function(e){setCustomerSearch(e.target.value);}}
                  placeholder="חיפוש לפי שם, טלפון, כתובת..."
                  style={Object.assign({},inpStyle,{flex:1,minWidth:200})}
                />
                <select value={customerSourceFilter||"all"} onChange={function(e){setCustomerSourceFilter(e.target.value);}} style={Object.assign({},inpStyle,{width:"auto",minWidth:140,cursor:"pointer"})}>
                  <option value="all">כל המקורות</option>
                  {CUSTOMER_SOURCES.map(function(s){ return <option key={s} value={s}>{s}</option>; })}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
                {customers.filter(function(c){
                  var q = (customerSearch||"").trim().toLowerCase();
                  var matchSearch = !q || c.name.toLowerCase().indexOf(q)>=0 || (c.phone||"").indexOf(q)>=0 || (c.address||"").toLowerCase().indexOf(q)>=0;
                  var matchSource = !customerSourceFilter || customerSourceFilter==="all" || c.source===customerSourceFilter;
                  return matchSearch && matchSource;
                }).map(function(c){
                  var cnt = orders.filter(function(o){ return o.client === c.name; }).length;
                  return <CustomerCard key={c.id} customer={c} orderCount={cnt} onClick={setSelectedCustomer} />;
                })}
              </div>
            </div>
          }
        </div>
      : null}

      {tab === "designers" ?
        <DesignersView designers={designers} customers={customers} onSave={saveDesigner} onDelete={deleteDesigner} />
      : null}

      {tab === "installers" ?
        <InstallerWorkloadView users={users} orders={orders} onOrderClick={function(o){ setSelected(o); setTab("orders"); }} />
      : null}

      {tab === "reports" ? <ReportsView orders={orders} purchaseOrders={purchaseOrders} /> : null}

      {tab === "admin" ? <AdminDashboard users={users} onUpdateUsers={setUsers} /> : null}

      {selected && !editing ?
        <OrderDetail order={selected} onClose={function(){setSelected(null);}} onEdit={function(o){setEditing(o);}} onDelete={deleteOrder} onStatusChange={statusChange} factoryName={factoryName} onPrintMaterials={function(o){setPrintingOrder(o);}} canAddReport={(currentRole.permissions||[]).indexOf("add_report")>=0} onAddReport={function(o){setAddingReportTo(o);}} onViewReport={function(r){setViewingReport(r);}} users={users} onToggleUrgent={function(updated){ setOrders(function(prev){ return prev.map(function(o){ return o.id===updated.id?updated:o; }); }); setSelected(updated); }} />
      : null}

      {showNew || editing ?
        <Modal onClose={function(){setShowNew(false);setEditing(null);}}>
          <OrderForm initial={editing} onSave={saveOrder} onCancel={function(){setShowNew(false);setEditing(null);}} priceCatalog={priceCatalog} onPriceUpdate={updateCatalogPrice} users={users} />
        </Modal>
      : null}

      {newEventDate || editingEvent ?
        <Modal onClose={function(){setNewEventDate(null);setEditingEvent(null);}} wide={true}>
          <EventForm
            initial={editingEvent || (newEventDate ? {id:makeId("EVT"),type:calendarSubTab==="showroom"?"meeting":"installation",orderId:"",date:newEventDate,time:"08:00",team:"",teamIds:[],notes:""} : null)}
            calendarType={calendarSubTab}
            orders={orders}
            users={users}
            onSave={saveEvent}
            onCancel={function(){setNewEventDate(null);setEditingEvent(null);}}
          />
        </Modal>
      : null}

      {showNewPO ?
        <Modal onClose={function(){setShowNewPO(false);}} wide={true}>
          <PurchaseOrderForm orders={orders} onSave={savePurchaseOrder} onCancel={function(){setShowNewPO(false);}} />
        </Modal>
      : null}

      {selectedPO ?
        <PurchaseOrderDetail po={selectedPO} onClose={function(){setSelectedPO(null);}} onDelete={deletePurchaseOrder} onUpdate={updatePurchaseOrder} factoryName={factoryName} />
      : null}

      {(showNewQuote || editingQuote) ?
        <Modal onClose={function(){setShowNewQuote(false);setEditingQuote(null);}} wide={true}>
          <QuoteForm initial={editingQuote} onSave={saveQuote} onCancel={function(){setShowNewQuote(false);setEditingQuote(null);}} />
        </Modal>
      : null}

      {selectedQuote && !editingQuote ?
        <QuoteDetail quote={selectedQuote} onClose={function(){setSelectedQuote(null);}} onEdit={function(q){setEditingQuote(q);}} onDelete={deleteQuote} onConvert={convertQuoteToOrder} />
      : null}

      {(showNewCustomer || editingCustomer) ?
        <Modal onClose={function(){setShowNewCustomer(false);setEditingCustomer(null);}}>
          <CustomerForm initial={editingCustomer} designers={designers} onSave={saveCustomer} onCancel={function(){setShowNewCustomer(false);setEditingCustomer(null);}} />
        </Modal>
      : null}

      {selectedCustomer && !editingCustomer ?
        <CustomerDetail
          customer={selectedCustomer}
          relatedOrders={orders.filter(function(o){ return o.client === selectedCustomer.name; })}
          onClose={function(){setSelectedCustomer(null);}}
          onEdit={function(c){setEditingCustomer(c);}}
          onDelete={deleteCustomer}
          onOrderClick={function(o){ setSelectedCustomer(null); setSelected(o); setTab("orders"); }}
        />
      : null}

      {printingOrder ? <PrintableMaterials order={printingOrder} factoryName={factoryName} onClose={function(){setPrintingOrder(null);}} /> : null}

      {addingReportTo ?
        <Modal onClose={function(){setAddingReportTo(null);}} wide={true}>
          <InstallationReportForm order={addingReportTo} currentUserName={currentUser.name} onSave={saveInstallationReport} onCancel={function(){setAddingReportTo(null);}} />
        </Modal>
      : null}

      {viewingReport ? <ReportViewer report={viewingReport} onClose={function(){setViewingReport(null);}} /> : null}
    </div>
  );
}
