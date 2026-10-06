const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const state = {
  totalSlots: 12,
  occupied: [],
  revenue: 0,
  securityFails: 0,
  securityEvents: [],
  currentMain: "q0",
  activity: [],
  dfaRuns: 0,
  nfaRuns: 0,
  regexRuns: 0,
  payment: 0,
  fee: 80,
  plate: "MH12AB1234"
};

const dfaStates = [
  ["q0","M/H","q1","State prefix"],
  ["q1","H/H","q1","State prefix"],
  ["q1","0-9","q2","District begins"],
  ["q2","0-9","q3","District complete"],
  ["q3","A-Z","q4","Series begins"],
  ["q4","A-Z","q5","Series complete"],
  ["q5","0-9","q6","Number begins"],
  ["q6","0-9","q7","Number"],
  ["q7","0-9","q8","Number"],
  ["q8","0-9","q9","Final digit"],
  ["q9","END","qA","ACCEPT"]
];

function now(){ return new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.remove("show"),2200); }
function log(msg,type=""){ state.activity.unshift({time:now(),msg,type}); state.activity=state.activity.slice(0,30); renderActivity(); }
function renderActivity(){
  $("#activityLog").innerHTML = state.activity.length ? state.activity.map(x=>`<div class="log-item ${x.type}"><span>${x.time}</span>${x.msg}</div>`).join("") : `<div class="log-item"><span>${now()}</span>System initialized. Waiting for vehicle.</div>`;
}
function updateStats(){
  const occupied=state.occupied.length, total=state.totalSlots, pct=Math.round(occupied/total*100);
  $("#availableSlots").textContent=total-occupied; $("#totalSlots").textContent=total;
  $("#occupiedSlots").textContent=occupied; $("#revenue").textContent="₹"+state.revenue;
  $("#securityEvents").textContent=state.securityEvents.length;
  $("#capacityPercent").textContent=pct+"%"; $("#capacityText").textContent=`${occupied} / ${total} slots occupied`;
  $("#capacityBar").style.width=pct+"%";
  $(".capacity-ring").style.background=`conic-gradient(var(--accent2) ${pct}%, #27313d ${pct}%)`;
  $("#capacityStatus").textContent=pct>=100?"PARKING FULL":pct>=80?"High occupancy":"Parking available";
  $$(".slot").forEach((el,i)=>el.classList.toggle("occupied",state.occupied.includes(i+1)));
}
function renderSlots(){
  $("#slotGrid").innerHTML=Array.from({length:state.totalSlots},(_,i)=>`<div class="slot ${state.occupied.includes(i+1)?"occupied":""}" data-slot="${i+1}"><b>P${String(i+1).padStart(2,"0")}</b><span>${state.occupied.includes(i+1)?"OCCUPIED":"FREE"}</span></div>`).join("");
}
function setMainState(q){
  state.currentMain=q; $("#globalState").textContent=q;
  const order=["q0","q1","q2","q3","q4","q5","q6","q7","q8"], idx=order.indexOf(q);
  $$("#mainStateMachine .node").forEach(n=>{const i=order.indexOf(n.dataset.state);n.classList.toggle("current",n.dataset.state===q);n.classList.toggle("done",i>=0 && i<idx);});
}
function simulateVehicle(){
  if(state.occupied.length>=state.totalSlots){ log("Entry rejected — parking capacity reached.","error"); setMainState("q3"); triggerSecurity("Parking-full entry attempt"); toast("Parking is full."); return; }
  const sequence=["q0","q1","q2","q3","q4","q5"];
  sequence.forEach((q,i)=>setTimeout(()=>setMainState(q),i*450));
  setTimeout(()=>{
    const slot=Array.from({length:state.totalSlots},(_,i)=>i+1).find(x=>!state.occupied.includes(x));
    state.occupied.push(slot); renderSlots(); updateStats();
    const el=$(`.slot[data-slot="${slot}"]`); if(el){el.classList.add("just-filled");setTimeout(()=>el.classList.remove("just-filled"),700);}
    state.plate="MH"+String(10+slot).padStart(2,"0")+"AB"+String(1000+slot);
    log(`Vehicle ${state.plate} validated and allocated to P${String(slot).padStart(2,"0")}.`,"success");
    toast(`Vehicle parked at P${String(slot).padStart(2,"0")}`);
  },sequence.length*450);
}

