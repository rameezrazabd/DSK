async function fetchTopsheetDisb(bId, targetDateFrom, targetDateTo) {
    try {
        let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
        if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
        
        h['Site-Name'] = 'dsk';
        h['Accept'] = 'application/json, text/plain, */*';
        if (h['Content-Type']) delete h['Content-Type'];
        if (h['content-type']) delete h['content-type'];
        h['X-Requested-With'] = 'XMLHttpRequest';

        let fDate = targetDateFrom;
        let tDate = targetDateTo;
        if (fDate && fDate.includes('/')) { let p = fDate.split('/'); fDate = p[2] + '-' + p[1] + '-' + p[0]; }
        if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }

        let fd = new FormData();
        let finalBId = await getRealBranchIdFallback(bId);
        fd.append('cbo_report_level', '1');
        fd.append('cbo_branch', finalBId);
        fd.append('cbo_area', '');
        fd.append('cbo_zone', '');
        fd.append('cbo_region', '');
        fd.append('cbo_product_category', '0');
        fd.append('cbo_product', '0');
        fd.append('cbo_transfer_member', '1');
        fd.append('txt_date_from', fDate);
        fd.append('txt_date_to', tDate);
        fd.append('controller_name', '');
        fd.append('method_name', '');
        fd.append('cbo_funding_organizations', '0');

        let url = '/core-service/index.php/topsheet_loan_disbursement_registers/ajax_for_generate_report';
        let res = await fetch(url, { method: 'POST', headers: h, body: fd, credentials: 'include' });
        let text = await res.text();
        
        try {
            let json = JSON.parse(text);
            let sum = 0;
            
            function searchForDisbCount(obj) {
                if (!obj) return;
                if (typeof obj === 'object') {
                    if (Array.isArray(obj)) {
                        obj.forEach(searchForDisbCount);
                    } else {
                        // Look for keys like member_no, borrower_no, loanee, count, etc.
                        for (let k in obj) {
                            let kLow = k.toLowerCase();
                            // Usually topsheets group by product
                            if (kLow === 'borrower_no' || kLow === 'loanee' || kLow === 'disbursement_borrower_no' || kLow === 'this_period_borrower_no' || kLow === 'member_no') {
                                sum += parseInt(obj[k]) || 0;
                            } else {
                                searchForDisbCount(obj[k]);
                            }
                        }
                    }
                }
            }
            
            searchForDisbCount(json);
            
            if (sum > 0) {
                return { count: sum };
            }
            
            return { count: 0 };
        } catch (err) {
            // It might actually be HTML in some branches/versions
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, 'text/html');
            let grandTotalRow = Array.from(doc.querySelectorAll('tr')).find(tr => {
                let cells = Array.from(tr.querySelectorAll('td, th'));
                return cells.some(c => c.textContent.trim().toLowerCase().includes('grand total') || c.textContent.trim().toLowerCase().includes('sub total') || c.textContent.trim().toLowerCase().includes('total'));
            });
            
            if (grandTotalRow) {
                let cells = Array.from(grandTotalRow.querySelectorAll('td, th'));
                if (cells.length >= 4) {
                    let bText = cells[cells.length - 4].textContent.replace(/,/g, '').trim();
                    return { count: parseInt(bText) || 0 };
                }
            }
        }
        return { count: 0 };
    } catch(e) {
        return { count: 0 };
    }
}
// \u{1F9F9} UNIVERSAL REAL BRANCH ID RESOLVER
async function getRealBranchIdFallback(fallback) {
    if (fallback && fallback !== 'SELF' && fallback !== '0' && fallback !== '-1') return fallback;
    
    let cached = sessionStorage.getItem('mf_real_branch_id_iframe');
    if (cached && cached !== 'SELF') return cached;
    
    let cUrl = sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup');
    if (cUrl) {
        let m = cUrl.match(/[?&]cbo_branch=(-?\d+)/);
        if (m && m[1] && m[1] !== '-1') {
            sessionStorage.setItem('mf_real_branch_id_iframe', m[1]);
            return m[1];
        }
    }
    
    try {
        let v = JSON.parse(localStorage.getItem('vuex'));
        if (v && v.auth && v.auth.user) {
            if (v.auth.user.branch_id) return v.auth.user.branch_id;
            if (v.auth.user.branchId) return v.auth.user.branchId;
        }
    } catch(e) {}
    
    let cbo = document.querySelector('select[name="cbo_branch"]');
    if (cbo && cbo.value && cbo.value !== '-1') return cbo.value;
    
    return sessionStorage.getItem('mf_user_type') === 'BRANCH' ? '' : '-1';
}
// \u{1F9F9} XHR INTERCEPTOR FOR MAIN PAGE
let script = document.createElement('script');
script.textContent = `
    (function() {
        const origOpen = XMLHttpRequest.prototype.open;
        const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        const origSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) { 
            this._url = url; 
            this._method = method; 
            this._headers = {}; 
            origOpen.apply(this, arguments); 
        };
        
        XMLHttpRequest.prototype.setRequestHeader = function(name, value) { 
            this._headers[name] = value; 
            origSetHeader.apply(this, arguments); 
        };
        
        XMLHttpRequest.prototype.send = function(body) {
            if (this._headers && (this._headers['Authorization'] || this._headers['authorization'])) {
                try {
                    sessionStorage.setItem('mf_main_stolen_headers', JSON.stringify(this._headers));
                    if (this._url && this._url.includes('cbo_branch=')) {
                        sessionStorage.setItem('mf_cloned_url', this._url);
                    }
                } catch(e) {}
            }
            this.addEventListener('load', function() {
                try {
                    if (this.responseText && this.responseText.includes('"branches_info"')) {
                        let data = JSON.parse(this.responseText);
                        if (data && data.branches_info) {
                            localStorage.setItem('mf_captured_branches_info', JSON.stringify(data.branches_info));
                        }
                    }
                } catch(e) {}
            });
            origSend.apply(this, arguments);
        };
    })();
`;
document.documentElement.appendChild(script);
script.remove();
// ========================================================================
// \u{1F9F9} CLEAN UP LEGACY SNAPSHOT MEMORY (No persistent storage for Extension)
// ========================================================================
try {
    localStorage.removeItem('mf_cached_zones');
    localStorage.removeItem('mf_cached_areas');
    localStorage.removeItem('mf_cached_branches');
    localStorage.removeItem('mf_cached_dates_v2');
    localStorage.removeItem('mf_user_type');
} catch(e) {}

// ========================================================================
// \u{1F514} 0. AUTO UPDATE NOTIFICATION SYSTEM & WEB FONTS
// ========================================================================
(function injectWebFonts() {
    if (!document.getElementById('dsk-web-fonts')) {
        const fontStyle = document.createElement('style');
        fontStyle.id = 'dsk-web-fonts';
        fontStyle.innerHTML = `
            /* Embed SolaimanLipi (Unicode equivalent of SutonnyOMJ) as a webfont fallback */
            @font-face {
                font-family: 'SutonnyOMJ_Web';
                src: local('SutonnyOMJ'), url('https://banglawebfonts.pages.dev/fonts/solaiman-lipi/solaiman-lipi-regular.woff2') format('woff2');
                unicode-range: U+0980-09FF, U+200C-200D, U+25CC; /* Bengali */
            }
            @font-face {
                font-family: DSK_MixedFont;
                src: local('SutonnyOMJ'), url('https://banglawebfonts.pages.dev/fonts/solaiman-lipi/solaiman-lipi-regular.woff2') format('woff2');
                unicode-range: U+0980-09FF, U+200C-200D, U+25CC; /* Bengali */
            }
            @font-face {
                font-family: DSK_MixedFont;
                src: local('Calibri'), local('Arial'), local('Segoe UI');
                unicode-range: U+0000-024F, U+2018-201F, U+2026; /* English/ASCII & Punctuation */
            }
        `;
        document.head.appendChild(fontStyle);
    }
})();

