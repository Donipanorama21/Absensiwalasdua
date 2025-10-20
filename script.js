/* ---------- CONFIG: GANTI INI SETELAH DEPLOY APPS SCRIPT ---------- */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzpBIE-3Tor-M7HNGiOjmelWn36LchaHEY_AdIWiJLJ0eVMFI2BnnPIEf0QhDlbnDN3Pg/exec"; // contoh: https://script.google.com/macros/s/AKfy.../exec
/* ----------------------------------------------------------------- */

const STUDENTS = [
"ARDIKA SUGIARTO","ARIL OKTA PIANSYAH","ASBY ARIF RAMADHAN","AZRIEL AZHAR RACHMAN",
"BAYU MAULANA IBRAHIM","CRISTIAN TRI MULYANA","DEWA BRAJA","FAZRI MAULANA ROHMAN",
"GLENREYDOAN SARAGIH","IKRAM IRWANSYAH","KEFIN FAIZIN","MUHAMAD FATHANMUBINA KALIMUSADA",
"MUHAMMAD ALI FAQIH","MUHAMMAD ILYAS MAULANA","MUHAMMAD RHAGIEL ISKANDAR","RAKIDI",
"RIZIQ MAULANA","RIZKY FASYA IRAWAN","SYAHRU NABHAN","VINO RAMADAN","ZALFA RAPID"
];

document.addEventListener('DOMContentLoaded', () => {
  // login flow
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', login);
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // populate date / year / export selects
  populateDateSelect();
  populateYearSelect();
  populateExportMonthYear();

  // render student rows
  renderStudentRows();

  // default export month/year values
  const exportMonth = document.getElementById('exportMonth');
  if (exportMonth) exportMonth.value = (new Date()).getMonth()+1;
  const exportYear = document.getElementById('exportYear');
  if (exportYear) exportYear.value = new Date().getFullYear();

  // actions
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveAttendance);
  const summaryBtn = document.getElementById('summaryBtn');
  if (summaryBtn) summaryBtn.addEventListener('click', fetchSummary);
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', requestExport);
});

function showToast(message, type='success'){
  const t = document.getElementById('toast');
  if(!t) { alert(message); return; }
  t.textContent = message;
  t.className = 'toast ' + (type==='error' ? 'error' : 'success');
  t.style.display = 'block';
  setTimeout(()=>{ t.style.display='none'; }, 3800);
}

/* ---------- Login (simple, client-side) ---------- */
function login(){
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  // default demo account: wali / 12345
  const accounts = { 'wali':'12345' };
  if(accounts[user] && accounts[user] === pass){
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPage').style.display = 'block';
    showToast('Selamat datang, ' + user);
    fetchSummary(); // show initial summary
  } else {
    showToast('Nama pengguna atau kata sandi salah', 'error');
  }
}
function logout(){
  location.reload();
}

/* ---------- UI helpers ---------- */
function populateDateSelect(){
  const sel = document.getElementById('dateSelect');
  if(!sel) return;
  sel.innerHTML = '';
  for(let d=1; d<=31; d++){
    const opt = document.createElement('option'); opt.value=d; opt.textContent=d;
    sel.appendChild(opt);
  }
}
function populateYearSelect(){
  const sel = document.getElementById('yearSelect');
  if(!sel) return;
  sel.innerHTML = '';
  for(let y=2025; y<=2030; y++){
    const opt = document.createElement('option'); opt.value=y; opt.textContent=y;
    sel.appendChild(opt);
  }
}
function populateExportMonthYear(){
  const m = document.getElementById('exportMonth');
  if(m){
    m.innerHTML = '';
    for(let i=1;i<=12;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; m.appendChild(o); }
  }
  const y = document.getElementById('exportYear');
  if(y){
    y.innerHTML = '';
    for(let yy=2025; yy<=2030; yy++){ const o=document.createElement('option'); o.value=yy; o.textContent=yy; y.appendChild(o); }
  }
}

