const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzmgDxayZ9ohuY4Of6Pki7JTFTtjQCycvmn_HzActkWijT52VED0e3yGHrzZ1BswLys/exec";

// ၁။ Auth & Initialization
function checkAuth() {
    const user = JSON.parse(localStorage.getItem("tool_user"));
    if (!user && !window.location.href.includes("login.html")) {
        window.location.href = "login.html";
    }
    return user;
}

window.onload = function() {
    const user = checkAuth();
    if (user) {
        initApp(user);
    }
};

async function initApp(user) {
    if (document.getElementById('stats-container')) fetchDashboardData(user);
    if (document.getElementById('tools-body')) fetchToolsData(user);
    if (document.getElementById('sites-list-body')) fetchSitesData();
    if (document.getElementById('location') || document.getElementById('modal-location')) populateSitesDropdown(user);

    // Admin မဟုတ်ရင် ခလုတ်အချို့ကို ဖျောက်ထားမည်
    if (user.role !== "admin") {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

// ၂။ Dashboard Logic (Site Clickable Cards ပါဝင်သည်)
async function fetchDashboardData(user) {
    try {
        const [toolsRes, sitesRes] = await Promise.all([
            fetch(SCRIPT_URL),
            fetch(SCRIPT_URL + "?action=getSites")
        ]);
        const tools = await toolsRes.json();
        let sites = await sitesRes.json();
        
        // User ဖြစ်ရင် သူတာဝန်ကျတဲ့ Site တစ်ခုပဲ ပြမယ်
        if (user.role !== "admin") {
            sites = sites.filter(s => s === user.site);
        }

        const container = document.getElementById('stats-container');
        let html = "";
        
        // Admin ဖြစ်ရင် Total Card ပြမယ်
        if (user.role === "admin") {
            html += `
                <div class="card clickable" onclick="goToSiteTools('All')">
                    <h3>Total Tools</h3>
                    <p>${tools.length}</p>
                    <div class="card-footer">View all inventory →</div>
                </div>`;
        }
        
        sites.forEach(site => {
            const count = tools.filter(t => t.location === site).length;
            html += `
                <div class="card clickable" onclick="goToSiteTools('${site}')">
                    <h3>${site}</h3>
                    <p>${count}</p>
                    <div class="card-footer">See details →</div>
                </div>`;
        });
        container.innerHTML = html;
    } catch (e) { console.error(e); }
}

// ၃။ Tools List Logic (Filter & Move Button ပါဝင်သည်)
async function fetchToolsData(user) {
    try {
        const res = await fetch(SCRIPT_URL);
        const tools = await res.json();
        const tbody = document.getElementById('tools-body');
        
        const urlParams = new URLSearchParams(window.location.search);
        let filterSite = urlParams.get('filterSite') || (user.role !== "admin" ? user.site : "All");
        
        let filtered = filterSite === "All" ? tools : tools.filter(t => t.location === filterSite);
        if (filterSite !== "All") document.querySelector('h1').innerText = `Tools at ${filterSite}`;

        tbody.innerHTML = filtered.map(tool => `
            <tr>
                <td>${tool.id}</td>
                <td><strong>${tool.name}</strong><br><small>${tool.sender || ''} ➔ ${tool.receiver || ''}</small></td>
                <td><span class="badge">${tool.location}</span></td>
                <td>${tool.condition}</td>
                <td><button onclick="openMoveModal('${tool.id}', '${tool.name}')" class="btn-move">Move</button></td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// ၄။ Login/Logout & Move Logic
async function login() {
    const name = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if(!name || !pass) return alert("Please fill all fields");
    
    const res = await fetch(SCRIPT_URL + `?action=login&name=${name}&pass=${pass}`);
    const result = await res.json();
    if (result.status === "success") {
        localStorage.setItem("tool_user", JSON.stringify(result.user));
        window.location.href = "dashboard.html";
    } else {
        alert("Login failed!");
    }
}

function logout() {
    localStorage.removeItem("tool_user");
    window.location.href = "login.html";
}

function goToSiteTools(siteName) {
    window.location.href = `tools.html?filterSite=${encodeURIComponent(siteName)}`;
}

// Site Management (Admin Only)
async function fetchSitesData() {
    const res = await fetch(SCRIPT_URL + "?action=getSites");
    const sites = await res.json();
    const tbody = document.getElementById('sites-list-body');
    if(tbody) {
        tbody.innerHTML = sites.map(s => `<tr><td>${s}</td><td><button onclick="deleteSite('${s}')" class="admin-only" style="color:red; cursor:pointer; border:none; background:none;">Delete</button></td></tr>`).join('');
    }
}

async function populateSitesDropdown(user) {
    const res = await fetch(SCRIPT_URL + "?action=getSites");
    let sites = await res.json();
    const el = document.getElementById('location') || document.getElementById('modal-location');
    if(el) el.innerHTML = sites.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Move Modal Logic
let currentId = null;
function openMoveModal(id, name) {
    currentId = id;
    document.getElementById('modal-tool-name').innerText = "Move: " + name;
    document.getElementById('moveModal').style.display = 'block';
}

function closeModal() { document.getElementById('moveModal').style.display = 'none'; }

async function confirmMove() {
    const user = JSON.parse(localStorage.getItem("tool_user"));
    const data = {
        action: "move", id: currentId,
        location: document.getElementById('modal-location').value,
        sender: document.getElementById('sender-name').value,
        receiver: document.getElementById('receiver-name').value
    };
    await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(data) });
    location.reload();
}