(function checkAppUpdate() {
    const CURRENT_VERSION = "2.4"; // \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u0985\u09CD\u09AF\u09BE\u09AA \u09AD\u09BE\u09B0\u09CD\u09B8\u09A8
    
    // \u26A0\uFE0F \u09A8\u09BF\u099A\u09C7 YOUR_USERNAME \u098F\u09B0 \u099C\u09BE\u09DF\u0997\u09BE\u09DF \u0986\u09AA\u09A8\u09BE\u09B0 \u0997\u09BF\u099F\u09B9\u09BE\u09AC\u09C7\u09B0 \u0986\u09B8\u09B2 \u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u09AC\u09B8\u09BF\u09DF\u09C7 \u09A6\u09BF\u09A8 
    const UPDATE_JSON_URL = "https://raw.githubusercontent.com/rameezrazabd/DSK/main/update.json"; 

    setTimeout(() => {
        fetch(UPDATE_JSON_URL + "?t=" + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                if (data && data.version && parseFloat(data.version) > parseFloat(CURRENT_VERSION)) {
                    showUpdateModal(data);
                }
            })
            .catch(err => console.log("Update check:", err));
    }, 4000);

    function showUpdateModal(data) {
        if (document.getElementById('mf-update-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'mf-update-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center; font-family: DSK_MixedFont, sans-serif;';
        
        modal.innerHTML = `
            <div style="background:white; width:85%; max-width:340px; border-radius:10px; padding:20px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.5); animation: popIn 0.3s ease;">
                <div style="font-size:42px; margin-bottom:10px;">\u{1F680}</div>
                <h3 style="margin:0 0 10px 0; color:#2c3e50; font-size:18px; font-weight:bold;">${data.title || '\u09A8\u09A4\u09C1\u09A8 \u0986\u09AA\u09A1\u09C7\u099F \u098F\u09B8\u09C7\u099B\u09C7!'}</h3>
                <p style="color:#444; font-size:13px; line-height:1.5; margin-bottom:18px; text-align:left; background:#f8f9fa; padding:12px; border-radius:6px; border-left:4px solid #2980b9;">${data.message || '\u0985\u09CD\u09AF\u09BE\u09AA\u099F\u09BF\u09B0 \u098F\u0995\u099F\u09BF \u09A8\u09A4\u09C1\u09A8 \u09B8\u0982\u09B8\u09CD\u0995\u09B0\u09A3 \u0989\u09AA\u09B2\u09AC\u09CD\u09A7 \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0986\u09B0\u0993 \u0989\u09A8\u09CD\u09A8\u09A4 \u09B8\u09C1\u09AC\u09BF\u09A7\u09BE \u09AA\u09C7\u09A4\u09C7 \u098F\u0996\u09A8\u0987 \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09C1\u09A8\u0964'}</p>
                
                <button id="btn-do-update" style="width:100%; background:#27ae60; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow:0 4px 10px rgba(39,174,96,0.3); margin-bottom:8px;">\u{1F4E5} \u098F\u0996\u09A8\u0987 \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u0995\u09B0\u09C1\u09A8</button>
                
                ${data.force_update ? '' : '<button id="btn-skip-update" style="width:100%; background:none; color:#7f8c8d; border:none; padding:8px; font-size:12px; cursor:pointer;">\u09AA\u09B0\u09C7 \u09AE\u09A8\u09C7 \u0995\u09B0\u09BE\u0993</button>'}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('btn-do-update').onclick = () => {
            if (window.AndroidDownloader && window.AndroidDownloader.openUrl) {
                window.AndroidDownloader.openUrl(data.download_url);
            } else {
                window.open(data.download_url, '_blank');
            }
        };
        
        let skipBtn = document.getElementById('btn-skip-update');
        if (skipBtn) {
            skipBtn.onclick = () => modal.remove();
        }
    }
})();

// ========================================================================
// \u{1F310} 0.5 CENTRAL HIERARCHY MASTER SCANNER (UNIFIED SYSTEM SYNC FOR ALL UIs)
// ========================================================================
(function() {
    'use strict';
    
    window._isCentralSyncRunning = false;

    function triggerVueChange(el, value, win) {
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (win && win.jQuery) win.jQuery(el).trigger('change');
    }

    function findSelect(doc, name) {
        if (!doc) return null;
        return doc.getElementById(name) || doc.querySelector(`select[name="${name}"]`);
    }

    async function waitForSelect(doc, name, minLen = 1) {
        for (let i = 0; i < 40; i++) {
            let el = findSelect(doc, name);
            if (el && el.options && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 250));
        }
        return findSelect(doc, name);
    }

    window.runGlobalHierarchySync = function(force = false, callback = null) {
        if (!force && sessionStorage.getItem('mf_global_hierarchy_synced') === 'TRUE') {
            if (callback) callback(true);
            return;
        }
        if (window._isCentralSyncRunning) {
            if (callback) {
                window.addEventListener('mf_central_sync_completed', () => callback(true), { once: true });
            }
            return;
        }
        window._isCentralSyncRunning = true;
        sessionStorage.removeItem('mf_cloned_url');
                    sessionStorage.removeItem('mf_api_template');
                    sessionStorage.removeItem('mf_cloned_headers');
                    localStorage.removeItem('mf_cloned_headers_backup');
        sessionStorage.removeItem('mf_cloned_headers');
        localStorage.removeItem('mf_cloned_url_backup');
        localStorage.removeItem('mf_cloned_headers_backup');

        let toast = document.getElementById('central-sync-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'central-sync-toast';
            toast.style.cssText = 'position:fixed; bottom:20px; right:16px; background:rgba(44, 62, 80, 0.9); color:white; padding:6px 12px; z-index:9999999; border-radius:50px; font-weight:bold; font-size:11px; font-family: DSK_MixedFont, sans-serif; box-shadow:0 2px 8px rgba(0,0,0,0.3); transition:all 0.3s ease; display:flex; align-items:center; gap:6px; pointer-events:none; border:1px solid #34495e;';
            document.body.appendChild(toast);
        }
        toast.style.background = '#f39c12';
        toast.innerHTML = '<span>\u2699\uFE0F \u099C\u09CB\u09A8, \u0985\u099E\u09CD\u099A\u09B2, \u09B6\u09BE\u0996\u09BE \u09B8\u09BF\u0982\u0995 \u09B9\u099A\u09CD\u099B\u09C7...</span>';

        const iframe = document.createElement('iframe');
        iframe.allow = "geolocation 'none'";
        iframe.style.cssText = 'position:fixed; top:0px; left:-9999px; width:1200px; height:800px; border:none; z-index:-1;';
        iframe.src = window.location.origin + window.location.pathname + '#/reports/po-mis-reports/po-mis-1-index';
        document.body.appendChild(iframe);

        let timeout = setTimeout(() => {
            if (document.body.contains(iframe)) iframe.remove();
            window._isCentralSyncRunning = false;
            toast.style.background = '#e74c3c';
            toast.innerHTML = '<span>\u26A0\uFE0F \u09B8\u09BF\u0982\u0995 \u09B9\u09A4\u09C7 \u09B8\u09AE\u09DF \u09B2\u09BE\u0997\u099B\u09C7... \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09BE \u09B9\u09AC\u09C7!</span>';
            setTimeout(() => toast.remove(), 3000);
            if (callback) callback(false);
        }, 45000);

        iframe.onload = () => {
            setTimeout(async () => {
                try {
                            let doc = iframe.contentDocument || iframe.contentWindow.document;
                    let win = iframe.contentWindow;

                    let reportLvl = null, branchSel = null;
                    let formReadyCount = 0;
                    for (let i = 0; i < 40; i++) {
                        reportLvl = findSelect(doc, 'cbo_report_level');
                        branchSel = findSelect(doc, 'cbo_branch');
                        
                        let hasReportOpts = reportLvl && reportLvl.options && reportLvl.options.length > 1;
                        let hasBranchOpts = branchSel && branchSel.options && branchSel.options.length > 1;
                        
                        if (hasReportOpts || hasBranchOpts) break;

                        let submitBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary');
                        if (submitBtn) {
                            formReadyCount++;
                            if (formReadyCount >= 15) break; 
                        }
                        await new Promise(r => setTimeout(r, 400));
                    }

                    let uType = 'BRANCH';
                    let isUTypeConfirmed = false;
                    let foundUser = null;
                    try {
                        let v = JSON.parse(localStorage.getItem('vuex') || '{}');
                        function findUser(obj) {
                            if (!obj || typeof obj !== 'object') return null;
                            if (obj.branch_type !== undefined && obj.is_head_office !== undefined) return obj;
                            for (let key in obj) {
                                let res = findUser(obj[key]);
                                if (res) return res;
                            }
                            return null;
                        }
                        foundUser = findUser(v);
                        if (foundUser) {
                            if (String(foundUser.is_head_office) === "1") uType = 'HO';
                            else if (foundUser.branch_type === "Z") uType = 'ZONE';
                            else if (foundUser.branch_type === "A") uType = 'AREA';
                            else if (foundUser.branch_type === "B") uType = 'BRANCH';
                            isUTypeConfirmed = true;
                        }
                    } catch(e) {}

                    let zones = [], areas = [], branches = [];
                    let zMap = {}, aMap = {};
                    let currentZone = "Unknown Zone";
                    let currentArea = "Unknown Area";

                    let bInfo = doc.querySelector('.branch_info');
                    if (bInfo) {
                        let bText = bInfo.innerText.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ');
                        let areaMatch = bText.match(/Area\s*:\s*(.*?)(?=\s+Date|\s+Branch|\s+Zone|$)/i);
                        if (areaMatch && areaMatch[1]) currentArea = areaMatch[1].trim();
                        
                        let zoneMatch = bText.match(/Zone\s*:\s*(.*?)(?=\s+Area|\s+Date|\s+Branch|$)/i);
                        if (zoneMatch && zoneMatch[1]) currentZone = zoneMatch[1].trim();
                        
                        let headerNameMatch = bText.match(/Branch\s*:\s*(.*?)\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
                        if (headerNameMatch && headerNameMatch[1]) {
                            let hName = headerNameMatch[1].trim();
                            localStorage.setItem('microfin_entity_name', hName);
                            if (currentArea === "Unknown Area" && hName.toLowerCase().includes('area')) currentArea = hName;
                            if (currentZone === "Unknown Zone" && hName.toLowerCase().includes('zone')) currentZone = hName;
                        } else {
                            localStorage.setItem('microfin_entity_name', '');
                        }
                    }

                    var hasZone = false, hasArea = false;
                    if (reportLvl && reportLvl.options && reportLvl.options.length > 0) {
                        hasZone = Array.from(reportLvl.options).some(o => o.value === '3');
                        hasArea = Array.from(reportLvl.options).some(o => o.value === '2');
                        
                        if (!isUTypeConfirmed) {
                            if (hasZone) uType = 'HO';
                            else if (hasArea) uType = 'ZONE';
                            else uType = 'AREA';
                        }
                    }

                    if (reportLvl && reportLvl.options && reportLvl.options.length > 0) {
                        let hasZone = Array.from(reportLvl.options).some(o => o.value === '3');
                        if (hasZone) {
                            triggerVueChange(reportLvl, '3', win);
                            await new Promise(r => setTimeout(r, 800));
                            let zoneSel = await waitForSelect(doc, 'cbo_zone');
                            if (zoneSel && zoneSel.options) {
                                Array.from(zoneSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                        if (!opt.disabled && !opt.value.includes('@@@')) {
                                            let optName = opt.text.trim();
                                            if (optName.toLowerCase().includes('total') && currentZone !== "Unknown Zone") {
                                                optName = currentZone;
                                            } else {
                                                currentZone = optName;
                                            }
                                            zones.push({ id: opt.value, name: optName });
                                        } else if (opt.disabled && opt.value.includes('@@@')) {
                                            let areaName = opt.text.replace(/\u00A0/g, '').replace(/@@@/g, '').trim();
                                            if (areaName) zMap[areaName] = currentZone;
                                        }
                                    }
                                });
                            }
                        }

                        if (hasArea) {
                            triggerVueChange(reportLvl, '2', win);
                            await new Promise(r => setTimeout(r, 800));
                            let areaSel = await waitForSelect(doc, 'cbo_area');
                            if (areaSel && areaSel.options) {
                                Array.from(areaSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                        if (!opt.disabled && !opt.value.includes('@@@')) {
                                            let optName = opt.text.trim();
                                            if (optName.toLowerCase().includes('total') && currentArea !== "Unknown Area") {
                                                optName = currentArea;
                                            } else {
                                                currentArea = optName;
                                            }
                                            let pZone = zMap[optName] || currentZone || "Unknown Zone";
                                            areas.push({ id: opt.value, name: optName, zone: pZone });
                                        } else if (opt.disabled && opt.value.includes('@@@')) {
                                            let bId = opt.value.split('##')[1] || opt.value.replace(/[^0-9]/g, '');
                                            let bNameClean = opt.text.replace(/\u00A0/g, '').replace(/@@@/g, '').trim();
                                            if (bId) {
                                                aMap[bId] = currentArea;
                                                zMap[bId] = zMap[currentArea] || currentZone || "Unknown Zone";
                                            }
                                            if (bNameClean) {
                                                aMap[bNameClean] = currentArea;
                                                zMap[bNameClean] = zMap[currentArea] || currentZone || "Unknown Zone";
                                            }
                                        }
                                    }
                                });
                            }
                        }

                        let hasBranch = Array.from(reportLvl.options).some(o => o.value === '1');
                        if (hasBranch) {
                            triggerVueChange(reportLvl, '1', win);
                            await new Promise(r => setTimeout(r, 800));
                            let bSel = await waitForSelect(doc, 'cbo_branch');
                            if (bSel && bSel.options) {
                                Array.from(bSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                        let bName = opt.text.trim();
                                        if (!opt.disabled && !opt.value.includes('@@@') && !/\b(area|zone)\b/i.test(bName)) {
                                            let bId = opt.value;
                                            let bArea = aMap[bId] || aMap[bName] || (currentArea !== "Unknown Area" ? currentArea : "Unknown Area");
                                            let bZone = zMap[bArea] || zMap[bId] || (currentZone !== "Unknown Zone" ? currentZone : "Unknown Zone");
                                            branches.push({ id: bId, name: bName, area: bArea, zone: bZone });
                                            aMap[bId] = bArea;
                                            zMap[bId] = bZone;
                                        }
                                    }
                                });
                            }
                        }
                    } else if (branchSel && branchSel.options && branchSel.options.length > 2) {
                        uType = 'AREA';
                        let bSel = await waitForSelect(doc, 'cbo_branch', 0);
                        if (bSel && bSel.options) {
                            Array.from(bSel.options).forEach(opt => {
                                if (opt.value && opt.value !== '-1' && opt.value !== '' && !opt.text.includes('--')) {
                                    let bName = opt.text.trim();
                                    if (!opt.disabled && !opt.value.includes('@@@') && !/\b(area|zone)\b/i.test(bName)) {
                                        branches.push({ id: opt.value, name: bName, area: currentArea, zone: currentZone });
                                        aMap[opt.value] = currentArea;
                                        zMap[opt.value] = currentZone;
                                    }
                                }
                            });
                        }
                    } else {
                        uType = 'BRANCH';
                        let myName = localStorage.getItem('microfin_entity_name') || "My Branch";
                        let myId = "SELF";
                        
                        try {
                            if (foundUser) {
                                let bId = foundUser.branch_id || foundUser.branchId || foundUser.branch;
                                if (bId) {
                                    myId = String(bId);
                                    let rawName = foundUser.branch_name || foundUser.branchName || myName;
                                    let rawCode = "";
                                    if (foundUser.login && foundUser.login.includes('.')) {
                                        rawCode = foundUser.login.split('.')[1];
                                    } else if (foundUser.branch_code) {
                                        rawCode = foundUser.branch_code;
                                    }
                                    if (rawCode && !rawName.includes(rawCode)) {
                                        myName = rawName + " (" + rawCode + ")";
                                    } else {
                                        myName = rawName;
                                    }
                                }
                            }
                            
                            if (myId === "SELF") {
                                let v = JSON.parse(localStorage.getItem('vuex') || '{}');
                                function findBranch(obj) {
                                    if (!obj || typeof obj !== 'object') return null;
                                    if (obj.cbo_branch && obj.cbo_branch !== '-1' && obj.cbo_branch !== '0') return String(obj.cbo_branch);
                                    if (obj.branch_id && obj.branch_id !== '-1' && obj.branch_id !== '0') return String(obj.branch_id);
                                    for (let key in obj) {
                                        let res = findBranch(obj[key]);
                                        if (res) return res;
                                    }
                                    return null;
                                }
                                let possibleId = findBranch(v);
                                if (possibleId) myId = possibleId;
                            }
                            
                            if (myId === "SELF") {
                                try {
                                    let headersStr = sessionStorage.getItem('mf_main_stolen_headers') || localStorage.getItem('mf_cloned_headers_backup');
                                    let headers = {};
                                    if (headersStr) {
                                        headers = JSON.parse(headersStr);
                                    } else {
                                        let v = JSON.parse(localStorage.getItem('vuex') || '{}');
                                        function findToken(obj) {
                                            if (!obj || typeof obj !== 'object') return null;
                                            if (obj.token && typeof obj.token === 'string' && obj.token.length > 20) return obj.token;
                                            for (let key in obj) { let res = findToken(obj[key]); if (res) return res; }
                                            return null;
                                        }
                                        let token = findToken(v);
                                        if (token) headers['Authorization'] = 'Bearer ' + token;
                                        headers['Site-Name'] = window.location.pathname.split('/')[1] || 'dsk';
                                    }
                                    
                                    if (Object.keys(headers).length > 0) {
                                        let endpoints = [
                                            { url: window.location.origin + '/core-service/index.php/po_mis_reports/po_mis_1_index', method: 'GET' },
                                            { url: window.location.origin + '/core-service/index.php/po_mis_reports/ajax_po_mis_report', method: 'POST' }
                                        ];
                                        
                                        for (let ep of endpoints) {
                                            if (myId !== "SELF") break;
                                            try {
                                                let res = await fetch(ep.url, {
                                                    method: ep.method,
                                                    headers: headers
                                                });
                                                if (res.ok) {
                                                    let text = await res.text();
                                                    let data = null;
                                                    try { data = JSON.parse(text); } catch(e) {}
                                                    if (data && data.branches_info && data.branches_info.length > 0) {
                                                        myId = String(data.branches_info[0].branch_id);
                                                        let rawName = data.branches_info[0].branch_name || myName;
                                                        let rawCode = data.branches_info[0].branch_code || "";
                                                        if (rawCode && !rawName.includes(rawCode)) myName = rawName + " (" + rawCode + ")";
                                                        else myName = rawName;
                                                    } else if (text.includes('"branches_info"')) {
                                                        let bMatch = text.match(/"branches_info"\s*:\s*(\[\s*\{[^}]+\}\s*\])/);
                                                        if (bMatch && bMatch[1]) {
                                                            let p = JSON.parse(bMatch[1]);
                                                            if (p && p.length > 0) {
                                                                myId = String(p[0].branch_id);
                                                                let rawName = p[0].branch_name || myName;
                                                                let rawCode = p[0].branch_code || "";
                                                                if (rawCode && !rawName.includes(rawCode)) myName = rawName + " (" + rawCode + ")";
                                                                else myName = rawName;
                                                            }
                                                        }
                                                    }
                                                }
                                            } catch (err) {}
                                        }
                                    }
                                } catch(e) {}
                            }
                            
                            if (myId === "SELF") {
                                let cInfoStr = localStorage.getItem('mf_captured_branches_info');
                                if (cInfoStr) {
                                    let cInfo = JSON.parse(cInfoStr);
                                    if (cInfo && cInfo.length > 0) {
                                        myId = String(cInfo[0].branch_id);
                                        let rawName = cInfo[0].branch_name || myName;
                                        let rawCode = cInfo[0].branch_code || "";
                                        if (rawCode && !rawName.includes(rawCode)) {
                                            myName = rawName + " (" + rawCode + ")";
                                        } else {
                                            myName = rawName;
                                        }
                                    }
                                }
                            }
                        } catch(e) {}

                        if (myId === "SELF") {
                            if (branchSel && branchSel.options && branchSel.options.length > 0) {
                                Array.from(branchSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && opt.value !== '' && !opt.text.includes('--')) {
                                        myId = opt.value;
                                        myName = opt.text.trim();
                                    }
                                });
                            } else {
                                let hiddenBranch = doc.querySelector('input[name="cbo_branch"], input[name="branch_id"]');
                                if (hiddenBranch && hiddenBranch.value && hiddenBranch.value !== '-1') {
                                    myId = hiddenBranch.value;
                                }
                            }
                        }
                        if (myId === "SELF" || myName === "My Branch") {
                            let bInfo = doc.querySelector('.branch_info');
                            if (bInfo && bInfo.innerText.includes('Branch:')) {
                                let m = bInfo.innerText.match(/Branch:\s*(.*?)\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
                                if (m && m[1]) myName = m[1].trim();
                            }
                        }
                        let bInfoMatch = doc.documentElement.innerHTML.match(/"branches_info"\s*:\s*(\[\s*\{[^}]+\}\s*\])/);
                        if (bInfoMatch && bInfoMatch[1]) {
                            try {
                                let parsed = JSON.parse(bInfoMatch[1]);
                                if (parsed && parsed.length > 0) {
                                    myId = parsed[0].branch_id || myId;
                                    let rawName = parsed[0].branch_name || myName;
                                    let rawCode = parsed[0].branch_code || "";
                                    if (rawCode && !rawName.includes(rawCode)) {
                                        myName = rawName + " (" + rawCode + ")";
                                    } else {
                                        myName = rawName;
                                    }
                                }
                            } catch(e) {}
                        }
                        
                        if (myId === "SELF" || myId === "") {
                            let match = doc.documentElement.innerHTML.match(/["']?(?:branch_id|branchId|cbo_branch)["']?\s*[:=]\s*["']?(-?\d+)/i);
                            if (match && match[1] && match[1] !== '0' && match[1] !== '-1') myId = match[1];
                        }
                        
                        let codeMatch = doc.documentElement.innerHTML.match(/"branch_code"\s*:\s*"([^"]+)"/);
                        if (codeMatch && codeMatch[1] && !myName.includes(codeMatch[1])) {
                            myName = myName + " (" + codeMatch[1] + ")";
                        }
                        
                        branches = [{ id: myId, name: myName, area: 'Branch', zone: 'Branch' }];
                    }

                    if (branches.length > 0) {
                        // Save simultaneously for ALL UIs & extensions
                        sessionStorage.setItem('mf_user_type', uType);
                        sessionStorage.setItem('mf_cached_zones', JSON.stringify(zones));
                        sessionStorage.setItem('mf_cached_areas', JSON.stringify(areas));
                        sessionStorage.setItem('mf_cached_branches', JSON.stringify(branches));
                        sessionStorage.setItem('mf_auto_synced', 'true');
                        sessionStorage.setItem('mf_global_hierarchy_synced', 'TRUE');

                        localStorage.setItem('microfin_role', uType);
                        localStorage.setItem('microfin_branch_list', JSON.stringify(branches));
                        localStorage.setItem('microfin_aMap', JSON.stringify(aMap));
                        localStorage.setItem('microfin_zMap', JSON.stringify(zMap));
                        localStorage.setItem('microfin_sync_status', 'DONE');

                        toast.style.background = '#27ae60';
                        if (uType === 'BRANCH' && branches.length > 0) {
                            toast.innerHTML = `<span>\u2705 সিংক সম্পন্ন! শাখা আইডি: ${branches[0].id} (${branches[0].name}) কালেক্ট হয়েছে।</span>`;
                        } else {
                            toast.innerHTML = `<span>\u2705 \u099C\u09CB\u09A8, \u0985\u099E\u09CD\u099A\u09B2, \u09B6\u09BE\u0996\u09BE \u09B8\u09BF\u0982\u0995 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8! (${branches.length}\u099F\u09BF \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4)</span>`;
                        }
                        setTimeout(() => toast.remove(), 4000);
                        window.dispatchEvent(new CustomEvent('mf_central_sync_completed'));
                        if (callback) callback(true);
                    } else {
                        throw new Error("No branches found during scan");
                    }

                    clearTimeout(timeout);
                    if (document.body.contains(iframe)) iframe.remove();
                    window._isCentralSyncRunning = false;
                } catch (err) {
                    console.error("Central Sync Error:", err);
                    clearTimeout(timeout);
                    if (document.body.contains(iframe)) iframe.remove();
                    window._isCentralSyncRunning = false;
                    toast.style.background = '#e74c3c';
                    toast.innerHTML = '<span>\u26A0\uFE0F \u09B8\u09BE\u09AE\u09DF\u09BF\u0995 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE\u0964 \u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09BE \u09B9\u09AC\u09C7!</span>';
                    setTimeout(() => toast.remove(), 3000);
                    if (callback) callback(false);
                }
            }, 800);
        };
    };

    // Auto-detect login & dashboard entry to fire scan immediately
    setInterval(() => {
        if (window !== window.top) return;
        if (window.location.hash.includes('login') || window.location.hash.includes('logout')) {
            sessionStorage.removeItem('mf_global_hierarchy_synced');
            sessionStorage.removeItem('mf_auto_synced');
            sessionStorage.removeItem('mf_cloned_url');
                    sessionStorage.removeItem('mf_api_template');
                    sessionStorage.removeItem('mf_cloned_headers');
                    localStorage.removeItem('mf_cloned_headers_backup');
            sessionStorage.removeItem('mf_cloned_headers');
            sessionStorage.removeItem('mf_user_type');
            localStorage.removeItem('microfin_sync_status');
            localStorage.removeItem('mf_cloned_url_backup');
            localStorage.removeItem('mf_cloned_headers_backup');
            localStorage.removeItem('microfin_branch_list');
            localStorage.removeItem('microfin_role');
            localStorage.removeItem('microfin_aMap');
            localStorage.removeItem('microfin_zMap');

        } else if (window.location.hash.includes('dashboard')) {
            if (sessionStorage.getItem('mf_global_hierarchy_synced') !== 'TRUE' && !window._isCentralSyncRunning) {
                window.runGlobalHierarchySync(false);
            }
        }
    }, 1000);
})();

// ========================================================================
(function() {
    try {
        let v = JSON.parse(localStorage.getItem('vuex') || '{}');
        let currentToken = (v && v.auth && v.auth.token) ? v.auth.token : '';
        let lastToken = localStorage.getItem('mf_last_vuex_token');
        if (currentToken && lastToken && currentToken !== lastToken) {
            localStorage.setItem('mf_last_vuex_token', currentToken);
            sessionStorage.removeItem('mf_cached_branches');
            localStorage.removeItem('microfin_branch_list');
            localStorage.removeItem('microfin_branch_info');
            localStorage.removeItem('mf_cloned_headers_backup');
            localStorage.removeItem('mf_cloned_url_backup');
            sessionStorage.removeItem('mf_real_branch_id_iframe');
            sessionStorage.removeItem('mf_global_hierarchy_synced');
            localStorage.removeItem('microfin_sync_status');
        } else if (currentToken && !lastToken) {
            localStorage.setItem('mf_last_vuex_token', currentToken);
        }
    } catch(e) {}
})();

// ========================================================================
// EXTENSION 1: \u{1F4C5} Branch Date Extractor (Compact Mobile Edition)
// ========================================================================
(function() {
    'use strict';

    function triggerVueChange(el, value, win) {
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (win && win.jQuery) win.jQuery(el).trigger('change');
    }

    async function waitForOptions(doc, selector, minLen = 1) {
        for(let i=0; i<80; i++) {
            let el = doc.querySelector(selector);
            if (el && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 100));
        }
        return doc.querySelector(selector);
    }

    function calculateLag(dateStr) {
        if (!dateStr || dateStr === 'Not Found' || dateStr === 'Not Scanned') return '-';
        try {
            let branchDate = new Date(dateStr);
            if (isNaN(branchDate.getTime())) {
                let parts = dateStr.split(/[-/]/);
                if (parts.length === 3) {
                    branchDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
            if (isNaN(branchDate.getTime())) return '-';

            let today = new Date();
            today.setHours(0,0,0,0);
            branchDate.setHours(0,0,0,0);

            let diffTime = today.getTime() - branchDate.getTime();
            let diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
            return diffDays;
        } catch (e) {
            return '-';
        }
    }

    async function fetchDatesViaInvisibleFrame(mode, level, targetId, branchesToProcess) {
        try {
            let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { 
                try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} 
            }
            
            h['Site-Name'] = 'dsk';
            h['Accept'] = 'application/json, text/plain, */*';
            h['X-Requested-With'] = 'XMLHttpRequest';
            
            let url = mode === 'MIS' 
                ? 'https://mfnext3.microfin360.com/dashboard-service/branch/branch_performance' 
                : 'https://mfnext3.microfin360.com/dashboard-service/financial/get_table_ais_info';
                
            let response = await fetch(url, { method: 'GET', headers: h });
            if (!response.ok) throw new Error("API not ok: " + response.status);
            
            let json = await response.json();
            let dataMap = {};
            
            // Recursively search for objects containing 'code' and 'branchDate'
            function extractDates(obj) {
                if (!obj) return;
                if (Array.isArray(obj)) {
                    for (let item of obj) extractDates(item);
                } else if (typeof obj === 'object') {
                    if (obj.code && (obj.branchDate || obj.branch_date || obj.date)) {
                        let code = obj.code.toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
                        let date = obj.branchDate || obj.branch_date || obj.date;
                        if (date && date !== "N/A") {
                            if (date.includes('T')) date = date.split('T')[0];
                            dataMap[code] = date;
                        }
                    }
                    for (let key in obj) {
                        extractDates(obj[key]);
                    }
                }
            }
            
            extractDates(json);

            let uType = sessionStorage.getItem('mf_user_type') || localStorage.getItem('mf_user_type') || 'HO';
            let isBranchRole = (uType === 'BRANCH' || targetId === 'SELF' || (branchesToProcess && branchesToProcess.length === 1 && branchesToProcess[0].id === 'SELF'));
            
            if (isBranchRole && Object.keys(dataMap).length > 0) {
                 dataMap['self'] = Object.values(dataMap)[0];
            }

            return dataMap;
        } catch (e) {
            console.error("fetchDatesViaInvisibleFrame API error", e);
            return {};
        }
    }

    function makeDraggable(elmnt, header) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = dragMouseDown;
        header.style.cursor = "move";
        function dragMouseDown(e) {
            e = e || window.event; e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e = e || window.event; e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            elmnt.style.right = 'auto'; elmnt.style.bottom = 'auto';
        }
        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null;
        }
    }

        function updateUIForRole() {
        let lvl = document.getElementById('bde-ui-level');
        let uType = sessionStorage.getItem('mf_user_type');
        if (!lvl) return;
        
        let zones = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
        if (zones.length === 0) {
            let zMap = JSON.parse(localStorage.getItem('microfin_zMap') || '{}');
            zones = [...new Set(Object.values(zMap))].filter(Boolean).sort().map(z => ({ id: z, name: z }));
        }
        let areas = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
        if (areas.length === 0) {
            let aMap = JSON.parse(localStorage.getItem('microfin_aMap') || '{}');
            areas = [...new Set(Object.values(aMap))].filter(Boolean).sort().map(a => ({ id: a, name: a }));
        }

        
        lvl.innerHTML = '';
        if (uType === 'BRANCH') {
            lvl.innerHTML = `<option value="AREA">\u09B6\u09BE\u0996\u09BE</option>`;
            lvl.disabled = true;

        } else if (uType === 'AREA') {
            lvl.innerHTML = `<option value="AREA">\u09B6\u09BE\u0996\u09BE</option>`;

        } else {
            let options = `<option value="AREA">\u09B6\u09BE\u0996\u09BE</option>`;
            if (areas.length > 0) options += `<option value="ZONE">\u0985\u099E\u09CD\u099A\u09B2</option>`;
            if (zones.length > 0) options += `<option value="HO" selected>\u099C\u09CB\u09A8</option>`;
            else if (areas.length > 0) options = options.replace(`value="ZONE"`, `value="ZONE" selected`);
            else options = options.replace(`value="AREA"`, `value="AREA" selected`);
            lvl.innerHTML = options;
        }
        populateTargets();
    }

    function populateTargets() {
        let targetSel = document.getElementById('bde-ui-target');
        let lvlEl = document.getElementById('bde-ui-level');
        if (!targetSel || !lvlEl) return;
        let level = lvlEl.value;
        let uType = sessionStorage.getItem('mf_user_type');
        
        targetSel.innerHTML = '';
        if (uType === 'BRANCH') {
            let currentBranchName = localStorage.getItem('microfin_entity_name') || 'My Branch';
            let branchList = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
            let bObj = branchList.find(b => b.name === currentBranchName) || branchList[0];
            let val = bObj ? bObj.id : 'SELF';
            targetSel.innerHTML = `<option value="${val}">${currentBranchName}</option>`;
            targetSel.disabled = true;
            return;
        }
        
        targetSel.disabled = false;
        targetSel.innerHTML = '<option value="ALL" selected>\uD83D\uDE80 Select All</option>';
        
        let data = [];
        if (uType === 'AREA') {
            data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');

        } else {
            if (level === 'HO') {
                
                let zMap = JSON.parse(localStorage.getItem('microfin_zMap') || '{}');
                let zList = [...new Set(Object.values(zMap))].filter(Boolean).sort();
                data = zList.map(z => ({ id: z, name: z }));
        
            } else if (level === 'ZONE') {
                
                let aMap = JSON.parse(localStorage.getItem('microfin_aMap') || '{}');
                let aList = [...new Set(Object.values(aMap))].filter(Boolean).sort();
                data = aList.map(a => ({ id: a, name: a }));
        
            } else if (level === 'AREA') {
                data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
            }
        }
        
        data.forEach(item => {
            let val = item.id || item.name;
            if (level === 'HO') val = item.name;
            if (level === 'ZONE') val = item.name;
            targetSel.innerHTML += `<option value="${val}">${item.name}</option>`;
        });
    }


    function performRoleWiseSync() {
        window.runGlobalHierarchySync(true, (success) => {
            if(document.getElementById('bde-ui-level')) updateUIForRole();
        });
    }

    window.performZeroTouchSync = function(force = false) {
        if (!force && localStorage.getItem('microfin_sync_status') === 'DONE') return;
        window.runGlobalHierarchySync(true, (success) => {
            if(success) {
                localStorage.setItem('microfin_sync_status', 'DONE');
            }
        });
    }

    let isBdeBtnClosed = false;
        function escapeXml(unsafe) {
        return (unsafe || '').replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

        function escapeXml(unsafe) {
        return (unsafe || '').replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

        function escapeXml(unsafe) {
        return (unsafe || '').replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    window.getMasterFabContainer = function() {
        let master = document.getElementById('microfin-master-fab');
        if (!master) {
            master = document.createElement('div');
            master.id = 'microfin-master-fab';
            master.style.cssText = 'position:fixed; bottom:70px; right:16px; z-index:999999; display:flex; flex-direction:column-reverse; align-items:flex-end;';
            
            let toggleBtn = document.createElement('div');
            toggleBtn.innerHTML = '\u{1F6E0}\u{FE0F} Custom Report DSK-IT';
            toggleBtn.style.cssText = 'background: linear-gradient(135deg, #2c3e50, #34495e); color:white; border-radius:50px; padding:8px 16px; font-weight:bold; font-size:13px; box-shadow:0 4px 12px rgba(0,0,0,0.4); cursor:pointer; font-family: DSK_MixedFont, sans-serif; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); user-select:none; transform-origin: right bottom; opacity: 1; transform: scale(1);';
            toggleBtn.onmouseover = () => { if(toggleBtn.style.pointerEvents !== 'none'){ toggleBtn.style.transform = 'scale(1.05) translateY(-2px)'; toggleBtn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)'; }};
            toggleBtn.onmouseout = () => { if(toggleBtn.style.pointerEvents !== 'none'){ toggleBtn.style.transform = 'scale(1) translateY(0)'; toggleBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'; }};

            let closeMenuBtn = document.createElement('div');
            closeMenuBtn.innerHTML = '\u2715 Close Menu';
            closeMenuBtn.style.cssText = 'display:none; background: linear-gradient(135deg, #e74c3c, #c0392b); color:white; border-radius:50px; padding:8px 16px; font-weight:bold; font-size:13px; box-shadow:0 4px 12px rgba(231,76,60,0.4); cursor:pointer; font-family: DSK_MixedFont, sans-serif; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); user-select:none; transform-origin: right bottom; opacity:0; transform: scale(0.8);';
            closeMenuBtn.onmouseover = () => { if(closeMenuBtn.style.pointerEvents !== 'none'){ closeMenuBtn.style.transform = 'scale(1.05) translateY(-2px)'; closeMenuBtn.style.boxShadow = '0 8px 20px rgba(231,76,60,0.6)'; }};
            closeMenuBtn.onmouseout = () => { if(closeMenuBtn.style.pointerEvents !== 'none'){ closeMenuBtn.style.transform = 'scale(1) translateY(0)'; closeMenuBtn.style.boxShadow = '0 6px 16px rgba(231,76,60,0.4)'; }};
            
            let menuItems = document.createElement('div');
            menuItems.id = 'microfin-menu-items';
            menuItems.style.cssText = 'display:none; flex-direction:column; gap:4px; align-items:flex-end; margin-bottom:8px; transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity:0; transform: translateY(30px) scale(0.9); pointer-events:none; transform-origin: right bottom;';
            
            toggleBtn.onclick = () => {
                if (localStorage.getItem('microfin_sync_status') !== 'DONE') {
                    let oldHtml = toggleBtn.innerHTML;
                    let oldBg = toggleBtn.style.background;
                    toggleBtn.innerHTML = '\u23F3 Syncing in progress...';
                    toggleBtn.style.background = 'linear-gradient(135deg, #f39c12, #d35400)';
                    toggleBtn.style.transform = 'scale(1.05) translateX(-5px)';
                    setTimeout(() => {
                        toggleBtn.innerHTML = oldHtml;
                        toggleBtn.style.background = oldBg;
                        toggleBtn.style.transform = 'scale(1) translateY(0)';
                    }, 2000);
                    return;
                }

                toggleBtn.style.opacity = '0';
                toggleBtn.style.transform = 'scale(0.8)';
                toggleBtn.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    toggleBtn.style.display = 'none';
                    closeMenuBtn.style.display = 'block';
                    menuItems.style.display = 'flex';
                    
                    void closeMenuBtn.offsetWidth;
                    void menuItems.offsetWidth;
                    
                    closeMenuBtn.style.opacity = '1';
                    closeMenuBtn.style.transform = 'scale(1) translateY(0)';
                    closeMenuBtn.style.pointerEvents = 'auto';
                    
                    menuItems.style.opacity = '1';
                    menuItems.style.transform = 'translateY(0) scale(1)';
                    menuItems.style.pointerEvents = 'auto';
                }, 200);
            };

            closeMenuBtn.onclick = () => {
                closeMenuBtn.style.opacity = '0';
                closeMenuBtn.style.transform = 'scale(0.8)';
                closeMenuBtn.style.pointerEvents = 'none';
                
                menuItems.style.opacity = '0';
                menuItems.style.transform = 'translateY(30px) scale(0.9)';
                menuItems.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    closeMenuBtn.style.display = 'none';
                    menuItems.style.display = 'none';
                    
                    toggleBtn.style.display = 'block';
                    void toggleBtn.offsetWidth;
                    
                    toggleBtn.style.opacity = '1';
                    toggleBtn.style.transform = 'scale(1) translateY(0)';
                    toggleBtn.style.pointerEvents = 'auto';
                }, 300);
            };
            
            master.appendChild(toggleBtn);
            master.appendChild(closeMenuBtn);
            master.appendChild(menuItems);
            document.body.appendChild(master);
        }
        return document.getElementById('microfin-menu-items');
    }

    setInterval(() => {
        let master = document.getElementById('microfin-master-fab');
        if (master) {
            master.style.display = window.location.hash.includes('dashboard') ? 'flex' : 'none';
        }
    }, 500);

    function initFloatingButton() {
        if (isBdeBtnClosed || document.getElementById('bde-ghost-date-toggle')) return;
        
        let container = document.createElement('div');
        container.id = 'bde-ghost-date-toggle';
        container.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background: linear-gradient(135deg, #2980b9 0%, rgba(0,0,0,0.4) 150%); color:white; border-radius:50px; padding:5px 12px; font-weight:bold; font-size:11px; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-family: DSK_MixedFont, sans-serif; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer; width: max-content; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(5px);';
        container.onmouseover = () => { container.style.transform = 'scale(1.05) translateX(-4px)'; container.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)'; };
        container.onmouseout = () => { container.style.transform = 'scale(1) translateX(0)'; container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'; };
        
        let textSpan = document.createElement('span');
        textSpan.innerText = '\uD83D\uDCC5 Branch Dates';
        textSpan.style.cssText = 'margin-right:8px; pointer-events:none;';
        
        let closeBtn = document.createElement('button');
        closeBtn.innerText = '\u2715';
        closeBtn.title = '\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.25); color:white; border:none; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; outline:none; transition:0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.25)';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            isBdeBtnClosed = true;
            container.remove();
        };

        container.onclick = () => {
            isBdeBtnClosed = false;
            // container.remove();
            showFloatingPanel();
        };
        
        container.appendChild(textSpan);
        // container.appendChild(closeBtn);
        window.getMasterFabContainer().appendChild(container);
    }

    function showFloatingPanel() {
        if (document.getElementById('bde-ghost-date-panel')) return;

        let panel = document.createElement('div');
          panel.id = 'bde-ghost-date-panel';
          panel.style.cssText = 'position:fixed; top:10px; left:50%; transform:translateX(-50%); background:white; border:2px solid #2980b9; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.4); width:95vw; max-width:800px; max-height:90vh; z-index:999999; display:flex; flex-direction:column; font-family: SutonnyOMJ, SolaimanLipi, DSK_MixedFont, sans-serif; overflow:hidden;';

        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="bde-drag-header" style="background:#2c3e50; color:white; padding:4px 8px; display:flex; justify-content:space-between; align-items:center; cursor:move; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; overflow:hidden;">
                    <strong style="font-size:11.5px;">\u{1F4C5} Branch Date Extractor</strong>
                    <span id="bde-status-msg" style="font-size:11px; font-weight:bold; color:#f1c40f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></span>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                    <button id="bde-export-excel-btn" style="display:none; background:#8e44ad; color:white; border:none; padding:4px 8px; font-size:11px; cursor:pointer; border-radius:3px; font-weight:bold; transition:0.2s;">\u{1F4E5} Excel</button>
                    <button id="bde-close-date-panel" title="\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(255, 65, 108, 0.45); transition: all 0.2s ease; outline: none; padding: 0;" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 3px 10px rgba(255, 65, 108, 0.7)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 6px rgba(255, 65, 108, 0.45)';" onmousedown="this.style.transform='scale(0.95)';">\u2715</button>
                </div>
            </div>

            <div style="padding:6px; display:flex; flex-direction:column; flex:1; overflow:hidden;">
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; align-items:center; flex-shrink:0;">
                    <div style="flex:1; min-width:130px; display:flex; align-items:center; gap:4px;">
                        <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09B2\u09C7\u09AD\u09C7\u09B2:</label>
                        <select id="bde-ui-level" style="flex:1; width:100%; padding:0 4px; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; height:24px; box-sizing:border-box; margin:0;"></select>
                    </div>
                    <div style="flex:1.5; min-width:130px; display:flex; align-items:center; gap:4px;">
                        <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8:</label>
                        <select id="bde-ui-target" style="flex:1; width:100%; padding:0 4px; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; height:24px; box-sizing:border-box; margin:0;"></select>
                    </div>
                    <div>
                        <button id="bde-sync-btn" style="height:24px; width:28px; background:#bdc3c7; color:#2c3e50; border:none; border-radius:3px; cursor:pointer; font-weight:bold; font-size:12px; display:flex; align-items:center; justify-content:center; padding:0;" title="\u09B8\u09BF\u0999\u09CD\u0995">\u{1F504}</button>
                    </div>
                </div>

                <button id="bde-start-fetch-btn" style="width:100%; height:28px; display:flex; align-items:center; justify-content:center; gap:6px; background:#27ae60; color:white; border:none; font-weight:bold; font-size:13px; border-radius:3px; cursor:pointer; margin-bottom:5px; flex-shrink:0; transition:0.2s;">\u{1F680} Fetch Dates (Auto Engine)</button>
                
                <div id="bde-tabs-bar" style="display:flex; gap:6px; margin-bottom:5px; flex-shrink:0;">
                    <button id="bde-tab-all" style="flex:1; background:#2980b9; color:white; border:none; padding:4px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">All (<span id="bde-lbl-all">\u09E6</span>)</button>
                    <button id="bde-tab-current" style="flex:1; background:#ecf0f1; color:#7f8c8d; border:1px solid #bdc3c7; padding:4px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">Current (<span id="bde-lbl-current">\u09E6</span>)</button>
                    <button id="bde-tab-back" style="flex:1; background:#ecf0f1; color:#7f8c8d; border:1px solid #bdc3c7; padding:4px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">Back (<span id="bde-lbl-back">\u09E6</span>)</button>
                </div>
                
                <div id="bde-table-output" style="margin-top:4px; flex:1; overflow-y:auto; border:1px solid #eaeaea; border-radius:4px;"></div>
            </div>
        `;

        document.getElementById('bde-close-date-panel').onclick = () => {
            isBdeBtnClosed = true;
            panel.remove();
        };
        makeDraggable(panel, document.getElementById('bde-drag-header'));
        document.getElementById('bde-ui-level').onchange = populateTargets;
        updateUIForRole();

        let tabAll = document.getElementById('bde-tab-all');
        let tabCurrent = document.getElementById('bde-tab-current');
        let tabBack = document.getElementById('bde-tab-back');

        function filterTableRows(filterType) {
            [tabAll, tabCurrent, tabBack].forEach(tab => {
                if (tab) {
                    tab.style.background = '#ecf0f1'; 
                    tab.style.color = '#7f8c8d'; 
                    tab.style.border = '1px solid #bdc3c7';
                }
            });
            
            if (filterType === 'all' && tabAll) {
                tabAll.style.background = '#2980b9'; tabAll.style.color = 'white'; tabAll.style.border = 'none';
            } else if (filterType === 'current' && tabCurrent) {
                tabCurrent.style.background = '#27ae60'; tabCurrent.style.color = 'white'; tabCurrent.style.border = 'none';
            } else if (filterType === 'back' && tabBack) {
                tabBack.style.background = '#e74c3c'; tabBack.style.color = 'white'; tabBack.style.border = 'none';
            }
            
            let tbodies = Array.from(document.querySelectorAll('#bde-table-output tbody'));
            
            tbodies.forEach(tbody => {
                if (tbody.getAttribute('data-status') === 'header') {
                    tbody.style.display = '';
                } else {
                    let status = tbody.getAttribute('data-status');
                    if (filterType === 'all') {
                        tbody.style.display = '';
                    } else {
                        tbody.style.display = (status === filterType) ? '' : 'none';
                    }
                }
            });

            let currentZoneHeader = null;
            let currentAreaHeader = null;
            let zoneHasVisible = false;
            let areaHasVisible = false;


            for (let i = 0; i < tbodies.length; i++) {
                let tb = tbodies[i];
                if (tb.getAttribute('data-status') === 'header') {
                    if (tb.textContent.includes('Zone:')) {
                        if (currentAreaHeader && !areaHasVisible) currentAreaHeader.style.display = 'none';
                        if (currentZoneHeader && !zoneHasVisible) currentZoneHeader.style.display = 'none';
                        currentZoneHeader = tb;
                        currentAreaHeader = null;
                        zoneHasVisible = false;
                    } else if (tb.textContent.includes('Area:')) {
                        if (currentAreaHeader && !areaHasVisible) currentAreaHeader.style.display = 'none';
                        currentAreaHeader = tb;
                        areaHasVisible = false;
                    }
                } else {
                    if (tb.style.display !== 'none') {
                        zoneHasVisible = true;
                        areaHasVisible = true;
                    }
                }
            }
            if (currentAreaHeader && !areaHasVisible) currentAreaHeader.style.display = 'none';
            if (currentZoneHeader && !zoneHasVisible) currentZoneHeader.style.display = 'none';
        }

        if (tabAll) tabAll.onclick = () => filterTableRows('all');
        if (tabCurrent) tabCurrent.onclick = () => filterTableRows('current');
        if (tabBack) tabBack.onclick = () => filterTableRows('back');

        document.getElementById('bde-sync-btn').onclick = () => {
            sessionStorage.removeItem('mf_cached_branches');
            performRoleWiseSync();
        };

        function formatBdeDate(dtStr) {
            if (!dtStr || dtStr === "N/A" || dtStr.includes("Not")) return dtStr;
            try {
                let parts = dtStr.split("-");
                if (parts.length === 3) {
                    let d = new Date(parts[0], parseInt(parts[1])-1, parts[2]);
                    let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return d.getDate() + " " + months[d.getMonth()] + ", " + d.getFullYear();
                }
            } catch(e) {}
            return dtStr;
        }

        async function startFetchingDates() {
            let level = document.getElementById('bde-ui-level').value;
            let targetId = document.getElementById('bde-ui-target').value;
            let branchesToProcess = [];

            if (targetId === 'ALL') {
                branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
            } else if (level === 'HO') {
                branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]').filter(b => b.zone === targetId);
            } else if (level === 'ZONE') {
                branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]').filter(b => b.area === targetId);
            } else if (level === 'AREA') {
                branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]').filter(b => b.id.toString() === targetId);
            }

            if(branchesToProcess.length === 0) {
                alert('\u0995\u09CB\u09A8\u09CB \u09B6\u09BE\u0996\u09BE \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF! \u09B8\u09BF\u0999\u09CD\u0995 \u09AC\u09BE\u099F\u09A8\u09C7 \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C1\u09A8\u0964');
                return;
            }

            let output = document.getElementById('bde-table-output');
            let startBtn = document.getElementById('bde-start-fetch-btn');
            let exportBtn = document.getElementById('bde-export-excel-btn');
            let statusElement = document.getElementById('bde-status-msg');

            if(startBtn) { startBtn.disabled = true; startBtn.style.background = "#7f8c8d"; }
            if(exportBtn) { exportBtn.style.display = 'none'; }

            let tableHtml = `
                <table style="width:100%; border-collapse:collapse; font-size:10px; text-align:center; table-layout:fixed; font-family: 'SutonnyOMJ', 'SolaimanLipi', DSK_MixedFont, sans-serif;">
                    <thead style="position: sticky; top: 0; z-index:5;">
                        <tr>
                            <th style="padding:5px 2px; border:1px solid #bdc3c7; background:#2c3e50; color:white; width:25%; text-align:center !important; font-size:11px; font-weight:bold; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">\u09B6\u09BE\u0996\u09BE\u09B0 \u09A8\u09BE\u09AE</th>
                            <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#34495e; color:white; width:27%; white-space:nowrap; text-align:center !important; font-size:11px; font-weight:bold; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8</th>
                            <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#2980b9; color:white; width:16%; white-space:nowrap; text-align:center !important; font-size:11px; font-weight:bold; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">MIS \u09A1\u09C7\u099F</th>
                            <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#2980b9; color:white; width:8%; white-space:nowrap; text-align:center !important; font-size:11px; font-weight:bold; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</th>
                            <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#27ae60; color:white; width:16%; white-space:nowrap; text-align:center !important; font-size:11px; font-weight:bold; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">AIS \u09A1\u09C7\u099F</th>
                            <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#27ae60; color:white; width:8%; white-space:nowrap; text-align:center !important; font-size:11px; font-weight:bold; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</th>
                        </tr>
                    </thead>
            `;

            branchesToProcess.sort((a, b) => { let z = (a.zone || "").localeCompare(b.zone || ""); if (z !== 0) return z; let ar = (a.area || "").localeCompare(b.area || ""); if (ar !== 0) return ar; return parseInt(a.id || "0") - parseInt(b.id || "0"); }); 
            
            let currentZ = ""; 
            let currentA = ""; 

            for(let b of branchesToProcess) { 
                if (b.zone !== currentZ && b.zone && b.zone !== "Branch" && b.zone !== "Assigned Zone") { 
                    currentZ = b.zone; 
                    tableHtml += `<tbody data-status="header"><tr style="background:#0277bd; color:white;"><td colspan="6" style="padding:4px; text-align:left;"><b>\u{1F3E2} Zone: ` + currentZ + `</b></td></tr></tbody>`; 
                } 
                if (b.area !== currentA && b.area && b.area !== "Branch" && b.area !== "Assigned Area") { 
                    currentA = b.area; 
                    tableHtml += `<tbody data-status="header"><tr style="background:#e1f5fe; color:#01579b;"><td colspan="6" style="padding:4px; text-align:left;">&nbsp;&nbsp;<b>\u{1F4CD} Area: ` + currentA + `</b></td></tr></tbody>`; 
                } 
                
                let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, "");
                tableHtml += `
                    <tbody id="bde-tr-${safeId}" data-status="pending">
                        <tr>
                            <td style="text-align:left; padding:4px 3px; border:1px solid #bdc3c7; font-weight:bold; white-space:normal; line-height:1.25; font-size:10px; color:#2c3e50; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">${b.name}</td>
                            <td colspan="5" style="padding:3px 2px; border:1px solid #bdc3c7; color:gray; font-size:10px; white-space:nowrap; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">\u23F3 \u09AB\u09C7\u099A\u09BF\u0982...</td>
                        </tr>
                    </tbody>
                `;
            }
            tableHtml += `</table>`;
            output.innerHTML = tableHtml;

            try {
                if(statusElement) statusElement.innerHTML = `<span style="color:#2980b9;">\u23F3 MIS \u09A1\u09BE\u099F\u09BE \u09B8\u09CD\u0995\u09CD\u09B0\u09CD\u09AF\u09BE\u09AA \u09B9\u099A\u09CD\u099B\u09C7...</span>`;
                let misDataMap = await fetchDatesViaInvisibleFrame('MIS', level, targetId, branchesToProcess);

                if(statusElement) statusElement.innerHTML = `<span style="color:#2980b9;">\u23F3 AIS \u09A1\u09BE\u099F\u09BE \u09B8\u09CD\u0995\u09CD\u09B0\u09CD\u09AF\u09BE\u09AA \u09B9\u099A\u09CD\u099B\u09C7...</span>`;
                let aisDataMap = await fetchDatesViaInvisibleFrame('AIS', level, targetId, branchesToProcess);

                let allCount = 0;
                let currentCount = 0;
                let backCount = 0;

                for (let b of branchesToProcess) {
                    let bCodeMatch = b.name.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                    let bCode = bCodeMatch ? bCodeMatch[1] : b.name.replace(/[^a-z]/gi, '').toLowerCase();

                    let aisDate = aisDataMap[bCode] || aisDataMap['mybranch'] || aisDataMap['self'] || aisDataMap['default'] || (branchesToProcess.length === 1 ? Object.values(aisDataMap)[0] : null) || "N/A";
                    let misDate = misDataMap[bCode] || misDataMap['mybranch'] || misDataMap['self'] || misDataMap['default'] || (branchesToProcess.length === 1 ? Object.values(misDataMap)[0] : null) || "N/A";

                    let aisLag = calculateLag(aisDate);
                    let misLag = calculateLag(misDate);

                    let mNum = typeof misLag === 'number' ? misLag : 999;
                    let aNum = typeof aisLag === 'number' ? aisLag : 999;

                                        let rowStatus = 'current';
                    let statusTextHtml = '\u2705 \u0986\u09AA-\u099F\u09C1-\u09A1\u09C7\u099F';

                    let bnD = ['\u09E6','\u09E7','\u09E8','\u09E9','\u09EA','\u09EB','\u09EC','\u09ED','\u09EE','\u09EF']; let en2bn = (n) => String(n).replace(/[0-9]/g, w => bnD[parseInt(w)]);
                    let mStr = mNum === 999 ? 'N/A' : (en2bn(mNum) + '\u09A6\u09BF\u09A8');
                    let aStr = aNum === 999 ? 'N/A' : (en2bn(aNum) + '\u09A6\u09BF\u09A8');

                    if (mNum > 0 && aNum > 0) {
                        rowStatus = 'back';
                        statusTextHtml = '\u{1F534} MIS ' + mStr + ' AIS ' + aStr + ' \u09AA\u09BF\u099B\u09BF\u09DF\u09C7';
                    } else if (mNum > 0) {
                        rowStatus = 'back';
                        statusTextHtml = '\u{1F534} MIS ' + mStr + ' \u09AA\u09BF\u099B\u09BF\u09DF\u09C7';
                    } else if (aNum > 0) {
                        rowStatus = 'back';
                        statusTextHtml = '\u{1F534} AIS ' + aStr + ' \u09AA\u09BF\u099B\u09BF\u09DF\u09C7';
                    }
                    
                    allCount++;
                    if (rowStatus === 'current') currentCount++;
                    else backCount++;

                    let aisLagColor = aNum > 2 ? '#c0392b' : (aNum > 0 ? '#d35400' : '#27ae60');
                    let misLagColor = mNum > 2 ? '#c0392b' : (mNum > 0 ? '#d35400' : '#27ae60');

                    let rowBg = rowStatus === 'back' ? "background:#fff5f5;" : "";
                    let formatMis = formatBdeDate(misDate);
                    let formatAis = formatBdeDate(aisDate);
                    
                    let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
                    let trElement = document.getElementById(`bde-tr-${safeId}`);
                    if (trElement) {
                        trElement.setAttribute('data-status', rowStatus);
                        trElement.innerHTML = `
                            <tr style="${rowBg}">
                                <td style="text-align:left; padding:4px 3px; border:1px solid #bdc3c7; font-weight:bold; color:#2c3e50; white-space:normal; line-height:1.25; font-size:10px; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">${b.name}</td>
                                <td style="padding:3px 1px; border:1px solid #bdc3c7; font-weight:bold; font-size:8px; line-height:1.1; color:${rowStatus === 'back' ? '#c0392b' : '#27ae60'}; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">${statusTextHtml}</td>
                                <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${misDate === 'N/A'?'#e74c3c':'#2980b9'}; font-weight:bold; background:#f4f9f9; font-size:9px; white-space:nowrap; overflow:hidden; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">${formatMis}</td>
                                <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${misLagColor}; font-weight:bold; background:#f4f9f9; font-size:10px; white-space:nowrap; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">${misLag}</td>
                                <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${aisDate === 'N/A'?'#e74c3c':'#27ae60'}; font-weight:bold; background:#f9fbf9; font-size:9px; white-space:nowrap; overflow:hidden; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">${formatAis}</td>
                                <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${aisLagColor}; font-weight:bold; background:#f9fbf9; font-size:10px; white-space:nowrap; font-family: 'SolaimanLipi', DSK_MixedFont, sans-serif;">${aisLag}</td>
                            </tr>
                        `;
                    }
                }

                let lblAll = document.getElementById('bde-lbl-all');
                if (lblAll) lblAll.innerText = allCount;
                let lblCur = document.getElementById('bde-lbl-current');
                if (lblCur) lblCur.innerText = currentCount;
                let lblBack = document.getElementById('bde-lbl-back');
                if (lblBack) lblBack.innerText = backCount;
                
                if (statusElement) { 
                    statusElement.innerHTML = `<span style="color:#27ae60;">\u2705 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8!</span>`; 
                    // setTimeout(() => { if(statusElement) statusElement.innerHTML = ''; }, 2000); 
                }
            } catch(e) {
                console.error(e);
                if(statusElement) statusElement.innerHTML = `<span style="color:red;">\u274C \u09B8\u09CD\u0995\u09CD\u09AF\u09BE\u09A8\u09BF\u0982\u09DF\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!</span>`;
            } finally {
                let finalStartBtn = document.getElementById('bde-start-fetch-btn');
                let finalExportBtn = document.getElementById('bde-export-excel-btn');

                if (finalStartBtn) {
                    finalStartBtn.disabled = false; 
                    finalStartBtn.removeAttribute('disabled');
                    finalStartBtn.style.background = "#27ae60";
                }
                if (finalExportBtn) {
                    finalExportBtn.style.display = 'block'; 
                }
            }
        }
        
        document.getElementById('bde-start-fetch-btn').onclick = startFetchingDates;

        document.getElementById('bde-export-excel-btn').onclick = () => {
            let table = document.querySelector("#bde-table-output table");
            if (!table) return;

            let statusMsg = document.getElementById('bde-status-msg');
            if(statusMsg) statusMsg.innerHTML = "\u23F3 Excel \u09AB\u09BE\u0987\u09B2 \u09A4\u09C8\u09B0\u09BF \u09B9\u099A\u09CD\u099B\u09C7...";

            try {
                let allBranches = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
                let branchMap = {};
                allBranches.forEach(b => {
                    branchMap[b.name.trim()] = b;
                });

                let dataRowsAll = [];
                let dataRowsCurrent = [];
                let dataRowsBack = [];

                table.querySelectorAll('tbody[id^="bde-tr-"]').forEach(tbody => {
                    let tr = tbody.querySelector('tr');
                    if (tr && tr.cells.length >= 6) {
                        let branchName = tr.cells[0].textContent.replace(/[^a-zA-Z0-9 \-]/g, '').replace(/&nbsp;/g, '').trim();
                        let statusText = tr.cells[1].textContent.trim();
                        let isBack = tbody.getAttribute('data-status') === 'back';
                        
                        let branchObj = branchMap[branchName];
                        if (!branchObj) {
                            let matched = allBranches.find(br => br.name.trim() === branchName || branchName.includes(br.name.trim()) || br.name.trim().includes(branchName));
                            if (matched) branchObj = matched;
                        }
                        
                        let z = branchObj ? (branchObj.zone || '') : '';
                        let a = branchObj ? (branchObj.area || '') : '';

                        let rowObj = {
                            zone: z,
                            area: a,
                            branch: branchName,
                            status: statusText,
                            misDate: tr.cells[2].textContent.trim(),
                            misLag: tr.cells[3].textContent.trim(),
                            aisDate: tr.cells[4].textContent.trim(),
                            aisLag: tr.cells[5].textContent.trim()
                        };

                        dataRowsAll.push(rowObj);
                        if (isBack) dataRowsBack.push(rowObj);
                        else dataRowsCurrent.push(rowObj);
                    }
                });

                let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n xmlns:o="urn:schemas-microsoft-com:office:office"\n xmlns:x="urn:schemas-microsoft-com:office:excel"\n xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n xmlns:html="http://www.w3.org/TR/REC-html40">\n <Styles>\n  <Style ss:ID="Default" ss:Name="Normal">\n   <Alignment ss:Vertical="Center" ss:WrapText="1"/>\n   <Borders>\n    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n   </Borders>\n   <Font ss:FontName="SutonnyOMJ" ss:Size="10" ss:Color="#2C3E50"/>\n  </Style>\n  <Style ss:ID="sTitle"><Font ss:FontName="SutonnyOMJ" ss:Size="14" ss:Bold="1" ss:Color="#2980B9"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n  <Style ss:ID="sNormalBold"><Font ss:FontName="SutonnyOMJ" ss:Size="11" ss:Bold="1" ss:Color="#34495E"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n  <Style ss:ID="H_Branch" ss:Parent="Default"><Interior ss:Color="#34495E" ss:Pattern="Solid"/><Font ss:FontName="SutonnyOMJ" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="H_Status" ss:Parent="Default"><Interior ss:Color="#8E44AD" ss:Pattern="Solid"/><Font ss:FontName="SutonnyOMJ" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="H_MIS" ss:Parent="Default"><Interior ss:Color="#2980B9" ss:Pattern="Solid"/><Font ss:FontName="SutonnyOMJ" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="H_AIS" ss:Parent="Default"><Interior ss:Color="#16A085" ss:Pattern="Solid"/><Font ss:FontName="SutonnyOMJ" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="R_Normal_C" ss:Parent="Default"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="R_Normal_L" ss:Parent="Default"><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="R_Normal_S" ss:Parent="Default"><Font ss:FontName="SutonnyOMJ" ss:Size="10" ss:Color="#27AE60"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="R_Delay_C" ss:Parent="Default"><Interior ss:Color="#FDEDEC" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="R_Delay_L" ss:Parent="Default"><Interior ss:Color="#FDEDEC" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="R_Delay_S" ss:Parent="Default"><Interior ss:Color="#FDEDEC" ss:Pattern="Solid"/><Font ss:FontName="SutonnyOMJ" ss:Size="10" ss:Bold="1" ss:Color="#C0392B"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="Lag_Red" ss:Parent="Default"><Font ss:FontName="SutonnyOMJ" ss:Size="10" ss:Bold="1" ss:Color="#C0392B"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="Lag_Grn" ss:Parent="Default"><Font ss:FontName="SutonnyOMJ" ss:Size="10" ss:Color="#27AE60"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n </Styles>`;

                function buildWorksheet(sheetName, dataRows) {
                    let sXml = ` <Worksheet ss:Name="${escapeXml(sheetName)}">\n  <Table>\n   <Column ss:Width="45"/>\n   <Column ss:Width="130"/>\n   <Column ss:Width="130"/>\n   <Column ss:Width="160"/>\n   <Column ss:Width="140"/>\n   <Column ss:Width="95"/>\n   <Column ss:Width="75"/>\n   <Column ss:Width="95"/>\n   <Column ss:Width="75"/>\n   <Row ss:Height="30"><Cell ss:MergeAcross="8" ss:StyleID="sTitle"><Data ss:Type="String">DUSHTHA SHASTHYA KENDRA (DSK)</Data></Cell></Row>\n   <Row ss:Height="20"><Cell ss:MergeAcross="8" ss:StyleID="sNormalBold"><Data ss:Type="String">Branch Date Extraction (${escapeXml(sheetName)}) | Generated: ${new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour12: true })}</Data></Cell></Row>\n   <Row ss:Height="22">\n    <Cell ss:StyleID="H_Branch"><Data ss:Type="String">\u0995\u09CD\u09B0\u09AE\u09BF\u0995</Data></Cell>\n    <Cell ss:StyleID="H_Branch"><Data ss:Type="String">\u099C\u09CB\u09A8</Data></Cell>\n    <Cell ss:StyleID="H_Branch"><Data ss:Type="String">\u0985\u099E\u09CD\u099A\u09B2</Data></Cell>\n    <Cell ss:StyleID="H_Branch"><Data ss:Type="String">\u09B6\u09BE\u0996\u09BE\u09B0 \u09A8\u09BE\u09AE</Data></Cell>\n    <Cell ss:StyleID="H_Status"><Data ss:Type="String">\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8</Data></Cell>\n    <Cell ss:StyleID="H_MIS"><Data ss:Type="String">MIS \u09A1\u09C7\u099F</Data></Cell>\n    <Cell ss:StyleID="H_MIS"><Data ss:Type="String">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</Data></Cell>\n    <Cell ss:StyleID="H_AIS"><Data ss:Type="String">AIS \u09A1\u09C7\u099F</Data></Cell>\n    <Cell ss:StyleID="H_AIS"><Data ss:Type="String">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</Data></Cell>\n   </Row>\n`;
                    
                    let idx = 1;
                    dataRows.forEach(r => {
                        let isDelay = r.status.includes("\u09AA\u09BF\u099B\u09BF\u09DF\u09C7");
                        let cL = isDelay ? "R_Delay_L" : "R_Normal_L";
                        let cC = isDelay ? "R_Delay_C" : "R_Normal_C";
                        let cS = isDelay ? "R_Delay_S" : "R_Normal_S";
                        
                        function getLagStyle(valStr) {
                            let n = parseInt(valStr);
                            if (isNaN(n)) return cC;
                            if (n > 0) return "Lag_Red";
                            return "Lag_Grn";
                        }
                        
                        sXml += `   <Row>\n`;
                        sXml += `    <Cell ss:StyleID="${cC}"><Data ss:Type="Number">${idx++}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${cL}"><Data ss:Type="String">${escapeXml(r.zone)}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${cL}"><Data ss:Type="String">${escapeXml(r.area)}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${cL}"><Data ss:Type="String">${escapeXml(r.branch)}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${cS}"><Data ss:Type="String">${escapeXml(r.status)}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${cC}"><Data ss:Type="String">${escapeXml(r.misDate)}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${getLagStyle(r.misLag)}"><Data ss:Type="Number">${r.misLag === '-' ? 0 : r.misLag}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${cC}"><Data ss:Type="String">${escapeXml(r.aisDate)}</Data></Cell>\n`;
                        sXml += `    <Cell ss:StyleID="${getLagStyle(r.aisLag)}"><Data ss:Type="Number">${r.aisLag === '-' ? 0 : r.aisLag}</Data></Cell>\n`;
                        sXml += `   </Row>\n`;
                    });
                    
                    sXml += `  </Table>\n </Worksheet>\n`;
                    return sXml;
                }

                xml += buildWorksheet("All Branches", dataRowsAll);
                xml += buildWorksheet("Current", dataRowsCurrent);
                xml += buildWorksheet("Back", dataRowsBack);
                xml += `</Workbook>`;

                let finalOutput = "\uFEFF" + xml;
                let blob = new Blob([finalOutput], { type: 'application/vnd.ms-excel;charset=utf-8;' });
                let fileName = `Branch_Date_Extraction_${new Date().getTime()}.xls`;

                if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
                    window.AndroidDownloader.saveExcel(finalOutput, fileName);
                } else {
                    let a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
                
                if(statusMsg) {
                    statusMsg.innerHTML = "<span style='color:green;'>\u2705 Excel Downloaded!</span>";
                    // setTimeout(() => { if(statusMsg) statusMsg.innerHTML = ''; }, 2000);
                }
            } catch(e) {
                console.error(e);
                if(statusMsg) statusMsg.innerHTML = "<span style='color:red;'>\u274C Export Failed!</span>";
            }
        };
    }

    let hasSyncedThisPageLoad = false;

    setInterval(() => {
        let isDashboard = window.location.hash.includes('#/mis/dashboard') || window.location.hash.includes('#/ais/dashboard');
        
        let btn = document.getElementById('bde-ghost-date-toggle');
        let panel = document.getElementById('bde-ghost-date-panel');
        
        if (isDashboard) {
            if (!btn) initFloatingButton();
            
            if (!hasSyncedThisPageLoad) {
                hasSyncedThisPageLoad = true;
                performRoleWiseSync();
            }

        } else {
            hasSyncedThisPageLoad = false;
            isBdeBtnClosed = false;
            if (btn) btn.remove();
            if (panel) panel.remove();
        }
    }, 1500);

})();

