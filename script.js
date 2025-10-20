/* ---------- CONFIG: GANTI INI DENGAN KUNCI SUPABASE ANDA ---------- */
const SUPABASE_URL = "https://pdjsytahwnedkfkbytlf.supabase.co";       // Contoh: https://abcde12345.supabase.co
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkanN5dGFod25lZGtma2J5dGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIzMDAsImV4cCI6MjA3NjUxODMwMH0.3-G2yP4OdQkpUeQBtl_x08HDmGPQxAhjX31cfl2UBjY";     // Contoh: eyJ...
/* ------------------------------------------------------------- */

// Inisialisasi Supabase Client
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const STUDENTS = [
"ARDIKA SUGIARTO","ARIL OKTA PIANSYAH","ASBY ARIF RAMADHAN","AZRIEL AZHAR RACHMAN",
"BAYU MAULANA IBRAHIM","CRISTIAN TRI MULYANA","DEWA BRAJA","FAZRI MAULANA ROHMAN",
"GLENREYDOAN SARAGIH","IKRAM IRWANSYAH","KEFIN FAIZIN","MUHAMAD FATHANMUBINA KALIMUSADA",
"MUHAMMAD ALI FAQIH","MUHAMMAD ILYAS MAULANA","MUHAMMAD RHAGIEL ISKANDAR","RAKIDI",
"RIZIQ MAULANA","RIZKY FASYA IRAWAN","SYAHRU NABHAN","VINO RAMADAN","ZALFA RAPID"
];

// --- Kode DOMContentLoaded, showToast, Login/Logout, UI helpers, dan renderStudentRows TIDAK BERUBAH ---

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

/* ------------------------------------------------------------- */
/* ---------- Save attendance (MENGGANTI saveAttendance LAMA) ---------- */
/* ------------------------------------------------------------- */
async function saveAttendance(){
 // gather data from form
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
  
 // Format tanggal untuk tipe data 'date' PostgreSQL: YYYY-MM-DD
 const tanggalAbsen = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;

 // Payload data untuk Supabase
 const payload = {
  tanggal_absen: tanggalAbsen, // Kunci utama untuk kueri
  hari: day, 
  semester: semester,
  catatan: note,
  siswa_data: entries, // Simpan data siswa sebagai JSONB
 };

 try{
    showToast('Menyimpan absensi ke Supabase...');
    
    // Cek apakah absensi untuk tanggal ini sudah ada (UPDATE)
    const { data: existingData, error: fetchError } = await sb
        .from('absensi')
        .select('id')
        .eq('tanggal_absen', tanggalAbsen)
        .limit(1);

    if (fetchError) throw fetchError;

    let res;
    if (existingData && existingData.length > 0) {
        // Jika sudah ada, lakukan UPDATE
        res = await sb
            .from('absensi')
            .update(payload)
            .eq('id', existingData[0].id)
            .select();
    } else {
        // Jika belum ada, lakukan INSERT
        res = await sb
            .from('absensi')
            .insert([payload])
            .select();
    }
    
    if(res.error){
        throw res.error;
    }

    showToast(`✅ Absensi ${tanggalAbsen} berhasil disimpan.`);
  fetchSummary(); 
 
 }catch(err){
  console.error('Supabase Error:', err);
  showToast('❌ Gagal menyimpan ke Supabase: ' + err.message, 'error');
 }
}


/* ------------------------------------------------------------- */
/* ---------- Summary (MENGGANTI fetchSummary LAMA) ---------- */
/* ------------------------------------------------------------- */
async function fetchSummary(){
    showToast('Mengambil ringkasan data dari Supabase...');
    try{
        // Ambil semua data absensi (hanya kolom siswa_data)
        const { data: attendanceData, error } = await sb
            .from('absensi')
            .select('siswa_data');

        if (error) throw error;
        
        if(!attendanceData || attendanceData.length === 0){
             renderSummary([]);
             showToast('Tidak ada data absensi yang ditemukan.', 'error');
             return;
        }

        const totalDays = attendanceData.length;
        const studentSummary = {};

        // Inisialisasi hitungan kehadiran
        STUDENTS.forEach(name => {
            studentSummary[name] = { presentCount: 0 };
        });

        // Hitung total kehadiran (Hadir)
        attendanceData.forEach(dayEntry => {
            // dayEntry.siswa_data adalah array [{nama:.., status:..}, ...]
            dayEntry.siswa_data.forEach(entry => {
                if (studentSummary[entry.name] && entry.status === 'Hadir') {
                    studentSummary[entry.name].presentCount++;
                }
            });
        });

        // Finalisasi & hitung persentase
        const summary = STUDENTS.map(name => {
            const count = studentSummary[name].presentCount;
            const percent = ((count / totalDays) * 100).toFixed(1);
            return { name, percent };
        }).sort((a, b) => b.percent - a.percent); 

        renderSummary(summary);
        showToast(`Ringkasan berhasil diperbarui dari ${totalDays} hari absensi.`);

    }catch(err){
        console.error('Supabase Error:', err);
        showToast('❌ Gagal ambil ringkasan: ' + err.message, 'error');
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

/* ------------------------------------------------------------- */
/* ---------- Export request (DINONAKTIFKAN) ---------- */
/* ------------------------------------------------------------- */
async function requestExport(){
 showToast('❌ Fitur Export (.xlsx) membutuhkan server. Data absensi Anda tersimpan dengan aman di Supabase.', 'error');
}
