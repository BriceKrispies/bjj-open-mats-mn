(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const l of o)if(l.type==="childList")for(const i of l.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function n(o){const l={};return o.integrity&&(l.integrity=o.integrity),o.referrerPolicy&&(l.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?l.credentials="include":o.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(o){if(o.ep)return;o.ep=!0;const l=n(o);fetch(o.href,l)}})();function F(){return new Date().toISOString().slice(0,10)}function B(){const e=new Date;return e.setDate(e.getDate()+1),e.toISOString().slice(0,10)}function R(){const e=F(),t=B();return[{id:"1",gym:"The Cellar Gym",city:"Minneapolis",date:e,time:"11:00 AM",endTime:"1:00 PM",rsvpCount:22,capacity:25,remaining:3,lat:44.9778,lon:-93.265,description:"Open mat for all levels. Gi and No-Gi welcome.",gi:!0,nogi:!0},{id:"2",gym:"Midwest Martial Arts",city:"Bloomington",date:e,time:"12:00 PM",endTime:"2:00 PM",rsvpCount:14,capacity:30,remaining:16,lat:44.8408,lon:-93.2983,description:"Saturday open mat. Beginners encouraged!",gi:!0,nogi:!1},{id:"3",gym:"Alliance MN",city:"St. Paul",date:e,time:"10:00 AM",endTime:"12:00 PM",rsvpCount:18,capacity:20,remaining:2,lat:44.9537,lon:-93.09,isNew:!0,createdAt:new Date().toISOString(),description:"Competition-focused rolling. All belts.",gi:!1,nogi:!0},{id:"4",gym:"Gracie Barra Edina",city:"Edina",date:e,time:"2:00 PM",endTime:"4:00 PM",rsvpCount:8,lat:44.8897,lon:-93.3499,description:"Casual open mat. No-Gi only.",gi:!1,nogi:!0},{id:"5",gym:"Minnesota Top Team",city:"Eagan",date:e,time:"3:00 PM",endTime:"5:00 PM",rsvpCount:11,capacity:15,remaining:4,lat:44.8041,lon:-93.1669,description:"MMA and grappling open mat.",gi:!0,nogi:!0},{id:"6",gym:"Warrior's Cove",city:"Minneapolis",date:t,time:"10:00 AM",endTime:"12:00 PM",rsvpCount:19,capacity:22,remaining:3,lat:44.9631,lon:-93.2683,description:"Sunday morning open mat.",gi:!0,nogi:!0},{id:"7",gym:"Academy MN",city:"Plymouth",date:t,time:"11:00 AM",endTime:"1:00 PM",rsvpCount:6,capacity:20,remaining:14,lat:45.0105,lon:-93.4555,isNew:!0,createdAt:new Date().toISOString(),description:"Friendly rolls, all levels.",gi:!0,nogi:!1},{id:"8",gym:"Tapped Out MMA",city:"St. Paul",date:t,time:"1:00 PM",endTime:"3:00 PM",rsvpCount:12,lat:44.9445,lon:-93.0962,description:"No-Gi only open mat.",gi:!1,nogi:!0},{id:"9",gym:"GB Maple Grove",city:"Maple Grove",date:t,time:"9:00 AM",endTime:"11:00 AM",rsvpCount:15,capacity:18,remaining:3,lat:45.0725,lon:-93.4558,description:"Morning open mat. Gi required.",gi:!0,nogi:!1},{id:"10",gym:"10th Planet Minneapolis",city:"Minneapolis",date:t,time:"4:00 PM",endTime:"6:00 PM",rsvpCount:9,capacity:25,remaining:16,lat:44.9489,lon:-93.2363,isNew:!0,createdAt:new Date().toISOString(),description:"No-Gi only. Rubber guard welcome.",gi:!1,nogi:!0}]}function S(e){return e.capacity?e.remaining!==void 0&&e.remaining<=3||e.rsvpCount/e.capacity>=.85:!1}const d=(e,t=16)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${e}</svg>`,r={clock:d('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),users:d('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),mapPin:d('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),calendar:d('<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>'),chevronLeft:d('<path d="M15 18l-6-6 6-6"/>'),chevronRight:d('<path d="M9 18l6-6-6-6"/>'),fire:d('<path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/>')},w=new Date,a={screen:"list",dateMode:"today",sortMode:"popular",filters:{gymId:"all",withinMiles:50,dateISO:""},detailId:null,events:[],calYear:w.getFullYear(),calMonth:w.getMonth(),selectedDate:m()};let v;function m(){return new Date().toISOString().slice(0,10)}function T(){const e=new Date;return e.setDate(e.getDate()+1),e.toISOString().slice(0,10)}function M(e){return String(e).padStart(2,"0")}function I(e,t,n){return`${e}-${M(t+1)}-${M(n)}`}function W(e){let t=e;switch(a.dateMode==="today"?t=t.filter(n=>n.date===m()):a.dateMode==="tomorrow"&&(t=t.filter(n=>n.date===T())),a.filters.gymId!=="all"&&(t=t.filter(n=>n.id===a.filters.gymId)),a.sortMode){case"popular":t.sort((n,s)=>s.rsvpCount-n.rsvpCount);break;case"nearest":t.sort((n,s)=>s.rsvpCount-n.rsvpCount);break;case"new":t.sort((n,s)=>n.isNew&&!s.isNew?-1:!n.isNew&&s.isNew?1:(s.createdAt??"").localeCompare(n.createdAt??""));break;case"all":t.sort((n,s)=>{const o=n.date.localeCompare(s.date);return o!==0?o:n.time.localeCompare(s.time)});break}return t}function C(e){const t=new Map;for(const n of e){const s=t.get(n.date)??[];s.push(n),t.set(n.date,s)}return t}function A(e){return e===m()?"Today":e===T()?"Tomorrow":new Date(e+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}function Y(e){return new Date(e+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}function H(e){const t=new Map;for(const n of e)t.has(n.gym)||t.set(n.gym,n.id);return[{id:"all",name:"All Gyms"},...Array.from(t,([n,s])=>({id:s,name:n}))]}function P(e){const t=S(e),n=[];return t&&n.push(`<span class="badge badge--warn">${r.fire} Almost Full!</span>`),e.isNew&&n.push('<span class="badge badge--success">NEW</span>'),`
    <div class="event-row" data-action="detail" data-id="${e.id}">
      <div class="event-row__info">
        <div class="event-row__name">${e.gym}</div>
        <div class="event-row__meta">
          <span>${r.mapPin} ${e.city}</span>
          <span>${r.clock} ${e.time} – ${e.endTime}</span>
        </div>
        <div class="event-row__meta" style="margin-top:4px">
          <span>${r.users} ${e.rsvpCount} RSVP</span>
          ${e.remaining!==void 0?`<span>${e.remaining} remaining</span>`:""}
          ${n.join(" ")}
        </div>
      </div>
      <div class="event-row__stats">
        <button class="btn btn--primary" data-action="detail" data-id="${e.id}">View Details</button>
      </div>
    </div>`}function z(e){const t=S(e);return`
    <div class="detail">
      <button class="btn btn--ghost" data-action="${a.screen==="calendar"?"backToCal":"back"}" style="margin-bottom:var(--space-md)">${r.chevronLeft} Back</button>
      <div class="card">
        <div class="card--section">
          <div class="detail__header">${e.gym}</div>
          <div style="color:var(--c-text-secondary);font-size:var(--font-sm)">${e.city}</div>
          ${t?`<div style="margin-top:var(--space-sm)"><span class="badge badge--warn">${r.fire} Almost Full!</span></div>`:""}
          ${e.isNew?'<div style="margin-top:var(--space-sm)"><span class="badge badge--success">NEW</span></div>':""}
        </div>
        <div class="card--section">
          <div class="detail__row"><span class="detail__label">Date</span><span>${A(e.date)}, ${e.date}</span></div>
          <div class="detail__row"><span class="detail__label">Time</span><span>${e.time} – ${e.endTime}</span></div>
          <div class="detail__row"><span class="detail__label">RSVPs</span><span>${e.rsvpCount}${e.capacity?` / ${e.capacity}`:""}</span></div>
          ${e.remaining!==void 0?`<div class="detail__row"><span class="detail__label">Remaining</span><span>${e.remaining}</span></div>`:""}
          <div class="detail__row"><span class="detail__label">Style</span><span>${[e.gi&&"Gi",e.nogi&&"No-Gi"].filter(Boolean).join(", ")||"Open"}</span></div>
        </div>
        ${e.description?`<div class="card--section" style="font-size:var(--font-sm);color:var(--c-text-secondary)">${e.description}</div>`:""}
        <div class="card--section">
          <button class="btn btn--primary" style="width:100%;justify-content:center">RSVP</button>
        </div>
      </div>
    </div>`}function b(){const e=W(a.events),t=H(a.events),n=[{key:"today",label:"Today"},{key:"tomorrow",label:"Tomorrow"},{key:"week",label:"This Week"}],s=[{key:"popular",label:"Popular"},{key:"nearest",label:"Nearest"},{key:"new",label:"New Events"},{key:"all",label:"All Events"}],o=C(e);let l="";for(const[i,p]of o)l+=`
      <div class="section-title">${A(i)}</div>
      <div class="card">
        ${p.map(P).join("")}
      </div>`;return e.length===0&&(l='<div style="padding:var(--space-2xl);text-align:center;color:var(--c-text-muted)">No events found</div>'),`
    <div class="header">
      <div class="row">
        <div>
          <div class="header__title">OpenMatsMN</div>
          <div class="header__subtitle">Find open mats near you</div>
        </div>
        <div class="right">
          <button class="btn" data-action="openCalendar">${r.calendar} Calendar</button>
        </div>
      </div>
      <div style="margin-top:var(--space-md)">
        <div class="segmented">
          ${n.map(i=>`<button class="segmented__item${a.dateMode===i.key?" segmented__item--active":""}" data-action="dateMode" data-value="${i.key}">${i.label}</button>`).join("")}
        </div>
      </div>
    </div>
    <div class="filters">
      <select class="select" data-action="gymFilter">
        ${t.map(i=>`<option value="${i.id}"${a.filters.gymId===i.id?" selected":""}>${i.name}</option>`).join("")}
      </select>
      <select class="select" data-action="distanceFilter">
        ${[5,10,25,50].map(i=>`<option value="${i}"${a.filters.withinMiles===i?" selected":""}>${i} mi</option>`).join("")}
      </select>
    </div>
    <div class="tabs">
      ${s.map(i=>`<button class="tabs__item${a.sortMode===i.key?" tabs__item--active":""}" data-action="sortMode" data-value="${i.key}">${i.label}</button>`).join("")}
    </div>
    <div style="padding-bottom:var(--space-2xl)">
      ${l}
    </div>`}function V(){const{calYear:e,calMonth:t,selectedDate:n}=a,s=m(),o=new Date(e,t,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}),l=new Date(e,t+1,0).getDate(),i=new Date(e,t,1).getDay(),p=C(a.events);let g=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(c=>`<div class="cal__dow">${c}</div>`).join("");for(let c=0;c<i;c++)g+='<div class="cal__cell cal__cell--empty"></div>';for(let c=1;c<=l;c++){const u=I(e,t,c),L=u===s,O=u===n,y=p.get(u)??[],E=y.slice(0,3).map(f=>`<span class="pill" data-action="detail" data-id="${f.id}">${f.time.replace(/:00/g,"")} ${f.gym.split(" ")[0]}</span>`).join(""),j=y.length>3?`<span class="pill" style="background:var(--c-muted-bg);color:var(--c-text-secondary)">+${y.length-3}</span>`:"",G=["cal__cell",L?"cal__cell--today":"",O?"cal__cell--selected":""].filter(Boolean).join(" ");g+=`
      <div class="${G}" data-action="selectDay" data-date="${u}">
        <span class="cal__day">${c}</span>
        <div class="cal__pills">${E}${j}</div>
      </div>`}const h=p.get(n)??[],N=h.length>0?`<div class="card">${h.map(P).join("")}</div>`:'<div style="padding:var(--space-2xl);text-align:center;color:var(--c-text-muted)">No open mats</div>';return`
    <div class="header">
      <div class="row">
        <button class="btn btn--ghost" data-action="backToList">${r.chevronLeft} Back</button>
        <div class="grow" style="text-align:center">
          <div class="header__title" style="font-size:var(--font-lg)">OpenMatsMN</div>
        </div>
        <div style="width:60px"></div>
      </div>
    </div>
    <div class="cal">
      <div class="cal__header">
        <button class="btn btn--ghost" data-action="prevMonth">${r.chevronLeft}</button>
        <span class="cal__header-title">${o}</span>
        <button class="btn btn--ghost" data-action="nextMonth">${r.chevronRight}</button>
      </div>
      <div class="cal__grid">
        ${g}
      </div>
      <div class="cal__detail">
        <div class="cal__detail-heading">${Y(n)}</div>
        ${N}
      </div>
    </div>`}function x(){if(a.detailId){const e=a.events.find(t=>t.id===a.detailId);v.innerHTML=e?z(e):b()}else a.screen==="calendar"?v.innerHTML=V():v.innerHTML=b()}function $(){const e=new Date(a.calYear,a.calMonth+1,0).getDate(),t=parseInt(a.selectedDate.slice(8),10),n=Math.min(t,e);a.selectedDate=I(a.calYear,a.calMonth,n)}function _(e,t){switch(e){case"dateMode":a.dateMode=t.dataset.value??"today",a.detailId=null;break;case"sortMode":a.sortMode=t.dataset.value??"popular";break;case"detail":a.detailId=t.dataset.id??null,window.location.hash=a.detailId?`/event/${a.detailId}`:"";return;case"back":a.detailId=null,a.screen="list",window.location.hash="";return;case"backToCal":a.detailId=null,window.location.hash="/calendar";return;case"openCalendar":a.screen="calendar",a.detailId=null,window.location.hash="/calendar";return;case"backToList":a.screen="list",a.detailId=null,window.location.hash="";return;case"prevMonth":a.calMonth===0?(a.calMonth=11,a.calYear--):a.calMonth--,$();break;case"nextMonth":a.calMonth===11?(a.calMonth=0,a.calYear++):a.calMonth++,$();break;case"selectDay":a.selectedDate=t.dataset.date??a.selectedDate;break;case"gymFilter":a.filters.gymId=t.value;break;case"distanceFilter":a.filters.withinMiles=parseInt(t.value,10);break;default:return}x()}async function q(){try{const e=await fetch("/data/events.json");if(e.ok){a.events=await e.json();return}}catch{}a.events=R()}function k(){const e=window.location.hash.replace("#",""),t=e.match(/^\/event\/(.+)$/);t?a.detailId=t[1]:e==="/calendar"?(a.screen="calendar",a.detailId=null):(a.screen="list",a.detailId=null),x()}async function U(e){v=e,await q(),k(),v.addEventListener("click",t=>{const n=t.target.closest("[data-action]");n&&_(n.dataset.action,n)}),v.addEventListener("change",t=>{const n=t.target;n.dataset.action&&_(n.dataset.action,n)}),window.addEventListener("hashchange",k)}const D=document.getElementById("app");D&&U(D);"serviceWorker"in navigator&&navigator.serviceWorker.register("/sw.js");