function setupDfa(){
  $("#dfaTable").innerHTML=dfaStates.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("");
}
function runDfa(){
  const input=$("#dfaInput").value.trim().toUpperCase(), display=$("#dfaDisplay"), result=$("#dfaResult");
  state.dfaRuns++; display.innerHTML="";
  const pattern=/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
  [...input].forEach((c,i)=>{const d=document.createElement("div");d.className="dfa-char";d.innerHTML=`<b>${c}</b><small>step ${i+1}</small>`;display.appendChild(d);setTimeout(()=>d.classList.add("active"),i*110);setTimeout(()=>d.classList.remove("active"),i*110+280);});
  setTimeout(()=>{const ok=pattern.test(input);result.className="result-box "+(ok?"ok":"bad");result.innerHTML=ok?`✓ ACCEPTED — <b>${input}</b> belongs to the regular language L.`:`✗ REJECTED — <b>${input||"ε"}</b> is not accepted by this DFA.`;log(`DFA processed "${input||"ε"}" → ${ok?"ACCEPT":"REJECT"}`,ok?"success":"error");},Math.max(300,input.length*120));
}

function runNfa(){
  const input=$("#nfaInput").value.trim().toUpperCase(), visual=$("#nfaVisual"), result=$("#nfaResult");
  state.nfaRuns++; visual.innerHTML="";
  const wrap=document.createElement("div");wrap.className="nfa-path";visual.appendChild(wrap);
  const nodes=["q0","q1","q2","q3","q4","q5"];
  nodes.forEach((n,i)=>{const el=document.createElement("div");el.className="nfa-node";el.textContent=n;wrap.appendChild(el);if(i<nodes.length-1){const a=document.createElement("span");a.textContent="→";a.style.color="#596678";wrap.appendChild(a);}});
  const valid=/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/.test(input);
  $$(".nfa-node",visual).forEach((n,i)=>setTimeout(()=>n.classList.add("active"),i*180));
  setTimeout(()=>{if(valid)$(".nfa-node:last-child",visual).classList.add("accept");result.className="result-box "+(valid?"ok":"bad");result.innerHTML=valid?`✓ NFA found an accepting path for <b>${input}</b>.`:`✗ No accepting path exists for <b>${input||"ε"}</b>.`;log(`NFA explored paths for "${input||"ε"}" → ${valid?"ACCEPT":"REJECT"}`,valid?"success":"error");},nodes.length*190);
}

function runRegex(){
  const p=$("#regexPattern").value, input=$("#regexInput").value, result=$("#regexResult"), meter=$("#regexMeter");
  state.regexRuns++;
  let ok=false,error="";
  try{ok=new RegExp(p).test(input)}catch(e){error="Invalid regular expression."}
  meter.style.width=ok?"100%":"18%"; meter.style.background=ok?"var(--accent2)":"var(--danger)";
  result.className="result-box "+(ok?"ok":"bad");
  result.textContent=error|| (ok?`✓ MATCH — "${input}" belongs to the language defined by the regex.`:`✗ NO MATCH — "${input}" does not belong to the language.`);
  log(`Regex validation "${input}" → ${error?"ERROR":ok?"MATCH":"NO MATCH"}`,ok?"success":"error");
}

