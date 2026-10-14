const STORAGE_KEY = "paperpilot.documents.v1";
const fileInput = document.getElementById("fileInput");
const toast = document.getElementById("toast");
const dialog = document.getElementById("detailDialog");
let documents = loadDocuments();
let toastTimer;

function loadDocuments(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []}}
function saveDocuments(){localStorage.setItem(STORAGE_KEY,JSON.stringify(documents));renderAll()}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function formatSize(bytes){if(!bytes)return "0 KB";return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`}
function formatDate(value){return new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function getType(name){const n=name.toLowerCase();if(/invoice|bill/.test(n))return "Invoice";if(/receipt|payment|expense/.test(n))return "Receipt";return "Other"}
function getExtension(name){return (name.split(".").pop()||"FILE").toUpperCase().slice(0,4)}
function fileClass(name){const ext=getExtension(name);if(["PNG","JPG","JPEG","WEBP"].includes(ext))return "image";if(ext==="PDF")return "pdf";return ""}
function showToast(message){toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),3000)}
function rowMarkup(doc,withActions=false){return `<div class="${withActions?"document-card":"doc-row"}"><div class="file-icon ${fileClass(doc.name)}">${escapeHTML(getExtension(doc.name))}</div><div class="doc-info"><b title="${escapeHTML(doc.name)}">${escapeHTML(doc.name)}</b><small>${escapeHTML(doc.type)} · ${formatSize(doc.size)} · ${formatDate(doc.addedAt)}</small></div>${withActions?`<div class="document-actions"><button class="small-action" data-detail="${doc.id}">Details</button><button class="small-action delete" data-delete="${doc.id}">Delete</button></div>`:`<span class="type-tag">${escapeHTML(doc.type)}</span><button class="row-menu" aria-label="Document details" data-detail="${doc.id}">···</button>`}</div>`}
function renderAll(){
  document.getElementById("docCount").textContent=documents.length;
  document.getElementById("totalStat").textContent=documents.length;
  document.getElementById("invoiceStat").textContent=documents.filter(d=>d.type==="Invoice").length;
  document.getElementById("receiptStat").textContent=documents.filter(d=>d.type==="Receipt").length;
  const recent=[...documents].sort((a,b)=>b.addedAt-a.addedAt).slice(0,4);
  document.getElementById("recentList").innerHTML=recent.length?recent.map(d=>rowMarkup(d)).join(""):`<div class="empty-state"><span>▤</span><b>Your desk is clear</b><p>Add an invoice or receipt to get started.</p></div>`;
  renderDocuments();
}
function renderDocuments(){
  const query=(document.getElementById("searchInput")?.value||"").toLowerCase();
  const filter=document.getElementById("filterSelect")?.value||"all";
  const items=documents.filter(d=>(d.name.toLowerCase().includes(query)||d.type.toLowerCase().includes(query))&&(filter==="all"||d.type===filter)).sort((a,b)=>b.addedAt-a.addedAt);
  document.getElementById("allDocuments").innerHTML=items.length?items.map(d=>rowMarkup(d,true)).join(""):`<div class="empty-state" style="grid-column:1/-1;background:white;border:1px solid var(--line);border-radius:12px"><span>⌕</span><b>${documents.length?"No matching documents":"No documents yet"}</b><p>${documents.length?"Try another search or filter.":"Add files from your device to build your document library."}</p></div>`;
}
function navigate(view){
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("active"));
  document.getElementById(view+"View").classList.add("active");
  document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
  const names={dashboard:"Overview",documents:"Documents",privacy:"Privacy center"};
  document.getElementById("breadcrumbTitle").textContent=names[view];
  if(view==="documents")renderDocuments();
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.view)));
document.getElementById("viewAllBtn").addEventListener("click",()=>navigate("documents"));
document.getElementById("privacyLearnBtn").addEventListener("click",()=>navigate("privacy"));
document.getElementById("searchInput").addEventListener("input",renderDocuments);
document.getElementById("filterSelect").addEventListener("change",renderDocuments);

async function addFiles(fileList){
  const files=Array.from(fileList||[]);if(!files.length)return;
  const allowed=["pdf","png","jpg","jpeg","txt"];
  let added=0;
  for(const file of files){
    const ext=file.name.split(".").pop().toLowerCase();
    if(!allowed.includes(ext)){showToast(`${file.name}: unsupported file type`);continue}
    if(file.size>10*1024*1024){showToast(`${file.name}: exceeds the 10 MB limit`);continue}
    if(documents.some(d=>d.name===file.name&&d.size===file.size)){showToast(`${file.name} is already in your library`);continue}
    documents.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name:file.name,size:file.size,type:getType(file.name),addedAt:Date.now()});added++;
  }
  saveDocuments();fileInput.value="";
  if(added)showToast(`${added} document${added===1?"":"s"} added to your local library`);
}
fileInput.addEventListener("change",e=>addFiles(e.target.files));
const dropzone=document.getElementById("dropzone");
["dragenter","dragover"].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();dropzone.classList.add("dragover")}));
["dragleave","drop"].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();dropzone.classList.remove("dragover")}));
dropzone.addEventListener("drop",e=>addFiles(e.dataTransfer.files));

document.addEventListener("click",e=>{
  const detail=e.target.closest("[data-detail]");
  const del=e.target.closest("[data-delete]");
  if(detail){const doc=documents.find(d=>d.id===detail.dataset.detail);if(doc)showDetails(doc)}
  if(del){const doc=documents.find(d=>d.id===del.dataset.delete);if(doc&&confirm(`Delete "${doc.name}" from this local library?`)){documents=documents.filter(d=>d.id!==doc.id);saveDocuments();showToast("Document record deleted")}}
});
function showDetails(doc){
  document.getElementById("detailContent").innerHTML=`<div class="file-icon ${fileClass(doc.name)}">${escapeHTML(getExtension(doc.name))}</div><h2>${escapeHTML(doc.name)}</h2><p>Document record stored in your local PaperPilot workspace.</p><div class="detail-meta"><b>Category:</b> ${escapeHTML(doc.type)}<br><b>File size:</b> ${formatSize(doc.size)}<br><b>Added:</b> ${formatDate(doc.addedAt)}<br><b>Privacy:</b> Local index only</div><p>Note: this prototype stores the document's name and metadata, not its file contents. It does not upload or analyze the file.</p>`;
  dialog.showModal();
}
document.getElementById("closeDialog").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
document.getElementById("clearAllBtn").addEventListener("click",()=>{
  if(!documents.length){showToast("Your library is already empty");return}
  if(confirm("Delete every document record from this browser? This cannot be undone.")){documents=[];saveDocuments();showToast("All document records cleared")}
});
document.getElementById("helpBtn").addEventListener("click",()=>showToast("Tip: add files, search your library, and categorize records. Everything stays in this browser."));
renderAll();