// ========================================================================
// EXTENSION 2: \u{1F680} MIS & AIS Checker-DSK_IT (Full Screen & Zero Digit Clip)
// ========================================================================
(function() {
    'use strict';

    function getToday() {
        let d = new Date(), m = '' + (d.getMonth() + 1), day = '' + d.getDate();
        if (m.length < 2) m = '0' + m;
        if (day.length < 2) day = '0' + day;
        return [d.getFullYear(), m, day].join('-');
    }

    function getFirstDayOfMonth() {
        let d = new Date(), m = '' + (d.getMonth() + 1);
        if (m.length < 2) m = '0' + m;
        return [d.getFullYear(), m, '01'].join('-');
    }

    const formatNum = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function parseIs(doc) {
        let surplusMonth = -2;
        let surplusYear = -2;
        try {
            let cellElements = doc.querySelectorAll('.th_title, .acc_th, td');

            for (let cell of cellElements) {
                if (cell.textContent && cell.textContent.toLowerCase().includes('surplus/deficit')) {
                    let tr = cell.closest('tr');
                    if (tr) {
                        let amountCells = tr.querySelectorAll('.th_amount, td');
                        // Filter out the title cell itself if it's in amountCells
                        let vals = [];
                        for(let c of amountCells) {
                             if(c === cell) continue;
                             let text = c.textContent.replace(/[^\d.-]/g, '');
                             if(text !== '') vals.push(parseFloat(text) || 0);
                        }
                        if (vals.length >= 2) {
                            surplusMonth = vals[vals.length - 2];
                            surplusYear = vals[vals.length - 1];
                        }
                    }
                }
            }
        } catch(e) {
            return { surplusMonth: -1, surplusYear: -1 };
        }
        return { surplusMonth, surplusYear };
    }

    function parseAis(doc) {
        let savings = 0, loan = 0, cashInHand = 0, cashAtBank = 0, equity = 0, equityPrev = 0;
        try {
            doc.querySelectorAll('tr').forEach(tr => {
                let rowText = (tr.textContent || "").toLowerCase();
                let cells = tr.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    let vals = [];
                    for (let i = 1; i < cells.length; i++) {
                        let textVal = cells[i].textContent.replace(/[^\d.-]/g, '');
                        if (textVal && textVal !== '-') {
                            let parsed = parseFloat(textVal);
                            if (!isNaN(parsed)) vals.push(parsed);
                        }
                    }
                    let val = vals.length > 0 ? vals[0] : 0;
                    
                    if (rowText.includes('members savings deposit')) savings = val;
                    else if (rowText.includes('loan to beneficiries') || rowText.includes('loan to members')) loan = val;
                    else if (rowText === 'cash in hand' || rowText.includes('cash in hand') && !rowText.includes('total')) cashInHand = val;
                    else if ((rowText.includes('cash at bank') || rowText.includes('cash at bank (branch)')) && !rowText.includes('total')) cashAtBank = val;
                    else if (rowText.includes('total equity/capital fund') || rowText.includes('total equity')) {
                        equity = val;
                        equityPrev = vals.length > 1 ? vals[1] : 0;
                    }
                }
            });
        } catch(e) {}
        return { savings, loan, cashInHand, cashAtBank, equity, equityPrev };
    }

    function parseMis(doc) {
        let savings = 0, loan = 0;
        try {
            let allElements = doc.querySelectorAll('b, span, div, th, td');

            for (let el of allElements) {
                if (el.textContent && el.textContent.includes('Grand Total Saving Balance')) {
                    let valStr = el.textContent.split('Grand Total Saving Balance')[1] || el.textContent;
                    let match = valStr.match(/[\d,]+(\.\d{2})?/);
                    if (match) savings = parseFloat(match[0].replace(/[^\d.-]/g, '')) || 0;
                }
            }

            let rows = doc.querySelectorAll('tr');

            for (let tr of rows) {
                if (tr.textContent && tr.textContent.includes('Total :') && !tr.textContent.includes('Grand')) {
                    let cells = tr.querySelectorAll('td, th');
                    let financials = [];
                    cells.forEach(cell => {
                        let txt = cell.textContent.trim();
                        if (txt.includes('.')) {
                            let num = parseFloat(txt.replace(/[^\d.-]/g, ''));
                            if (!isNaN(num)) financials.push(num);
                        }
                    });
                    if (financials.length >= 3) { loan = financials[2]; break; }
                }
            }
        } catch(e) {}
        return { savings, loan };
    }

    function triggerVueChange(el, value, win) {
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (win && win.jQuery) win.jQuery(el).trigger('change');
    }

    async function waitForOptions(doc, selector, minLen = 1) {
        for(let i=0; i<80; i++) {
            let el = doc.querySelector(selector);
            if (el && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 100));
        }
        return doc.querySelector(selector);
    }



    
        window._disbMutex = window._disbMutex || Promise.resolve();

    async function fetchDisbursementCountSilently(bId, sDateFrom, sDateTo, retries = 3) {
        return new Promise(resolve => {
            window._disbMutex = window._disbMutex.then(async () => {
                try {
                    let headers = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
                    let token = headers['Authorization'] || headers['authorization'];
                    if (!token) throw new Error("Missing Token");
                    
                    let sendHeaders = {
                        'Authorization': token,
                        'site-name': 'dsk',
                        'x-tenant-geo': 'bd',
                        'accept': 'application/json, text/plain, */*',
                        'accept-language': 'en'
                    };
                    
                    if (h['content-type']) delete h['content-type'];
              h['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
              let formData = new URLSearchParams();
                    formData.append('cbo_report_level', '1');
                    let finalBId = await getRealBranchIdFallback(bId);
                    formData.append('cbo_branch', finalBId);
                    formData.append('cbo_area', '');
                    formData.append('cbo_zone', '');
                    formData.append('cbo_region', '');
                    formData.append('cbo_product_category', '0');
                    formData.append('cbo_product', '0');
                    formData.append('cbo_transfer_member', '1');
                    formData.append('txt_date_from', sDateFrom);
                    formData.append('txt_date_to', sDateTo);
                    formData.append('controller_name', '');
                    formData.append('method_name', '');
                
                    formData.append('cbo_funding_organizations', '-1');

                    let url = 'https://mfnext3.microfin360.com/core-service/index.php/topsheet_loan_disbursement_registers/ajax_for_generate_report';
                    
                    let res = await fetch(url, {
                        method: 'POST',
                        headers: sendHeaders,
                        credentials: 'include',
                        body: formData
                    });
                    
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    
                    let text = await res.text();
                    
                    try {
                        let j = JSON.parse(text);
                        if (j && j.report_data && j.report_data[bId]) {
                            let count = j.report_data[bId].branch_wise_total_info || 0;
                            resolve({ count: parseInt(count) });
                        } else if (j && typeof j === 'object' && !j.report_data) {
                            resolve({ count: 0 });
                        } else {
                            throw new Error('Invalid JSON structure');
                        }
                    } catch(e) {
                        console.error('fetchDisbCount JSON Parse Error:', e, text.substring(0,200));
                        throw new Error('Parse failed');
                    }
                } catch (e) {
                    console.error('fetchDisbCount Error on branch', bId, e);
                    if (retries > 0) {
                        console.log('Retrying fetchDisbCount for branch', bId, 'Retries left:', retries);
                        await new Promise(r => setTimeout(r, 2000)); 
                        let retryResult = await fetchDisbursementCountSilently(bId, sDateFrom, sDateTo, retries - 1);
                        resolve(retryResult);
                    } else {
                        resolve({ count: 0 });
                    }
                }
                
                // Cool down before allowing the next branch to process
                await new Promise(r => setTimeout(r, 600));
            });
        });
    }
    
    async function fetchMemberDataSilently(bId, sDateFrom, sDateTo, type, productId = '', retries = 3) {
        try {
            let headers = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!headers || !headers['Authorization']) return { count: 0 };
            
            headers['Site-Name'] = 'dsk';
            headers['x-tenant-geo'] = 'bd';
            headers['X-Requested-With'] = 'XMLHttpRequest';
            headers['Accept'] = 'application/json, text/javascript, */*; q=0.01';

            try {
                let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
                await fetch(preUrl, { method: 'GET', headers: headers, credentials: 'include' });
            } catch(e) {}

            let url = '';
            let safeBId = await getRealBranchIdFallback(bId);
            if (type === 'member_admission') {
                url = '/core-service/index.php/members/index?limit=10&offset=0&cbo_branch=' + safeBId + '&cbo_samity=&txt_from_date=' + sDateFrom + '&txt_to_date=' + sDateTo;
            } else if (type === 'member_dropout') {
                url = '/core-service/index.php/member_closings/index?limit=10&offset=0&search=1&cbo_savings_type=&cbo_branch=' + safeBId + '&txt_date_from=' + sDateFrom + '&txt_date_to=' + sDateTo;
            } else if (type === 'td_open') {
                url = '/core-service/index.php/savings/index?limit=20&offset=0&cbo_branch=' + safeBId + (productId ? '&cbo_saving_product_id=' + productId : '') + '&txt_date_from=' + sDateFrom + '&txt_date_to=' + sDateTo + '&cbo_saving_status=-1&is_searched=1';
            } else if (type === 'td_close') {
                url = '/core-service/index.php/saving_closings/index?limit=20&offset=0&cbo_branch=' + safeBId + (productId ? '&cbo_saving_products_id=' + productId : '') + '&txt_date_from=' + sDateFrom + '&txt_date_to=' + sDateTo + '&search=1';
            } else {
                return {count: 0};
            }

            let fullUrl = url.startsWith('http') ? url : (window.location.origin + url);
            let r = await fetch(fullUrl, { method: 'GET', headers: headers });
            if (!r.ok) return { count: 0 };
            let text = await r.text();
            let d;
            try {
                d = JSON.parse(text);
            } catch(e) {
                let debug = document.getElementById('debug-banner-mf');
                if(!debug) {
                    debug = document.createElement('div');
                    debug.id = 'debug-banner-mf';
                    debug.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#c0392b; color:white; z-index:999999; padding:15px; font-size:12px; border-bottom:3px solid #e74c3c;';
                    document.body.prepend(debug);
                }
                debug.innerHTML = '<b>API Response Error (' + type + ' / Product: ' + productId + '):</b><br>' + text.substring(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return { count: 0 };
            }
            return { count: (d.total_rows !== undefined ? d.total_rows : (d.total !== undefined ? d.total : (d.recordsTotal !== undefined ? d.recordsTotal : (d.count !== undefined ? d.count : (d.data && Array.isArray(d.data) ? d.data.length : 0))))) };
        } catch (e) { if(retries > 0) { await new Promise(r => setTimeout(r, 1000 + Math.random()*1000)); return fetchMemberDataSilently(bId, sDateFrom, sDateTo, type, productId, retries - 1); } console.error('fetchMemberDataSilently Error:', e); return { count: 0 }; }
    }

                                    async function fetchWriteOffColl(bId, fromDate, toDate, retries = 3) {
        try {
            let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
            try {
                let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
                await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
            } catch(e) {}
            let fd = new FormData();
            let finalBId = await getRealBranchIdFallback(bId);
            fd.append('cbo_branch', finalBId);
            fd.append('cbo_report_level', '1');
            fd.append('project_id', '-1');
            fd.append('cbo_ledger_head', '402');
            fd.append('opening_date', fromDate);
            fd.append('todate', toDate);
            fd.append('cbo_voucher_type', '-1');
            fd.append('cbo_report_option', 'consilidated');
            fd.append('cbo_is_fraction_contain', '1');
            fd.append('cbo_avoid_zero_balance', '0');
            
            let h2 = Object.assign({}, h);
            delete h2['Content-Type']; delete h2['content-type'];
            delete h2['Content-Length']; delete h2['content-length'];
            delete h2['Accept']; delete h2['accept'];
            
            let res = await window.fetch(window.location.origin + '/core-service/index.php/acc_ledger_reports/ledger_report_view', {
                method: 'POST',
                headers: h2, credentials: 'include', body: fd
            });
            let text = await res.text();
            if (!text || text.trim() === '' || text.trim().startsWith('<')) return 0;
            let j;
            try {
                j = JSON.parse(text);
            } catch(e) {
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 1000 + Math.random()*1000));
                    return fetchWriteOffColl(bId, fromDate, toDate, retries - 1);
                }
                return 0; // If it fails completely, assume 0 rather than crashing
            }
            if (j && j.data_all && j.data_all.length > 0 && j.data_all[0].ledger_reports) {
                let reps = j.data_all[0].ledger_reports;
                let totalCr = 0;
                for (let key in reps) {
                    if (key !== 'voucher_type' && key !== 'sum_amount') {
                        // Sometimes 'Opening Balance' is in the first row, but we want all credit amounts
                        totalCr += parseFloat(reps[key].cr_amount) || 0;
                    }
                }
                return totalCr;
            }
        } catch(e) {
            console.error('WriteOff fetch err', e);
        }
        return 0;
    }

    async function fetchNewDueData(bId, targetDateFrom, targetDateTo) {
    let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
    h['Site-Name'] = 'dsk';
    h['Accept'] = 'application/json, text/plain, */*';
    if (h['Content-Type']) delete h['Content-Type'];
    if (h['content-type']) delete h['content-type'];
    h['X-Requested-With'] = 'XMLHttpRequest';
    h['X-Tenant-Geo'] = 'bd';

    try {
        let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
        await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
    } catch(e) {}

    let fDate = targetDateFrom;
    let tDate = targetDateTo;
    if (fDate && fDate.includes('/')) { let p = fDate.split('/'); fDate = p[2] + '-' + p[1] + '-' + p[0]; }
    if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }

    let formData = new FormData();
            formData.append('cbo_report_level', '1');
            let finalBId = await getRealBranchIdFallback(bId);
            formData.append('cbo_branch', finalBId);
    formData.append('txt_date_from', fDate);
    formData.append('txt_date_to', tDate);
    formData.append('cbo_field_officer', '-1');
    formData.append('cbo_funding_org', '-1');
    formData.append('cbo_loan_category', '-1');
    formData.append('cbo_loan_products', '-1');
    formData.append('cbo_product_or_category', '1');
    formData.append('cbo_service_charge', '1');
    
    let url = '/core-service/index.php/new_due_registers/ajax_for_generate_report';
    
    let fetchRetries = 0;
    while (fetchRetries < 3) {
        try {
            let req = await fetch(url, {
                method: 'POST',
                headers: h, credentials: 'include', body: formData
            });
            if (!req.ok) return { borrower: 0, amount: 0 };
            let text = await req.text();
            let json = JSON.parse(text);
            
            let count = 0;
            let total = 0;
            
            if (json && json.due_loan_info) {
                for (let samityId in json.due_loan_info) {
                    let members = json.due_loan_info[samityId];
                    for (let memberId in members) {
                        let loans = members[memberId];
                        count++;
                        for (let loanId in loans) {
                            total += parseFloat(loans[loanId].due_amount || 0);
                        }
                    }
                }
            }
            return { borrower: count, amount: total };
        } catch (e) {
            fetchRetries++;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return { borrower: 0, amount: 0 };
}
async function getRealBranchIdViaIframe() {
    let cached = sessionStorage.getItem('mf_real_branch_id_iframe'); if (sessionStorage.getItem('mf_real_branch_id_failed')) return '';
    if (cached) return cached;
    let failed = sessionStorage.getItem('mf_real_branch_id_failed');
    if (failed) return '';
    
    let cUrl = sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup');
    if (cUrl) {
        let m = cUrl.match(/[?&]cbo_branch=(-?\d+)/);
        if (m && m[1]) {
            sessionStorage.setItem('mf_real_branch_id_iframe', m[1]);
            return m[1];
        }
    }
    
    let apiTmpl = sessionStorage.getItem('mf_api_template');
    if (apiTmpl) {
        let m = apiTmpl.match(/[?&"']cbo_branch["']?\s*[:=]\s*["']?(-?\d+)/);
        if (m && m[1]) {
            sessionStorage.setItem('mf_real_branch_id_iframe', m[1]);
            return m[1];
        }
    }
    
    let bListStr = localStorage.getItem('microfin_branch_list');
    if (bListStr) {
        try {
            let bList = JSON.parse(bListStr);
            if (bList.length === 1 && bList[0].id && bList[0].id !== 'SELF' && bList[0].id !== '') {
                sessionStorage.setItem('mf_real_branch_id_iframe', bList[0].id);
                return bList[0].id;
            }
        } catch(e) {}
    }

    try {
        let vuexStr = localStorage.getItem('vuex');
        if (vuexStr) {
            let v = JSON.parse(vuexStr);
            let extractedId = '';
            if (v.auth && v.auth.user && v.auth.user.branch_id) extractedId = String(v.auth.user.branch_id);
            else if (v.auth && v.auth.user && v.auth.user.branchId) extractedId = String(v.auth.user.branchId);
            else if (v.auth && v.auth.token) {
                let payloadStr = atob(v.auth.token.split('.')[1]);
                let payload = JSON.parse(payloadStr);
                if (payload.branch_id) extractedId = String(payload.branch_id);
                else if (payload.branchId) extractedId = String(payload.branchId);
                else if (payload.branch) extractedId = String(payload.branch);
            }
            if (extractedId && extractedId !== 'SELF' && extractedId !== '0') {
                sessionStorage.setItem('mf_real_branch_id_iframe', extractedId);
                return extractedId;
            }
        }
    } catch(e) {}

    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed; top:0; left:-9999px; width:1px; height:1px; border:none; z-index:-1;';
        iframe.src = window.location.origin + window.location.pathname + '#/reports/acc-balance-sheets/balance-sheet-report-filter';
        document.body.appendChild(iframe);
        let timeout = setTimeout(() => { 
            if (document.body.contains(iframe)) iframe.remove(); 
            sessionStorage.setItem('mf_real_branch_id_failed', '1');
            resolve(''); 
        }, 2000);
        iframe.onload = () => {
            let checkCount = 0;
            let iv = setInterval(() => {
                checkCount++;
                try {
                    let doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (doc) {
                        let input = doc.querySelector('[name="cbo_branch"]');
                        if (input && input.value && input.value !== '?') {
                            clearInterval(iv);
                            clearTimeout(timeout);
                            sessionStorage.setItem('mf_real_branch_id_iframe', input.value);
                            iframe.remove();
                            resolve(input.value);
                            return;
                        }
                    }
                    if (checkCount > 15) {
                        clearInterval(iv);
                        clearTimeout(timeout);
                        sessionStorage.setItem('mf_real_branch_id_failed', '1');
                        iframe.remove();
                        resolve('');
                    }
                } catch(e) {
                    clearInterval(iv);
                    clearTimeout(timeout);
                    sessionStorage.setItem('mf_real_branch_id_failed', '1');
                    iframe.remove();
                    resolve('');
                }
            }, 400);
        };
    });
}
        async function fetchPeriodicalReportApi(bId, targetDateFrom, targetDateTo, transactionType = "0") {
            let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
            h['Site-Name'] = 'dsk';
            h['Accept'] = 'application/json, text/plain, */*';
            if (h['Content-Type']) delete h['Content-Type'];
            if (h['content-type']) delete h['content-type'];
            h['X-Requested-With'] = 'XMLHttpRequest';
            h['X-Tenant-Geo'] = 'bd';

            try {
                let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
                await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
            } catch(e) {}

            let fDate = targetDateFrom;
            let tDate = targetDateTo;
            if (fDate && fDate.includes('/')) { let p = fDate.split('/'); fDate = p[2] + '-' + p[1] + '-' + p[0]; }
            if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }

            let formData = new FormData();
            let finalBId = await getRealBranchIdFallback(bId);
            formData.append('cbo_branch', finalBId);
            formData.append('cbo_field_officer', '0');
            formData.append('cbo_funding_org_id', '0');
            formData.append('cbo_product_category', '0');
            formData.append('cbo_product', '0');
            formData.append('cbo_transaction_type', transactionType);
            formData.append('txt_date_from', fDate);
            formData.append('txt_date_to', tDate);
            formData.append('cbo_loan_type', '0');
            formData.append('cbo_service_charge', '1');
            formData.append('cbo_round_up', '0');

            let url = '/core-service/index.php/periodical_reports/ajax_periodical_report';
            
            let fetchRetries = 0;
            while (fetchRetries < 3) {
                try {
                    let req = await fetch(url, {
                        method: 'POST',
                        headers: h, credentials: 'include', body: formData
                    });
                    if (!req.ok) return null;
                    let json = await req.json();
                    
                    if (json && json.report_data && json.report_data.infos && json.report_data.infos.total) {
                        let t = json.report_data.infos.total;
                        let result = { savingsDeposit:0, savingsRefund:0, disbAmount:0, recoverable:0, regular:0, due:0, advance:0, principal:0, serviceCharge:0 };
                        
                        if (t.savings) {
                            for (let k in t.savings) {
                                result.savingsDeposit += parseFloat(t.savings[k].deposit_amount || 0);
                                result.savingsRefund += parseFloat(t.savings[k].withdraw_amount || 0);
                            }
                        }
                        if (t.loans) {
                            result.disbAmount += parseFloat(t.loans.disbursement_amount || 0);
                            result.recoverable += parseFloat(t.loans.recoverable_principle || 0);
                            result.regular += parseFloat(t.loans.principle_regular_recovery || 0);
                            result.due += parseFloat(t.loans.principle_due || 0);
                            result.advance += parseFloat(t.loans.principle_advance || 0);
                            result.principal += parseFloat(t.loans.principle_recovery || t.loans.principal_recovery || 0);
                            result.serviceCharge += parseFloat(t.loans.interest_recovery || 0);
                        }
                        return result;
                    }
                    return null;
                } catch(err) {
                    fetchRetries++;
                    if (fetchRetries >= 3) return null;
                    await new Promise(r => setTimeout(r, 1000 + Math.random()*1000));
                }
            }
            return null;
        }

        async function fetchBalanceSheetApi(bId, targetDateTo) {
            let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
            h['Site-Name'] = 'dsk';
            h['Accept'] = 'application/json, text/plain, */*';
            if (h['Content-Type']) delete h['Content-Type'];
            if (h['content-type']) delete h['content-type'];
            h['X-Requested-With'] = 'XMLHttpRequest';
            h['X-Tenant-Geo'] = 'bd';

            try {
                let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
                await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
            } catch(e) {}

            let tDate = targetDateTo;
            if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }

            let formData = new FormData();
            formData.append('cbo_report_level', '1');
            let finalBId = await getRealBranchIdFallback(bId);
            formData.append('cbo_branch', finalBId);
            formData.append('txt_as_on_date', tDate);
            formData.append('project_id', '-1');
            formData.append('cbo_is_fraction_contain', '1');
            formData.append('cbo_report_options', 'P');
            formData.append('txt_date_from', tDate);
            formData.append('txt_date_to', tDate);
            formData.append('chk_show_ledger_code', 'yes');

            let url = '/core-service/index.php/acc_balance_sheets/ajax_balance_sheet_report';
            
            let fetchRetries = 0;
            while (fetchRetries < 3) {
                try {
                    let req = await fetch(url, {
                        method: 'POST',
                        headers: h, credentials: 'include', body: formData
                    });
                    if (!req.ok) return null;
                    let json = await req.json();
                    
                    let result = { cashInHand: 0, cashAtBank: 0, equity: 0, equityPrev: 0, savings: 0, loan: 0, debugLog: "" };
                    
                    // First search cash balances in the structured nodes
                    function searchCash(node) {
                        if (!node) return;
                        let amtStr = (node.cumulative_amount_current || 0).toString().replace(/,/g, '');
                        let currentAmt = parseFloat(amtStr);
                        if (node.code === "132000") result.cashInHand = currentAmt;
                        else if (node.code === "134000") result.cashAtBank = currentAmt;
                        
                        if (node.children) {
                            for (let k in node.children) {
                                searchCash(node.children[k]);
                            }
                        }
                    }
                    if (json && json.balancesheets) {
                        for (let type in json.balancesheets) {
                            for (let key in json.balancesheets[type]) {
                                searchCash(json.balancesheets[type][key]);
                            }
                        }
                    }

                    // Then find the HTML string in the JSON and parse Equity, Savings, Loan from it
                    for (let key in json) {
                        if (typeof json[key] === 'string' && json[key].includes('<table')) {
                            let div = document.createElement('div');
                            div.innerHTML = json[key];
                            div.querySelectorAll('tr').forEach(tr => {
                                let rowText = (tr.textContent || "").toLowerCase();
                                let cells = tr.querySelectorAll('td, th');
                                if (cells.length >= 2) {
                                    let vals = [];
                                    for (let i = 1; i < cells.length; i++) {
                                        let textVal = cells[i].textContent.replace(/[^\d.-]/g, '');
                                        if (textVal && textVal !== '-') {
                                            let parsed = parseFloat(textVal);
                                            if (!isNaN(parsed)) vals.push(parsed);
                                        }
                                    }
                                    let val = vals.length > 0 ? vals[0] : 0;
                                    
                                    if (rowText.includes('total equity/capital fund') || rowText.includes('total equity')) {
                                        result.equity = val;
                                        result.equityPrev = vals.length > 1 ? vals[1] : 0;
                                    }
                                    else if (rowText.includes('members savings deposit')) {
                                        result.savings = val;
                                    }
                                    else if (rowText.includes('loan to beneficiries') || rowText.includes('loan to members')) {
                                        result.loan = val;
                                    }
                                }
                            });
                        }
                    }
                    
                    return result;
                } catch(err) {
                    fetchRetries++;
                    if (fetchRetries >= 3) return null;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            return null;
        }

        async function fetchIncomeStatementApi(bId, targetDateTo) {
            let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
            h['Site-Name'] = 'dsk';
            h['Accept'] = 'application/json, text/plain, */*';
            if (h['Content-Type']) delete h['Content-Type'];
            if (h['content-type']) delete h['content-type'];
            h['X-Requested-With'] = 'XMLHttpRequest';
            h['X-Tenant-Geo'] = 'bd';

            let tDate = targetDateTo;
            if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }

            let formData = new FormData();
            formData.append('cbo_report_level', '1');
            let finalBId = await getRealBranchIdFallback(bId);
            formData.append('cbo_branch', finalBId);
            formData.append('txt_as_on_date', tDate);
            formData.append('txt_date_from', tDate);
            formData.append('txt_date_to', tDate);
            formData.append('project_id', '-1');
            formData.append('cbo_is_fraction_contain', '1');
            formData.append('cbo_report_options', 'P');

            let url = '/core-service/index.php/acc_income_statements/ajax_income_statment';
            
            let fetchRetries = 0;
            while (fetchRetries < 3) {
                try {
                    let req = await fetch(url, {
                        method: 'POST',
                        headers: h, credentials: 'include', body: formData
                    });
                    if (!req.ok) return null;
                    let json = await req.json();
                    
                    let incomeMonth = 0, incomeYear = 0;
                    let expenseMonth = 0, expenseYear = 0;
                    
                    if (json && json.income_staments) {
                        if (json.income_staments.income) {
                            let incomeRoot = Object.values(json.income_staments.income)[0];
                            if (incomeRoot) {
                                incomeMonth = parseFloat(incomeRoot.amount_current_month || 0);
                                incomeYear = parseFloat(incomeRoot.amount_current_year || 0);
                            }
                        }
                        if (json.income_staments.expense) {
                            let expenseRoot = Object.values(json.income_staments.expense)[0];
                            if (expenseRoot) {
                                expenseMonth = parseFloat(expenseRoot.amount_current_month || 0);
                                expenseYear = parseFloat(expenseRoot.amount_current_year || 0);
                            }
                        }
                    }
                    
                    return {
                        surplusMonth: incomeMonth - expenseMonth,
                        surplusYear: incomeYear - expenseYear
                    };
                } catch(err) {
                    fetchRetries++;
                    if (fetchRetries >= 3) return null;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            return null;
        }
        async function fetchDueCollectionApi(bId, targetDateFrom, targetDateTo) {
            let h = {};
            try { 
                let saved = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
                Object.assign(h, saved);
            } catch(e) {}
            
            // CRITICAL FIX: Only use vuex if the interceptor hasn't already provided a fresh Authorization token!
            if (!h['Authorization'] && !h['authorization']) {
                try { 
                    let v = JSON.parse(localStorage.getItem('vuex')); 
                    if (v && v.auth && v.auth.token) { 
                        h['Authorization'] = 'Bearer ' + v.auth.token; 
                    } 
                } catch(e) {}
            }
            
            h['Site-Name'] = 'dsk';
            h['X-Tenant-Geo'] = 'bd';
            h['Accept'] = 'application/json, text/plain, */*';
            
            // Remove problematic headers that cause 401 or 500 for multipart
            if (h['Content-Type']) delete h['Content-Type'];
            if (h['content-type']) delete h['content-type'];
            if (h['x-requested-with']) delete h['x-requested-with'];
            h['X-Requested-With'] = 'XMLHttpRequest';
            if (h['x-requested-with']) delete h['x-requested-with'];
            h['X-Requested-With'] = 'XMLHttpRequest';
            try {
                let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
                await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
            } catch(e) {}
            if (h['Isme-Token']) delete h['Isme-Token'];
            if (h['isme-token']) delete h['isme-token'];
            if (h['Device-Key']) delete h['Device-Key'];
            if (h['device-key']) delete h['device-key'];

            try {
                let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
                await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
            } catch(e) {}

            let fDate = targetDateFrom;
            let tDate = targetDateTo;
            if (fDate && fDate.includes('/')) { let p = fDate.split('/'); fDate = p[2] + '-' + p[1] + '-' + p[0]; }
            if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }

            let formData = new FormData();
            formData.append('cbo_report_level', '1');
            let finalBId = await getRealBranchIdFallback(bId);
            formData.append('cbo_branch', finalBId);
            formData.append('cbo_samity_id', '-1');
            formData.append('cbo_product', '-1');
            formData.append('txt_date_from', fDate);
            formData.append('txt_date_to', tDate);
            formData.append('cbo_service_charge', '0');

            let url = '/core-service/index.php/register_reports/ajax_due_collection_register';
            
            let fetchRetries = 0;
            while (fetchRetries < 3) {
                try {
                    let req = await fetch(url, {
                        method: 'POST',
                        headers: h, credentials: 'include', body: formData
                    });
                    if (!req.ok) return null;
                    let json = await req.json();
                    
                    let result = { totalCurrent: 0, totalMatured: 0 };
                    if (json && json.due_collection) {
                        for (let k in json.due_collection) {
                            result.totalCurrent += parseFloat(json.due_collection[k].regular_due_collection_amount || 0);
                            result.totalMatured += parseFloat(json.due_collection[k].expired_due_collection_amount || 0);
                        }
                    }
                    return result;
                } catch(err) {
                    fetchRetries++;
                    if (fetchRetries >= 3) return null;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            return null;
        }
                                async function fetchFullPaidData(bId, targetDateFrom, targetDateTo) {
              let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
              h['Site-Name'] = 'dsk';
              h['Accept'] = 'application/json, text/plain, */*';
              if (h['Content-Type']) delete h['Content-Type'];
              if (h['content-type']) delete h['content-type'];
              h['X-Requested-With'] = 'XMLHttpRequest';
                h['X-Tenant-Geo'] = 'bd';
    
                try {
    
                    let preUrl = '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
    
                    await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
    
                } catch(e) {}
    
                let fDate = targetDateFrom;
                let tDate = targetDateTo;
                if (fDate && fDate.includes('/')) { let p = fDate.split('/'); fDate = p[2] + '-' + p[1] + '-' + p[0]; }
                if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }
    
                let formData = new FormData();
            let finalBId = await getRealBranchIdFallback(bId);
            formData.append('cbo_report_level', '1');
            formData.append('cbo_branch', finalBId);
              formData.append('cbo_area', '-1');
              formData.append('cbo_zone', '-1');
              formData.append('cbo_region', '-1');
              formData.append('txt_date_from', fDate);
              formData.append('txt_date_to', tDate);
              formData.append('controller_name', '');
              formData.append('method_name', '');
                
  
              let url = '/core-service/index.php/topsheet_fully_paid_loan_registers/ajax_for_generate_report';
              
              let fetchRetries = 0;
              while (fetchRetries < 3) {
                  try {
                      let req = await fetch(url, {
                          method: 'POST',
                          headers: h, credentials: 'include', body: formData
                      });
                      if (!req.ok) return "HttpErr";
                      let text = await req.text();
                      let json = JSON.parse(text);
                      if (json && json.report_data) {
                            if (json.report_data[bId] && typeof json.report_data[bId].loanee !== 'undefined') {
                                  return parseInt(json.report_data[bId].loanee) || 0;
                              } else {
                                  let keys = Object.keys(json.report_data);
                                  if (keys.length > 0 && json.report_data[keys[0]] && typeof json.report_data[keys[0]].loanee !== 'undefined') {
                                      return parseInt(json.report_data[keys[0]].loanee) || 0;
                                  }
                                  if (keys.length === 0) return 0;
                              }
                            return 0;
                        }
                        if (json && json.status === "error") return "ApiErr";
                        return 0;
                  } catch(err) {
                      fetchRetries++;
                      if (fetchRetries >= 3) return "CatchErr";
                      await new Promise(r => setTimeout(r, 1000));
                  }
              }
              return "Timeout";
          }

                                async function fetchTermDepositData(bId, targetDateFrom, targetDateTo) {
          let pIds = [29, 30, 34, 36, 31, 32, 33];
          let oRes = [];
          for (let id of pIds) { oRes.push(await fetchMemberDataSilently(bId, targetDateFrom, targetDateTo, 'td_open', id)); }

          let closeCounts = { lts: 0, double: 0, monthly: 0, fdr: 0, total: 0 };
          let debugStr = '';
          try {
              let fDate = targetDateFrom;
              let tDate = targetDateTo;
              if (fDate && fDate.includes('/')) { let p = fDate.split('/'); fDate = p[2] + '-' + p[1] + '-' + p[0]; }
              if (tDate && tDate.includes('/')) { let p = tDate.split('/'); tDate = p[2] + '-' + p[1] + '-' + p[0]; }
              
              let offset = 0;
              let hasMore = true;
              let totalSeen = 0;
              let tRows = 0;
              
              while (hasMore) {
                  let safeBId = await getRealBranchIdFallback(bId);
                  let url = '/core-service/index.php/saving_closings/index?limit=20&offset=' + offset + '&search=1&cbo_savings_type=&cbo_branch=' + safeBId + '&txt_date_from=' + fDate + '&txt_date_to=' + tDate + '&cbo_saving_products_id=-1';
                    let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
                    h['Site-Name'] = 'dsk';
                    h['Accept'] = 'application/json, text/plain, */*';
                    let req;
                    let fetchRetries = 0;
                    while (fetchRetries < 3) {
                        try {
                            req = await fetch(url, { headers: h });
                            break;
                        } catch(err) {
                            fetchRetries++;
                            if (fetchRetries >= 3) throw err;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                  let text = await req.text();
                  debugStr = 'Fetched';
                  let json = JSON.parse(text);
                  debugStr = 'Parsed';
                  
                  if (json && json.saving_closings && Array.isArray(json.saving_closings)) {
                      tRows = parseInt(json.total_rows) || 0;
                      totalSeen += json.saving_closings.length;
                      
                      for (let row of json.saving_closings) {
                          let pid = parseInt(row.product_id);
                          if (pid === 29 || pid === 30) closeCounts.lts++;
                          else if (pid === 34) closeCounts.double++;
                          else if (pid === 36) closeCounts.monthly++;
                          else if (pid === 31 || pid === 32 || pid === 33) closeCounts.fdr++;
                      }
                      
                      if (json.saving_closings.length === 0 || offset + json.saving_closings.length >= tRows) {
                          hasMore = false;
                      } else {
                          offset += 20;
                      }
                  } else {
                      hasMore = false;
                      debugStr = 'NoArr';
                  }
              }
              let sum = closeCounts.lts + closeCounts.double + closeCounts.monthly + closeCounts.fdr;
              closeCounts.total = sum;
          } catch(e) { 
              console.error('Error fetching td_close:', e); 
              closeCounts.total = sum || 0;
          }

          return {
              open: {
                  lts: (oRes[0].count || 0) + (oRes[1].count || 0),
                  double: oRes[2].count || 0,
                  monthly: oRes[3].count || 0,
                  fdr: (oRes[4].count || 0) + (oRes[5].count || 0) + (oRes[6].count || 0),
                  total: (oRes[0].count || 0) + (oRes[1].count || 0) + (oRes[2].count || 0) + (oRes[3].count || 0) + (oRes[4].count || 0) + (oRes[5].count || 0) + (oRes[6].count || 0)
              },
              close: closeCounts
          };
      }

    async function fetchMisReportApi(bId, targetDate, retries = 2) {
        try {
            let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {} }
            
            h['Site-Name'] = 'dsk';
            h['Accept'] = 'application/json, text/plain, */*';
            if (h['Content-Type']) delete h['Content-Type'];
            if (h['content-type']) delete h['content-type'];
            h['X-Requested-With'] = 'XMLHttpRequest';

            let fDate = targetDate;
            if (fDate && fDate.includes('/')) { let p = fDate.split('/'); fDate = p[2] + '-' + p[1] + '-' + p[0]; }

            let fd = new FormData();
            let finalBId = await getRealBranchIdFallback(bId);
            fd.append('cbo_branch', finalBId);
            fd.append('cbo_samity', '-1');
            fd.append('cbo_funding_organization', '-1');
            fd.append('cbo_service_charge', '1');
            fd.append('txt_date', fDate);

            let url = '/core-service/index.php/member_migration_balances/ajax_member_migration_balance_report';
            let res = await fetch(url, { method: 'POST', headers: h, body: fd, credentials: 'include' });
            
            let text = await res.text();
            let json = null;
            try {
                json = JSON.parse(text);
            } catch(e) {}
            
            let htmlStr = '';
            if (json && typeof json === 'object') {
                for (let key in json) {
                    if (typeof json[key] === 'string' && (json[key].includes('<table') || json[key].includes('Grand Total Saving Balance'))) {
                        htmlStr = json[key];
                        break;
                    }
                }
            } else {
                htmlStr = text;
            }

            if (htmlStr && (htmlStr.includes('<table') || htmlStr.includes('Grand Total Saving Balance'))) {
                let parser = new DOMParser();
                let doc = parser.parseFromString(htmlStr, 'text/html');
                let data = parseMis(doc);
                if(data.loan === 0 && data.savings === 0 && htmlStr.includes('Data Not Found')) {
                    return null;
                }
                return data;
            }
            
            if(retries > 0) {
                await new Promise(r => setTimeout(r, 1000));
                return fetchMisReportApi(bId, targetDate, retries - 1);
            }
            
            return null;
        } catch(e) {
            if(retries > 0) {
                await new Promise(r => setTimeout(r, 1000));
                return fetchMisReportApi(bId, targetDate, retries - 1);
            }
            return null;
        }
    }

    function scrapeViaGhost(hashUrl, targetDate, reportLevel, targetId, type, statusCallback, transactionType = "0", serviceChargeMode = "1") {


    return new Promise((resolve) => {
            let iframe = document.createElement('iframe');
            iframe.allow = "geolocation 'none'";
            let isLive = false;
            if (isLive) {
                let offset = Math.floor(Math.random() * 40);
                iframe.style.cssText = `position:fixed; bottom:${offset}px; right:${offset}px; width:700px; height:500px; border:4px solid #e74c3c; border-radius:5px; z-index:9999999; background:white; box-shadow:0 10px 30px rgba(0,0,0,0.5); opacity:0.95; transition:0.3s;`;
            } else {
                iframe.style.cssText = 'position:fixed; top:0; left:-9999px; width:1200px; height:800px; border:none; z-index:-1;';
            }
            iframe.src = window.location.origin + window.location.pathname + hashUrl;
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => {
                if(document.body.contains(iframe)) iframe.remove();
                resolve(type === 'is' ? { surplusMonth: -999, surplusYear: -999 } : null);
            }, type === 'samity' ? 300000 : ((type === 'daily_transaction' || type === 'due_collection' || type === 'ais' || type === 'topsheet_disb') ? 25000 : 60000)); 

            let isProcessed = false;
            let uType = sessionStorage.getItem('mf_user_type') || 'HO';

            iframe.onload = () => {
                if(isProcessed) return;
                
                setTimeout(async () => {
                    try {
                            let doc = iframe.contentDocument || iframe.contentWindow.document;
                        let win = iframe.contentWindow;
                        let btn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary');

                        let reportLvlDropdown = null;
                        for(let i=0; i<15; i++) {
                            reportLvlDropdown = doc.querySelector('select[name="cbo_report_level"]');
                            let branchDropdown = doc.querySelector('select[name="cbo_branch"]');
                            let submitBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary');
                            if(reportLvlDropdown || branchDropdown || submitBtn) {
                                reportLvlDropdown = doc.querySelector('select[name="cbo_report_level"]'); // Re-assign in case only branch was found
                                break;
                            }
                            await new Promise(r => setTimeout(r, 200));
                        }
                        
                        if (reportLvlDropdown && reportLvlDropdown.value !== reportLevel) {
                            triggerVueChange(reportLvlDropdown, reportLevel, win);
                            await new Promise(r => setTimeout(r, 600)); 
                        }

                        if (uType === 'HO' || uType === 'ZONE' || uType === 'AREA') {
                            let targetSelector = reportLevel === '3' ? 'select[name="cbo_zone"]' : (reportLevel === '2' ? 'select[name="cbo_area"]' : 'select[name="cbo_branch"]');
                            let targetSel = await waitForOptions(doc, targetSelector);
                            if (targetSel && targetId !== 'ALL' && targetSel.value !== targetId) {
                                triggerVueChange(targetSel, targetId, win);
                                await new Promise(r => setTimeout(r, 800));
                            }
                        }

                        if (type === 'mis') {
                            await new Promise(r => setTimeout(r, 2000));

                            let samitySel = doc.querySelector('select[name="cbo_samity"]');
                            if (samitySel && samitySel.value !== "-1") {
                                triggerVueChange(samitySel, "-1", win); 
                                await new Promise(r => setTimeout(r, 300));
                            }
                            var scSel = doc.querySelector('select[name="cbo_service_charge"]');
                            if (scSel && scSel.value !== "1") triggerVueChange(scSel, "1", win);
                            
                            let fractionSel = doc.querySelector('select[name="cbo_is_fraction_contain"]');
                            if (fractionSel && fractionSel.value !== "1") {
                                triggerVueChange(fractionSel, "1", win);
                            }
                            
                            let foSel = doc.querySelector('select[name="cbo_funding_organization"]');
                            if (foSel && foSel.value !== "-1") triggerVueChange(foSel, "-1", win);
                            
                            let dInput = doc.querySelector('input[name="txt_date"]');
                            if (dInput && dInput.value !== targetDate) triggerVueChange(dInput, targetDate, win);
                            
                            setTimeout(() => {
                                let currentBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary') || btn;
                                if (currentBtn) {
                                    currentBtn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                    currentBtn.click();
                                }
                                
                                let poll = setInterval(() => {
                                    if (doc.body.textContent.includes('Saving Balance')) {
                                        clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                        let data = parseMis(doc);
                                        iframe.remove(); resolve(data);
                                    }
                                }, 300);
                            }, 200);
                        } 
                        else if (type === 'ais') {

                            let dateInputAis = doc.querySelector('input[name="txt_as_on_date"]');
                            if(dateInputAis && dateInputAis.value !== targetDate) triggerVueChange(dateInputAis, targetDate, win);

                            let fractionSel = doc.querySelector('select[name="cbo_is_fraction_contain"]');
                            if (fractionSel && fractionSel.value !== "1") {
                                triggerVueChange(fractionSel, "1", win);
                            }

                            let checkbox = doc.getElementById('chk_show_ledger_code1');
                            let checkLabel = doc.querySelector('label[for="chk_show_ledger_code1"]');
                            
                            if (checkbox && !checkbox.checked) {
                                if (checkLabel) checkLabel.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true }));
                                else checkbox.click();
                                checkbox.checked = true;
                                triggerVueChange(checkbox, "1", win);
                            }

                            setTimeout(() => {
                                let currentBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary') || btn;
                                if (currentBtn) {
                                    currentBtn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                    currentBtn.click();
                                }
                                
                                let poll = setInterval(() => {
                                    let bodyText = (doc.body.textContent || '').toLowerCase();
                                    if (bodyText.includes('total asset') || bodyText.includes('total equity') || bodyText.includes('total liabilities')) {
                                        clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                        let data = parseAis(doc);
                                        iframe.remove(); resolve(data);
                                    }
                                }, 400);
                            }, 200);
                        } 
                          else if (type === 'daily_transaction') {
                              try {
                                  let targetDateFrom = document.getElementById('custom-audit-date-from').value;
                                  let targetDateTo = document.getElementById('custom-audit-date').value;

                                  var dForce = setInterval(() => {
                                      let df = doc.querySelector('input[name="txt_from_date"]') || doc.querySelector('input[name="txt_date_from"]') || doc.querySelectorAll('input[name*="from"]')[0];
                                      let dt = doc.querySelector('input[name="txt_to_date"]') || doc.querySelector('input[name="txt_date_to"]') || doc.querySelectorAll('input[name*="to"]')[0];
                                      if (df && df.value !== targetDateFrom) triggerVueChange(df, targetDateFrom, win);
                                      if (dt && dt.value !== targetDateTo) triggerVueChange(dt, targetDateTo, win);
                                  }, 100);
                                  setTimeout(() => clearInterval(dForce), 15000);

                                  var df_sync = doc.querySelector('input[name="txt_from_date"]') || doc.querySelector('input[name="txt_date_from"]') || doc.querySelectorAll('input[name*="from"]')[0];
                                  var dt_sync = doc.querySelector('input[name="txt_to_date"]') || doc.querySelector('input[name="txt_date_to"]') || doc.querySelectorAll('input[name*="to"]')[0];
                                  if (df_sync && df_sync.value !== targetDateFrom) triggerVueChange(df_sync, targetDateFrom, win);
                                  if (dt_sync && dt_sync.value !== targetDateTo) triggerVueChange(dt_sync, targetDateTo, win);

                                  var branchSel = doc.querySelector('select[name="cbo_branch"]');
                                  if (branchSel && targetId !== 'SELF' && branchSel.value !== targetId) {
                                      triggerVueChange(branchSel, targetId, win);
                                      await new Promise(r => setTimeout(r, 600)); // Faster cascade wait
                                  }

                                  var scSel = doc.querySelector('select[name="cbo_service_charge"]');
                                  if (scSel && scSel.value !== serviceChargeMode) triggerVueChange(scSel, serviceChargeMode, win);

                                  var txSel = doc.querySelector('select[name="cbo_transaction_type"]');
                                  if (txSel && txSel.value !== transactionType) triggerVueChange(txSel, transactionType, win);

                                  // Wait for inputs to be exactly correct (up to 15 seconds for slow networks)
                                  for (let wait = 0; wait < 150; wait++) {
                                      let bs = doc.querySelector('select[name="cbo_branch"]');
                                      let df = doc.querySelector('input[name="txt_from_date"]') || doc.querySelector('input[name="txt_date_from"]') || doc.querySelectorAll('input[name*="from"]')[0];
                                      let dt = doc.querySelector('input[name="txt_to_date"]') || doc.querySelector('input[name="txt_date_to"]') || doc.querySelectorAll('input[name*="to"]')[0];
                                      let submitBtnCheck = doc.getElementById('custom-search-btn') || doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary');
                                      
                                      let branchOk = (!bs || targetId === 'SELF' || bs.value === targetId);
                                      let dFromOk = (!df || df.value === targetDateFrom);
                                      let dToOk = (!dt || dt.value === targetDateTo);
                                      if (branchOk && dFromOk && dToOk && submitBtnCheck) break;
                                      await new Promise(r => setTimeout(r, 100));
                                  }
                                  
                                  // Give Vue time to sync the v-model state from the DOM values before submitting
                                  await new Promise(r => setTimeout(r, 800));

                                  let submitBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary');
                                  if (submitBtn) {
                                      submitBtn.click();
                                  }

                                  let startWait = Date.now();
                                  let checkInt = setInterval(() => {
                                      if (Date.now() - startWait > 90000) {
                                          clearInterval(checkInt);
                                          isProcessed = true;
                                          if(document.body.contains(iframe)) iframe.remove();
                                          resolve({ savingsDeposit:0, savingsRefund:0, disbAmount:0, recoverable:0, regular:0, due:0, advance:0, rebate:0, principal:0, serviceCharge:0 });
                                          return;
                                      }
                                      let totalRow = Array.from(doc.querySelectorAll('tr')).reverse().find(r => r.textContent.includes('Total') || r.textContent.includes('Grand Total'));
                                      if (totalRow) {
                                          let cells = Array.from(totalRow.querySelectorAll('td, th'));
                                          // Note: The total row usually comes AFTER the thead and some data rows.
                                          if (doc.querySelectorAll('tr').length > 4 && cells.length > 2) {
                                              clearInterval(checkInt);
                                              
                                              let headerGrid = []; 
                                              let trs = Array.from(doc.querySelectorAll('thead tr'));
                                              for (let r = 0; r < trs.length; r++) {
                                                  headerGrid[r] = headerGrid[r] || [];
                                                  let tds = Array.from(trs[r].querySelectorAll('th, td'));
                                                  let c = 0;
                                                  for (let td of tds) {
                                                      while (headerGrid[r][c]) c++; 
                                                      let rSpan = parseInt(td.getAttribute('rowspan') || '1', 10);
                                                      let cSpan = parseInt(td.getAttribute('colspan') || '1', 10);
                                                      let text = (td.innerText || td.textContent).replace(/\s+/g, ' ').trim().toLowerCase();
                                                      for (let i = 0; i < rSpan; i++) {
                                                          headerGrid[r + i] = headerGrid[r + i] || [];
                                                          for (let j = 0; j < cSpan; j++) {
                                                              headerGrid[r + i][c + j] = text;
                                                          }
                                                      }
                                                      c += cSpan;
                                                  }
                                              }

                                              let colMapping = {};
                                              if (headerGrid.length > 0) {
                                                  let numCols = headerGrid[0].length;
                                                  for (let c = 0; c < numCols; c++) {
                                                      let fullText = Array.from(new Set(headerGrid.map(row => row[c]))).join(' '); 
                                                      if (fullText.includes('savings collection')) colMapping[c] = 'savingsDeposit';
                                                      else if (fullText.includes('savings refund')) colMapping[c] = 'savingsRefund';
                                                      else if (fullText.includes('disbursement amount')) colMapping[c] = 'disbAmount';
                                                      else if (fullText.includes('regular recoverable')) colMapping[c] = 'recoverable';
                                                      else if (fullText.includes('loan collection') && fullText.includes('regular')) colMapping[c] = 'regular';
                                                      else if (fullText.includes('loan collection') && fullText.includes('due')) colMapping[c] = 'due';
                                                      else if (fullText.includes('loan collection') && fullText.includes('advance')) colMapping[c] = 'advance';
                                                      else if (fullText.includes('principle') || fullText.includes('principal')) colMapping[c] = 'principal';
                                                      else if (fullText.includes('service charge')) colMapping[c] = 'serviceCharge';
                                                  }
                                              }

                                              let totalLogicalVals = [];
                                              cells.forEach(cell => {
                                                  let span = parseInt(cell.getAttribute('colspan') || '1', 10);
                                                  let t = cell.innerText.split('\n')[0].replace(/\*/g, '').replace(/,/g, '').trim();
                                                  let val = parseFloat(t);
                                                  if (isNaN(val)) val = 0;
                                                  for (let i = 0; i < span; i++) {
                                                      totalLogicalVals.push(i === span - 1 ? val : 0);
                                                  }
                                              });

                                              let result = { savingsDeposit:0, savingsRefund:0, disbAmount:0, recoverable:0, regular:0, due:0, advance:0, principal:0, serviceCharge:0 };
                                              for (let i = 0; i < totalLogicalVals.length; i++) {
                                                  let key = colMapping[i];
                                                  if (key) {
                                                      result[key] += totalLogicalVals[i];
                                                  }
                                              }
                                              
                                              let disbCount = 0;
                                              let disbColIndex = parseInt(Object.keys(colMapping).find(k => colMapping[k] === 'disbAmount'));
                                              if (!isNaN(disbColIndex) && headerGrid.length > 0) {
                                                  let numCols = headerGrid[0].length;
                                                  let disbOffsetRight = numCols - 1 - disbColIndex;
                                                  let dataRows = Array.from(doc.querySelectorAll('tbody tr'));
                                                  dataRows.forEach(tr => {
                                                      let text = tr.textContent.toLowerCase();
                                                      if (text.includes('sub total') || text.includes('grand total') || text.includes('total')) return;
                                                      
                                                      let tds = Array.from(tr.querySelectorAll('td'));
                                                      if (tds.length > disbOffsetRight) {
                                                          let cell = tds[tds.length - 1 - disbOffsetRight];
                                                          let val = parseFloat((cell.innerText || cell.textContent).split('\n')[0].replace(/\*/g, '').replace(/,/g, '').trim());
                                                          if (!isNaN(val) && val > 0) disbCount++;
                                                      }
                                                  });
                                              }
                                              result.disbCount = disbCount;

                                              resolve(result);
                                              isProcessed = true;
                                              clearTimeout(timeout);
                                              if(document.body.contains(iframe)) iframe.remove();
                                              return;
                                          }
                                      }
                                  }, 1000);
                              } catch(e) {
                                  isProcessed = true;
                                  if(document.body.contains(iframe)) iframe.remove();
                                  resolve({ savingsDeposit:0, savingsRefund:0, disbAmount:0, recoverable:0, regular:0, due:0, advance:0, rebate:0, principal:0, serviceCharge:0 });
                              }
                              return;                            }
                            else if (type === 'member_admission' || type === 'member_dropout') {
                              try {
                                  let targetDateFrom = document.getElementById('custom-audit-date-from').value;
                                  let targetDateTo = document.getElementById('custom-audit-date').value;

                                  if (!win._intercepted) {
                                      const ifrOpen = win.XMLHttpRequest.prototype.open;
                                      const ifrSetHeader = win.XMLHttpRequest.prototype.setRequestHeader;
                                      const ifrSend = win.XMLHttpRequest.prototype.send;
                                      win.XMLHttpRequest.prototype.open = function(m, u) { this._url = u; this._headers = {}; ifrOpen.apply(this, arguments); };
                                      win.XMLHttpRequest.prototype.setRequestHeader = function(k, v) { this._headers[k] = v; ifrSetHeader.apply(this, arguments); };
                                      win.XMLHttpRequest.prototype.send = function(body) {
                                          let isSearchApi = this._method && this._method.toUpperCase() === 'POST' && !this._url.includes('cbo_') && !this._url.includes('config');
                                            if (this._url && isSearchApi) {
                                              this.addEventListener('load', function() {
                                                  try {
                                                      let data = JSON.parse(this.responseText);
                                                        if (data && typeof data === 'object') {
                                                            if ('total' in data || 'total_rows' in data || 'recordsTotal' in data || 'count' in data) {
                                                                win._memberCount = data.total ?? data.total_rows ?? data.count ?? data.recordsTotal ?? data.recordsFiltered ?? data.data?.length ?? 0;
                                                                win._memberCaptured = true;
                                                            } else if ('data' in data && Array.isArray(data.data)) {
                                                                win._memberCount = data.data.length;
                                                                win._memberCaptured = true;
                                                            } else if (Array.isArray(data)) {
                                                                win._memberCount = data.length;
                                                                win._memberCaptured = true;
                                                            }
                                                        }
                                                    } catch(e) {}
                                              });
                                          }
                                          ifrSend.apply(this, arguments);
                                      };
                                      win._intercepted = true;
                                  }

                                  var dForce = setInterval(() => {
                                      let df = doc.querySelector('input[name="txt_from_date"]') || doc.querySelector('input[name="txt_date_from"]') || doc.querySelectorAll('input[name*="from"]')[0];
                                      let dt = doc.querySelector('input[name="txt_to_date"]') || doc.querySelector('input[name="txt_date_to"]') || doc.querySelectorAll('input[name*="to"]')[0];
                                      if (df && df.value !== targetDateFrom) triggerVueChange(df, targetDateFrom, win);
                                      if (dt && dt.value !== targetDateTo) triggerVueChange(dt, targetDateTo, win);
                                  }, 100);
                                  setTimeout(() => clearInterval(dForce), 15000);

                                  var df_sync = doc.querySelector('input[name="txt_from_date"]') || doc.querySelector('input[name="txt_date_from"]') || doc.querySelectorAll('input[name*="from"]')[0];
                                  var dt_sync = doc.querySelector('input[name="txt_to_date"]') || doc.querySelector('input[name="txt_date_to"]') || doc.querySelectorAll('input[name*="to"]')[0];
                                  if (df_sync && df_sync.value !== targetDateFrom) triggerVueChange(df_sync, targetDateFrom, win);
                                  if (dt_sync && dt_sync.value !== targetDateTo) triggerVueChange(dt_sync, targetDateTo, win);

                                  var branchSel = doc.querySelector('select[name="cbo_branch"]');
                                  if (branchSel && targetId !== 'SELF' && branchSel.value !== targetId) triggerVueChange(branchSel, targetId, win);

                                  win._memberCaptured = false; setTimeout(() => { let searchBtn = doc.getElementById('custom-search-btn') || Array.from(doc.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim().includes('Search')) || doc.querySelector('button[type="submit"]');
                                      if (searchBtn) {
                                          searchBtn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                          searchBtn.click();
                                      }
                                  }, 500);

                                  for (let i = 0; i < 60; i++) {
                                      if (win._memberCaptured) break;
                                      await new Promise(r => setTimeout(r, 250));
                                  }

                                  let finalCount = win._memberCount || 0;
                                    if (finalCount === 0) {
                                        try {
                                            let infoDiv = Array.from(doc.querySelectorAll('div')).find(d => d.innerText && d.innerText.toLowerCase().includes('showing') && d.innerText.toLowerCase().includes('entries'));
                                            if (infoDiv) {
                                                let match = infoDiv.innerText.match(/of\s+(\d+)/i);
                                                if (match) finalCount = parseInt(match[1]);
                                            }
                                            if (finalCount === 0) {
                                                let rows = doc.querySelectorAll('table tbody tr');
                                                if (rows.length > 0 && !rows[0].innerText.toLowerCase().includes('no data') && !rows[0].innerText.toLowerCase().includes('no record') && !rows[0].innerText.toLowerCase().includes('????? ?????')) {
                                                    finalCount = rows.length;
                                                }
                                            }
                                        } catch(ex) {}
                                    }
                                    isProcessed = true; clearTimeout(timeout); iframe.remove();
                                    resolve({ count: finalCount });
                                  return;
                              } catch(e) {
                                  isProcessed = true; clearTimeout(timeout); iframe.remove();
                                  resolve({ count: 0 });
                                  return;
                              }
                            }
                            
                              else if (type === 'due_collection') {
                            try {
                                let targetDateFrom = document.getElementById('custom-audit-date-from').value;
                                let targetDateTo = document.getElementById('custom-audit-date').value;
                                
                                var branchSel = doc.querySelector('select[name="cbo_branch"]');
                                if (branchSel && targetId !== 'SELF' && branchSel.value !== targetId) triggerVueChange(branchSel, targetId, win);

                                let dateInputFrom = doc.querySelector('input[name="txt_date_from"]');
                                if (dateInputFrom && dateInputFrom.value !== targetDateFrom) triggerVueChange(dateInputFrom, targetDateFrom, win);

                                let dateInputTo = doc.querySelector('input[name="txt_date_to"]');
                                if (dateInputTo && dateInputTo.value !== targetDateTo) triggerVueChange(dateInputTo, targetDateTo, win);

                                let samitySel = doc.querySelector('select[name="cbo_samity_id"]');
                                if (samitySel && samitySel.value !== "-1") triggerVueChange(samitySel, "-1", win);

                                let prodSel = doc.querySelector('select[name="cbo_product"]');
                                if (prodSel && prodSel.value !== "-1") triggerVueChange(prodSel, "-1", win);

                                var scSel = doc.querySelector('select[name="cbo_service_charge"]');
                                if (scSel && scSel.value !== "0") triggerVueChange(scSel, "0", win);
                                
                                setTimeout(() => {
                                    win._activeReqs = 0;
                                    win._reqCompleted = false;
                                    win._interceptedDueData = null;
                                    
                                    if (!win._intercepted) {
                                        let origOpen = win.XMLHttpRequest.prototype.open;
                                        win.XMLHttpRequest.prototype.open = function(method, url) {
                                            let isReportReq = method.toUpperCase() === 'POST' || (url && (url.includes('report') || url.includes('api')));
                                            if (isReportReq) win._activeReqs++;
                                            this.addEventListener('load', function() { 
                                                if(isReportReq) { 
                                                    win._activeReqs--; 
                                                    win._reqCompleted = true; 
                                                    if (url && url.includes('ajax_due_collection_register')) {
                                                        try {
                                                            win._interceptedDueData = JSON.parse(this.responseText);
                                                        } catch(err){}
                                                    }
                                                } 
                                            });
                                            this.addEventListener('error', () => { if(isReportReq) { win._activeReqs--; win._reqCompleted = true; } });
                                            this.addEventListener('abort', () => { if(isReportReq) { win._activeReqs--; win._reqCompleted = true; } });
                                            origOpen.apply(this, arguments);
                                        };
                                        let origFetch = win.fetch;
                                        win.fetch = async function(resource, options) {
                                            let method = (options && options.method) ? options.method : 'GET';
                                            let url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
                                            let isReportReq = method.toUpperCase() === 'POST' || url.includes('report') || url.includes('api');
                                            if (isReportReq) win._activeReqs++;
                                            try {
                                                let res = await origFetch.apply(this, arguments);
                                                if (isReportReq) { 
                                                    win._activeReqs--; 
                                                    win._reqCompleted = true; 
                                                    if (url.includes('ajax_due_collection_register')) {
                                                        try {
                                                            let clone = res.clone();
                                                            win._interceptedDueData = await clone.json();
                                                        } catch(err){}
                                                    }
                                                }
                                                return res;
                                            } catch(e) {
                                                if (isReportReq) { win._activeReqs--; win._reqCompleted = true; }
                                                throw e;
                                            }
                                        };
                                        win._intercepted = true;
                                    }

                                    win._reqCompleted = false;
                                    let currentBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary') || btn;
                                    if (currentBtn) {
                                        currentBtn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                        currentBtn.click();
                                    }
                                    
                                    let poll = setInterval(() => {
                                        if (win._reqCompleted && win._activeReqs === 0 && win._interceptedDueData) {
                                            clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                            
                                            let data = win._interceptedDueData;
                                            let totalCurrent = 0;
                                            let totalMatured = 0; let totalRecoverable = 0;
                                            let totalOutstanding = 0;
                                            let totalDue = 0;
                                            let totalNewDueBorrower = 0;
                                            let totalNewDueAmount = 0;

                                            if (data && data.due_collection) {
                                                let firstRow = null;
                                                for (let k in data.due_collection) {
                                                    firstRow = data.due_collection[k];
                                                    break;
                                                }
                                                if (firstRow && typeof firstRow === 'object') {
                                                    if (!('regular_due_collection_amount' in firstRow)) {
                                                        alert("DEBUG: We got data but wrong keys! Keys are: " + Object.keys(firstRow).join(', '));
                                                    }
                                                }

                                                for (let key in data.due_collection) {
                                                    let row = data.due_collection[key];
                                                    totalCurrent += parseFloat(row.regular_due_collection_amount || row.current_due || row.regular_due || 0);
                                                    totalMatured += parseFloat(row.expired_due_collection_amount || row.matured_due || row.expired_due || 0);
                                                    totalOutstanding += parseFloat(row.outstanding || 0);
                                                    totalDue += parseFloat(row.due || 0);
                                                    totalNewDueBorrower += parseInt(row.new_due_member || row.new_due_member_no || row.new_due_borrower || row.new_due_loanee || 0);
                                                    totalNewDueAmount += parseFloat(row.new_due_amount || row.new_due || row.new_due_collection_amount || 0);
                                                      totalRecoverable += parseFloat(row.regular_recoverable_amount || row.recoverable_amount || row.regular_recoverable || row.recoverable || row.target_amount || 0);
                                                }
                                            }
                                            iframe.remove(); resolve({ totalCurrent, totalMatured, totalOutstanding, totalDue, totalRecoverable, totalNewDueBorrower, totalNewDueAmount });
                                        } else if (win._reqCompleted && win._activeReqs === 0) {
                                            // Fallback if data was loaded via XMLHttpRequest or HTML instead
                                            let bodyText = (doc.body.textContent || '').toLowerCase();
                                            if (bodyText.includes('due collection') || bodyText.includes('grand total')) {
                                                clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                                alert("DEBUG: Intercept failed or HTML rendered instead of JSON.");
                                                iframe.remove(); resolve({ totalCurrent: 0, totalMatured: 0, totalOutstanding: 0, totalDue: 0, totalRecoverable: 0, totalNewDueBorrower: 0, totalNewDueAmount: 0 });
                                            }
                                        }
                                    }, 400);
                                }, 1000);
                            } catch (e) {
                                console.error('Due Collection API Error:', e);
                                isProcessed = true; clearTimeout(timeout); iframe.remove();
                                resolve({ totalCurrent: 0, totalMatured: 0, totalOutstanding: 0, totalDue: 0, totalRecoverable: 0, totalNewDueBorrower: 0, totalNewDueAmount: 0 });
                                return;
                            }
                        } else if (type === 'topsheet_disb') {
                            try {
                                let cboReportLevel = null;
                                let checkDropdown = setInterval(async () => {
                                    cboReportLevel = doc.querySelector('select[name="cbo_report_level"]');
                                    if (cboReportLevel) {
                                        clearInterval(checkDropdown);
                                        cboReportLevel.value = '1';
                                        triggerVueChange(cboReportLevel, '1', win);
                                        await new Promise(r => setTimeout(r, 400));
                                        
                                        let cboBranch = doc.querySelector('select[name="cbo_branch"]');
                                        if (cboBranch && targetId !== 'SELF' && targetId && targetId !== '0' && targetId !== '-1') {
                                                                                    let safeTargetId = targetId;
                                                                                    cboBranch.value = safeTargetId;
                                                                                    triggerVueChange(cboBranch, safeTargetId, win);
                                            await new Promise(r => setTimeout(r, 400));
                                        }
                                        
                                        let dates = targetDate.split('|');
                                        let dateFrom = doc.querySelector('input[name="txt_date_from"]') || doc.getElementById('txt_date_from');
                                        if (dateFrom && dates[0]) { dateFrom.value = dates[0]; triggerVueChange(dateFrom, dates[0], win); }
                                        
                                        let dateTo = doc.querySelector('input[name="txt_date_to"]') || doc.getElementById('txt_date_to');
                                        if (dateTo && dates[1]) { dateTo.value = dates[1]; triggerVueChange(dateTo, dates[1], win); }
                                        
                                        await new Promise(r => setTimeout(r, 200));
                                        let sBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.search-btn') || doc.querySelector('.rep_btn button.btn-primary');
                                        if (sBtn) sBtn.click();
                                        
                                        let poll = setInterval(() => {
                                            let grandTotalRow = Array.from(doc.querySelectorAll('tr')).find(tr => {
                                                let cells = Array.from(tr.querySelectorAll('td, th'));
                                                return cells.some(c => c.textContent.trim().toLowerCase().includes('grand total'));
                                            });
                                            if (grandTotalRow && win._reqCompleted && win._activeReqs === 0) {
                                                clearInterval(poll);
                                                clearTimeout(timeout);
                                                isProcessed = true;
                                                let disbCount = 0;
                                                let cells = grandTotalRow.querySelectorAll('td, th');
                                                if (cells.length >= 4) {
                                                    disbCount = parseInt(cells[cells.length - 4].textContent.replace(/,/g, '').trim()) || 0;
                                                    }
                                                if(document.body.contains(iframe)) iframe.remove();
                                                resolve({ count: disbCount });
                                            } else {
                                                let noData = doc.querySelector('.no-data-found, .alert-warning, .empty-table');
                                                if (noData && noData.innerText.toLowerCase().includes('no data')) {
                                                    clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                                    if(document.body.contains(iframe)) iframe.remove();
                                                    resolve({ count: 0 });
                                                }
                                            }
                                        }, 1000);
                                    }
                                }, 500);
                            } catch(e) {
                                isProcessed = true; clearTimeout(timeout); if(document.body.contains(iframe)) iframe.remove();
                                resolve({ count: 0 });
                            }
                        } else if (type === 'samity') {
                            try {
                                if (!win._intercepted) {
                                    const ifrOpen = win.XMLHttpRequest.prototype.open;
                                    const ifrSetHeader = win.XMLHttpRequest.prototype.setRequestHeader;
                                    const ifrSend = win.XMLHttpRequest.prototype.send;
                                    win.XMLHttpRequest.prototype.open = function(m, u) { this._url = u; this._headers = {}; ifrOpen.apply(this, arguments); };
                                    win.XMLHttpRequest.prototype.setRequestHeader = function(k, v) { this._headers[k] = v; ifrSetHeader.apply(this, arguments); };
                                    win.XMLHttpRequest.prototype.send = function(body) {
                                        if (this._url && this._url.includes('samities')) {
                                            try {
                                                sessionStorage.setItem('mf_cloned_url', this._url);
                                                sessionStorage.setItem('mf_cloned_headers', JSON.stringify(this._headers));
                                            } catch(e){}
                                            win._samityHeadersCaptured = true;
                                        }
                                        ifrSend.apply(this, arguments);
                                    };
                                    win._intercepted = true;
                                }


                                // Poll for the search button since Vue might take a moment to render
                                for (let i = 0; i < 15; i++) {
                                    let searchBtn = doc.getElementById('custom-search-btn') || Array.from(doc.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim().includes('Search')) || doc.querySelector('button[type="submit"]');
                                    if (searchBtn) {
                                        searchBtn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                        searchBtn.click();
                                        break;
                                    }
                                    await new Promise(r => setTimeout(r, 400));
                                }
                                
                                for (let i = 0; i < 30; i++) {
                                    if (win._samityHeadersCaptured) break;
                                    await new Promise(r => setTimeout(r, 200));
                                }

                                let savedHd = sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup');
                                let clonedHeaders = {};
                                if (savedHd) clonedHeaders = JSON.parse(savedHd);
                                clonedHeaders['X-Requested-With'] = 'XMLHttpRequest';
                                clonedHeaders['Accept'] = 'application/json, text/plain, */*';
                                
                                let cUrl = sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup');
                                let possibleUrls = [];
                                if (cUrl && cUrl.includes('samities')) {
                                    possibleUrls.push(cUrl);
                                } else {
                                    possibleUrls.push('/core-service/index.php/samities/ajax_list');
                                    possibleUrls.push('/core-service/index.php/samities/index');
                                    possibleUrls.push('/core-service/index.php/samities');
                                }
                                
                                let debugInfo = '';
                                let allSamities = [];
                                let offset = 0;
                                let limit = 500;
                                let totalCount = 0;
                                let successUrl = null;
                                
                                while (true) {
                                    let data = null;
                                    let fetchUrlObj = null;
                                    
                                    for (let candidateUrl of possibleUrls) {
                                        let fetchUrl = new URL(candidateUrl.startsWith('http') ? candidateUrl : window.location.origin + candidateUrl);
                                        fetchUrl.searchParams.set('limit', limit);
                                        fetchUrl.searchParams.set('offset', offset);
                                        fetchUrl.searchParams.set('isSearch', '1');
                                        fetchUrl.searchParams.set('cbo_status', '1');
                                        fetchUrl.searchParams.set('cbo_employee', '-1');
                                        if (targetId !== 'SELF') fetchUrl.searchParams.set('cbo_branch', targetId);
                                        
                                        let apiUrl = fetchUrl.toString();
                                        debugInfo = apiUrl;
                                        try {
                                            let r = await window.fetch(apiUrl, { method: 'GET', headers: clonedHeaders, credentials: 'include' });
                                            if (r.ok) {
                                                let temp = await r.json();
                                                if (temp && (temp.samities || temp.data || Array.isArray(temp))) {
                                                    data = temp;
                                                    successUrl = candidateUrl;
                                                    break;
                                                }
                                            }
                                        } catch(e) {}
                                    }
                                    
                                    if (!data) throw new Error("Could not fetch samity data from any candidate URL");
                                    
                                    // If we found a working URL, only use that one for next pagination loops
                                    possibleUrls = [successUrl];
                                    
                                    if (data.total) totalCount = parseInt(data.total);
                                    else if (data.recordsTotal) totalCount = parseInt(data.recordsTotal);
                                    
                                    let dataArr = data.samities || data.data || data;
                                    if (Array.isArray(dataArr) && dataArr.length > 0) {
                                        for (let s of dataArr) {
                                            let code = s.code || s.samity_code || s.name;
                                            let members = parseInt(s.total_member || s.member_count || '0');
                                            if (code && !allSamities.some(x => x.code === code)) {
                                                allSamities.push({ code, members });
                                            }
                                        }
                                        if (dataArr.length < limit) break;
                                        offset += dataArr.length;
                                    } else {
                                        break;
                                    }
                                }
                                
                                if (totalCount === 0) totalCount = allSamities.length;

                                  let finalDebug = totalCount === 0 ? 'Empty Data! URL: ' + debugInfo + ' | cUrl: ' + cUrl + ' | win.captured: ' + win._samityCapturedUrl : undefined;
                                  isProcessed = true; clearTimeout(timeout); iframe.remove();
                                  resolve({ totalCount: totalCount, data: allSamities, debug: finalDebug });
                                  return;
} catch (e) {
                                console.error('Samity API Error:', e);
                                isProcessed = true; clearTimeout(timeout); iframe.remove();
                                resolve({ totalCount: 0, data: [] });
                                return;
                            }
                        } else if (type === 'is') {





                            let dateInputIs = doc.querySelector('input[name="txt_as_on_date"]');
                            if(dateInputIs && dateInputIs.value !== targetDate) triggerVueChange(dateInputIs, targetDate, win);

                            let fundSel = doc.querySelector('select[name="project_id"]');
                            if (fundSel && fundSel.value !== "-1") triggerVueChange(fundSel, "-1", win);
                            
                            let fractionSel = doc.querySelector('select[name="cbo_is_fraction_contain"]');
                            if (fractionSel && fractionSel.value !== "1") {
                                triggerVueChange(fractionSel, "1", win);
                            }

                            setTimeout(() => {
                                win._activeReqs = 0;
                                win._reqCompleted = false;
                                
                                if (!win._intercepted) {
                                    let origOpen = win.XMLHttpRequest.prototype.open;
                                    win.XMLHttpRequest.prototype.open = function(method, url) {
                                        let isReportReq = method.toUpperCase() === 'POST' || (url && (url.includes('report') || url.includes('api')));
                                        if (isReportReq) win._activeReqs++;
                                        this.addEventListener('load', () => { if(isReportReq) { win._activeReqs--; win._reqCompleted = true; } });
                                        this.addEventListener('error', () => { if(isReportReq) { win._activeReqs--; win._reqCompleted = true; } });
                                        this.addEventListener('abort', () => { if(isReportReq) { win._activeReqs--; win._reqCompleted = true; } });
                                        origOpen.apply(this, arguments);
                                    };
                                    let origFetch = win.fetch;
                                    win.fetch = async function(resource, options) {
                                        let method = (options && options.method) ? options.method : 'GET';
                                        let url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
                                        let isReportReq = method.toUpperCase() === 'POST' || url.includes('report') || url.includes('api');
                                        if (isReportReq) win._activeReqs++;
                                        try {
                                            let res = await origFetch.apply(this, arguments);
                                            if (isReportReq) { win._activeReqs--; win._reqCompleted = true; }
                                            return res;
                                        } catch(e) {
                                            if (isReportReq) { win._activeReqs--; win._reqCompleted = true; }
                                            throw e;
                                        }
                                    };
                                    win._intercepted = true;
                                }

                                win._reqCompleted = false; // Reset again right before click
                                let currentBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary') || btn;
                                if (currentBtn) {
                                    currentBtn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                    currentBtn.click();
                                }
                                
                                let poll = setInterval(() => {
                                    let bodyText = (doc.body.textContent || '').toLowerCase();
                                    // Wait until a request has completed AND no active requests are running
                                    if (win._reqCompleted && win._activeReqs === 0 && bodyText.includes('surplus/deficit')) {
                                        setTimeout(() => {
                                            clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                            let data = parseIs(doc);
                                            iframe.remove(); resolve(data);
                                        }, 1000); // 1s buffer for Vue render
                                    }
                                }, 400);
                            }, 1000);
                        }
                    } catch(e) { clearTimeout(timeout); iframe.remove(); resolve(null); }
                }, 2000);
            };
        });
    }

    let isMisAisBtnClosed = false;
    window.currentCheckerType = 'MIS';

    function createCheckerButton(id, title, bottomPx, bgColor, typeName) {
        if (isMisAisBtnClosed || document.getElementById(id)) return;
        
        let container = document.createElement('div');
        container.id = id;
        container.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background: linear-gradient(135deg, ' + bgColor + ' 0%, rgba(0,0,0,0.4) 150%); color:white; border-radius:50px; padding:5px 12px; font-weight:bold; font-size:11px; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-family: DSK_MixedFont, sans-serif; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer; width: max-content; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(5px);';
        container.onmouseover = () => { container.style.transform = 'scale(1.05) translateX(-4px)'; container.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)'; };
        container.onmouseout = () => { container.style.transform = 'scale(1) translateX(0)'; container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'; };
        
        let textSpan = document.createElement('span');
        textSpan.innerText = title;
        textSpan.style.cssText = 'margin-right:8px; pointer-events:none;';

        let closeBtn = document.createElement('button');
        closeBtn.innerText = '\u2715';
        closeBtn.title = '\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.25); color:white; border:none; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; outline:none; transition:0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.25)';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            isMisAisBtnClosed = true;
            document.getElementById('mis-ais-toggle-btn')?.remove();
            document.getElementById('cash-bank-toggle-btn')?.remove();
            document.getElementById('equity-toggle-btn')?.remove();
            document.getElementById('samity-toggle-btn')?.remove();
            document.getElementById('due-toggle-btn')?.remove();
            document.getElementById('daily-toggle-btn')?.remove();
            let p = document.getElementById('ghost-audit-panel');
            if(p) p.remove();
        };

        container.onclick = () => {
            window.currentCheckerType = typeName;
            openMisAisPanel(title);
        };
        container.appendChild(textSpan);
        // container.appendChild(closeBtn);
        window.getMasterFabContainer().appendChild(container);
    }

    function initMisAisToggleBtn() {
        if (!window.location.hash.includes('dashboard')) return;
        createCheckerButton('mis-ais-toggle-btn', '\u{1F680} MIS & AIS Crosschecker', 202, '#2c3e50', 'MIS');
        createCheckerButton('cash-bank-toggle-btn', '\u{1F4B0} Cash-Bank', 244, '#16a085', 'CASH');
        createCheckerButton('equity-toggle-btn', '\u{1F4CA} Equity', 286, '#8e44ad', 'EQUITY');
        createCheckerButton('samity-toggle-btn', '\u{1F465} Samity wise member info.', 328, '#2980b9', 'SAMITY');
        createCheckerButton('due-toggle-btn', '\u{1F4B0} Due collection Summary', 370, '#c0392b', 'DUE_COLLECTION');
        createCheckerButton('daily-toggle-btn', '\u{1F4B0} Daily Tran. Summ.', 412, '#f39c12', 'DAILY_TRANSACTION');
    }

    function openMisAisPanel(customTitle) {
        customTitle = customTitle || '\u{1F680} MIS & AIS Checker-DSK_IT';
        if (document.getElementById('ghost-audit-panel')) return;
        
        try {
            let vuexStr = localStorage.getItem('vuex');
            if (vuexStr) {
                let v = JSON.parse(vuexStr);
                if (v.auth && v.auth.token) {
                    let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; h['Isme-Token'] = v.auth.token; } } catch(e) {}
                    h['Authorization'] = 'Bearer ' + v.auth.token;
                    h['authorization'] = 'Bearer ' + v.auth.token;
                    sessionStorage.setItem('mf_cloned_headers', JSON.stringify(h));
                    localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(h));
                }
            }
        } catch(e) {}

        const panel = document.createElement('div');
        panel.id = 'ghost-audit-panel';
        panel.style.cssText = 'position: fixed; top: 5px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 98vw; max-width: 750px; font-family: DSK_MixedFont, sans-serif; z-index: 999999; overflow: hidden;';
        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="ghost-header" style="background:#2c3e50; color:white; padding:4px 8px; cursor:move; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; overflow:hidden;">
                    <strong id="panel-title" style="font-size:11.5px; pointer-events:none; white-space:nowrap;">${customTitle}</strong>
                    <span id="audit-status" style="font-size:11px; font-weight:bold; color:#f1c40f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></span>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">

                    <button id="export-excel-btn" style="display:none; background:#8e44ad; border:none; color:white; font-size:11px; cursor:pointer; padding:3px 8px; border-radius:3px; font-weight:bold; transition:0.2s;">\u{1F4E5} Excel</button>
                    <button id="sync-locations-btn" style="background:#f39c12; border:none; color:white; font-size:11px; cursor:pointer; padding:3px 8px; border-radius:3px; font-weight:bold;">\u{1F504} Sync</button>
                    <button id="ghost-close" title="\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(255, 65, 108, 0.45); transition: all 0.2s ease;">\u2715</button>
                </div>
            </div>
            
            <div id="ghost-body" style="padding:6px; display:flex; flex-direction:column; height: 100%;">
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:6px; align-items:center;" id="controls-container">
                </div>
                <button id="start-audit-btn" style="width:100%; background:#27ae60; color:white; border:none; height:26px; font-weight:bold; font-size:12px; border-radius:3px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s; flex-shrink:0;">\u{1F680} Start Process</button>
                <div id="audit-output" style="margin-top:4px; display:flex; flex-direction:column; flex:1; overflow:hidden;"></div>
            </div>
        `;

        document.getElementById('ghost-close').onclick = () => panel.remove();

        function renderUI() {
            let container = document.getElementById('controls-container');
            if (!container) return;
            
            let uType = sessionStorage.getItem('mf_user_type');
            let dateHtml = ``;
            if (window.currentCheckerType === 'DUE_COLLECTION' || window.currentCheckerType === 'DAILY_TRANSACTION') {
                dateHtml = `
                <div style="flex:1; min-width:130px; display:flex; align-items:center; gap:4px;">
                    <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">From:</label>
                    <input type="date" id="custom-audit-date-from" style="flex:1; width:100%; padding:0 4px; margin:0; border:1px solid #bdc3c7; border-radius:3px; font-family: DSK_MixedFont, sans-serif; font-size:12px; height:24px; box-sizing:border-box;" value="${getFirstDayOfMonth()}">
                </div>
                <div style="flex:1; min-width:130px; display:flex; align-items:center; gap:4px;">
                    <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">To:</label>
                    <input type="date" id="custom-audit-date" style="flex:1; width:100%; padding:0 4px; margin:0; border:1px solid #bdc3c7; border-radius:3px; font-family: DSK_MixedFont, sans-serif; font-size:12px; height:24px; box-sizing:border-box;" value="${getToday()}">
                </div>
                `;
            } else {
                dateHtml = `
                <div style="flex:1; display:${window.currentCheckerType === 'SAMITY' ? 'none' : 'flex'}; align-items:center; gap:4px;">
                    <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09A4\u09BE\u09B0\u09BF\u0996:</label>
                    <input type="date" id="custom-audit-date" style="flex:1; width:100%; padding:0 4px; margin:0; border:1px solid #bdc3c7; border-radius:3px; font-family: DSK_MixedFont, sans-serif; cursor:pointer; font-size:12px; height:24px; box-sizing:border-box;" value="${getToday()}">
                </div>
                `;
            }

            if (uType === 'BRANCH') {
                let currentBranchName = localStorage.getItem('microfin_entity_name') || 'My Branch';
                if (currentBranchName === 'My Branch' || !currentBranchName) {
                    let bInfo = document.querySelector('.branch_info');
                    if (bInfo) {
                        let bText = bInfo.innerText.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ');
                        let m = bText.match(/Branch\s*:\s*(.*?)(?=\s+Date|\s+Zone|\s+Area|$|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
                        if (m && m[1]) currentBranchName = m[1].trim();
                    }
                }
                container.innerHTML = dateHtml + `
                    <div style="flex:1.5; min-width:130px; display:flex; align-items:center; gap:4px;">
                        <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09AC\u09CD\u09B0\u09BE\u099E\u09CD\u099A:</label>
                        <select id="custom-target" style="flex:1; width:100%; padding:0 4px; margin:0; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; font-weight:bold; color:#16a085; height:24px; box-sizing:border-box;"><option value="ALL">\u09B8\u0995\u09B2 \u09B6\u09BE\u0996\u09BE (Select All)</option></select>
                    </div>
                `;
            } 
            else if (uType === 'AREA') {
                container.innerHTML = dateHtml + `
                    <div style="flex:1.5; min-width:130px; display:flex; align-items:center; gap:4px;">
                        <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8:</label>
                        <select id="custom-target" style="flex:1; width:100%; padding:0 4px; margin:0; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; height:24px; box-sizing:border-box;">
                            <option value="ALL">-- \u{1F680} All Branches (Batch) --</option>
                        </select>
                    </div>
                `;
                populateTargets();
            } 
            else { 
                  let zones = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
                  if (zones.length === 0) {
                      let zMap = JSON.parse(localStorage.getItem('microfin_zMap') || '{}');
                      zones = [...new Set(Object.values(zMap))].filter(Boolean).sort().map(z => ({ id: z, name: z }));
                  }
                  let areas = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
                  if (areas.length === 0) {
                      let aMap = JSON.parse(localStorage.getItem('microfin_aMap') || '{}');
                      areas = [...new Set(Object.values(aMap))].filter(Boolean).sort().map(a => ({ id: a, name: a }));
                  }
                
                let levelOptions = `<option value="1">\u09B6\u09BE\u0996\u09BE</option>`;
                if (areas.length > 0) levelOptions += `<option value="2">\u0985\u099E\u09CD\u099A\u09B2</option>`;
                if (zones.length > 0) levelOptions += `<option value="3" selected>\u099C\u09CB\u09A8</option>`;
                else if (areas.length > 0) levelOptions = levelOptions.replace('value="2"', 'value="2" selected');
                else levelOptions = levelOptions.replace('value="1"', 'value="1" selected');

                container.innerHTML = dateHtml + `
                    <div style="flex:1; min-width:130px; display:flex; align-items:center; gap:4px;">
                        <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09B2\u09C7\u09AD\u09C7\u09B2:</label>
                        <select id="custom-level" style="flex:1; width:100%; padding:0 4px; margin:0; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; height:24px; box-sizing:border-box;">
                            ${levelOptions}
                        </select>
                    </div>
                    <div style="flex:1.5; min-width:130px; display:flex; align-items:center; gap:4px;">
                        <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8:</label>
                        <select id="custom-target" style="flex:1; width:100%; padding:0 4px; margin:0; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; height:24px; box-sizing:border-box;">
                            <option value="">\u09B2\u09CB\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</option>
                        </select>
                    </div>
                `;
                
                let lvl = document.getElementById('custom-level');
                if(lvl) {
                    lvl.onchange = populateTargets;
                    populateTargets();
                }
            }
        }

        function populateTargets() {
            let targetSel = document.getElementById('custom-target');

            
            let uType = sessionStorage.getItem('mf_user_type');
            let data = [];

            if (uType === 'BRANCH') return;

            let level = document.getElementById('custom-level') ? document.getElementById('custom-level').value : '1';
            
            targetSel.innerHTML = '<option value="ALL" selected>\u{1F680} Select All</option>';
            
            if (uType === 'AREA') {
                data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
            } else {
                if (level === '3') { let zMap = JSON.parse(localStorage.getItem('microfin_zMap') || '{}'); let zList = [...new Set(Object.values(zMap))].filter(Boolean).sort(); data = zList.map(z => ({ id: z, name: z })); }
        
                else if (level === '2') { let aMap = JSON.parse(localStorage.getItem('microfin_aMap') || '{}'); let aList = [...new Set(Object.values(aMap))].filter(Boolean).sort(); data = aList.map(a => ({ id: a, name: a })); }
        
                else if (level === '1') data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
            }
            
            if(data.length > 0) {
                data.forEach(item => { targetSel.innerHTML += `<option value="${item.id}">${item.name}</option>`; });
            }
        }

        renderUI();
        window.addEventListener('mf_central_sync_completed', () => {
            renderUI();
            populateTargets();
        });

        if (!sessionStorage.getItem('mf_auto_synced') || !sessionStorage.getItem('mf_user_type')) {
            if (window.runGlobalHierarchySync) {
                window.runGlobalHierarchySync(false, () => { renderUI(); populateTargets(); });
            }
        }

        document.getElementById('sync-locations-btn').onclick = () => {
            document.getElementById('audit-status').innerHTML = `\u23F3 \u09B8\u09BF\u0982\u0995 \u09B9\u099A\u09CD\u099B\u09C7...`;
            document.getElementById('start-audit-btn').disabled = true;
            document.getElementById('export-excel-btn').style.display = 'none';
            
            window.runGlobalHierarchySync(true, (success) => { 
                let st = document.getElementById('audit-status');
                if(st) {
                    if(success) {
                        st.innerHTML = `<span style="color:#27ae60;">\u2705 \u09B8\u09BF\u09B8\u09CD\u099F\u09C7\u09AE \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4!</span>`;
                        // setTimeout(() => { if(st) st.innerHTML = ''; }, 2000);
                        document.getElementById('start-audit-btn').disabled = false;
                        populateTargets();
                    } else {
                        st.innerHTML = `<span style="color:#e74c3c;">\u274C \u09B8\u09BF\u0982\u0995 \u09AB\u09C7\u0987\u09B2\u09CD\u09A1!</span>`;
                    }
                }
            });
        };

        let isDragging = false, initialX, initialY;
        const header = document.getElementById('ghost-header');

        header.addEventListener('mousedown', (e) => {
            let rect = panel.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            if (e.target === header || e.target.parentNode === header || e.target.id === 'panel-title') {
                isDragging = true;
            }
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                panel.style.left = (e.clientX - initialX) + 'px';
                panel.style.top = (e.clientY - initialY) + 'px';
                panel.style.transform = 'none'; 
            }
        });

        document.getElementById('export-excel-btn').onclick = () => {
    let previousTab = window._misAisCurrentTab;
    window._misAisCurrentTab = 'ALL';
    if(window.applyTabFilters) window.applyTabFilters();

    let table = document.querySelector('.audit-table');
    if(!table) {
        window._misAisCurrentTab = previousTab;
        if(window.applyTabFilters) window.applyTabFilters();
        return;
    }

    let cloneAll = table.cloneNode(true);
    cloneAll.querySelectorAll('.manual-retry-btn').forEach(btn => btn.remove());
    
    let diffClass = window.currentCheckerType === 'EQUITY' ? 'loss-branch' : 'has-diff';
    
    let cloneDiff = table.cloneNode(true);
    cloneDiff.querySelectorAll('.audit-row-group').forEach(tbody => {
        if (!tbody.classList.contains(diffClass)) { tbody.remove(); return; }
        
        if (window.currentCheckerType === 'EQUITY') {
            let equityRow = tbody.querySelector('.equity-row');
            let surplusRow = tbody.querySelector('.surplus-row');
            let branchTdEq = tbody.querySelector('.branch-name-td');
            if (equityRow && surplusRow && branchTdEq) {
                let eLoss = equityRow.classList.contains('is-loss');
                let sLoss = surplusRow.classList.contains('is-loss');
                if (eLoss && !sLoss) {
                    surplusRow.remove();
                    branchTdEq.rowSpan = 1;
                } else if (sLoss && !eLoss) {
                    equityRow.remove();
                    branchTdEq.rowSpan = 1;
                    surplusRow.insertBefore(branchTdEq, surplusRow.firstChild);
                }
            }
        }
    });
    cloneDiff.querySelectorAll('.manual-retry-btn').forEach(btn => btn.remove());

    let cloneHighCash = null;
    if (window.currentCheckerType === 'CASH') {
        cloneHighCash = table.cloneNode(true);
        cloneHighCash.querySelectorAll('.audit-row-group').forEach(tbody => {
            if (!tbody.classList.contains('high-cash')) {
                tbody.remove();
            } else {
                let cashRow = tbody.querySelector('.cash-row');
                let bankRow = tbody.querySelector('.bank-row');
                let branchTd = tbody.querySelector('.branch-name-td');
                
                if (cashRow && bankRow && branchTd) {
                    let cHigh = cashRow.classList.contains('is-high');
                    let bHigh = bankRow.classList.contains('is-high');
                    
                    if (cHigh && !bHigh) {
                        bankRow.remove();
                        branchTd.rowSpan = 1;
                    } else if (bHigh && !cHigh) {
                        cashRow.remove();
                        branchTd.rowSpan = 1;
                        bankRow.insertBefore(branchTd, bankRow.firstChild);
                    }
                }
            }
        });
        cloneHighCash.querySelectorAll('.manual-retry-btn').forEach(btn => btn.remove());
    }

    window._misAisCurrentTab = previousTab;
    if(window.applyTabFilters) window.applyTabFilters();

    // FIXED: totalCols includes the 3 injected columns already. Do not add 3 again.
    let totalCols = window.currentCheckerType === 'MIS' ? 8 : (window.currentCheckerType === 'EQUITY' || window.currentCheckerType === 'SAMITY' ? 7 : (window.currentCheckerType === 'DAILY_TRANSACTION' ? 32 : 6));
    
    let rName = window.currentCheckerType === 'MIS' ? 'MIS Check' : (window.currentCheckerType === 'EQUITY' ? 'Equity Check' : (window.currentCheckerType === 'CASH' ? 'Cash & Bank' : (window.currentCheckerType === 'SAMITY' ? 'Samity Info' : (window.currentCheckerType === 'DAILY_TRANSACTION' ? 'Daily Tran. Summ.' : 'Due Collection'))));
    let exDate = document.getElementById('custom-audit-date') ? document.getElementById('custom-audit-date').value : '';
    let exDateFrom = document.getElementById('custom-audit-date-from') ? document.getElementById('custom-audit-date-from').value : exDate;
    let exDateStr = '';
    if (exDateFrom && exDate) {
        exDateStr = exDateFrom === exDate ? ` - Date: ${exDate}` : ` - Date Range: ${exDateFrom} to ${exDate}`;
    } else if (exDate) {
        exDateStr = ` - Date: ${exDate}`;
    }
    let dt = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour12: true }) + exDateStr;

    function escapeXml(unsafe) {
        return (unsafe || '').replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return '';
            }
        });
    }

    function injectSerialZoneArea(clone, sheetTitle) {
        clone.querySelectorAll('thead tr, tbody tr').forEach(tr => {
            let text = tr.textContent || tr.innerText;
            if (text.includes('Report Generated') || text.includes('Report Generated On') || text.includes('Zone:') || text.includes('Area:')) {
                tr.remove();
            }
        });

        clone.querySelectorAll('tbody[data-status="header"]').forEach(tb => tb.remove());

        let theads = clone.querySelectorAll('thead tr');
        let firstTheadTr = theads[0];
        if (firstTheadTr) {
            let rs = theads.length > 1 ? ' rowspan="' + theads.length + '"' : '';
            firstTheadTr.insertAdjacentHTML('afterbegin', '<th'+rs+'>\u0995\u09CD\u09B0\u09AE\u09BF\u0995</th><th'+rs+'>\u099C\u09CB\u09A8</th><th'+rs+'>\u0985\u099E\u09CD\u099A\u09B2</th>');
        }
        
        // Ensure total rows don't span serial, zone, area
        clone.querySelectorAll('.subtotal-label').forEach(td => {
            td.insertAdjacentHTML('beforebegin', '<td></td><td></td><td></td>');
        });

        let idx = 1;
        clone.querySelectorAll('tbody[id^="tbody-"]').forEach(tbody => {
            let zone = tbody.getAttribute('data-zone') || '';
            let area = tbody.getAttribute('data-area') || '';
            let firstTr = tbody.querySelector('tr');
            if (firstTr) {
                let firstTd = firstTr.querySelector('td');
                if (firstTd) {
                    firstTd.innerHTML = (firstTd.innerHTML || '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[\u2700-\u27BF]/gu, '').replace(/&nbsp;/g, '').trim();
                }
                let rowspan = firstTd && firstTd.hasAttribute('rowspan') ? ' rowspan="' + firstTd.getAttribute('rowspan') + '"' : '';
                firstTr.insertAdjacentHTML('afterbegin', 
                    '<td' + rowspan + '>' + idx++ + '</td>' +
                    '<td' + rowspan + '>' + zone + '</td>' +
                    '<td' + rowspan + '>' + area + '</td>'
                );
            }
        });
        
        clone.querySelectorAll('tbody:not([id^="tbody-"])').forEach(tb => {
            if (tb.classList.contains('dt-subtotal')) return;
            if (tb.classList.contains('audit-row-group') || tb.querySelector('td[colspan]')) {
                if (!tb.hasAttribute('id')) tb.remove();
            }
        });

        let sXml = ' <Worksheet ss:Name="' + escapeXml(sheetTitle) + '">\n  <Table>\n';
        
        // Tighter column widths to fit on screen and reduce space.
        sXml += '   <Column ss:Width="35"/>\n'; // Serial
        sXml += '   <Column ss:Width="85"/>\n'; // Zone
        sXml += '   <Column ss:Width="85"/>\n'; // Area
        sXml += '   <Column ss:Width="105"/>\n'; // Branch
        
        if (window.currentCheckerType === 'MIS') {
            sXml += '   <Column ss:Width="80"/>\n';
            sXml += '   <Column ss:Width="100"/>\n';
            sXml += '   <Column ss:Width="100"/>\n';
            sXml += '   <Column ss:Width="100"/>\n';

        } else if (window.currentCheckerType === 'EQUITY') {
            sXml += '   <Column ss:Width="80"/>\n';
            sXml += '   <Column ss:Width="120"/>\n';
            sXml += '   <Column ss:Width="120"/>\n';

        } else if (window.currentCheckerType === 'SAMITY') {
            sXml += '   <Column ss:Width="80"/>\n';
            sXml += '   <Column ss:Width="100"/>\n';
            sXml += '   <Column ss:Width="400"/>\n';

        } else if (window.currentCheckerType === 'DUE_COLLECTION') {
            sXml += '   <Column ss:Width="120"/>\n';
            sXml += '   <Column ss:Width="120"/>\n';

        } else if (window.currentCheckerType === 'DAILY_TRANSACTION') {
            for(let i=0; i<22; i++) sXml += '   <Column ss:Width="53"/>\n';
        } else {
            // CASH
            sXml += '   <Column ss:Width="80"/>\n';
            sXml += '   <Column ss:Width="180"/>\n';
        }

        sXml += '   <Row ss:Height="30"><Cell ss:MergeAcross="' + (totalCols-1) + '" ss:StyleID="sTitle"><Data ss:Type="String">DUSHTHA SHASTHYA KENDRA (DSK)</Data></Cell></Row>\n';
        sXml += '   <Row ss:Height="22"><Cell ss:MergeAcross="' + (totalCols-1) + '" ss:StyleID="sSubTitle"><Data ss:Type="String">' + escapeXml(rName) + ' (' + escapeXml(sheetTitle) + ') - Generated On: ' + dt + '</Data></Cell></Row>\n';
        
        let rIdx = 3; 
        let grid = {}; 

        clone.querySelectorAll('tr').forEach(tr => {
            sXml += '   <Row>\n';
            let cIdx = 1;
            if (!grid[rIdx]) grid[rIdx] = {};

            tr.querySelectorAll('th, td').forEach(cell => {
                while(grid[rIdx][cIdx]) {
                    cIdx++;
                }
                
                let text = (cell.innerHTML || '').replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
                text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[\u2700-\u27BF]/gu, ''); 
                
                let isTotalRow = tr.closest('.dt-subtotal, tfoot') !== null;
                let sId = cell.tagName.toLowerCase() === 'th' ? 'sHeader' : 'sRowCenter';
                if (isTotalRow) {
                    sId = cell.classList.contains('subtotal-label') ? 'sTotalRowRight' : 'sTotalRow';
                } else if (cell.tagName.toLowerCase() === 'td' && isNaN(Number(text)) && text.length > 3) {
                    sId = 'sRowLeft';
                }
                
                let cSpan = cell.colSpan > 1 ? cell.colSpan : 1;
                let rSpan = cell.rowSpan > 1 ? cell.rowSpan : 1;
                
                let mAcross = cSpan > 1 ? ' ss:MergeAcross="' + (cSpan - 1) + '"' : '';
                let mDown = rSpan > 1 ? ' ss:MergeDown="' + (rSpan - 1) + '"' : '';
                
                sXml += '    <Cell ss:Index="' + cIdx + '" ss:StyleID="' + sId + '"' + mAcross + mDown + '><Data ss:Type="String">' + escapeXml(text) + '</Data></Cell>\n';
                
                for (let r = 0; r < rSpan; r++) {
                    for (let c = 0; c < cSpan; c++) {
                        if (!grid[rIdx + r]) grid[rIdx + r] = {};
                        grid[rIdx + r][cIdx + c] = true;
                    }
                }
                cIdx += cSpan;
            });
            sXml += '   </Row>\n';
            rIdx++;
        });
        
        sXml += '  </Table>\n </Worksheet>\n';
        return sXml;
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n xmlns:o="urn:schemas-microsoft-com:office:office"\n xmlns:x="urn:schemas-microsoft-com:office:excel"\n xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n xmlns:html="http://www.w3.org/TR/REC-html40">\n <Styles>\n  <Style ss:ID="Default" ss:Name="Normal">\n   <Alignment ss:Vertical="Center" ss:WrapText="1"/>\n   <Borders>\n    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>\n   </Borders>\n   <Font ss:FontName="SutonnyOMJ" ss:Size="10" ss:Color="#2C3E50"/>\n  </Style>\n  <Style ss:ID="sTitle"><Font ss:FontName="SutonnyOMJ" ss:Size="16" ss:Bold="1" ss:Color="#2980B9"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n  <Style ss:ID="sSubTitle"><Font ss:FontName="SutonnyOMJ" ss:Size="12" ss:Bold="1" ss:Color="#34495E"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>\n  <Style ss:ID="sHeader"><Interior ss:Color="#2C3E50" ss:Pattern="Solid"/><Font ss:FontName="SutonnyOMJ" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/></Borders></Style>\n  <Style ss:ID="sRowCenter" ss:Parent="Default"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="sRowLeft" ss:Parent="Default"><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="sRowRight" ss:Parent="Default"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="sTotalRow" ss:Parent="Default"><Interior ss:Color="#E1F5FE" ss:Pattern="Solid"/><Font ss:FontName="SutonnyOMJ" ss:Size="10" ss:Bold="1" ss:Color="#01579B"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>\n  <Style ss:ID="sTotalRowRight" ss:Parent="sTotalRow"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/></Style>\n </Styles>\n';
    
    xml += injectSerialZoneArea(cloneAll, 'All Branches');
    
    let diffSheetName = window.currentCheckerType === 'EQUITY' ? 'Loss Branches' : 'Differences';
    if (window.currentCheckerType === 'MIS' || window.currentCheckerType === 'EQUITY') {
        xml += injectSerialZoneArea(cloneDiff, diffSheetName);
    } else if (window.currentCheckerType === 'CASH' && cloneHighCash) {
        xml += injectSerialZoneArea(cloneHighCash, 'High Cash-Bank');
    }

    xml += '</Workbook>';

    let finalOutput = '\uFEFF' + xml; 

    let tN = window.currentCheckerType === 'MIS' ? 'MIS_Check' : (window.currentCheckerType === 'EQUITY' ? 'Equity_Check' : (window.currentCheckerType === 'CASH' ? 'Cash_Bank_Check' : (window.currentCheckerType === 'SAMITY' ? 'Samity_Info' : (window.currentCheckerType === 'DAILY_TRANSACTION' ? 'Daily_Transaction_Summary' : 'Due_Collection'))));
    let fileName = tN + '_' + new Date().getTime() + '.xls';
    
    try {
        if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
            window.AndroidDownloader.saveExcel(finalOutput, fileName);

        } else {
            let blob = new Blob([finalOutput], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            let a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    } catch(e) {
        console.error(e);
    }
};










        panel.addEventListener('click', async (e) => {
            if(e.target && e.target.classList.contains('manual-retry-btn')) {
                let btnTarget = e.target;
                let bId = btnTarget.getAttribute('data-id');
                let bName = btnTarget.getAttribute('data-name');
                let targetName = bName;
                let safeId = bId.toString().replace(/[^a-zA-Z0-9]/g, '');
                let sDate = document.getElementById('custom-audit-date').value;
                
                let tbody = document.getElementById(`tbody-${safeId}`);
                if(!tbody) return;

                tbody.innerHTML = `
                    <tr>
                        <td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${bName}</td>
                        <td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} \u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987 \u099A\u09B2\u099B\u09C7...</td>
                    </tr>
                `;

                const updateStatus = (msg) => { 
                    let stEl = document.getElementById('status-text');
                    if(stEl) stEl.innerText = msg; 
                };

                updateStatus(`\u09AE\u09CD\u09AF\u09BE\u09A8\u09C1\u09AF\u09BC\u09BE\u09B2 \u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987: ${bName}...`);

                let mData = null;
                let aData = null;
                let iData = null;
                if (window.currentCheckerType === 'MIS') {
                    mData = await fetchMisReportApi(bId, sDate);
                    if (mData) {
                        let t2 = document.getElementById(`tbody-${safeId}`);
                        if(t2) t2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${bName}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Balance Sheet \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await fetchBalanceSheetApi(bId, sDate);
                    }
                    } else if (window.currentCheckerType === 'SAMITY') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${bName}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost( '#/samity/samities/index', sDate, '1', bId, 'samity', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09BE\u0987...</td></tr>`;
                            aData = await scrapeViaGhost( '#/samity/samities/index', sDate, '1', bId, 'samity', updateStatus);
                        }
                    } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Due Collection \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        
                        let safeBId = typeof bId !== 'undefined' ? bId : b.id;
                        let safeDateFrom = typeof targetDateFrom !== 'undefined' ? targetDateFrom : (typeof selectedDate !== 'undefined' ? selectedDate : sDate);
                        let safeDateTo = typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate);
                        
                        aData = await fetchDueCollectionApi(safeBId, safeDateFrom, safeDateTo);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} Due Collection \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09BE\u0987...</td></tr>`;
                            aData = await fetchDueCollectionApi(safeBId, safeDateFrom, safeDateTo);
                        }
                        if (aData) {
                            let dWriteOff = await fetchWriteOffColl(safeBId, safeDateFrom, safeDateTo);
                            aData.writeOffColl = dWriteOff;
                        }
                    } else if (window.currentCheckerType === 'DAILY_TRANSACTION') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${bName}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Daily Transaction \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        
                        let targetDateFrom = document.getElementById('custom-audit-date-from') ? document.getElementById('custom-audit-date-from').value : sDate;
                        let targetDateTo = document.getElementById('custom-audit-date') ? document.getElementById('custom-audit-date').value : sDate;

                          let dDisbCount = await fetchTopsheetDisb(bId, targetDateFrom, targetDateTo);
                            let dAdmission = await fetchMemberDataSilently(bId, targetDateFrom, targetDateTo, 'member_admission');
                            let dDropout = await fetchMemberDataSilently(bId, targetDateFrom, targetDateTo, 'member_dropout');
                            let tdData = await fetchTermDepositData(bId, targetDateFrom, targetDateTo);
                            let dFullPaid = await fetchFullPaidData(bId, targetDateFrom, targetDateTo);
                              let dNewDue = await fetchNewDueData(bId, targetDateFrom, targetDateTo); let dWriteOff = await fetchWriteOffColl(bId, targetDateFrom, targetDateTo);
                            
                            let dAll = await fetchPeriodicalReportApi(bId, targetDateFrom, targetDateTo, "0");
                            let dAllWith = dAll;
                            let dCash = await fetchPeriodicalReportApi(bId, targetDateFrom, targetDateTo, "1");
                            let dNonCash = await fetchPeriodicalReportApi(bId, targetDateFrom, targetDateTo, "5");
                            
                        let dDue = await fetchDueCollectionApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateFrom !== 'undefined' ? targetDateFrom : (typeof selectedDate !== 'undefined' ? selectedDate : sDate), typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                        let dBal = await fetchBalanceSheetApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));

                        aData = dAll;
                          if (aData) {
                              aData.admissions = typeof dAdmission !== 'undefined' && dAdmission ? dAdmission.count : (aData.admissions || 0);
                                aData.dropouts = typeof dDropout !== 'undefined' && dDropout ? dDropout.count : (aData.dropouts || 0);
                                aData.fullPaidCount = typeof dFullPaid !== 'undefined' ? dFullPaid : 0;
                                aData.tdOpen = tdData ? tdData.open.total : 0;
                                aData.tdOpenLts = tdData ? tdData.open.lts : 0;
                                aData.tdOpenDouble = tdData ? tdData.open.double : 0;
                                aData.tdOpenMonthly = tdData ? tdData.open.monthly : 0; aData.tdOpenFdr = tdData ? tdData.open.fdr : 0;
                                aData.tdClose = tdData ? tdData.close.total : 0;
                                aData.tdCloseLts = tdData ? tdData.close.lts : 0;
                                aData.tdCloseDouble = tdData ? tdData.close.double : 0;
                                aData.tdCloseMonthly = tdData ? tdData.close.monthly : 0; aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.disbCount = typeof dDisbCount !== 'undefined' && dDisbCount ? dDisbCount.count : (aData.disbCount || 0);
                                aData.serviceCharge = dAllWith ? dAllWith.serviceCharge : 0;
                                aData.principal = dAllWith ? dAllWith.principal : (aData.regular + aData.due + aData.advance);
                                aData.savingsRefundCash = dCash ? dCash.savingsRefund : 0;
                            aData.savingsRefundNonCash = dNonCash ? dNonCash.savingsRefund : 0;
                            aData.currentDue = dDue ? dDue.totalCurrent : 0;
                            aData.maturedDue = dDue ? dDue.totalMatured : 0;
aData.due = (parseFloat(aData.currentDue) || 0) + (parseFloat(aData.maturedDue) || 0);
                              aData.newDueBorrower = dNewDue ? dNewDue.borrower : 0;
                              aData.newDueAmount = dNewDue ? dNewDue.amount : 0; aData.writeOffColl = dWriteOff || 0;
                            aData.cashInHand = dBal ? dBal.cashInHand : 0;
                            aData.cashAtBank = dBal ? dBal.cashAtBank : 0;
                        }
                        
                        if (!aData || !dCash || !dNonCash || !dDue || !dBal) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${bName}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} Daily Transaction \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09BE\u0987...</td></tr>`;
                            
                            let rAll = await fetchPeriodicalReportApi(bId, targetDateFrom, targetDateTo, "0");
                            let rAllWith = rAll;
                            let rCash = await fetchPeriodicalReportApi(bId, targetDateFrom, targetDateTo, "1");
                            let rNonCash = await fetchPeriodicalReportApi(bId, targetDateFrom, targetDateTo, "5");
                            let rDue = await fetchDueCollectionApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateFrom !== 'undefined' ? targetDateFrom : (typeof selectedDate !== 'undefined' ? selectedDate : sDate), typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                            let rBal = await fetchBalanceSheetApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                            
                            aData = rAll;
                              if (aData) {
                                  aData.admissions = typeof dAdmission !== 'undefined' && dAdmission ? dAdmission.count : (aData.admissions || 0);
                                aData.dropouts = typeof dDropout !== 'undefined' && dDropout ? dDropout.count : (aData.dropouts || 0);
                                aData.fullPaidCount = typeof dFullPaid !== 'undefined' ? dFullPaid : 0;
                                aData.tdOpen = tdData ? tdData.open.total : 0;
                                aData.tdOpenLts = tdData ? tdData.open.lts : 0;
                                aData.tdOpenDouble = tdData ? tdData.open.double : 0;
                                aData.tdOpenMonthly = tdData ? tdData.open.monthly : 0; aData.tdOpenFdr = tdData ? tdData.open.fdr : 0;
                                aData.tdClose = tdData ? tdData.close.total : 0;
                                aData.tdCloseLts = tdData ? tdData.close.lts : 0;
                                aData.tdCloseDouble = tdData ? tdData.close.double : 0;
                                aData.tdCloseMonthly = tdData ? tdData.close.monthly : 0; aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.disbCount = typeof dDisbCount !== 'undefined' && dDisbCount ? dDisbCount.count : (aData.disbCount || 0);
                                    aData.serviceCharge = rAllWith ? rAllWith.serviceCharge : 0;
                                    aData.principal = rAllWith ? rAllWith.principal : (aData.regular + aData.due + aData.advance);
                                    aData.savingsRefundCash = rCash ? rCash.savingsRefund : 0;
                                aData.savingsRefundNonCash = rNonCash ? rNonCash.savingsRefund : 0;
                                aData.currentDue = rDue ? rDue.totalCurrent : 0;
                                aData.maturedDue = rDue ? rDue.totalMatured : 0;
aData.due = (parseFloat(aData.currentDue) || 0) + (parseFloat(aData.maturedDue) || 0);
                                  aData.newDueBorrower = dNewDue ? dNewDue.borrower : 0;
                                  aData.newDueAmount = dNewDue ? dNewDue.amount : 0; aData.writeOffColl = dWriteOff || 0;
                                aData.cashInHand = rBal ? rBal.cashInHand : 0;
                                aData.cashAtBank = rBal ? rBal.cashAtBank : 0;
                            }
                        }
                    } else {
                        theadHTML = `<tr><th style="width:24%; text-align:left;">Branch</th><th style="width:14%; text-align:left;">Item</th><th style="width:62%; text-align:right;">Balance (AIS)</th></tr>`;
                    }

                    let htmlRowsSingle = '';                    
                    let misData = mData;
                    let aisData = aData;
                    let isData = iData;
                    
                    if (window.currentCheckerType === 'MIS') {
                        let loanDiff = (misData && aisData) ? (parseFloat(misData.loan) - parseFloat(aisData.loan)) : 0;
                        let savDiff = (misData && aisData) ? (parseFloat(misData.savings) - parseFloat(aisData.savings)) : 0;
                        
                        htmlRowsSingle = `
                            <tr>
                                <td rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; background:#f4f9f4; font-size:9px;">${targetName}</td>
                                <td style="text-align:left; font-size:9px;"><b>Loan</b></td>
                                <td style="white-space:nowrap; font-size:9px;">${misData ? formatNum(misData.loan) : '0'}</td>
                                <td style="white-space:nowrap; font-size:9px;">${aisData ? formatNum(aisData.loan) : '0'}</td>
                                <td style="color:${loanDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(loanDiff)}</td>
                            </tr>
                            <tr>
                                <td style="text-align:left; font-size:9px;"><b>Savings</b></td>
                                <td style="white-space:nowrap; font-size:9px;">${misData ? formatNum(misData.savings) : '0'}</td>
                                <td style="white-space:nowrap; font-size:9px;">${aisData ? formatNum(aisData.savings) : '0'}</td>
                                <td style="color:${savDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(savDiff)}</td>
                            </tr>
                        `;
                    } else if (window.currentCheckerType === 'CASH') {
                        let cashColor = (aisData && aisData.cashInHand >= 2001) ? 'red' : '#16a085';
                        let bankColor = (aisData && aisData.cashAtBank >= 1000001) ? 'red' : '#16a085';
                        htmlRowsSingle = `
                            <tr>
                                <td rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; background:#f4f9f4; font-size:9px;">${targetName}</td>
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Cash</b></td>
                                <td style="color:${cashColor}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${aisData ? formatNum(aisData.cashInHand) : '0'}</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Bank</b></td>
                                <td style="color:${bankColor}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${aisData ? formatNum(aisData.cashAtBank) : '0'}</td>
                            </tr>
                        `;
                    } else if (window.currentCheckerType === 'EQUITY') {
                        let sM = isData ? formatNum(isData.surplusMonth) : '0';
                        let sY = isData ? formatNum(isData.surplusYear) : '0';
                        htmlRowsSingle = `
                            <tr class="equity-row">
                                <td class="branch-name-td" rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">${targetName}</td>
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Equity</b></td>
                                <td style="color:${(aisData && aisData.equity < 0 && aisData.equity !== -999) ? 'red' : '#8e44ad'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${aisData ? formatNum(aisData.equity) : '0'}</td>
                                <td style="color:${(aisData && aisData.equityPrev < 0 && aisData.equityPrev !== -999) ? 'red' : '#8e44ad'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${aisData ? formatNum(aisData.equityPrev) : '0'}</td>
                            </tr>
                            <tr class="surplus-row" style="border-bottom:1px solid #bdc3c7;">
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Surplus</b></td>
                                <td style="color:${(isData && isData.surplusMonth < 0 && isData.surplusMonth !== -999) ? 'red' : '#e67e22'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${sM}</td>
                                <td style="color:${(isData && isData.surplusYear < 0 && isData.surplusYear !== -999) ? 'red' : '#d35400'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${sY}</td>
                            </tr>
                        `;
                    } else if (window.currentCheckerType === 'SAMITY') {
                        let totalCount = aData && aData.totalCount !== undefined ? aData.totalCount : (aData ? aData.length : 0);
                        let smallSamities = aData && aData.data ? aData.data.filter(s => s.members >= 0 && s.members <= 19) : (aData && Array.isArray(aData) ? aData.filter(s => s.members >= 0 && s.members <= 19) : []);
                        let smallCount = smallSamities.length;
                        let codesText = smallSamities.map(s => s.code).join(', ');
                        if (totalCount === 0 && aData && aData.debug) codesText = '<span style="color:red;">' + aData.debug + '</span>';
                        htmlRowsSingle = `<tr class="samity-row"><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">` + targetName + `</td><td style="text-align:center; color:#2c3e50; font-size:10px; font-weight:bold;">` + totalCount + `</td><td style="text-align:center; color:#c0392b; font-size:10px; font-weight:bold;">` + smallCount + `</td><td style="text-align:left; color:#8e44ad; font-size:9px; white-space:normal; word-wrap:break-word;">` + codesText + `</td></tr>`;
                    } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                        htmlRowsSingle = `<tr><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">` + targetName + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData ? (parseFloat(aData.totalCurrent)||0).toFixed(2) : '0') + `</td><td style="text-align:center; font-weight:bold; color:#e67e22;">` + (aData ? (parseFloat(aData.totalMatured)||0).toFixed(2) : '0') + `</td></tr>`;
                    } else if (window.currentCheckerType === 'DAILY_TRANSACTION') {
                          let otr = aData && aData.recoverable > 0 ? ((aData.regular * 100) / aData.recoverable).toFixed(2) : '0.00';
                          let disbCount = aData ? (aData.disbCount || 0) : 0;
                          htmlRowsSingle = `<tr><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">` + targetName + `</td><td style="text-align:center; font-weight:bold; color:#8e44ad;">` + (aData && aData.admissions ? aData.admissions : '0') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData && aData.dropouts ? aData.dropouts : '0') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData && aData.tdOpen ? aData.tdOpen : '0') + `</td><td style="text-align:center; font-weight:bold; color:#e74c3c;">` + (aData && aData.tdClose ? aData.tdClose : '0') + `</td><td style="text-align:center; font-weight:bold; color:#2980b9;">` + (aData ? (parseFloat(aData.savingsDeposit)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.savingsRefund)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.savingsRefundCash)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.savingsRefundNonCash)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + disbCount + `</td><td style="text-align:center; font-weight:bold; color:#2c3e50;">` + (aData && aData.fullPaidCount ? aData.fullPaidCount : '0') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData ? (parseFloat(aData.disbAmount)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#e67e22;">` + (aData ? (parseFloat(aData.recoverable)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#8e44ad;">` + (aData ? (parseFloat(aData.regular)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#2c3e50;">` + otr + `%</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.due)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#d35400;">` + (aData ? (parseFloat(aData.currentDue)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.maturedDue)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#f39c12;">` + (aData ? (parseFloat(aData.advance)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#2980b9;">` + (aData ? (parseFloat(aData.principal)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#8e44ad;">` + (aData ? (parseFloat(aData.serviceCharge)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData ? (parseFloat(aData.cashInHand)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#2980b9;">` + (aData ? (parseFloat(aData.cashAtBank)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#d35400;">` + (aData && aData.newDueBorrower ? aData.newDueBorrower : '0') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.newDueAmount)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#f39c12;">` + (aData ? (parseFloat(aData.writeOffColl)||0).toFixed(2) : '0.00') + `</td></tr>`;
                      }
                      tbody.innerHTML = htmlRowsSingle;
                
                let expBtn = document.getElementById('export-excel-btn');
                if(expBtn) expBtn.style.display = 'block';
            } else if (e.target && e.target.id === 'start-audit-btn') {
                let st = document.getElementById('audit-status');
                if (st) st.innerText = "Connecting to Data Source (background)...";
                if (typeof ensureApiAndBranchList === 'function') {
                    await ensureApiAndBranchList();
                }
                if (st) st.innerText = "";
                let uType = sessionStorage.getItem('mf_user_type');
                let targetId = 'SELF';
                let targetName = localStorage.getItem('microfin_entity_name') || 'My Branch';
                let level = '1';
                
                let targetSel = document.getElementById('custom-target');
                if (targetSel) {
                    targetId = targetSel.value;
                    targetName = targetSel.options[targetSel.selectedIndex].text;
                    level = document.getElementById('custom-level') ? document.getElementById('custom-level').value : '1';
                }
                
                let allBranches = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
                let branchesToProcess = [];
                let selectedDate = document.getElementById('custom-audit-date') ? document.getElementById('custom-audit-date').value : '';
                
                if (uType === 'BRANCH') {
                    let currentBranchName = localStorage.getItem('microfin_entity_name') || 'My Branch';
                    if (currentBranchName === 'My Branch' || !currentBranchName) {
                        let bInfo = document.querySelector('.branch_info');
                        if (bInfo) {
                            let bText = bInfo.innerText.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ');
                            let m = bText.match(/Branch\s*:\s*(.*?)(?=\s+Date|\s+Zone|\s+Area|$|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
                            if (m && m[1]) currentBranchName = m[1].trim();
                        }
                    }
                    let bData = JSON.parse(sessionStorage.getItem('mf_user_branch') || '{}');
                    if(bData.id) {
                        bData.name = currentBranchName;
                        branchesToProcess = [bData];
                    } else if (allBranches && allBranches.length > 0 && allBranches[0].id && allBranches[0].id !== 'SELF' && allBranches[0].id !== '0') {
                        branchesToProcess = [allBranches[0]];
                    } else {
                        let extractedId = 'SELF';
                        try {
                            let vuexStr = localStorage.getItem('vuex');
                            if (vuexStr) {
                                let v = JSON.parse(vuexStr);
                                if (v.auth && v.auth.user && v.auth.user.branch_id) extractedId = String(v.auth.user.branch_id);
                                else if (v.auth && v.auth.user && v.auth.user.branchId) extractedId = String(v.auth.user.branchId);
                                else if (v.auth && v.auth.token) {
                                    let payloadStr = atob(v.auth.token.split('.')[1]);
                                    let payload = JSON.parse(payloadStr);
                                    if (payload.branch_id) extractedId = String(payload.branch_id);
                                    else if (payload.branchId) extractedId = String(payload.branchId);
                                    else if (payload.branch) extractedId = String(payload.branch);
                                }
                            }
                        } catch(e) {}
                        branchesToProcess = [{id: extractedId, name: currentBranchName}];
                    }
                } else if (targetId === 'ALL') {
                    branchesToProcess = allBranches;
                } else {
                    if (level === '3') branchesToProcess = allBranches.filter(b => b.zone === targetName);
                    else if (level === '2') branchesToProcess = allBranches.filter(b => b.area === targetName);
                    else if (level === '1') branchesToProcess = allBranches.filter(b => b.id === targetId);
                }
                
                if(branchesToProcess.length === 0) {
                    alert("\u274C \u0995\u09CB\u09A8\u09CB \u09B6\u09BE\u0996\u09BE \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF!");
                    return;
                }

                let output = document.getElementById('audit-output');
                let tableStyle = `<style>.audit-table { width:100%; border-collapse:collapse; background:white; } .audit-table th, .audit-table td { border:1px solid #bdc3c7; padding:4px; font-family: DSK_MixedFont, sans-serif; } .has-diff {} .no-diff {} .loss-branch {} .high-cash {} .audit-table th { background:#2c3e50; color:white; border: 1px solid white; }</style>`;
                
                let now = new Date();
                let dtString = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                let selectedDateFrom = document.getElementById('custom-audit-date-from') ? document.getElementById('custom-audit-date-from').value : selectedDate;
                let dateRangeStr = '';
                if (selectedDateFrom && selectedDate) {
                    if (selectedDateFrom === selectedDate) {
                        dateRangeStr = ` | \u{1F4C5} Date: ${selectedDate}`;
                    } else {
                        dateRangeStr = ` | \u{1F4C5} Date Range: ${selectedDateFrom} to ${selectedDate}`;
                    }
                } else if (selectedDate) {
                    dateRangeStr = ` | \u{1F4C5} Date: ${selectedDate}`;
                }

                window._misAisCurrentTab = window._misAisCurrentTab || 'ALL';
                let tableHtml = tableStyle + `
                    <div style="margin-bottom:6px; display:flex; gap:6px; justify-content:center;">
                        <button id="tab-all-branches" style="background:#2980b9; color:white; border:none; padding:5px 12px; font-size:11px; border-radius:3px; cursor:pointer; font-weight:bold; opacity:${window._misAisCurrentTab === 'ALL' ? '1' : '0.5'}; transition:0.2s;">\u{1F4CA} \u09B8\u0995\u09B2 \u09B6\u09BE\u0996\u09BE</button>
                        ${window.currentCheckerType === 'MIS' ? 
                            `<button id="tab-only-diff" style="background:#e74c3c; color:white; border:none; padding:5px 12px; font-size:11px; border-radius:3px; cursor:pointer; font-weight:bold; opacity:${window._misAisCurrentTab === 'DIFF' ? '1' : '0.5'}; transition:0.2s;">\u26A0\uFE0F Only Differences</button>` :
                            (window.currentCheckerType === 'EQUITY' ? `<button id="tab-loss-branches" style="background:#e74c3c; color:white; border:none; padding:5px 12px; font-size:11px; border-radius:3px; cursor:pointer; font-weight:bold; opacity:${window._misAisCurrentTab === 'LOSS' ? '1' : '0.5'}; transition:0.2s;">\u{1F4C9} \u09B2\u09B8 \u09B6\u09BE\u0996\u09BE</button>` : 
                            (window.currentCheckerType === 'CASH' ? `<button id="tab-high-cash" style="background:#c0392b; color:white; border:none; padding:5px 12px; font-size:11px; border-radius:3px; cursor:pointer; font-weight:bold; opacity:${window._misAisCurrentTab === 'HIGH_CASH' ? '1' : '0.5'}; transition:0.2s;">\u{1F6A8} High Cash-Bank</button>` : ''))
                        }
                    </div>
                    <div style="max-height:55vh; overflow-y:auto;">
                    <table class="audit-table">
                        <thead style="background:#2c3e50; color:white; position:sticky; top:0; z-index:1;">
                            <tr style="background:#e8f4f8; color:#2980b9;">
                                <td colspan="26" style="padding:4px; font-size:11px; text-align:center; font-weight:bold; border:1px solid #bdc3c7;">
                                    \u{1F552} Report Generated On: ${dtString}${dateRangeStr}
                                </td>
                            </tr>
                            ${window.currentCheckerType === 'MIS' ? 
                                `<tr><th style="width:24%; text-align:left;">Branch</th><th style="width:14%; text-align:left;">Item</th><th style="width:20%;">MIS</th><th style="width:20%;">AIS</th><th style="width:22%;">Diff.</th></tr>` :
                              (window.currentCheckerType === 'EQUITY' ?
                                `<tr><th style="width:24%; text-align:left;">Branch</th><th style="width:14%; text-align:left;">Item</th><th style="width:31%; text-align:right;">Current Yr / This Month</th><th style="width:31%; text-align:right;">Previous Yr / This Yr</th></tr>` :
                              (window.currentCheckerType === 'SAMITY' ?
                                `<tr><th style="width:150px; text-align:center; vertical-align:middle;">Branch</th><th style="width:100px; text-align:center; vertical-align:middle;">Total Samity</th><th style="width:120px; text-align:center; vertical-align:middle;">Samity Count (0-19 Members)</th><th style="width:400px; text-align:center; vertical-align:middle;">Samity Numbers</th></tr>` :
                              (window.currentCheckerType === 'DUE_COLLECTION' ?
                                `<tr><th style="width:30%; text-align:left;">Branch</th><th style="width:35%; text-align:center;">Current Due</th><th style="width:35%; text-align:center;">Matured Due</th></tr>` :
                              (window.currentCheckerType === 'DAILY_TRANSACTION' ?
                                `<tr style="height:32px;"><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; text-align:left; width:7%;">Branch</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Member<br>Admission</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Member<br>DropOut</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Term Deposit<br>Open</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Term Deposit<br>Close</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Savings<br>Coll.</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Savings<br>Ref.</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Sav. Ref.<br>(Cash)</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Sav. Ref.<br>(Non-Cash)</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%; font-size:9px;">Borrower<br>Rec. Loan</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%; font-size:9px;">Full<br>Paid</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Disbursed</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Recoverable</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Regular</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:3%;">OTR %</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Due</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Current<br>Due</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Matured<br>Due</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Advance</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Total<br>Collection</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">SC</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Cash<br>In Hand</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">Cash<br>At Bank</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">New Due<br>Borrower</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">New Due<br>Amount</th><th style="position:sticky; top:0; z-index:21; background:#2c3e50; color:white; border:1px solid white; text-align:center; font-size:10px; width:4%;">WriteOff<br>Coll.</th></tr>` :
                                `<tr><th style="width:24%; text-align:left;">Branch</th><th style="width:14%; text-align:left;">Item</th><th style="width:62%; text-align:right;">Balance (AIS)</th></tr>`))))}
                        </thead>
                `;
                branchesToProcess.sort((a, b) => { let z = (a.zone || "").localeCompare(b.zone || ""); if (z !== 0) return z; let ar = (a.area || "").localeCompare(b.area || ""); if (ar !== 0) return ar; return parseInt(a.id || "0") - parseInt(b.id || "0"); }); let currentZ = ""; let currentA = ""; for(let b of branchesToProcess) { if (b.zone !== currentZ && b.zone && b.zone !== "Branch" && b.zone !== "Assigned Zone") { currentZ = b.zone; tableHtml += `<tbody data-status="header"><tr style="background:#0277bd; color:white;"><td colspan="26" style="padding:4px; text-align:left;"><b>\u{1F3E2} Zone: ` + currentZ + `</b></td></tr></tbody>`; } if (b.area !== currentA && b.area && b.area !== "Branch" && b.area !== "Assigned Area") { currentA = b.area; tableHtml += `<tbody data-status="header"><tr style="background:#e1f5fe; color:#01579b;"><td colspan="26" style="padding:4px; text-align:left;">&nbsp;&nbsp;<b>\u{1F4CD} Area: ` + currentA + `</b></td></tr></tbody>`; } let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, ""); tableHtml += `
                        <tbody id="tbody-${safeId}" class="audit-row-group" data-zone="${b.zone || ''}" data-area="${b.area || ''}">
                            <tr style="background:#fff;">
                                <td style="text-align:left; font-weight:bold; color:#2c3e50; font-size:9px;">${b.name}</td>
                                <td colspan="26" style="text-align:center; color:gray; font-size:9px;">\u23F3 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A8...</td>
                            </tr>
                        </tbody>
                    `;
                }
                tableHtml += `</table></div>`;
                output.innerHTML = tableHtml;

                let tabAll = document.getElementById('tab-all-branches');
                let tabDiff = document.getElementById('tab-only-diff');
                let tabLoss = document.getElementById('tab-loss-branches');
                let tabHighCash = document.getElementById('tab-high-cash');
                
                window.applyTabFilters = function(targetTbody = null) {
                    let tbodies = targetTbody ? [targetTbody] : document.querySelectorAll('.audit-row-group');
                    let tab = window._misAisCurrentTab;
                    tbodies.forEach(tbody => {
                        let isDiff = tbody.classList.contains('has-diff');
                        let isLoss = tbody.classList.contains('loss-branch');
                        let isHighCash = tbody.classList.contains('high-cash');
                        
                        if (tab === 'DIFF' && !isDiff) tbody.style.display = 'none';
                        else if (tab === 'LOSS' && !isLoss) tbody.style.display = 'none';
                        else if (tab === 'HIGH_CASH' && !isHighCash) tbody.style.display = 'none';
                        else tbody.style.display = '';

                        let cashRow = tbody.querySelector('.cash-row');
                        let bankRow = tbody.querySelector('.bank-row');
                        let branchTd = tbody.querySelector('.branch-name-td');
                        
                        if (cashRow && bankRow && branchTd) {
                            if (tab === 'HIGH_CASH') {
                                let cHigh = cashRow.classList.contains('is-high');
                                let bHigh = bankRow.classList.contains('is-high');
                                if (cHigh && bHigh) {
                                    cashRow.style.display = ''; bankRow.style.display = ''; branchTd.rowSpan = 2; cashRow.insertBefore(branchTd, cashRow.firstChild);
                                } else if (cHigh) {
                                    cashRow.style.display = ''; bankRow.style.display = 'none'; branchTd.rowSpan = 1; cashRow.insertBefore(branchTd, cashRow.firstChild);
                                } else if (bHigh) {
                                    cashRow.style.display = 'none'; bankRow.style.display = ''; branchTd.rowSpan = 1; bankRow.insertBefore(branchTd, bankRow.firstChild);
                                } else {
                                    cashRow.style.display = ''; bankRow.style.display = ''; branchTd.rowSpan = 2; cashRow.insertBefore(branchTd, cashRow.firstChild);
                                }
                            } else {
                                cashRow.style.display = ''; bankRow.style.display = ''; branchTd.rowSpan = 2; cashRow.insertBefore(branchTd, cashRow.firstChild);
                            }
                        }
                        
                        let equityRow = tbody.querySelector('.equity-row');
                        let surplusRow = tbody.querySelector('.surplus-row');
                        let branchTdEq = tbody.querySelector('.branch-name-td');
                        
                        if (equityRow && surplusRow && branchTdEq) {
                            if (tab === 'LOSS') {
                                let eLoss = equityRow.classList.contains('is-loss');
                                let sLoss = surplusRow.classList.contains('is-loss');
                                if (eLoss && sLoss) {
                                    equityRow.style.display = ''; surplusRow.style.display = ''; branchTdEq.rowSpan = 2; equityRow.insertBefore(branchTdEq, equityRow.firstChild);
                                } else if (eLoss) {
                                    equityRow.style.display = ''; surplusRow.style.display = 'none'; branchTdEq.rowSpan = 1; equityRow.insertBefore(branchTdEq, equityRow.firstChild);
                                } else if (sLoss) {
                                    equityRow.style.display = 'none'; surplusRow.style.display = ''; branchTdEq.rowSpan = 1; surplusRow.insertBefore(branchTdEq, surplusRow.firstChild);
                                } else {
                                    equityRow.style.display = ''; surplusRow.style.display = ''; branchTdEq.rowSpan = 2; equityRow.insertBefore(branchTdEq, equityRow.firstChild);
                                }
                            } else {
                                equityRow.style.display = ''; surplusRow.style.display = ''; branchTdEq.rowSpan = 2; equityRow.insertBefore(branchTdEq, equityRow.firstChild);
                            }
                        }
                    });

                    // Add total row for DAILY_TRANSACTION
                    if (window.currentCheckerType === 'DAILY_TRANSACTION') {
                        let tfoot = document.getElementById('daily-transaction-tfoot');
                        if (!tfoot) {
                            tfoot = document.createElement('tfoot');
                            tfoot.id = 'daily-transaction-tfoot';
                            tfoot.style.cssText = 'background:#e1f5fe; color:#01579b; font-weight:bold;';
                            document.querySelector('.audit-table').appendChild(tfoot);
                        }
                        
                        let zoneTotals = {};
                        let areaTotals = {};
                        let grandTotals = { admissions: 0, dropouts: 0, tdOpen: 0, tdClose: 0, tdOpenLts: 0, tdOpenDouble: 0, tdOpenMonthly: 0, tdOpenFdr: 0, tdCloseLts: 0, tdCloseDouble: 0, tdCloseMonthly: 0, tdCloseFdr: 0, savDep: 0, savRef: 0, savRefCash: 0, savRefNon: 0, disbCount: 0, fullPaid: 0, disb: 0, rec: 0, reg: 0, due: 0, curDue: 0, matDue: 0, adv: 0, prin: 0, sc: 0, cashIn: 0, cashBank: 0, newDueBorrower: 0, newDueAmount: 0, writeOffColl: 0, branchCount: 0 };
                        
                        document.querySelectorAll('.audit-row-group').forEach(tb => {
                            if (tb.style.display === 'none') return;
                            let zone = tb.getAttribute('data-zone') || 'Unknown';
                            let area = tb.getAttribute('data-area') || 'Unknown';
                            
                            if (!zoneTotals[zone]) zoneTotals[zone] = { admissions: 0, dropouts: 0, tdOpen: 0, tdClose: 0, tdOpenLts: 0, tdOpenDouble: 0, tdOpenMonthly: 0, tdOpenFdr: 0, tdCloseLts: 0, tdCloseDouble: 0, tdCloseMonthly: 0, tdCloseFdr: 0, savDep: 0, savRef: 0, savRefCash: 0, savRefNon: 0, disbCount: 0, fullPaid: 0, disb: 0, rec: 0, reg: 0, due: 0, curDue: 0, matDue: 0, adv: 0, prin: 0, sc: 0, cashIn: 0, cashBank: 0, newDueBorrower: 0, newDueAmount: 0, writeOffColl: 0, lastTb: null, branchCount: 0 };
                            if (!areaTotals[zone + '|' + area]) areaTotals[zone + '|' + area] = { admissions: 0, dropouts: 0, tdOpen: 0, tdClose: 0, tdOpenLts: 0, tdOpenDouble: 0, tdOpenMonthly: 0, tdOpenFdr: 0, tdCloseLts: 0, tdCloseDouble: 0, tdCloseMonthly: 0, tdCloseFdr: 0, savDep: 0, savRef: 0, savRefCash: 0, savRefNon: 0, disbCount: 0, fullPaid: 0, disb: 0, rec: 0, reg: 0, due: 0, curDue: 0, matDue: 0, adv: 0, prin: 0, sc: 0, cashIn: 0, cashBank: 0, newDueBorrower: 0, newDueAmount: 0, writeOffColl: 0, lastTb: null, branchCount: 0 };

                            let trs = tb.querySelectorAll('tr');
                            let hasValidData = false;
                            trs.forEach(tr => {
                                let tds = tr.querySelectorAll('td');
                                if (tds.length >= 20 && tds[0].innerText !== 'Total' && !tds[1].innerText.includes('\u23F3') && !tds[1].innerText.includes('\u274C') && !tds[1].innerText.includes('\u{1F504}')) {
                                    hasValidData = true;
                                    let v = (i) => parseFloat(tds[i].innerText.replace(/,/g, '')) || 0;
                                    let add = (obj) => {
                                        obj.admissions += parseInt(tds[1].innerText) || 0; obj.dropouts += parseInt(tds[2].innerText) || 0;
                                          obj.tdOpen += parseInt(tds[3].innerText) || 0;
                                            obj.tdClose += parseInt(tds[4].innerText) || 0;
                                            obj.savDep += v(5); obj.savRef += v(6); obj.savRefCash += v(7); obj.savRefNon += v(8);
                                            obj.disbCount += parseInt(tds[9].innerText) || 0;
                                            obj.fullPaid += parseInt(tds[10].innerText) || 0;
                                            obj.disb += v(11); obj.rec += v(12); obj.reg += v(13);
                                            obj.due += v(15); obj.curDue += v(16); obj.matDue += v(17); obj.adv += v(18); obj.prin += v(19); obj.sc += v(20);
                                            obj.cashIn += v(21); obj.cashBank += v(22); obj.newDueBorrower += parseInt(tds[23].innerText) || 0; obj.newDueAmount += v(24); obj.writeOffColl += v(25);
                                    };
                                    add(grandTotals); add(zoneTotals[zone]); add(areaTotals[zone + '|' + area]);
                                }
                            });
                            
                            if (hasValidData) {
                                zoneTotals[zone].lastTb = tb;
                                areaTotals[zone + '|' + area].lastTb = tb;
                                zoneTotals[zone].branchCount++;
                                areaTotals[zone + '|' + area].branchCount++;
                                grandTotals.branchCount++;
                            }
                        });

                        document.querySelectorAll('.dt-subtotal').forEach(e => e.remove());

                        let customLevelEl = document.getElementById('custom-level');
                        let level = customLevelEl ? customLevelEl.value : '1';

                        Object.keys(areaTotals).forEach(key => {
                            let data = areaTotals[key];
                            if (level === '1') return; // Hide area totals if branch level
                            if (data.lastTb && key.split('|')[1] !== 'Unknown' && key.split('|')[1] !== '' && data.branchCount > 1) {
                                let otr = data.rec > 0 ? ((data.reg * 100) / data.rec).toFixed(2) : '0.00';
                                let html = `<tr style="background:#e1f5fe; color:#01579b; font-weight:bold;" class="dt-subtotal">
                                    <td style="text-align:right; font-size:10px; white-space:nowrap;" class="subtotal-label">${key.split('|')[1]} (Total)</td><td style="text-align:center; font-size:10px;">${data.admissions}</td><td style="text-align:center; font-size:10px;">${data.dropouts}</td><td style="text-align:center; font-weight:bold; color:#16a085;">${data.tdOpen}</td><td style="text-align:center; font-weight:bold; color:#e74c3c;">${data.tdClose}</td><td style="text-align:center; font-size:10px;">${data.savDep.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.savRef.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.savRefCash.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.savRefNon.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.disbCount}</td>
                                      <td style="text-align:center; font-size:10px;">${data.fullPaid}</td>
                                      <td style="text-align:center; font-size:10px;">${data.disb.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.rec.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.reg.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${otr}%</td>
                                    <td style="text-align:center; font-size:10px;">${data.due.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.curDue.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.matDue.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.adv.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.prin.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.sc.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.cashIn.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.cashBank.toFixed(2)}</td><td style="text-align:center; font-size:10px;">${data.newDueBorrower}</td><td style="text-align:center; font-size:10px;">${data.newDueAmount.toFixed(2)}</td><td style="text-align:center; font-size:10px;">${data.writeOffColl.toFixed(2)}</td></tr>`;
                                let tb = document.createElement('tbody');
                                tb.className = 'dt-subtotal dt-area-total';
                                tb.innerHTML = html;
                                data.lastTb.parentNode.insertBefore(tb, data.lastTb.nextSibling);
                                zoneTotals[key.split('|')[0]].lastTb = tb; 
                            }
                        });

                        Object.keys(zoneTotals).forEach(z => {
                            let data = zoneTotals[z];
                            if (level === '1' || level === '2') return; // Hide zone totals if area or branch level
                            let areasInZone = Object.keys(areaTotals).filter(k => k.startsWith(z + '|')).length;
                            if (data.lastTb && z !== 'Unknown' && z !== '' && areasInZone > 1) {
                                let otr = data.rec > 0 ? ((data.reg * 100) / data.rec).toFixed(2) : '0.00';
                                let html = `<tr style="background:#0277bd; color:white; font-weight:bold;" class="dt-subtotal">
                                    <td style="text-align:right; font-size:10px; white-space:nowrap;" class="subtotal-label">${z} (Total)</td><td style="text-align:center; font-size:10px;">${data.admissions}</td><td style="text-align:center; font-size:10px;">${data.dropouts}</td><td style="text-align:center; font-weight:bold; color:#16a085;">${data.tdOpen}</td><td style="text-align:center; font-weight:bold; color:#e74c3c;">${data.tdClose}</td><td style="text-align:center; font-size:10px;">${data.savDep.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.savRef.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.savRefCash.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.savRefNon.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.disbCount}</td>
                                      <td style="text-align:center; font-size:10px;">${data.fullPaid}</td>
                                      <td style="text-align:center; font-size:10px;">${data.disb.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.rec.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.reg.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${otr}%</td>
                                    <td style="text-align:center; font-size:10px;">${data.due.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.curDue.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.matDue.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.adv.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.prin.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.sc.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.cashIn.toFixed(2)}</td>
                                    <td style="text-align:center; font-size:10px;">${data.cashBank.toFixed(2)}</td><td style="text-align:center; font-size:10px;">${data.newDueBorrower}</td><td style="text-align:center; font-size:10px;">${data.newDueAmount.toFixed(2)}</td><td style="text-align:center; font-size:10px;">${data.writeOffColl.toFixed(2)}</td></tr>`;
                                let tb = document.createElement('tbody');
                                tb.className = 'dt-subtotal dt-zone-total';
                                tb.innerHTML = html;
                                data.lastTb.parentNode.insertBefore(tb, data.lastTb.nextSibling);
                            }
                        });

                        let otr = grandTotals.rec > 0 ? ((grandTotals.reg * 100) / grandTotals.rec).toFixed(2) : '0.00';
                        let targetSel = document.getElementById('custom-target');
                        let isAll = !targetSel || targetSel.value === 'ALL';
                        
                        if (isAll && grandTotals.branchCount > 1) {
                            tfoot.innerHTML = `<tr>
                                <td style="text-align:left; font-size:10.5px; padding:6px;" class="subtotal-label"><b>Grand Total</b></td><td style="text-align:center; font-size:10px;">${grandTotals.admissions}</td><td style="text-align:center; font-size:10px;">${grandTotals.dropouts}</td><td style="text-align:center; font-weight:bold; color:#16a085;">${grandTotals.tdOpen}</td><td style="text-align:center; font-weight:bold; color:#e74c3c;">${grandTotals.tdClose}</td><td style="text-align:center; font-size:10px;">${grandTotals.savDep.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.savRef.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.savRefCash.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.savRefNon.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.disbCount}</td><td style="text-align:center; font-size:10px;">${grandTotals.fullPaid}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.disb.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.rec.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.reg.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${otr}%</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.due.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.curDue.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.matDue.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.adv.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.prin.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.sc.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.cashIn.toFixed(2)}</td>
                                <td style="text-align:center; font-size:10px;">${grandTotals.cashBank.toFixed(2)}</td><td style="text-align:center; font-size:10px;">${grandTotals.newDueBorrower}</td><td style="text-align:center; font-size:10px;">${grandTotals.newDueAmount.toFixed(2)}</td><td style="text-align:center; font-size:10px;">${grandTotals.writeOffColl.toFixed(2)}</td></tr>`;
                            tfoot.style.display = '';
                        } else {
                            tfoot.style.display = 'none';
                        }
                    }
                };

                if (tabAll) {
                    tabAll.onclick = () => {
                        window._misAisCurrentTab = 'ALL';
                        tabAll.style.opacity = '1';
                        if (tabDiff) tabDiff.style.opacity = '0.5';
                        if (tabLoss) tabLoss.style.opacity = '0.5';
                        if (tabHighCash) tabHighCash.style.opacity = '0.5';
                        if (window.applyTabFilters) window.applyTabFilters();
                    };
                }
                if (tabDiff) {
                    tabDiff.onclick = () => {
                        window._misAisCurrentTab = 'DIFF';
                        tabDiff.style.opacity = '1';
                        if (tabAll) tabAll.style.opacity = '0.5';
                        if (tabHighCash) tabHighCash.style.opacity = '0.5';
                        if (window.applyTabFilters) window.applyTabFilters();
                    };
                }
                if (tabLoss) {
                    tabLoss.onclick = () => {
                        window._misAisCurrentTab = 'LOSS';
                        tabLoss.style.opacity = '1';
                        if (tabAll) tabAll.style.opacity = '0.5';
                        if (tabHighCash) tabHighCash.style.opacity = '0.5';
                        if (window.applyTabFilters) window.applyTabFilters();
                    };
                }
                if (tabHighCash) {
                    tabHighCash.onclick = () => {
                        window._misAisCurrentTab = 'HIGH_CASH';
                        tabHighCash.style.opacity = '1';
                        if (tabAll) tabAll.style.opacity = '0.5';
                        if (tabDiff) tabDiff.style.opacity = '0.5';
                        if (tabLoss) tabLoss.style.opacity = '0.5';
                        if (window.applyTabFilters) window.applyTabFilters();
                    };
                }
                const updateStatus = (msg) => { 
                    let stEl = document.getElementById('audit-status');
                    if(stEl) stEl.innerText = msg; 
                };
                let successCount = 0;
                let currentIndex = 0;
                const CONCURRENT_LIMIT = window.currentCheckerType === "DAILY_TRANSACTION" ? 10 : 8;

                async function processNextBranch() {
                    while (currentIndex < branchesToProcess.length) {
                        let i = currentIndex++;
                        let b = branchesToProcess[i];
                        let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');

                    updateStatus(`[${i+1}/${branchesToProcess.length}] \u0985\u09A1\u09BF\u099F \u099A\u09B2\u099B\u09C7: ${b.name}...`);
                    
                    let tbodyBefore = document.getElementById(`tbody-${safeId}`);
                    if(tbodyBefore) {
                        tbodyBefore.innerHTML = `
                            <tr>
                                <td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td>
                                <td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} MIS \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td>
                            </tr>
                        `;
                    }

                    let mData = null;
                    let aData = null;
                    let iData = null;
                    if (window.currentCheckerType === 'MIS') {
                        mData = await fetchMisReportApi(b.id, selectedDate);
                        if (!mData) {
                            let tRetry1 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry1) tRetry1.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} MIS \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            mData = await fetchMisReportApi(b.id, selectedDate);
                        }
                        if (mData) {
                            let tRetry2 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Balance Sheet \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                            aData = await fetchBalanceSheetApi(b.id, selectedDate);
                            if (!aData) {
                                let tRetry3 = document.getElementById(`tbody-${safeId}`);
                                if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} Balance Sheet \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                                aData = await fetchBalanceSheetApi(b.id, selectedDate);
                            }
                        }
                    } else if (window.currentCheckerType === 'SAMITY') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost( '#/samity/samities/index', selectedDate, '1', b.id, 'samity', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await scrapeViaGhost( '#/samity/samities/index', selectedDate, '1', b.id, 'samity', updateStatus);
                        }
                    } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Due Collection \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await fetchDueCollectionApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateFrom !== 'undefined' ? targetDateFrom : (typeof selectedDate !== 'undefined' ? selectedDate : sDate), typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} Due Collection \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await fetchDueCollectionApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateFrom !== 'undefined' ? targetDateFrom : (typeof selectedDate !== 'undefined' ? selectedDate : sDate), typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                        }
                    } else if (window.currentCheckerType === 'DAILY_TRANSACTION') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Daily Transaction \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        
                        let targetDateFrom = document.getElementById('custom-audit-date-from') ? document.getElementById('custom-audit-date-from').value : selectedDate;
                        let targetDateTo = document.getElementById('custom-audit-date') ? document.getElementById('custom-audit-date').value : selectedDate;

                          let dDisbCount = await fetchTopsheetDisb(b.id, targetDateFrom, targetDateTo);
                            let dAdmission = await fetchMemberDataSilently(b.id, targetDateFrom, targetDateTo, 'member_admission');
                            let dDropout = await fetchMemberDataSilently(b.id, targetDateFrom, targetDateTo, 'member_dropout');
                            let tdData = await fetchTermDepositData(b.id, targetDateFrom, targetDateTo);
                              let dFullPaid = await fetchFullPaidData(b.id, targetDateFrom, targetDateTo);
                              let dNewDue = await fetchNewDueData(b.id, targetDateFrom, targetDateTo); let dWriteOff = await fetchWriteOffColl(b.id, targetDateFrom, targetDateTo);
                              let dAll = await fetchPeriodicalReportApi(b.id, targetDateFrom, targetDateTo, "0");
                              let dAllWith = dAll;
                              let dCash = await fetchPeriodicalReportApi(b.id, targetDateFrom, targetDateTo, "1");
                              let dNonCash = await fetchPeriodicalReportApi(b.id, targetDateFrom, targetDateTo, "5");
                        let dDue = await fetchDueCollectionApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateFrom !== 'undefined' ? targetDateFrom : (typeof selectedDate !== 'undefined' ? selectedDate : sDate), typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                        let dBal = await fetchBalanceSheetApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));

                        aData = dAll;
                          if (aData) {
                              aData.admissions = typeof dAdmission !== 'undefined' && dAdmission ? dAdmission.count : (aData.admissions || 0);
                                aData.dropouts = typeof dDropout !== 'undefined' && dDropout ? dDropout.count : (aData.dropouts || 0);
                                aData.fullPaidCount = typeof dFullPaid !== 'undefined' ? dFullPaid : 0;
                                aData.tdOpen = tdData ? tdData.open.total : 0;
                                aData.tdOpenLts = tdData ? tdData.open.lts : 0;
                                aData.tdOpenDouble = tdData ? tdData.open.double : 0;
                                aData.tdOpenMonthly = tdData ? tdData.open.monthly : 0; aData.tdOpenFdr = tdData ? tdData.open.fdr : 0;
                                aData.tdClose = tdData ? tdData.close.total : 0;
                                aData.tdCloseLts = tdData ? tdData.close.lts : 0;
                                aData.tdCloseDouble = tdData ? tdData.close.double : 0;
                                aData.tdCloseMonthly = tdData ? tdData.close.monthly : 0; aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.disbCount = typeof dDisbCount !== 'undefined' && dDisbCount ? dDisbCount.count : (aData.disbCount || 0);
                                aData.serviceCharge = dAllWith ? dAllWith.serviceCharge : 0;
                                aData.principal = dAllWith ? dAllWith.principal : (aData.regular + aData.due + aData.advance);
                                aData.savingsRefundCash = dCash ? dCash.savingsRefund : 0;
                            aData.savingsRefundNonCash = dNonCash ? dNonCash.savingsRefund : 0;
                            aData.currentDue = dDue ? dDue.totalCurrent : 0;
                            aData.maturedDue = dDue ? dDue.totalMatured : 0;
aData.due = (parseFloat(aData.currentDue) || 0) + (parseFloat(aData.maturedDue) || 0);
                              aData.newDueBorrower = dNewDue ? dNewDue.borrower : 0;
                              aData.newDueAmount = dNewDue ? dNewDue.amount : 0; aData.writeOffColl = dWriteOff || 0;
                            aData.cashInHand = dBal ? dBal.cashInHand : 0;
                            aData.cashAtBank = dBal ? dBal.cashAtBank : 0;
                        }
                        
                        if (!aData || !dCash || !dNonCash || !dDue || !dBal) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} Daily Transaction \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            
                              let rAll = await fetchPeriodicalReportApi(b.id, targetDateFrom, targetDateTo, "0");
                              let rAllWith = rAll;
                              let rCash = await fetchPeriodicalReportApi(b.id, targetDateFrom, targetDateTo, "1");
                              let rNonCash = await fetchPeriodicalReportApi(b.id, targetDateFrom, targetDateTo, "5");
                            let rDue = await fetchDueCollectionApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateFrom !== 'undefined' ? targetDateFrom : (typeof selectedDate !== 'undefined' ? selectedDate : sDate), typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                            let rBal = await fetchBalanceSheetApi(typeof bId !== 'undefined' ? bId : b.id, typeof targetDateTo !== 'undefined' ? targetDateTo : (typeof selectedDate !== 'undefined' ? selectedDate : sDate));
                            
                            aData = rAll;
                              if (aData) {
                                  aData.admissions = typeof dAdmission !== 'undefined' && dAdmission ? dAdmission.count : (aData.admissions || 0);
                                aData.dropouts = typeof dDropout !== 'undefined' && dDropout ? dDropout.count : (aData.dropouts || 0);
                                aData.fullPaidCount = typeof dFullPaid !== 'undefined' ? dFullPaid : 0;
                                aData.tdOpen = tdData ? tdData.open.total : 0;
                                aData.tdOpenLts = tdData ? tdData.open.lts : 0;
                                aData.tdOpenDouble = tdData ? tdData.open.double : 0;
                                aData.tdOpenMonthly = tdData ? tdData.open.monthly : 0; aData.tdOpenFdr = tdData ? tdData.open.fdr : 0;
                                aData.tdClose = tdData ? tdData.close.total : 0;
                                aData.tdCloseLts = tdData ? tdData.close.lts : 0;
                                aData.tdCloseDouble = tdData ? tdData.close.double : 0;
                                aData.tdCloseMonthly = tdData ? tdData.close.monthly : 0; aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.tdCloseFdr = tdData ? tdData.close.fdr : 0;
                                  aData.disbCount = typeof dDisbCount !== 'undefined' && dDisbCount ? dDisbCount.count : (aData.disbCount || 0);
                                    aData.serviceCharge = rAllWith ? rAllWith.serviceCharge : 0;
                                    aData.principal = rAllWith ? rAllWith.principal : (aData.regular + aData.due + aData.advance);
                                    aData.savingsRefundCash = rCash ? rCash.savingsRefund : 0;
                                aData.savingsRefundNonCash = rNonCash ? rNonCash.savingsRefund : 0;
                                aData.currentDue = rDue ? rDue.totalCurrent : 0;
                                aData.maturedDue = rDue ? rDue.totalMatured : 0;
aData.due = (parseFloat(aData.currentDue) || 0) + (parseFloat(aData.maturedDue) || 0);
                                  aData.newDueBorrower = dNewDue ? dNewDue.borrower : 0;
                                  aData.newDueAmount = dNewDue ? dNewDue.amount : 0; aData.writeOffColl = dWriteOff || 0;
                                aData.cashInHand = rBal ? rBal.cashInHand : 0;
                                aData.cashAtBank = rBal ? rBal.cashAtBank : 0;
                            }
                        }
                    } else {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Balance Sheet \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await fetchBalanceSheetApi(b.id, selectedDate);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} Balance Sheet \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await fetchBalanceSheetApi(b.id, selectedDate);
                        }
                        if (window.currentCheckerType === 'EQUITY') {
                            let tRetry4 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry4) tRetry4.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#27ae60; font-size:9px;">\u{1F504} Income Statement \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                            iData = await fetchIncomeStatementApi(b.id, selectedDate);
                            if (!iData) {
                                let tRetry5 = document.getElementById(`tbody-${safeId}`);
                                if(tRetry5) tRetry5.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9px;">${b.name}</td><td colspan="26" style="text-align:center; color:#d35400; font-size:9px;">\u{1F504} Income Statement \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                                iData = await fetchIncomeStatementApi(b.id, selectedDate);
                            }
                        }
                    }

                    let tbodyAfter = document.getElementById(`tbody-${safeId}`);
                    if (!tbodyAfter) continue; 

                    if ((window.currentCheckerType === 'MIS' && mData && aData) || (window.currentCheckerType !== 'MIS' && aData)) {
                        mData = mData || {};
                        iData = iData || {};
                        let lDiff = window.currentCheckerType === 'MIS' ? (mData.loan || 0) - (aData.loan || 0) : 0;
                        let sDiff = window.currentCheckerType === 'MIS' ? (mData.savings || 0) - (aData.savings || 0) : 0;
                        let sM = iData && iData.surplusMonth !== undefined ? (iData.surplusMonth === -999 ? "TIMEOUT" : formatNum(iData.surplusMonth)) : "0";
                        let sY = iData && iData.surplusYear !== undefined ? (iData.surplusYear === -999 ? "TIMEOUT" : formatNum(iData.surplusYear)) : "0";
                        
                        let lDiffColor = Math.abs(lDiff) < 1 ? 'green' : 'red';
                        let sDiffColor = Math.abs(sDiff) < 1 ? 'green' : 'red';
                        let hasDifference = window.currentCheckerType === 'MIS' && (Math.abs(lDiff) >= 1 || Math.abs(sDiff) >= 1);
                        
                        if (hasDifference) {
                            tbodyAfter.classList.add('has-diff');
                            tbodyAfter.classList.remove('no-diff');
                        } else {
                            tbodyAfter.classList.add('no-diff');
                            tbodyAfter.classList.remove('has-diff');
                        }

                        if (window.currentCheckerType === 'EQUITY' && ((aData && aData.equity < 0 && aData.equity !== -999) || (aData && aData.equityPrev < 0 && aData.equityPrev !== -999) || (iData && iData.surplusMonth < 0 && iData.surplusMonth !== -999) || (iData && iData.surplusYear < 0 && iData.surplusYear !== -999))) {
                            tbodyAfter.classList.add('loss-branch');
                        } else {
                            tbodyAfter.classList.remove('loss-branch');
                        }

                        if (window.currentCheckerType === 'CASH' && (aData.cashInHand >= 2001 || aData.cashAtBank >= 1000001)) {
                            tbodyAfter.classList.add('high-cash');
                        } else {
                            tbodyAfter.classList.remove('high-cash');
                        }

                        if (window._misAisCurrentTab === 'DIFF' && !tbodyAfter.classList.contains('has-diff')) {
                            tbodyAfter.style.display = 'none';
                        } else if (window._misAisCurrentTab === 'LOSS' && !tbodyAfter.classList.contains('loss-branch')) {
                            tbodyAfter.style.display = 'none';
                        } else if (window._misAisCurrentTab === 'HIGH_CASH' && !tbodyAfter.classList.contains('high-cash')) {
                            tbodyAfter.style.display = 'none';
                        } else {
                            tbodyAfter.style.display = '';
                        }
                        
                        let htmlRowsBatch = '';
                        if (window.currentCheckerType === 'MIS') {
                            htmlRowsBatch = `
                                <tr>
                                    <td rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; background:#f4f9f4; font-size:9px;">${b.name}</td>
                                    <td style="text-align:left; font-size:9px;"><b>Loan</b></td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(mData.loan)}</td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(aData.loan)}</td>
                                    <td style="color:${lDiffColor}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(lDiff)}</td>
                                </tr>
                                <tr>
                                    <td style="text-align:left; font-size:9px;"><b>Savings</b></td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(mData.savings)}</td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(aData.savings)}</td>
                                    <td style="color:${sDiffColor}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(sDiff)}</td>
                                </tr>
                            `;
                        } else if (window.currentCheckerType === 'CASH') {
                            let cashColor = aData.cashInHand >= 2001 ? 'red' : '#16a085';
                            let bankColor = aData.cashAtBank >= 1000001 ? 'red' : '#16a085';
                            let isHighCashClass = aData.cashInHand >= 2001 ? 'is-high' : '';
                            let isHighBankClass = aData.cashAtBank >= 1000001 ? 'is-high' : '';
                            htmlRowsBatch = `
                                <tr class="cash-row ${isHighCashClass}">
                                    <td class="branch-name-td" rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; background:#f4f9f4; font-size:9px;">${b.name}</td>
                                    <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Cash</b></td>
                                    <td style="color:${cashColor}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.cashInHand)}</td>
                                </tr>
                                <tr class="bank-row ${isHighBankClass}" style="background:#fcfcfc;">
                                    <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Bank</b></td>
                                    <td style="color:${bankColor}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.cashAtBank)}</td>
                                </tr>
                            `;
                        } else if (window.currentCheckerType === 'EQUITY') {
                            htmlRowsBatch = `
                                <tr class="equity-row">
                                    <td class="branch-name-td" rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">${b.name}</td>
                                    <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Equity</b></td>
                                    <td style="color:${(aData.equity < 0 && aData.equity !== -999) ? 'red' : '#8e44ad'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.equity)}</td>
                                    <td style="color:${(aData.equityPrev < 0 && aData.equityPrev !== -999) ? 'red' : '#8e44ad'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.equityPrev)}</td>
                                </tr>
                                <tr class="surplus-row" style="border-bottom:1px solid #bdc3c7;">
                                    <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Surplus</b></td>
                                    <td style="color:${(iData.surplusMonth < 0 && iData.surplusMonth !== -999) ? 'red' : '#e67e22'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${sM}</td>
                                    <td style="color:${(iData.surplusYear < 0 && iData.surplusYear !== -999) ? 'red' : '#d35400'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${sY}</td>
                                </tr>
                            `;
                        } else if (window.currentCheckerType === 'SAMITY') {
                            let totalCount = aData && aData.totalCount !== undefined ? aData.totalCount : (aData ? aData.length : 0);
                            let smallSamities = aData && aData.data ? aData.data.filter(s => s.members >= 0 && s.members <= 19) : (aData ? aData.filter(s => s.members >= 0 && s.members <= 19) : []);
                            let smallCount = smallSamities.length;
                            let codesText = smallSamities.map(s => s.code).join(', ');
                            if (totalCount === 0 && aData && aData.debug) codesText = '<span style="color:red;">' + aData.debug + '</span>';
                            htmlRowsBatch = `<tr class="samity-row"><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">` + b.name + `</td><td style="text-align:center; color:#2c3e50; font-size:10px; font-weight:bold;">` + totalCount + `</td><td style="text-align:center; color:#c0392b; font-size:10px; font-weight:bold;">` + smallCount + `</td><td style="text-align:left; color:#8e44ad; font-size:9px; white-space:normal; word-wrap:break-word;">` + codesText + `</td></tr>`;
                        } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                            htmlRowsBatch = `<tr><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">` + b.name + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData ? (parseFloat(aData.totalCurrent)||0).toFixed(2) : '0') + `</td><td style="text-align:center; font-weight:bold; color:#e67e22;">` + (aData ? (parseFloat(aData.totalMatured)||0).toFixed(2) : '0') + `</td></tr>`;
                        } else if (window.currentCheckerType === 'DAILY_TRANSACTION') {
                            let otr = aData && aData.recoverable > 0 ? ((aData.regular * 100) / aData.recoverable).toFixed(2) : '0.00';
                            let disbCount = aData ? (aData.disbCount || 0) : 0;
                              htmlRowsBatch = `<tr><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; white-space:nowrap; font-size:9px; border-bottom:1px solid #bdc3c7;">` + b.name + `</td><td style="text-align:center; font-weight:bold; color:#8e44ad;">` + (aData && aData.admissions ? aData.admissions : '0') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData && aData.dropouts ? aData.dropouts : '0') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData && aData.tdOpen ? aData.tdOpen : '0') + `</td><td style="text-align:center; font-weight:bold; color:#e74c3c;">` + (aData && aData.tdClose ? aData.tdClose : '0') + `</td><td style="text-align:center; font-weight:bold; color:#2980b9;">` + (aData ? (parseFloat(aData.savingsDeposit)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.savingsRefund)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.savingsRefundCash)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.savingsRefundNonCash)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + disbCount + `</td><td style="text-align:center; font-weight:bold; color:#2c3e50;">` + (aData && aData.fullPaidCount ? aData.fullPaidCount : '0') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData ? (parseFloat(aData.disbAmount)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#e67e22;">` + (aData ? (parseFloat(aData.recoverable)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#8e44ad;">` + (aData ? (parseFloat(aData.regular)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#2c3e50;">` + otr + `%</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.due)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#d35400;">` + (aData ? (parseFloat(aData.currentDue)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.maturedDue)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#f39c12;">` + (aData ? (parseFloat(aData.advance)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#2980b9;">` + (aData ? (parseFloat(aData.principal)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#8e44ad;">` + (aData ? (parseFloat(aData.serviceCharge)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData ? (parseFloat(aData.cashInHand)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#2980b9;">` + (aData ? (parseFloat(aData.cashAtBank)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#d35400;">` + (aData && aData.newDueBorrower ? aData.newDueBorrower : '0') + `</td><td style="text-align:center; font-weight:bold; color:#c0392b;">` + (aData ? (parseFloat(aData.newDueAmount)||0).toFixed(2) : '0.00') + `</td><td style="text-align:center; font-weight:bold; color:#f39c12;">` + (aData ? (parseFloat(aData.writeOffColl)||0).toFixed(2) : '0.00') + `</td></tr>`;
                        }
                        tbodyAfter.innerHTML = htmlRowsBatch;
                        if (window.applyTabFilters) window.applyTabFilters(tbodyAfter);
                        successCount++;
                    } else {
                        tbodyAfter.innerHTML = `
                            <tr>
                                <td style="text-align:left; font-weight:bold; color:#e74c3c; font-size:9px;">${b.name}</td>
                                <td colspan="${window.currentCheckerType === 'MIS' ? 3 : (window.currentCheckerType === 'EQUITY' || window.currentCheckerType === 'SAMITY' ? 2 : (window.currentCheckerType === 'DAILY_TRANSACTION' ? 26 : 4))}" style="text-align:center; color:red; font-size:9px;">\u274C \u09A1\u09BE\u099F\u09BE \u09A8\u09C7\u0987</td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <button class="manual-retry-btn" data-id="${b.id}" data-name="${b.name}" style="background:#e74c3c; color:white; border:none; padding:2px 6px; font-size:9px; border-radius:2px; cursor:pointer; font-weight:bold;">\u{1F504} Retry</button>
                                </td>
                            </tr>
                        `;
                        }
                    }
                }

                let workers = [];
                for (let w = 0; w < CONCURRENT_LIMIT; w++) {
                    let staggerDelay = w * 200; // Continuous stagger: 0ms, 250ms, 500ms...
                    workers.push(new Promise(resolve => setTimeout(async () => {
                        await processNextBranch();
                        resolve();
                    }, staggerDelay)));
                }
                await Promise.all(workers);

                let finalStatus = document.getElementById('audit-status');
                if(finalStatus) {
                    finalStatus.innerHTML = `\u2705 ${successCount} \u099F\u09BF \u09B6\u09BE\u0996\u09BE\u09B0 \u0985\u09A1\u09BF\u099F \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8!`;
                    // setTimeout(() => { if(finalStatus) finalStatus.innerHTML = ''; }, 2000);
                }
                
                let finalBtn = document.getElementById('start-audit-btn');
                if(finalBtn) { finalBtn.disabled = false; finalBtn.style.background = "#27ae60"; }
                
                let expBtn = document.getElementById('export-excel-btn');
                if(expBtn) expBtn.style.display = 'block';
            }
        });

        if(!document.getElementById('spinner-css')) {
            const style = document.createElement('style');
            style.id = 'spinner-css';
            style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
    }

    setInterval(() => {
        if (window.location.hash.includes('dashboard')) {
            initMisAisToggleBtn();

        } else {
            isMisAisBtnClosed = false;
            let btn1 = document.getElementById('mis-ais-toggle-btn');
            if (btn1) btn1.remove();
            let btn2 = document.getElementById('cash-bank-toggle-btn');
            if (btn2) btn2.remove();
            let btn3 = document.getElementById('equity-toggle-btn');
            if (btn3) btn3.remove();
            let btn4 = document.getElementById('samity-toggle-btn');
            if (btn4) btn4.remove();
            let btn5 = document.getElementById('due-toggle-btn');
            if (btn5) btn5.remove();
            let btn6 = document.getElementById('daily-toggle-btn');
            if (btn6) btn6.remove();
            
            let p = document.getElementById('ghost-audit-panel');
            if (p) p.remove();
        }
    }, 1500);

})();