function renderPayment(){
  $("#paidDisplay").textContent="₹"+state.payment;
  const max=Math.ceil(state.fee/20)*20;
  const count=Math.max(5,Math.ceil(max/20)+2);
  $("#paymentStates").innerHTML=Array.from({length:count},(_,i)=>{
    const amount=i*20, active=state.payment===amount, accept=amount>=state.fee;
    return `<div class="pstate ${active?"active":""} ${accept?"accept":""}"><b>qP${i}</b><small>₹${amount}${accept?" · ACCEPT":""}</small></div>`;
  }).join("");
  $("#paymentTable").innerHTML=Array.from({length:Math.min(count,8)},(_,i)=>`<tr><td>qP${i}</td><td>₹${i*20}</td><td>${i*20>=state.fee?"Accept payment":"Accept next denomination"}</td></tr>`).join("");
}
function addPayment(amount){
  state.payment+=amount; renderPayment();
  $("#paymentResult").className="result-box";
  $("#paymentResult").textContent=state.payment>=state.fee?`Payment state qP${Math.floor(state.payment/20)} — fee satisfied. Excess: ₹${state.payment-state.fee}.`:`Payment state qP${Math.floor(state.payment/20)} — ₹${state.fee-state.payment} remaining.`;
}
function completePayment(){
  if(state.payment<state.fee){$("#paymentResult").className="result-box bad";$("#paymentResult").textContent=`✗ REJECT — ₹${state.fee-state.payment} still required.`;triggerSecurity("Insufficient payment attempt");return;}
  const paid=state.payment; state.revenue+=state.fee; state.payment=0; renderPayment(); updateStats();
  $("#paymentResult").className="result-box ok";$("#paymentResult").textContent=`✓ ACCEPT — ₹${paid} received. Payment automaton reached an accepting state.`;
  log(`Payment accepted. Revenue increased by ₹${state.fee}.`,"success"); setMainState("q8"); toast("Payment accepted.");
}
function resetPayment(){state.payment=0;renderPayment();$("#paymentResult").className="result-box";$("#paymentResult").textContent="Payment state qP0 — waiting for input."}

function triggerSecurity(reason){
  state.securityFails++;
  const level=Math.min(state.securityFails,3), names=["NORMAL","WARNING","ALERT","BLOCKED"];
  state.securityEvents.unshift({time:now(),reason,state:`qS${level}`});
  state.securityEvents=state.securityEvents.slice(0,20);
  const box=$("#securityState");box.className="security-state "+(level===1?"warning":level===2?"alert":level===3?"blocked":"");
  box.innerHTML=`<span>qS${level}</span><strong>${names[level]}</strong><small>${reason}</small>`;
  $("#securityLog").innerHTML=state.securityEvents.map(e=>`<div class="security-event"><b>${e.time}</b> · ${e.state} · ${e.reason}</div>`).join("");
  updateStats(); log(`Security event: ${reason} → qS${level}`,level>=3?"error":"");
  if(level===3)toast("SECURITY BLOCKED");
}
function clearSecurity(){state.securityFails=0;state.securityEvents=[];$("#securityState").className="security-state";$("#securityState").innerHTML="<span>qS0</span><strong>NORMAL</strong><small>System secure</small>";$("#securityLog").innerHTML="";updateStats();toast("Security state reset.");}