/* ---------- Students table ---------- */
function renderStudentRows(){
  const tbody = document.getElementById('studentsTbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  STUDENTS.forEach((name, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td>
      <td style="text-align:left;padding-left:12px">${name}</td>
      <td>
        <select data-name="${encodeURIComponent(name)}" class="statusSelect">
          <option value="Hadir">Hadir</option>
          <option value="Sakit">Sakit</option>
          <option value="Izin">Izin</option>
          <option value="Alfa">Alfa</option>
        </select>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- Save attendance (POST to Apps Script) ---------- */
async function saveAttendance(){
  // gather
  const day = document.getElementById('daySelect').value;
  const date = Number(document.getElementById('dateSelect').value);
  const month = Number(document.getElementById('monthSelect').value);
  const year = Number(document.getElementById('yearSelect').value);
  const semester = document.getElementById('semesterSelect').value;
  const note = (document.getElementById('noteInput') && document.getElementById('noteInput').value) || '';

  if(!day || !date || !month || !year || !semester){
    showToast('Lengkapi semua field tanggal & semester', 'error'); return;
  }

  const selects = Array.from(document.querySelectorAll('.statusSelect'));
  const entries = selects.map(s => ({ name: decodeURIComponent(s.dataset.name), status: s.value }));

  const payload = {
    action: 'save_row_per_date',
    day, date, month, year, semester, note, entries
  };

  try{
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    // check response
    const contentType = res.headers.get('content-type') || '';
    if(res.ok && contentType.includes('application/json')){
      const j = await res.json();
      if(j && j.success){
        showToast('✅ ' + j.message);
        fetchSummary();
      } else {
        showToast('❌ ' + (j && j.error ? j.error : 'Gagal menyimpan'), 'error');
      }
    } else if(res.ok && !contentType.includes('application/json')){
      // some environments may not return JSON (but Apps Script should). handle as success.
      showToast('✅ Data terkirim (tidak ada respon JSON).');
      fetchSummary();
    } else {
      // HTTP error
      const txt = await res.text();
      showToast('❌ Server error: ' + (txt || res.statusText), 'error');
    }
  }catch(err){
    console.error(err);
    showToast('❌ Error koneksi: ' + err.message, 'error');
  }
}

/* ---------- Summary (GET) ---------- */
async function fetchSummary(){
  try{
    const url = `${GOOGLE_SCRIPT_URL}?action=summary`;
    const res = await fetch(url);
    const j = await res.json();
    if(j && j.success){
      renderSummary(j.summary);
    } else {
      renderSummary([]);
      // showToast('Tidak ada data ringkasan', 'error');
    }
  }catch(err){
    console.error(err);
    showToast('❌ Gagal ambil ringkasan', 'error');
  }
}
function renderSummary(summary){
  const tbody = document.querySelector('#summaryTable tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  summary.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td style="text-align:left;padding-left:10px">${s.name}</td><td>${s.percent}%</td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- Export request (creates Excel in Drive & returns link) ---------- */
async function requestExport(){
  const type = document.getElementById('exportType').value;
  const month = Number(document.getElementById('exportMonth').value);
  const year = Number(document.getElementById('exportYear').value);
  const semester = document.getElementById('exportSemester').value;

  const params = { action:'export', type, month, year, semester };
  const q = new URLSearchParams(params).toString();
  try{
    showToast('Membuat file rekap... Harap tunggu (beberapa detik).');
    const res = await fetch(GOOGLE_SCRIPT_URL + '?' + q);
    const j = await res.json();
    if(j && j.success && j.fileUrl){
      // tampilkan link download
      const wrap = document.getElementById('downloadLinkWrap');
      if(wrap) wrap.innerHTML = `<a class="ghost" href="${j.fileUrl}" target="_blank">Download: ${j.fileName}</a>`;
      showToast('✅ File rekap siap di-download');
    } else {
      showToast('❌ Gagal membuat rekap: ' + (j && j.error ? j.error : 'tidak ada data'), 'error');
    }
  }catch(err){
    console.error(err);
    showToast('❌ Error saat membuat rekap', 'error');
  }
}