// ========================================================================
// \u{1F4CA} 3. HIERARCHICAL BRANCH REPORT (DASHBOARD MEMBER VERIFICATION MODULE)
// ========================================================================
(function() {
    'use strict';

    // \u{1F31F} Ultra-Safe Storage Utilities (Error Proof)
    const storageUtil = {
        set: function(key, value, callback) {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    let obj = {}; obj[key] = value;
                    chrome.storage.local.set(obj, callback);
                    return;
                }
            } catch(e) { console.warn("Chrome storage not permitted. Using fallback."); }
            localStorage.setItem(key, JSON.stringify(value));
            if(callback) callback();
        },
        get: function(key, callback) {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get([key], function(result) {
                        if (chrome.runtime && chrome.runtime.lastError) {
                            let data = localStorage.getItem(key);
                            try { callback(data ? JSON.parse(data) : undefined); } catch(err) { callback(undefined); }
                        } else {
                            callback(result[key]);
                        }
                    });
                    return;
                }
            } catch(e) { console.warn("Chrome storage not permitted. Using fallback."); }
            try {
                let data = localStorage.getItem(key);
                callback(data ? JSON.parse(data) : undefined);
            } catch(err) { callback(undefined); }
        }
    };

    // \u09E7. \u0997\u09CD\u09B2\u09CB\u09AC\u09BE\u09B2 \u09AD\u09C7\u09B0\u09BF\u09AF\u09BC\u09C7\u09AC\u09B2 \u0993 \u0987\u09A8\u09CD\u099F\u09BE\u09B0\u09B8\u09C7\u09AA\u09CD\u099F\u09B0
    let clonedUrl = null;
    let clonedHeaders = {};
    let isCapturing = false;
    let isSyncing = false; 
    let isToggleClosed = false; 

    // Capture main window API if user navigates there manually
    const origOpen = XMLHttpRequest.prototype.open;
    const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) { this._url = url; this._method = method; this._headers = {}; origOpen.apply(this, arguments); };
    XMLHttpRequest.prototype.setRequestHeader = function(name, value) { this._headers[name] = value; origSetHeader.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function(body) {
        if (this._headers && (this._headers['Authorization'] || this._headers['authorization'])) {
            clonedHeaders = Object.assign({}, this._headers); 
            try {
                sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders)); sessionStorage.setItem('mf_session_refreshed', '1');
            } catch(e){}
        }

        if (this._url && (this._url.includes('cbo_branch') || this._url.includes('cbo_member_status') || (this._url.includes('members') && (this._url.includes('limit=') || this._url.includes('ajax') || this._url.includes('list'))))) {
            clonedUrl = this._url; 
            isCapturing = false;
            try {
                sessionStorage.setItem('mf_cloned_url', clonedUrl);
                localStorage.setItem('mf_cloned_url_backup', clonedUrl);
                
                let bodyStr = body;
                if (body instanceof FormData) {
                    let p = new URLSearchParams();
                    for (let [k,v] of body.entries()) p.append(k, v);
                    bodyStr = p.toString();
                }
                let template = { url: clonedUrl, method: this._method || 'POST', headers: clonedHeaders, body: bodyStr };
                sessionStorage.setItem('mf_api_template', JSON.stringify(template));
            } catch(e){}
            document.dispatchEvent(new Event('ApiCaptured'));
        }
        origSend.apply(this, arguments);
    };

    const origFetch = window.fetch;
    if(origFetch) {
        window.fetch = async function(url, options) {
            if (options && options.headers) {
                let h = options.headers;
                let auth = null;
                if (h instanceof Headers) auth = h.get('Authorization') || h.get('authorization');
                else if (typeof h === 'object') auth = h['Authorization'] || h['authorization'];
                
                if (auth) {
                    if (h instanceof Headers) {
                        clonedHeaders = {};
                        h.forEach((v, k) => clonedHeaders[k] = v);
                    } else {
                        clonedHeaders = Object.assign({}, h);
                    }
                    try {
                        sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                        localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders)); sessionStorage.setItem('mf_session_refreshed', '1');
                    } catch(e){}
                }
            }
            
            let urlStr = (typeof url === 'string' ? url : (url && url.url ? url.url : '') || '');
            if (urlStr && (urlStr.includes('cbo_branch') || urlStr.includes('cbo_member_status') || (urlStr.includes('members') && (urlStr.includes('limit=') || urlStr.includes('ajax') || urlStr.includes('list'))))) {
                clonedUrl = urlStr;
                isCapturing = false;
                try {
                    sessionStorage.setItem('mf_cloned_url', clonedUrl);
                    localStorage.setItem('mf_cloned_url_backup', clonedUrl);
                    
                    let bodyStr = (options && options.body) ? options.body : null;
                    if (bodyStr instanceof FormData) {
                        let p = new URLSearchParams();
                        for (let [k,v] of bodyStr.entries()) p.append(k, v);
                        bodyStr = p.toString();
                    }
                    let template = { url: clonedUrl, method: (options && options.method) ? options.method : 'POST', headers: clonedHeaders, body: bodyStr };
                    sessionStorage.setItem('mf_api_template', JSON.stringify(template));
                } catch(e){}
                document.dispatchEvent(new Event('ApiCaptured'));
            }
            return origFetch.apply(this, arguments);
        };
    }

    // \u09E8. \u09A1\u09BE\u099F\u09BE \u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C\u09AE\u09C7\u09A8\u09CD\u099F (Safe Parsing)
    function getMappings() {
        let aMap = {}, zMap = {};
        try { aMap = JSON.parse(localStorage.getItem('microfin_aMap') || '{}'); } catch(e){}
        try { zMap = JSON.parse(localStorage.getItem('microfin_zMap') || '{}'); } catch(e){}
        return {
            aMap: aMap,
            zMap: zMap,
            role: localStorage.getItem('microfin_role') || 'BRANCH',
            entityName: localStorage.getItem('microfin_entity_name') || ''
        };
    }

    // \u09E9. API \u099F\u09C7\u09AE\u09AA\u09CD\u09B2\u09C7\u099F \u09B8\u0982\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09BE (Background Iframe)
    async function ensureApiAndBranchList() {
        if ((sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup')) && sessionStorage.getItem('mf_session_refreshed')) { return; }

        try {
            let vuexStr = localStorage.getItem('vuex');
            if (vuexStr) {
                let v = JSON.parse(vuexStr);
                let extractedId = '';
                if (v.auth && v.auth.user && v.auth.user.branch_id) extractedId = String(v.auth.user.branch_id);
                else if (v.auth && v.auth.user && v.auth.user.branchId) extractedId = String(v.auth.user.branchId);
                else if (v.auth && v.auth.token) {
                    let payloadStr = atob(v.auth.token.split('.')[1]);
                    let payload = JSON.parse(payloadStr);
                    if (payload.branch_id) extractedId = String(payload.branch_id);
                    else if (payload.branchId) extractedId = String(payload.branchId);
                    else if (payload.branch) extractedId = String(payload.branch);
                }
                if (extractedId && extractedId !== 'SELF' && extractedId !== '0') {
                    sessionStorage.setItem('mf_real_branch_id_iframe', extractedId);
                    // Do NOT return immediately if we haven't captured headers OR haven't refreshed session
                    if ((sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup')) && sessionStorage.getItem('mf_session_refreshed')) {
                        return extractedId;
                    }
                }
            }
        } catch(e) {}

    return new Promise((resolve) => {
            isCapturing = true;
            let ifr = document.createElement('iframe');
            ifr.allow = "geolocation 'none'";
            ifr.style.cssText = 'position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; z-index:-1;';
            ifr.src = window.location.origin + window.location.pathname.replace('/#/', '/').replace('/#', '/') + '#/members/members/index';
            document.body.appendChild(ifr);

            let timer = setTimeout(() => {
                isCapturing = false;
                if(ifr.parentNode) ifr.remove();
                sessionStorage.setItem('mf_session_refreshed', '1'); resolve(); }, 25000);

            ifr.onload = () => {
                setTimeout(async () => {
                    try {
                        let doc = ifr.contentDocument || ifr.contentWindow.document;
                        let win = ifr.contentWindow;

                        if (win && win.fetch) {
                            const origFetch = win.fetch;
                            win.fetch = async function(resource, options) {
                                let method = (options && options.method) ? options.method : 'GET';
                                let url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
                                let h = (options && options.headers) ? options.headers : {};
                                if (url && (url.includes('cbo_branch') || url.includes('cbo_member_status') || (url.includes('members') && (url.includes('limit=') || url.includes('ajax') || url.includes('list'))))) {
                                    clonedUrl = url; sessionStorage.setItem('mf_cloned_url', clonedUrl);
                                    
                                    let hd = {};
                                    if (h instanceof Headers) {
                                        h.forEach((v, k) => hd[k] = v);
                                    } else {
                                        hd = JSON.parse(JSON.stringify(h));
                                    }
                                    try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { hd['Authorization'] = 'Bearer ' + v.auth.token; hd['Isme-Token'] = v.auth.token; } } catch(e) {}
                                    
                                    clonedHeaders = hd;
                                    sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                                    clearTimeout(timer); isCapturing = false; if (document.body.contains(ifr)) ifr.remove(); resolve(clonedUrl);
                                }
                                return origFetch.apply(this, arguments);
                            };
                        }

                        if (win && win.XMLHttpRequest) {
                            const ifrOpen = win.XMLHttpRequest.prototype.open;
                            const ifrSend = win.XMLHttpRequest.prototype.send;
                            const ifrSetHeader = win.XMLHttpRequest.prototype.setRequestHeader;

                            win.XMLHttpRequest.prototype.open = function(m, u) { 
                                this._url = u; 
                                this._method = m; 
                                this._headers = {}; 
                                ifrOpen.apply(this, arguments); 
                            };
                            
                            win.XMLHttpRequest.prototype.setRequestHeader = function(k, v) { 
                                this._headers[k] = v; 
                                ifrSetHeader.apply(this, arguments); 
                            };
                            
                            win.XMLHttpRequest.prototype.send = function(body) {
                                if (this._url && this._url.includes('/core-service/index.php/')) {
                                    clonedUrl = this._url; 
                                    clonedHeaders = Object.assign({}, this._headers); 
                                    try {
                                        sessionStorage.setItem('mf_cloned_url', clonedUrl);
                                        localStorage.setItem('mf_cloned_url_backup', clonedUrl);
                                        sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                                        localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders)); 
                                        sessionStorage.setItem('mf_session_refreshed', '1');
                                    } catch(e){}
                                    
                                    if (this._headers && (this._headers['Authorization'] || this._headers['authorization'])) {
                                        clearTimeout(timer); isCapturing = false; if (document.body.contains(ifr)) ifr.remove(); resolve(clonedUrl);
                                    }
                                }
                                ifrSend.apply(this, arguments);
                            };
                        }

                        let filterBtn = doc.querySelector('.filter-btn') || doc.querySelector('.fa-filter') || doc.querySelector('[title="Filter"]');
                        if (filterBtn) filterBtn.click();

                        let tryClick = setInterval(() => {
                            if (sessionStorage.getItem('mf_cloned_url')) {
                                clearInterval(tryClick);
                                return;
                            }
                            let btn = doc.getElementById('custom-search-btn') || Array.from(doc.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim().includes('Search')) || doc.querySelector('button[type="submit"]');
                            if (btn) {
                                btn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                btn.click();
                            }
                        }, 300);
                        
                        setTimeout(() => clearInterval(tryClick), 10000); // Stop clicking after 10s

                        clearTimeout(timer);
                        isCapturing = false;
                        if(ifr.parentNode) ifr.remove();
                        resolve();
                    } catch(e) {
                        clearTimeout(timer);
                        isCapturing = false;
                        if(ifr.parentNode) ifr.remove();
                        resolve();
                    }
                }, 1500);
            };
        });
    }

    // \u09EA. API \u09A1\u09C7\u099F\u09BE \u09AB\u09C7\u099A\u09BE\u09B0 (High Speed - Main Window Execution)
    async function fetchMemberCount(branchId, nidStatus) {
        try {
            let h = JSON.parse(sessionStorage.getItem('mf_main_stolen_headers') || sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup') || '{}');
            if (!h['Authorization'] && !h['authorization']) { 
                try { let v = JSON.parse(localStorage.getItem('vuex')); if (v && v.auth && v.auth.token) { h['Authorization'] = 'Bearer ' + v.auth.token; } } catch(e) {} 
            }
            h['Site-Name'] = window.location.pathname.split('/')[1] || 'dsk';
            h['x-tenant-geo'] = 'bd';
            h['X-Requested-With'] = 'XMLHttpRequest';
            h['Accept'] = 'application/json, text/javascript, */*; q=0.01';
            
            try {
                let preUrl = window.location.origin + '/core-service/index.php/samities/index?limit=20&offset=0&isSearch=0';
                await fetch(preUrl, { method: 'GET', headers: h, credentials: 'include' });
            } catch(e) {}

            let safeBId = branchId;
            if (safeBId === 'SELF' || !safeBId) {
                let v = JSON.parse(localStorage.getItem('vuex') || '{}');
                function findId(obj) { if(!obj || typeof obj!=='object') return null; if(obj.branch_id) return obj.branch_id; for(let k in obj) { let r=findId(obj[k]); if(r) return r; } return null; }
                safeBId = findId(v) || '';
            }

            let url = window.location.origin + '/core-service/index.php/members/index?limit=1&offset=0&cbo_branch=' + safeBId + '&cbo_nid_status=' + nidStatus + '&cbo_member_status=A';
            let r = await fetch(url, { method: 'GET', headers: h });
            if (!r.ok) return 0;
            let d = await r.json();
            return d.total !== undefined ? d.total : (d.total_rows !== undefined ? d.total_rows : (d.recordsTotal !== undefined ? d.recordsTotal : (d.count !== undefined ? d.count : 0)));
        } catch (e) {
            console.error('fetchMemberCount Error:', e);
            return 0;
        }
    }

    // \u09A1\u09CD\u09AF\u09BE\u09B6\u09AC\u09CB\u09B0\u09CD\u09A1\u09C7 \u09AD\u09BE\u09B8\u09AE\u09BE\u09A8 \u09AC\u09BE\u099F\u09A8
    function injectToggleBtn() {
        if (document.getElementById('member-report-toggle-btn')) return;
        
        let container = document.createElement('div');
        container.id = 'member-report-toggle-btn';
        container.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background: linear-gradient(135deg, #8e44ad 0%, rgba(0,0,0,0.4) 150%); color:white; border-radius:50px; padding:5px 12px; font-weight:bold; font-size:11px; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-family: DSK_MixedFont, sans-serif; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:pointer; width: max-content; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(5px);';
        container.onmouseover = () => { container.style.transform = 'scale(1.05) translateX(-4px)'; container.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)'; };
        container.onmouseout = () => { container.style.transform = 'scale(1) translateX(0)'; container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'; };
        
        let textSpan = document.createElement('span');
        textSpan.innerText = '\u{1F465} Member CIB Verification';
        textSpan.style.cssText = 'margin-right:8px; pointer-events:none;';

        container.onclick = () => injectUI();

        let closeBtn = document.createElement('button');
        closeBtn.innerText = '\u2715';
        closeBtn.title = '\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.25); color:white; border:none; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; outline:none; transition:0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.25)';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            isToggleClosed = true;
            container.remove();
            let p = document.getElementById('auto-report-panel');
            if(p) p.remove();
        };

        container.appendChild(textSpan);
        // container.appendChild(closeBtn);
        window.getMasterFabContainer().appendChild(container);
    }

    // \u09EB. \u09AA\u09CD\u09AF\u09BE\u09A8\u09C7\u09B2 \u0987\u09A8\u099C\u09C7\u099C\u09B6\u09A8 \u0993 \u099F\u09CD\u09B0\u09BF \u09B0\u09C7\u09A8\u09CD\u09A1\u09BE\u09B0\u09BF\u0982 \u0987\u099E\u09CD\u099C\u09BF\u09A8
    function injectUI() {
        try {
            if (document.getElementById('auto-report-panel')) return;
            
            const maps = getMappings();
            const syncStatus = localStorage.getItem('microfin_sync_status');
            const isReady = syncStatus === 'DONE';

            const panel = document.createElement('div');
            panel.id = 'auto-report-panel';
            panel.style.cssText = 'position: fixed; top: 5px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #8e44ad; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 97vw; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; font-family: DSK_MixedFont, sans-serif; z-index: 999999; overflow: hidden;';

            let filterHtml = '';
            if (isReady) {
                let zones = [...new Set(Object.values(maps.zMap))].filter(Boolean).sort();
                let areas = [...new Set(Object.values(maps.aMap))].filter(Boolean).sort();
                
                let levelOptions = `<option value="1">\u09B6\u09BE\u0996\u09BE</option>`;
                if (maps.role === 'HO' || maps.role === 'ZONE') {
                    if (areas.length > 0) levelOptions += `<option value="2">\u0985\u099E\u09CD\u099A\u09B2</option>`;
                }
                
                if (maps.role === 'HO') {
                    if (zones.length > 0) levelOptions += `<option value="3" selected>\u099C\u09CB\u09A8</option>`;
                    else if (areas.length > 0) levelOptions = levelOptions.replace('value="2"', 'value="2" selected');
                    else levelOptions = levelOptions.replace('value="1"', 'value="1" selected');
                } else if (maps.role === 'ZONE') {
                    if (areas.length > 0) levelOptions = levelOptions.replace('value="2"', 'value="2" selected');
                    else levelOptions = levelOptions.replace('value="1"', 'value="1" selected');
                } else {
                    levelOptions = levelOptions.replace('value="1"', 'value="1" selected');
                }

                filterHtml = `
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; align-items:center;">
                        <div style="flex:1; min-width:130px; display:flex; align-items:center; gap:4px;">
                            <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09B2\u09C7\u09AD\u09C7\u09B2:</label>
                            <select id="mv-level-selection" style="flex:1; width:100%; padding:0 4px; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; height:24px; box-sizing:border-box; margin:0;">
                                ${levelOptions}
                            </select>
                        </div>
                        <div style="flex:1.5; min-width:130px; display:flex; align-items:center; gap:4px;">
                            <label style="font-size:12px; font-weight:bold; color:#34495e; white-space:nowrap; margin:0; padding:0; line-height:24px; display:flex; align-items:center;">\u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8:</label>
                            <select id="filter-selection" style="flex:1; width:100%; padding:0 4px; border:1px solid #bdc3c7; border-radius:3px; font-size:12px; height:24px; box-sizing:border-box; margin:0;">
                            </select>
                        </div>
                    </div>
                `;
            }

            panel.innerHTML = `
                <div id="mem-report-header" style="background:#8e44ad; color:white; padding:4px 8px; cursor:move; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; overflow:hidden;">
                        <strong style="font-size:11.5px; pointer-events:none; white-space:nowrap;">\u{1F465} Member CIB Verification</strong>
                        <span id="status-text" style="font-size:11.5px; font-weight:bold; color:#f1c40f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                        <button id="export-btn" style="display:none; background:#27ae60; color:white; border:none; padding:4px 8px; font-size:11px; cursor:pointer; border-radius:3px; font-weight:bold; transition:0.2s;">\u{1F4E5} Excel</button>
                        <button id="resync-btn" style="background:#f39c12; color:white; border:none; padding:4px 8px; font-size:11px; cursor:pointer; border-radius:3px; font-weight:bold;">\u{1F504} Resync</button>
                        <button id="close-panel-btn" title="\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 25px; height: 25px; border-radius: 50%; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(255, 65, 108, 0.45); transition: 0.2s;">\u2715</button>
                    </div>
                </div>
                <div style="padding:10px; overflow-y:auto; flex:1; display:flex; flex-direction:column;">
                    ${filterHtml}
                    <button id="gen-btn" style="width:100%; height:30px; display:flex; align-items:center; justify-content:center; gap:6px; background:${isReady ? '#8e44ad' : '#ccc'}; color:white; border:none; cursor:${isReady ? 'pointer' : 'not-allowed'}; font-weight:bold; border-radius:3px; font-size:13px; flex-shrink:0; transition:0.2s;" ${!isReady ? 'disabled' : ''}>\u{1F680} Generate Tree Report</button>
                    <div id="table-container" style="overflow-y:auto; margin-top:8px; flex:1; max-height:55vh;"></div>
                </div>
            `;
            document.body.appendChild(panel);

            let mvLevel = document.getElementById('mv-level-selection');
            let mvFilter = document.getElementById('filter-selection');
            if (mvLevel && mvFilter && isReady) {
                let zones = [...new Set(Object.values(maps.zMap))].filter(Boolean).sort();
                let areas = [...new Set(Object.values(maps.aMap))].filter(Boolean).sort();
                let bList = JSON.parse(localStorage.getItem('microfin_branch_list') || '[]');
                
                mvLevel.onchange = () => {
                    let val = mvLevel.value;
                    if (val === '3') {
                        mvFilter.innerHTML = '<option value="ALL">\u{1F310} All Zones</option>' + zones.map(z => `<option value="${z}">${z}</option>`).join('');
                    } else if (val === '2') {
                        mvFilter.innerHTML = '<option value="ALL">\u{1F310} All Areas</option>' + areas.map(a => `<option value="${a}">${a}</option>`).join('');
                    } else if (val === '1') {
                        mvFilter.innerHTML = '<option value="ALL">\u{1F310} All Branches</option>' + bList.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                    }
                };
                mvLevel.onchange(); 
            }

            // \u{1F31F} Make header draggable
            let isDraggingMem = false, initialXMem, initialYMem;
            const memHeader = document.getElementById('mem-report-header');
            if (memHeader) {
                memHeader.addEventListener('mousedown', (e) => {
                    if (e.target.id === 'resync-btn' || e.target.id === 'close-panel-btn') return;
                    let rect = panel.getBoundingClientRect();
                    initialXMem = e.clientX - rect.left;
                    initialYMem = e.clientY - rect.top;
                    isDraggingMem = true;
                });
                document.addEventListener('mouseup', () => { isDraggingMem = false; });
                document.addEventListener('mousemove', (e) => {
                    if (isDraggingMem) {
                        e.preventDefault();
                        panel.style.left = (e.clientX - initialXMem) + 'px';
                        panel.style.top = (e.clientY - initialYMem) + 'px';
                        panel.style.transform = 'none'; 
                    }
                });
            }

            document.getElementById('resync-btn').onclick = () => {
                isSyncing = true;
                panel.remove();
                document.querySelectorAll('.blockUI, .modal-backdrop, .blockOverlay, .sweet-overlay').forEach(el => el.remove());
                sessionStorage.removeItem('mf_global_hierarchy_synced');
                sessionStorage.removeItem('mf_auto_synced');
                sessionStorage.removeItem('mf_cloned_url');
                    sessionStorage.removeItem('mf_api_template');
                    sessionStorage.removeItem('mf_cloned_headers');
                    localStorage.removeItem('mf_cloned_headers_backup');
                sessionStorage.removeItem('mf_user_type');
                sessionStorage.removeItem('mf_api_template');
                localStorage.removeItem('microfin_zMap');
                localStorage.removeItem('microfin_aMap');
                localStorage.removeItem('microfin_role');
                localStorage.removeItem('microfin_branch_list');
                localStorage.removeItem('microfin_sync_status');
                localStorage.removeItem('mf_cloned_url_backup');
                if (typeof window.performZeroTouchSync === 'function') window.performZeroTouchSync(true);
            };

            document.getElementById('close-panel-btn').onclick = () => {
                panel.remove();
            };

            if(isReady) {
                const renderTable = function(report) {
                    const { maps, rawBranches, fetchedCounts } = report;
                    let now = new Date();
                    let dtString = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    let html = `<table id="reportTable" border="1" style="width:100%; border-collapse:collapse; font-size:${window.currentCheckerType === 'DAILY_TRANSACTION' ? '9px' : '10px'}; line-height:1.2; font-family: DSK_MixedFont, sans-serif;">
                        <tr style="background:#e8f4f8; color:#2980b9;">
                            <td colspan="5" style="padding:6px; font-size:12px; text-align:center; font-weight:bold;">
                                \u{1F552} Report Generated On: ${dtString}
                            </td>
                        </tr>
                        <tr style="background:#2c3e50; color:white; font-size:11px;">
                            <th style="padding:2px; text-align:left; white-space:normal;">Hierarchy & Branch</th>
                            <th style="padding:2px; text-align:center; white-space:normal;">Active Member</th>
                            <th style="padding:2px; text-align:center; white-space:normal;">Verified Active Member</th>
                            <th style="padding:2px; text-align:center; white-space:normal;">Wrong NID</th>
                            <th style="padding:2px; text-align:center; white-space:normal;">Verified %</th>
                        </tr>`;

                    let uniqueZones = new Set(rawBranches.map(b => b.zone));
                    let uniqueAreas = new Set(rawBranches.map(b => b.area));
                    let currentRole = maps.role;
                    
                    if (rawBranches.length === 1) {
                        currentRole = 'BRANCH';
                    } else if (currentRole === 'HO') {
                        if (uniqueZones.size === 1 && uniqueAreas.size === 1) currentRole = 'AREA';
                        else if (uniqueZones.size === 1) currentRole = 'ZONE';
                    } else if (currentRole === 'ZONE') {
                        if (uniqueAreas.size === 1) currentRole = 'AREA';
                    }

                    if (currentRole === 'HO') {
                        let tree = {};
                        rawBranches.forEach(b => {
                            if(!tree[b.zone]) tree[b.zone] = {};
                            if(!tree[b.zone][b.area]) tree[b.zone][b.area] = [];
                            tree[b.zone][b.area].push(b);
                        });
                        
                        let totalHOActive = 0, totalHOVerified = 0, totalHOWrong = 0;
                        
                        for (let z in tree) {
                            html += `<tr style="background:#0277bd; color:white;"><td colspan="5" style="padding:4px;"><b>\u{1F3E2} Zone: ${z}</b></td></tr>`;
                            let zoneActive = 0, zoneVerified = 0, zoneWrong = 0;
                            
                            for (let a in tree[z]) {
                                html += `<tr style="background:#e1f5fe; color:#01579b;"><td colspan="5" style="padding:4px;">&nbsp;&nbsp;<b>\u{1F4CD} Area: ${a}</b></td></tr>`;
                                let areaActive = 0, areaVerified = 0, areaWrong = 0;
                                
                                for (let b of tree[z][a]) {
                                    let active = fetchedCounts[b.id].active;
                                    let verified = fetchedCounts[b.id].verified;
                                      let wrong = fetchedCounts[b.id].wrong || 0;
                                    let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                                    
                                    areaActive += active;
                                    areaVerified += verified;
                                      areaWrong += wrong;
                                    
                                    html += `<tr style="background:#fff;"><td style="padding:4px; word-break:break-word;">&nbsp;&nbsp;&nbsp;&nbsp;\u{1F3F7}\uFE0F ${b.name}</td><td style="text-align:center; padding:4px;">${active}</td><td style="text-align:center; padding:4px;">${verified}</td><td style="text-align:center; color:#c0392b; padding:4px;">${wrong}</td><td style="text-align:center; padding:4px;"><b>${perc}%</b></td></tr>`;
                                }
                                let areaPerc = areaActive > 0 ? Math.round((areaVerified / areaActive) * 100) : 0;
                                html += `<tr style="background:#fff2e6; font-weight:bold;"><td style="text-align:left; padding:4px; word-break:break-word;">&nbsp;&nbsp;\u{1F4CA} Total Area (${a})</td><td style="text-align:center; padding:4px;">${areaActive}</td><td style="text-align:center; padding:4px;">${areaVerified}</td><td style="text-align:center; color:#c0392b; padding:4px;">${areaWrong}</td><td style="text-align:center; color:#d35400; padding:4px;">${areaPerc}%</td></tr>`;
                                
                                zoneActive += areaActive;
                                zoneVerified += areaVerified;
                                  zoneWrong += areaWrong;
                            }
                            let zonePerc = zoneActive > 0 ? Math.round((zoneVerified / zoneActive) * 100) : 0;
                            html += `<tr style="background:#e6f4ea; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">\u{1F4CA} Total Zone (${z})</td><td style="text-align:center; padding:2px;">${zoneActive}</td><td style="text-align:center; padding:2px;">${zoneVerified}</td><td style="text-align:center; color:#c0392b; padding:2px;">${zoneWrong}</td><td style="text-align:center; color:green; padding:2px;">${zonePerc}%</td></tr>`;
                            
                            totalHOActive += zoneActive;
                            totalHOVerified += zoneVerified;
                              totalHOWrong += zoneWrong;
                        }
                        
                        if (Object.keys(tree).length > 1) {
                            let hoPerc = totalHOActive > 0 ? Math.round((totalHOVerified / totalHOActive) * 100) : 0;
                            html += `<tr style="background:#e1f5fe; color:#01579b; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">\u{1F4CA} Grand Total</td><td style="text-align:center; padding:2px;">${totalHOActive}</td><td style="text-align:center; padding:2px;">${totalHOVerified}</td><td style="text-align:center; color:#c0392b; padding:2px;">${totalHOWrong}</td><td style="text-align:center; color:#0277bd; padding:2px;">${hoPerc}%</td></tr>`;
                        }
                    } 
                    else if (currentRole === 'ZONE') {
                        let tree = {};
                        rawBranches.forEach(b => {
                            if(!tree[b.area]) tree[b.area] = [];
                            tree[b.area].push(b);
                        });
                        let grandActive = 0, grandVerified = 0, grandWrong = 0;
                        for (let a in tree) {
                            html += `<tr style="background:#0277bd; color:white;"><td colspan="5" style="padding:4px;"><b>\u{1F4CD} Area: ${a}</b></td></tr>`;
                            let areaActive = 0, areaVerified = 0, areaWrong = 0;
                            
                            for (let b of tree[a]) {
                                let active = fetchedCounts[b.id].active;
                                let verified = fetchedCounts[b.id].verified;
                                      let wrong = fetchedCounts[b.id].wrong || 0;
                                let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                                
                                areaActive += active;
                                areaVerified += verified;
                                      areaWrong += wrong;
                                
                                html += `<tr style="background:#fff; font-size:11px;"><td style="padding:2px; white-space:nowrap;">&nbsp;&nbsp;\u{1F3F7}\uFE0F ${b.name}</td><td style="text-align:center; padding:2px;">${active}</td><td style="text-align:center; padding:2px;">${verified}</td><td style="text-align:center; color:#c0392b; padding:2px;">${wrong}</td><td style="text-align:center; padding:2px;"><b>${perc}%</b></td></tr>`;
                            }
                            let areaPerc = areaActive > 0 ? Math.round((areaVerified / areaActive) * 100) : 0;
                            html += `<tr style="background:#fff2e6; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">\u{1F4CA} Total Area (${a})</td><td style="text-align:center; padding:2px;">${areaActive}</td><td style="text-align:center; padding:2px;">${areaVerified}</td><td style="text-align:center; color:#c0392b; padding:2px;">${areaWrong}</td><td style="text-align:center; color:#d35400; padding:2px;">${areaPerc}%</td></tr>`;
                            
                            grandActive += areaActive;
                            grandVerified += areaVerified;
                              grandWrong += areaWrong;
                        }
                        if (Object.keys(tree).length > 1) {
                            let grandPerc = grandActive > 0 ? Math.round((grandVerified / grandActive) * 100) : 0;
                            let totalLabel = "\u{1F4CA} Grand Total";
                            if (uniqueZones.size === 1 && rawBranches[0].zone && rawBranches[0].zone !== 'Unknown Zone' && rawBranches[0].zone !== 'Branch') {
                                totalLabel = `\u{1F4CA} Total Zone (${rawBranches[0].zone})`;
                            } else if (maps.entityName) {
                                totalLabel = `\u{1F4CA} Grand Total (${maps.entityName})`;
                            }
                            html += `<tr style="background:#e6f4ea; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">${totalLabel}</td><td style="text-align:center; padding:2px;">${grandActive}</td><td style="text-align:center; padding:2px;">${grandVerified}</td><td style="text-align:center; color:#c0392b; padding:2px;">${grandWrong}</td><td style="text-align:center; color:green; padding:2px;">${grandPerc}%</td></tr>`;
                        }
                    } 
                    else { 
                        let grandActive = 0, grandVerified = 0, grandWrong = 0;
                        
                        for (let b of rawBranches) {
                            let active = fetchedCounts[b.id].active;
                            let verified = fetchedCounts[b.id].verified;
                                      let wrong = fetchedCounts[b.id].wrong || 0;
                            let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                            
                            grandActive += active;
                            grandVerified += verified;
                              grandWrong += wrong;
                            
                            html += `<tr style="background:#fff; font-size:11px;"><td style="padding:2px; white-space:nowrap;"><span style="font-weight:bold; color:#2c3e50;">\u{1F3F7}\uFE0F ${b.name}</span></td><td style="text-align:center; padding:2px;">${active}</td><td style="text-align:center; padding:2px;">${verified}</td><td style="text-align:center; color:#c0392b; padding:2px;">${wrong}</td><td style="text-align:center; padding:2px;"><b>${perc}%</b></td></tr>`;
                        }
                        if (rawBranches.length > 1) {
                            let grandPerc = grandActive > 0 ? Math.round((grandVerified / grandActive) * 100) : 0;
                            let totalLabel = "\u{1F4CA} Grand Total";
                            if (uniqueAreas.size === 1 && rawBranches[0].area && rawBranches[0].area !== 'Unknown Area' && rawBranches[0].area !== 'Branch') {
                                totalLabel = `\u{1F4CA} Total Area (${rawBranches[0].area})`;
                            } else if (maps.entityName) {
                                totalLabel = `\u{1F4CA} Grand Total (${maps.entityName})`;
                            } 
                            html += `<tr style="background:#e1f5fe; color:#01579b; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">${totalLabel}</td><td style="text-align:center; padding:2px;">${grandActive}</td><td style="text-align:center; padding:2px;">${grandVerified}</td><td style="text-align:center; color:#c0392b; padding:2px;">${grandWrong}</td><td style="text-align:center; color:#0277bd; padding:2px;">${grandPerc}%</td></tr>`;
                        }
                    }
                    html += `</table>`;
                    document.getElementById('table-container').innerHTML = html;
                };

                document.getElementById('gen-btn').onclick = async () => {
                    const btn = document.getElementById('gen-btn');
                    const status = document.getElementById('status-text');
                    const filterEl = document.getElementById('filter-selection');
                    const selectedVal = filterEl ? filterEl.value : 'ALL';

                    btn.disabled = true;
                    status.innerText = "Processing configuration...";
                    document.getElementById('table-container').innerHTML = ''; 
                    document.getElementById('export-btn').style.display = 'none';

                    // Ensure basic hierarchy is synced
                    await new Promise(resolve => window.runGlobalHierarchySync(false, resolve));

                    let savedBListStr = localStorage.getItem('microfin_branch_list');
                    let rawBranches = [];
                    if (savedBListStr && JSON.parse(savedBListStr).length > 0) {
                        let bList = JSON.parse(savedBListStr);
                        rawBranches = bList.map(o => {
                            return {
                                id: o.id, 
                                name: o.name, 
                                area: maps.aMap[o.id] || o.area || 'Assigned Area', 
                                zone: maps.zMap[o.id] || o.zone || 'Assigned Zone'
                            };
                        });
                    } else {
                        let singleId = '';
                        let cbo = document.querySelector('select[name="cbo_branch"]');
                        if (cbo && cbo.value && cbo.value !== '-1' && cbo.value !== '') {
                            singleId = cbo.value;
                        } else {
                            let bData = JSON.parse(sessionStorage.getItem('mf_user_branch') || '{}');
                            if (bData.id) singleId = bData.id;
                        }
                        rawBranches = [{ id: singleId, name: localStorage.getItem('microfin_entity_name') || "My Branch", area: 'Branch', zone: 'Branch' }];
                    }

                    if(selectedVal !== 'ALL') {
                        let selectedLevel = document.getElementById('mv-level-selection') ? document.getElementById('mv-level-selection').value : '';
                        if (selectedLevel === '3') rawBranches = rawBranches.filter(b => b.zone === selectedVal);
                        else if (selectedLevel === '2') rawBranches = rawBranches.filter(b => b.area === selectedVal);
                        else if (selectedLevel === '1') rawBranches = rawBranches.filter(b => b.id === selectedVal);
                        else {
                            if(maps.role === 'HO') rawBranches = rawBranches.filter(b => b.zone === selectedVal);
                            else if(maps.role === 'ZONE') rawBranches = rawBranches.filter(b => b.area === selectedVal);
                        }
                    }

                    status.innerText = "Checking system readiness...";
                    
                    // We no longer need to check mf_cloned_url or ensureApiAndBranchList because fetchMemberCount is pure API now!
                    /*
                    if (!sessionStorage.getItem('mf_cloned_url') && !localStorage.getItem('mf_cloned_url_backup')) {
                        status.innerText = "Connecting to Data Source (background)...";
                        await ensureApiAndBranchList();
                    }

                    if (!sessionStorage.getItem('mf_cloned_url') && !localStorage.getItem('mf_cloned_url_backup')) {
                        status.innerHTML = '<span style="color:#e74c3c;">Connection failed. Please visit Member > Member List manually once.</span>';
                        setTimeout(() => { if(!status || !status.parentNode) return; status.innerText = "Ready"; btn.disabled = false; }, 6000);
                        return;
                    }
                    */

                    let currentReportStructure = { 
                        maps: maps, 
                        rawBranches: rawBranches, 
                        fetchedCounts: {}
                    };

                    // removed Connecting text
                    
                    let concurrency = 5; 
                    let index = 0;
                    let completed = 0;
                    let totalTasks = rawBranches.length;
                    
                    async function worker() {
                        while (index < totalTasks) {
                            let i = index++;
                            let b = rawBranches[i];
                            
                            let active = await fetchMemberCount(b.id, '');
                            let verified = await fetchMemberCount(b.id, '1');
                            let wrong = await fetchMemberCount(b.id, '2');
                            currentReportStructure.fetchedCounts[b.id] = { active: active, verified: verified, wrong: wrong };
                            
                            completed++;
                            status.innerText = `Fast Scanning (${completed}/${totalTasks})...`;
                        }
                    }
                    
                    let workers = [];
                    for (let w = 0; w < Math.min(concurrency, totalTasks); w++) {
                        workers.push(worker());
                    }
                    await Promise.all(workers);

                    renderTable(currentReportStructure);
                    
                    status.innerText = "\u2705 Report Generated Successfully!";
                    // setTimeout(() => { if(status) status.innerText = ''; }, 2000);
                    document.getElementById('export-btn').style.display = 'block';
                    btn.disabled = false;
                };

                document.getElementById('export-btn').onclick = () => {
                    let table = document.getElementById('reportTable');
                    if (!table) return;
                    
                    let clone = table.cloneNode(true);
                    
                    let newThead = document.createElement('thead');
                    let newTbody = document.createElement('tbody');
                    
                    let rows = Array.from(clone.querySelectorAll('tr'));
                    
                    let allBranches = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
                    let branchMap = {};
                    allBranches.forEach(b => {
                        branchMap[b.name.trim()] = b;
                    });
                    
                    let uniqueZones = [...new Set(allBranches.map(b => b.zone).filter(Boolean))];
                    let uniqueAreas = [...new Set(allBranches.map(b => b.area).filter(Boolean))];
                    let globalZone = uniqueZones.length === 1 ? uniqueZones[0] : '';
                    let globalArea = uniqueAreas.length === 1 ? uniqueAreas[0] : '';
                    
                    let currentZone = globalZone;
                    let currentArea = globalArea;
                    let idx = 1;
                    let totalCols = 8; 

                    rows.forEach((tr) => {
                        let text = tr.innerText || tr.textContent;
                        
                        if (text.includes('Report Generated On')) return; 
                        
                        // Table headers
                        if (text.includes('Hierarchy & Branch')) {
                            // Convert existing headers to have proper background directly on the <th> so Excel renders them
                            tr.querySelectorAll('th').forEach(th => {
                                th.style.backgroundColor = '#2c3e50';
                                th.style.color = 'white';
                                th.style.border = '1px solid black';
                            });
                            tr.insertAdjacentHTML('afterbegin', `<th style="border: 1px solid black; background-color: #2c3e50; color: white; text-align: center;">\u0995\u09CD\u09B0\u09AE\u09BF\u0995</th><th style="border: 1px solid black; background-color: #2c3e50; color: white; text-align: center;">\u099C\u09CB\u09A8</th><th style="border: 1px solid black; background-color: #2c3e50; color: white; text-align: center;">\u0985\u099E\u09CD\u099A\u09B2</th>`);
                            newThead.appendChild(tr);
                            return;
                        }

                        if (text.includes('Zone:')) {
                            currentZone = text.replace(/.*Zone:\s*/, '').trim();
                            return;
                        } else if (text.includes('Area:')) {
                            currentArea = text.replace(/.*Area:\s*/, '').trim();
                            return;
                        }
                        
                        let firstTd = tr.querySelector('td');
                        let cellText = firstTd ? firstTd.innerHTML : '';
                        
                        cellText = cellText.replace(/&nbsp;/g, '').replace(/[^a-zA-Z0-9 \-]/g, '').replace(/<[^>]*>?/gm, '').trim();
                        if (firstTd) firstTd.innerHTML = cellText; 
                        
                        let z = currentZone;
                        let a = currentArea;
                        let serial = '';
                        
                        if (text.includes('Total Area')) {
                            let match = cellText.match(/\(([^)]+)\)/);
                            if (match) a = match[1];
                        } else if (text.includes('Total Zone')) {
                            let match = cellText.match(/\(([^)]+)\)/);
                            if (match) z = match[1];
                            a = ''; 
                        } else if (text.includes('Grand Total')) {
                            z = '';
                            a = '';
                        } else {
                            // Branch row => gets a serial number
                            serial = idx++;
                            let branchObj = branchMap[cellText];
                            if (!branchObj) {
                                let matched = allBranches.find(br => br.name.trim() === cellText || cellText.includes(br.name.trim()) || br.name.trim().includes(cellText));
                                if (matched) branchObj = matched;
                            }
                            if (branchObj) {
                                z = branchObj.zone || z;
                                a = branchObj.area || a;
                                currentZone = z; 
                                currentArea = a; 
                            }
                        }
                        
                        tr.insertAdjacentHTML('afterbegin', `<td style="border: 1px solid black; text-align: center; font-weight: bold;">${serial}</td><td style="border: 1px solid black; text-align: left;">${z}</td><td style="border: 1px solid black; text-align: left;">${a}</td>`);
                        newTbody.appendChild(tr);
                    });

                    clone.innerHTML = '';
                    clone.appendChild(newThead);
                    clone.appendChild(newTbody);

                    clone.querySelectorAll('th, td').forEach(el => {
                        if(!el.style.border) el.style.border = '1px solid black';
                        if (el.tagName.toLowerCase() === 'th') {
                            el.style.fontSize = '12pt';
                        } else {
                            el.style.fontSize = '11pt';
                        }
                    });

                    let dt = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour12: true });
                    
                    let h1 = document.createElement('tr');
                    h1.innerHTML = `<th colspan="${totalCols}" style="font-size: 16pt; color: #2980b9; text-align: center; border: 1px solid black; background-color: #ffffff;">DUSHTHA SHASTHYA KENDRA (DSK)</th>`;
                    let h2 = document.createElement('tr');
                    h2.innerHTML = `<th colspan="${totalCols}" style="font-size: 13pt; color: #34495e; text-align: center; border: 1px solid black; background-color: #ffffff;">Member CIB Verification - Generated On: ${dt}</th>`;
                    newThead.insertBefore(h2, newThead.firstChild);
                    newThead.insertBefore(h1, newThead.firstChild);

                    let htmlContent = `<html><head><meta charset="UTF-8"><style>body, table, th, td { font-family: SutonnyOMJ, sans-serif !important; }</style></head><body style="font-family: SutonnyOMJ, sans-serif;">${clone.outerHTML}</body></html>`;
                    
                    let filterEl = document.getElementById('filter-selection');
                    let name = filterEl && filterEl.value !== 'ALL' ? filterEl.options[filterEl.selectedIndex].text.replace(/\s+/g, '_') : 'All_Branches';
                    let dateSuffix = new Date().toISOString().split('T')[0];
                    let fileName = `Member_Verification_${name}_${dateSuffix}.xls`;

                    htmlContent = htmlContent.replace(/[^\u0980-\u09FFa-zA-Z0-9\s\.,\-\(\)\/\\:;"'=<>&!%#\{\}\[\]_\|\+\*]/g, '');
                    let finalOutput = "\uFEFF" + htmlContent;

                    if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
                        window.AndroidDownloader.saveExcel(finalOutput, fileName);
                    } else {
                        let blob = new Blob([finalOutput], {type: 'application/vnd.ms-excel;charset=utf-8;'});
                        let a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                };

            }
        } catch (e) {
            console.error("UI Injection Error: ", e);
        }
    }

    // \u09EC. \u0985\u099F\u09CB \u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u099F\u09BE\u09B0 (\u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u09B9\u09CB\u09AE\u09AA\u09C7\u099C / \u09A1\u09CD\u09AF\u09BE\u09B6\u09AC\u09CB\u09B0\u09CD\u09A1)
    let hasSyncedThisPageLoad = false;

    setInterval(() => {
        if (window !== window.top) return;
        let isOnDashboard = window.location.hash.includes('dashboard');

        if (isOnDashboard) {
            if (!hasSyncedThisPageLoad) {
                hasSyncedThisPageLoad = true;
                if (localStorage.getItem('microfin_sync_status') !== 'DONE' && typeof window.performZeroTouchSync === 'function') {
                    window.performZeroTouchSync();
                }
            } 
            
            if (!document.getElementById('auto-report-panel') && !document.getElementById('member-report-toggle-btn') && !isToggleClosed) {
                try {
                    injectToggleBtn(); // Floating pill button on Dashboard immediately
                } catch(e) {
                    console.error("Failed to inject UI: ", e);
                }
            }

        } else {
            hasSyncedThisPageLoad = false;
            isToggleClosed = false; 
            let panel = document.getElementById('auto-report-panel');
            if (panel) panel.remove();
            let toggleBtn = document.getElementById('member-report-toggle-btn');
            if (toggleBtn) toggleBtn.remove();
        }
    }, 1000);

    // Force 'Is Round Up' to 'No' on any visible report page automatically
    setInterval(() => {
        let fractionSel = document.querySelector('select[name="cbo_is_fraction_contain"]');
        if (fractionSel && fractionSel.value !== "1") {
            fractionSel.value = "1";
            fractionSel.dispatchEvent(new Event('change', { bubbles: true }));
            fractionSel.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 1500);

    // --- CREATOR CREDITS EASTER EGG ---
    let _secretCode = "";
    document.addEventListener('keydown', (e) => {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
            _secretCode = "";
            return;
        }
        if (!e.key) return;
        _secretCode += e.key;
        if (_secretCode.length > 4) {
            _secretCode = _secretCode.substring(_secretCode.length - 4);
        }
        if (_secretCode === "1994") {
            showCreatorCredits();
            _secretCode = "";
        }
    });

    function showCreatorCredits() {
        if (document.getElementById('microfin-credits-modal')) return;

        let overlay = document.createElement('div');
        overlay.id = 'microfin-credits-modal';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(5px); animation: creditFadeIn 0.5s;';
        
        let card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding:40px; border-radius:20px; text-align:center; color:white; box-shadow:0 15px 35px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); max-width:400px; transform: scale(0.8); animation: creditPopIn 0.5s forwards; font-family: DSK_MixedFont, sans-serif;';
        
        card.innerHTML = `<style>
                @keyframes creditFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes creditPopIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            </style>
            <div style="font-size: 60px; margin-bottom: 20px; text-shadow: 0 5px 15px rgba(0,0,0,0.4);">\u{1F468}\u{200D}\u{1F4BB}</div>
            <h2 style="margin:0 0 15px 0; font-size:18px; color:#f1c40f; text-transform:uppercase; letter-spacing:1px;">\u09B8\u09AB\u099F\u0993\u09AF\u09BC\u09CD\u09AF\u09BE\u09B0 \u09A1\u09BF\u099C\u09BE\u0987\u09A8 \u098F\u09AC\u0982 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4\u0995\u09BE\u09B0\u09C0</h2>
            <h1 style="margin:0 0 10px 0; font-size:32px; font-weight:800; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">\u09AE\u09CB. \u09B0\u09AE\u09BF\u099C \u09B0\u09BE\u099C\u09BE</h1>
            <p style="margin:5px 0; font-size:18px; color:#ecf0f1;">\u09AA\u09A6\u09AC\u09C0\u0983 \u0986\u0987\u099F\u09BF \u0995\u09B0\u09CD\u09AE\u0995\u09B0\u09CD\u09A4\u09BE, \u09A1\u09BF\u098F\u09B8\u0995\u09C7</p>
            <div style="margin-top:25px; background:rgba(0,0,0,0.3); padding:12px 20px; border-radius:10px; display:inline-block; border:1px solid rgba(255,255,255,0.1);">
                <span style="font-size:20px; font-weight:bold; color:#2ecc71;">\u{1F4DE} \u09E6\u09E7\u09ED\u09E6\u09E7\u09E6\u09EB\u09EE\u09EC\u09EB\u09E6</span>
            </div>
            <br>
            <button id="close-credits-btn" style="margin-top:35px; background: linear-gradient(135deg, #e74c3c, #c0392b); border:none; color:white; padding:12px 30px; border-radius:50px; font-weight:bold; cursor:pointer; font-size:15px; box-shadow:0 6px 15px rgba(231,76,60,0.4); transition:0.3s; outline:none;">\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8</button>`;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        let closeBtn = document.getElementById('close-credits-btn');
        closeBtn.onmouseover = () => { closeBtn.style.transform = 'scale(1.05)'; };
        closeBtn.onmouseout = () => { closeBtn.style.transform = 'scale(1)'; };
        closeBtn.onclick = () => {
            overlay.style.opacity = '0';
            overlay.style.transition = '0.4s';
            card.style.transform = 'scale(0.8)';
            card.style.transition = '0.4s';
            setTimeout(() => overlay.remove(), 400);
        };
    }
})();