function reportHTML(){
  const occupied=state.occupied.length, pct=Math.round(occupied/state.totalSlots*100);
  return `<div class="report-header"><div><h2>Smart Parking 2.0</h2><p>Automata-Based Parking & Access Control Simulator</p></div><div><b>ISE REPORT</b><br><small>${new Date().toLocaleString()}</small></div></div>
  <div class="report-section"><h3>1. Simulation Summary</h3><table class="report-table"><tr><th>Metric</th><th>Value</th></tr><tr><td>Parking capacity</td><td>${state.totalSlots} slots</td></tr><tr><td>Occupied</td><td>${occupied} (${pct}%)</td></tr><tr><td>Revenue</td><td>₹${state.revenue}</td></tr><tr><td>Security events</td><td>${state.securityEvents.length}</td></tr><tr><td>Current global state</td><td>${state.currentMain}</td></tr></table></div>
  <div class="report-section"><h3>2. Automata Modules Implemented</h3><ul><li>DFA-based vehicle number validation and deterministic state transitions.</li><li>NFA path exploration for the same regular language.</li><li>Regular Expression validator for vehicle identifiers.</li><li>Parking capacity represented as finite occupancy states.</li><li>Payment automaton with accepting states after sufficient payment.</li><li>Security FSM for invalid events: NORMAL → WARNING → ALERT → BLOCKED.</li><li>Live state visualization, transition tables and simulation logs.</li></ul></div>
  <div class="report-section"><h3>3. Execution Statistics</h3><table class="report-table"><tr><th>Engine</th><th>Runs</th></tr><tr><td>DFA</td><td>${state.dfaRuns}</td></tr><tr><td>NFA</td><td>${state.nfaRuns}</td></tr><tr><td>Regex</td><td>${state.regexRuns}</td></tr></table></div>
  <div class="report-section"><h3>4. Formal Language Interpretation</h3><p>The system demonstrates how regular languages can model real-world validation and control workflows. A configuration is represented by a finite state, while valid input causes transitions according to the transition function. Accepting states represent successful completion.</p></div>
  <div class="report-section"><h3>5. Conclusion</h3><p>Smart Parking 2.0 demonstrates practical application of DFA, NFA, regular expressions and finite-state control in an interactive parking environment.</p></div>`;
}
function renderReport(){ $("#reportPreview").innerHTML=reportHTML(); }

function resetAll(){
  state.occupied=[];state.revenue=0;state.securityFails=0;state.securityEvents=[];state.currentMain="q0";state.activity=[];state.dfaRuns=0;state.nfaRuns=0;state.regexRuns=0;state.payment=0;
  renderSlots();updateStats();renderActivity();renderPayment();clearSecurity();setMainState("q0");renderReport();toast("Simulation reset.");
}
function downloadJSON(){
  const payload={project:"Smart Parking 2.0",generatedAt:new Date().toISOString(),capacity:{total:state.totalSlots,occupied:state.occupied.length,available:state.totalSlots-state.occupied.length},revenue:state.revenue,security:{events:state.securityEvents,failCount:state.securityFails},engines:{dfaRuns:state.dfaRuns,nfaRuns:state.nfaRuns,regexRuns:state.regexRuns},currentState:state.currentMain};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}), a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="smart-parking-2-report.json";a.click();URL.revokeObjectURL(a.href);
}

$$(".tab").forEach(tab=>tab.addEventListener("click",()=>{$$(".tab").forEach(t=>t.classList.remove("active"));tab.classList.add("active");$$(".page").forEach(p=>p.classList.remove("active"));$("#"+tab.dataset.tab).classList.add("active");if(tab.dataset.tab==="report")renderReport();window.scrollTo({top:0,behavior:"smooth"});}));
$("#simulateVehicleBtn").addEventListener("click",simulateVehicle);$("#runDfa").addEventListener("click",runDfa);$("#runNfa").addEventListener("click",runNfa);$("#runRegex").addEventListener("click",runRegex);
$$(".money-buttons button").forEach(b=>b.addEventListener("click",()=>addPayment(Number(b.dataset.money))));
$("#completePayment").addEventListener("click",completePayment);$("#resetPayment").addEventListener("click",resetPayment);
$("#invalidPlate").addEventListener("click",()=>triggerSecurity("Invalid vehicle plate"));$("#invalidPayment").addEventListener("click",()=>triggerSecurity("Invalid payment sequence"));$("#unauthorized").addEventListener("click",()=>triggerSecurity("Unauthorized entry attempt"));$("#clearSecurity").addEventListener("click",clearSecurity);
$("#reportBtn").addEventListener("click",()=>{$$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab==="report"));$$(".page").forEach(p=>p.classList.toggle("active",p.id==="report"));renderReport();window.scrollTo({top:0,behavior:"smooth"});});
$("#printReport").addEventListener("click",()=>window.print());$("#downloadReport").addEventListener("click",downloadJSON);$("#resetBtn").addEventListener("click",resetAll);
$("#year").textContent=new Date().getFullYear();
renderSlots();setupDfa();renderActivity();updateStats();renderPayment();renderReport();setMainState("q0");
log("FAFL simulation engine initialized.","success");
