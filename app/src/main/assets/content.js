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
// \u{1F514} 0. AUTO UPDATE NOTIFICATION SYSTEM
// ========================================================================
(function checkAppUpdate() {
    const CURRENT_VERSION = "1.4"; // \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u0985\u09CD\u09AF\u09BE\u09AA \u09AD\u09BE\u09B0\u09CD\u09B8\u09A8
    
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
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center; font-family:Arial;';
        
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
        sessionStorage.removeItem('mf_cloned_headers');
        localStorage.removeItem('mf_cloned_url_backup');
        localStorage.removeItem('mf_cloned_headers_backup');

        let toast = document.getElementById('central-sync-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'central-sync-toast';
            toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#f39c12; color:white; padding:8px 12px; z-index:9999999; border-radius:4px; font-weight:bold; font-size:12px; font-family:Arial; box-shadow:0 4px 10px rgba(0,0,0,0.25); transition:all 0.3s ease; display:flex; align-items:center; gap:6px;';
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

                    if (reportLvl && reportLvl.options && reportLvl.options.length > 0) {
                        let hasZone = Array.from(reportLvl.options).some(o => o.value === '3');
                        let hasArea = Array.from(reportLvl.options).some(o => o.value === '2');
                        
                        if (hasZone) uType = 'HO';
                        else if (hasArea) uType = 'ZONE';
                        else uType = 'AREA';

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
                        if (branchSel && branchSel.options && branchSel.options.length > 0) {
                            Array.from(branchSel.options).forEach(opt => {
                                if (opt.value && opt.value !== '-1' && opt.value !== '' && !opt.text.includes('--')) {
                                    myId = opt.value;
                                    myName = opt.text.trim();
                                }
                            });
                        }
                        if (myId === "SELF" || myName === "My Branch") {
                            let bInfo = doc.querySelector('.branch_info');
                            if (bInfo && bInfo.innerText.includes('Branch:')) {
                                let m = bInfo.innerText.match(/Branch:\s*(.*?)\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
                                if (m && m[1]) myName = m[1].trim();
                            }
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
                        toast.innerHTML = `<span>\u2705 \u099C\u09CB\u09A8, \u0985\u099E\u09CD\u099A\u09B2, \u09B6\u09BE\u0996\u09BE \u09B8\u09BF\u0982\u0995 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8! (${branches.length}\u099F\u09BF \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4)</span>`;
                        setTimeout(() => toast.remove(), 2500);
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

    function fetchDatesViaInvisibleFrame(mode, level, targetId, branchesToProcess) {
        return new Promise((resolve) => {
            let iframe = document.createElement('iframe');
            iframe.allow = "geolocation 'none'";
            iframe.style.cssText = 'position:fixed; top:0; left:0; width:1000px; height:800px; opacity:0.001; border:none; z-index:-999; pointer-events:none;';

            let uTypePrep = sessionStorage.getItem('mf_user_type') || localStorage.getItem('mf_user_type') || 'HO';
            let isBranchRolePrep = (uTypePrep === 'BRANCH' || targetId === 'SELF' || (branchesToProcess && branchesToProcess.length === 1 && branchesToProcess[0].id === 'SELF'));
            let targetHash = mode === 'MIS' ? '#/mis/dashboard' : '#/ais/dashboard';
            iframe.src = window.location.origin + window.location.pathname + targetHash;
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => { iframe.remove(); resolve({}); }, 60000);
            let isProcessed = false;

            iframe.onload = () => {
                if(isProcessed) return;

                setTimeout(async () => {
                    try {
                        let doc = iframe.contentDocument || iframe.contentWindow.document;
                        let win = iframe.contentWindow;
                        let uType = sessionStorage.getItem('mf_user_type') || localStorage.getItem('mf_user_type') || 'HO';
                        let isBranchRole = (uType === 'BRANCH' || targetId === 'SELF' || (branchesToProcess && branchesToProcess.length === 1 && branchesToProcess[0].id === 'SELF'));

                        if (!isBranchRole) {
                            for(let i=0; i<5; i++) {
                                let reportLvlDropdown = doc.querySelector('select[name="cbo_report_level"]');
                                let branchDropdown = doc.querySelector('select[name="cbo_branch"]');
                                let searchBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.btn-primary') || doc.querySelector('.btn-success');

                                if (reportLvlDropdown || branchDropdown) {
                                    if (reportLvlDropdown) {
                                        triggerVueChange(reportLvlDropdown, '1', win);
                                        await new Promise(r => setTimeout(r, 800));

                                        if (level === '3' && targetId !== 'ALL') {
                                            let zoneSel = await waitForOptions(doc, 'select[name="cbo_zone"]');
                                            if (zoneSel) { triggerVueChange(zoneSel, targetId, win); await new Promise(r => setTimeout(r, 800)); }
                                        } 
                                        else if (level === '2' && targetId !== 'ALL') {
                                            let areaSel = await waitForOptions(doc, 'select[name="cbo_area"]');
                                            if (areaSel) { triggerVueChange(areaSel, targetId, win); await new Promise(r => setTimeout(r, 800)); }
                                        }
                                    }

                                    if (level === '1' && targetId !== 'ALL') {
                                        let bSel = await waitForOptions(doc, 'select[name="cbo_branch"]');
                                        if (bSel) { triggerVueChange(bSel, targetId, win); await new Promise(r => setTimeout(r, 800)); }
                                    }

                                    if (searchBtn) {
                                        searchBtn.removeAttribute('disabled');
                                        searchBtn.click();
                                        await new Promise(r => setTimeout(r, 1200));
                                    }
                                    break;
                                }
                                await new Promise(r => setTimeout(r, 350));
                            }
                        }

                        async function clickWhenReady(text, isExact = false, maxWaitMs = 15000) {
                            let start = Date.now();
                            return new Promise(resolve => {
                                let timer = setInterval(async () => {
                                    let elements = doc.querySelectorAll('a, button, span, li, div');
                                    let clicked = false;
                                    for (let el of elements) {
                                        let txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                                        if (isExact ? (txt === text) : txt.includes(text)) {
                                            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
                                            el.click();
                                            clicked = true;
                                            await new Promise(r => setTimeout(r, 200));
                                        }
                                    }
                                    if (clicked) {
                                        clearInterval(timer); resolve(true);
                                    }
                                    if (Date.now() - start > maxWaitMs) {
                                        clearInterval(timer); resolve(false);
                                    }
                                }, 400);
                            });
                        }

                        if (mode === 'MIS') {
                            await clickWhenReady('branch performance', false, 15000);
                            await new Promise(r => setTimeout(r, 1000));
                            await clickWhenReady('more...', true, 15000);
                        }
                        else if (mode === 'AIS') {
                            await clickWhenReady('branch status', false, 15000);
                        }

                        let pollCount = 0;
                        let poll = setInterval(() => {
                            pollCount++;
                            if (pollCount > 120) {
                                clearInterval(poll); clearTimeout(timeout);
                                iframe.remove(); resolve({}); return;
                            }

                            let exportContainers = doc.querySelectorAll('#export-data, table');
                            for (let exportContainer of exportContainers) {
                                let rows = exportContainer.querySelectorAll('tbody tr');

                                if (rows.length > 0) {
                                    let bodyText = exportContainer.textContent.toLowerCase();
                                    let foundTarget = false;

                                    if (targetId === 'ALL' || branchesToProcess.length === 0 || isBranchRole) {
                                        foundTarget = true;
                                    } else {
                                        for (let b of branchesToProcess) {
                                            let bCodeMatch = b.name.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                                            let bCode = bCodeMatch ? bCodeMatch[1] : b.name.replace(/[^a-z]/gi, '').toLowerCase();
                                            if (bodyText.includes(bCode)) {
                                                foundTarget = true;
                                                break;
                                            }
                                        }
                                    }

                                    if (foundTarget) {
                                        let dataMap = {};
                                        for(let tr of rows) {
                                            let cells = tr.querySelectorAll('td');
                                            if(cells.length > 2) {
                                                let branchCellStr = cells[1] ? cells[1].textContent.trim().toLowerCase() : "";
                                                let bCodeMatch = branchCellStr.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                                                let bCode = bCodeMatch ? bCodeMatch[1] : branchCellStr.replace(/[^a-z]/g, '');

                                                let match = tr.textContent.match(/\d{1,2}\s+[a-zA-Z]{3},\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4}/g);
                                                if (match && match.length > 0) {
                                                    let finalDate = match[match.length - 1].replace(/\s+/g, ' ');
                                                    dataMap[bCode] = finalDate;
                                                    if (isBranchRole) dataMap['self'] = finalDate;
                                                }
                                            }
                                        }
                                        
                                        if (Object.keys(dataMap).length > 0) {
                                            clearInterval(poll); clearTimeout(timeout);
                                            isProcessed = true;
                                            iframe.remove(); resolve(dataMap);
                                            return;
                                        }
                                    }
                                }
                            }
                        }, 400);

                    } catch(e) {
                        clearTimeout(timeout); iframe.remove(); resolve({});
                    }
                }, 2500);
            };
        });
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
    function initFloatingButton() {
        if (isBdeBtnClosed || document.getElementById('bde-ghost-date-toggle')) return;
        
        let container = document.createElement('div');
        container.id = 'bde-ghost-date-toggle';
        container.style.cssText = 'position:fixed; bottom:118px; right:16px; display:flex; align-items:center; background:#2980b9; color:white; border-radius:50px; padding:8px 14px; font-weight:bold; font-size:13px; box-shadow:0 4px 14px rgba(0,0,0,0.4); z-index:999998; font-family:Arial; transition:all 0.3s ease; cursor:pointer;';
        
        let textSpan = document.createElement('span');
        textSpan.innerText = '\u{1F4C5} Branch Dates';
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
            let p = document.getElementById('bde-ghost-date-panel');
            if(p) p.remove();
        };

        container.onclick = () => openMainPanel();
        container.appendChild(textSpan);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
    }

    function openMainPanel() {
        if (document.getElementById('bde-ghost-date-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'bde-ghost-date-panel';
        panel.style.cssText = 'position: fixed; top: 5px; bottom: 35px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 97vw; max-width: 680px; display:flex; flex-direction:column; font-family: Arial; z-index: 999999; overflow: hidden;';

        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="bde-drag-header" style="background:#2c3e50; color:white; padding:7px 12px; display:flex; justify-content:space-between; align-items:center; cursor:move; flex-shrink:0;">
                <strong style="font-size:13px;">\u{1F4C5} Branch Date Extractor</strong>
                <button id="bde-close-date-panel" title="\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(255, 65, 108, 0.45); transition: all 0.2s ease; outline: none; padding: 0;" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 3px 10px rgba(255, 65, 108, 0.7)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 6px rgba(255, 65, 108, 0.45)';" onmousedown="this.style.transform='scale(0.95)';">\u2715</button>
            </div>

            <div style="padding:6px; display:flex; flex-direction:column; flex:1; overflow:hidden;">
                <div style="display:flex; gap:4px; margin-bottom:4px; align-items:flex-end; flex-shrink:0;">
                    <div style="flex:1;">
                        <label style="font-size:10px; font-weight:bold; color:#555;">\u{1F4CD} \u09B2\u09C7\u09AD\u09C7\u09B2:</label>
                        <select id="bde-ui-level" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;"></select>
                    </div>
                    <div style="flex:1.6;">
                        <label style="font-size:10px; font-weight:bold; color:#555;">\u{1F3E2} \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8 \u0995\u09B0\u09C1\u09A8:</label>
                        <select id="bde-ui-target" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;"></select>
                    </div>
                    <div>
                        <button id="bde-sync-btn" style="height:24px; width:28px; background:#bdc3c7; color:#2c3e50; border:none; border-radius:3px; cursor:pointer; font-weight:bold; font-size:12px;" title="\u09B8\u09BF\u0999\u09CD\u0995">\u{1F504}</button>
                    </div>
                </div>

                <button id="bde-start-fetch-btn" style="width:100%; background:#27ae60; color:white; border:none; padding:6px; font-weight:bold; font-size:13px; border-radius:4px; cursor:pointer; margin-bottom:5px; flex-shrink:0;">\u{1F680} Fetch Dates (Auto Engine)</button>
                
                <!-- \u{1F31F} \u09B8\u09CD\u09B2\u09BF\u09AE \u09B8\u09CD\u09AE\u09BE\u09B0\u09CD\u099F \u09E8-\u099F\u09CD\u09AF\u09BE\u09AC (\u09AC\u0995\u09CD\u09B8 \u0993 \u099F\u09CD\u09AF\u09BE\u09AC \u098F\u0995\u09A4\u09CD\u09B0\u09BF\u09A4 \u0995\u09B0\u09BE \u09B9\u09B2\u09CB \u099C\u09BE\u09DF\u0997\u09BE \u09AC\u09BE\u0981\u099A\u09BE\u09A4\u09C7) -->
                <div id="bde-tabs-bar" style="display:flex; gap:6px; margin-bottom:5px; flex-shrink:0;">
                    <button id="bde-tab-all" style="flex:1; background:#2980b9; color:white; border:none; padding:6px; border-radius:4px; font-size:11.5px; font-weight:bold; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.2);">\u{1F3E2} \u09B8\u0995\u09B2 \u09B6\u09BE\u0996\u09BE (<span id="bde-lbl-all">\u09E6</span>)</button>
                    <button id="bde-tab-overdue" style="flex:1; background:#fdedec; color:#c0392b; border:1px solid #e74c3c; padding:6px; border-radius:4px; font-size:11.5px; font-weight:bold; cursor:pointer; box-shadow:0 1px 3px rgba(231,76,60,0.15);">\u26A0\uFE0F \u09AA\u09BF\u099B\u09BF\u09DF\u09C7 \u0986\u099B\u09C7 (<span id="bde-lbl-overdue">\u09E6</span>)</button>
                </div>

                <div id="bde-status-msg" style="font-size:11px; font-weight:bold; color:#d35400; text-align:center; min-height:16px; flex-shrink:0;"></div>
                
                <div id="bde-table-output" style="margin-top:4px; flex:1; overflow-y:auto; border:1px solid #eaeaea; border-radius:4px;"></div>
                
                <button id="bde-export-excel-btn" style="display:none; width:100%; background:#8e44ad; color:white; border:none; padding:6px; margin-top:4px; font-weight:bold; font-size:13px; border-radius:4px; cursor:pointer; flex-shrink:0;">\u{1F4E5} Download Excel</button>
            </div>
        `;

        document.getElementById('bde-close-date-panel').onclick = () => panel.remove();
        makeDraggable(panel, document.getElementById('bde-drag-header'));
        document.getElementById('bde-ui-level').onchange = populateTargets;

        let tabAll = document.getElementById('bde-tab-all');
        let tabOverdue = document.getElementById('bde-tab-overdue');

        function filterTableRows(showOnlyOverdue) {
            if (showOnlyOverdue) {
                tabAll.style.background = '#ecf0f1'; tabAll.style.color = '#7f8c8d'; tabAll.style.border = '1px solid #bdc3c7';
                tabOverdue.style.background = '#e74c3c'; tabOverdue.style.color = 'white'; tabOverdue.style.border = 'none';
            } else {
                tabAll.style.background = '#2980b9'; tabAll.style.color = 'white'; tabAll.style.border = 'none';
                tabOverdue.style.background = '#fdedec'; tabOverdue.style.color = '#c0392b'; tabOverdue.style.border = '1px solid #e74c3c';
            }
            document.querySelectorAll('#bde-table-output tbody[id^="bde-tr-"]').forEach(tbody => {
                let status = tbody.getAttribute('data-status');
                if (showOnlyOverdue) {
                    tbody.style.display = (status === 'overdue') ? '' : 'none';
                } else {
                    tbody.style.display = '';
                }
            });
        }

        if (tabAll && tabOverdue) {
            tabAll.onclick = () => filterTableRows(false);
            tabOverdue.onclick = () => filterTableRows(true);
        }

        document.getElementById('bde-sync-btn').onclick = () => {
            document.getElementById('bde-status-msg').innerText = "\u23F3 \u09A1\u09BE\u099F\u09BE\u09AC\u09C7\u09B8 \u09B8\u09BF\u0999\u09CD\u0995 \u09B9\u099A\u09CD\u099B\u09C7...";
            window.runGlobalHierarchySync(true, (success) => {
                if(success) {
                    document.getElementById('bde-status-msg').innerHTML = "<span style='color:green;'>\u2705 \u09B8\u09BF\u0999\u09CD\u0995 \u09B8\u09AB\u09B2!</span>";
                    updateUIForRole();
                } else {
                    document.getElementById('bde-status-msg').innerHTML = "<span style='color:red;'>\u274C \u09B8\u09BF\u0999\u09CD\u0995 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5!</span>";
                }
            });
        };

        document.getElementById('bde-start-fetch-btn').onclick = startFetchingDates;

        document.getElementById('bde-export-excel-btn').onclick = () => {
            let table = document.querySelector("#bde-table-output table");
            if (!table) return;

            let statusMsg = document.getElementById('bde-status-msg');
            if(statusMsg) statusMsg.innerHTML = "<span style='color:#2980b9;'>\u23F3 Excel \u09AB\u09BE\u0987\u09B2 \u09A4\u09C8\u09B0\u09BF \u09B9\u099A\u09CD\u099B\u09C7...</span>";

            try {
                let allRows = [];
                let overdueRows = [];
                
                table.querySelectorAll('tbody[id^="bde-tr-"]').forEach(tbody => {
                    let tr = tbody.querySelector('tr');
                    if (tr && tr.cells.length >= 5) {
                        let isOverdue = tbody.getAttribute('data-status') === 'overdue';
                        let branch = tr.cells[0].innerText.replace(/[\r\n]+/g, ' ').replace(/\[.*?\]/g, '').trim();
                        let statusText = isOverdue ? "\u{1F534} \u09AA\u09BF\u099B\u09BF\u09DF\u09C7 \u0986\u099B\u09C7" : "\u2705 \u09B8\u09A0\u09BF\u0995";
                        
                        let rowObj = {
                            branch: branch,
                            status: statusText,
                            misDate: tr.cells[1].innerText.trim(),
                            misLag: tr.cells[2].innerText.trim(),
                            aisDate: tr.cells[3].innerText.trim(),
                            aisLag: tr.cells[4].innerText.trim()
                        };

                        allRows.push(rowObj);
                        if (isOverdue) overdueRows.push(rowObj);
                    }
                });

                let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#2C3E50"/>
  </Style>
  <Style ss:ID="H_Branch"><Interior ss:Color="#2C3E50" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="H_Status"><Interior ss:Color="#2C3E50" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="H_MIS"><Interior ss:Color="#2980B9" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="H_AIS"><Interior ss:Color="#27AE60" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  
  <Style ss:ID="R_Normal_L" ss:Parent="Default"><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="R_Normal_C" ss:Parent="Default"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="R_Normal_S" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#27AE60"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>

  <Style ss:ID="R_Delay_L" ss:Parent="Default"><Interior ss:Color="#FFF5F5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="R_Delay_C" ss:Parent="Default"><Interior ss:Color="#FFF5F5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="R_Delay_S" ss:Parent="Default"><Interior ss:Color="#FFF5F5" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#C0392B"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>

  <Style ss:ID="Lag_Red" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#C0392B"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="Lag_Org" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#D35400"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="Lag_Grn" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#27AE60"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
 </Styles>`;

                function buildWorksheet(sheetName, dataRows) {
                    let sXml = ` <Worksheet ss:Name="${sheetName}">\n  <Table>\n   <Column ss:Width="240"/>\n   <Column ss:Width="110"/>\n   <Column ss:Width="95"/>\n   <Column ss:Width="75"/>\n   <Column ss:Width="95"/>\n   <Column ss:Width="75"/>\n   <Row ss:Height="22">\n    <Cell ss:StyleID="H_Branch"><Data ss:Type="String">\u09B6\u09BE\u0996\u09BE\u09B0 \u09A8\u09BE\u09AE</Data></Cell>\n    <Cell ss:StyleID="H_Status"><Data ss:Type="String">\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8</Data></Cell>\n    <Cell ss:StyleID="H_MIS"><Data ss:Type="String">MIS \u09A1\u09C7\u099F</Data></Cell>\n    <Cell ss:StyleID="H_MIS"><Data ss:Type="String">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</Data></Cell>\n    <Cell ss:StyleID="H_AIS"><Data ss:Type="String">AIS \u09A1\u09C7\u099F</Data></Cell>\n    <Cell ss:StyleID="H_AIS"><Data ss:Type="String">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</Data></Cell>\n   </Row>`;

                    dataRows.forEach(r => {
                        let isDelay = r.status.includes("\u09AA\u09BF\u099B\u09BF\u09DF\u09C7") || r.status.includes("\u{1F534}");
                        let cL = isDelay ? "R_Delay_L" : "R_Normal_L";
                        let cC = isDelay ? "R_Delay_C" : "R_Normal_C";
                        let cS = isDelay ? "R_Delay_S" : "R_Normal_S";
                        
                        function getLagStyle(valStr, fallbackStyle) {
                            let v = parseInt(valStr || "0");
                            if (isNaN(v)) return fallbackStyle;
                            if (v > 2) return "Lag_Red";
                            if (v > 0) return "Lag_Org";
                            return "Lag_Grn";
                        }

                        let mStyle = getLagStyle(r.misLag, cC);
                        let aStyle = getLagStyle(r.aisLag, cC);

                        sXml += `\n   <Row ss:Height="18">\n    <Cell ss:StyleID="${cL}"><Data ss:Type="String">${r.branch}</Data></Cell>\n    <Cell ss:StyleID="${cS}"><Data ss:Type="String">${r.status}</Data></Cell>\n    <Cell ss:StyleID="${cC}"><Data ss:Type="String">${r.misDate}</Data></Cell>\n    <Cell ss:StyleID="${mStyle}"><Data ss:Type="String">${r.misLag}</Data></Cell>\n    <Cell ss:StyleID="${cC}"><Data ss:Type="String">${r.aisDate}</Data></Cell>\n    <Cell ss:StyleID="${aStyle}"><Data ss:Type="String">${r.aisLag}</Data></Cell>\n   </Row>`;
                    });

                    sXml += `\n  </Table>\n </Worksheet>`;
                    return sXml;
                }

                xml += buildWorksheet("\u{1F3E2} \u09B8\u0995\u09B2 \u09B6\u09BE\u0996\u09BE", allRows);
                xml += buildWorksheet("\u26A0\uFE0F \u09AA\u09BF\u099B\u09BF\u09DF\u09C7 \u0986\u099B\u09C7", overdueRows);
                xml += `\n</Workbook>`;

                let fileName = `Branch_Dates_${new Date().toISOString().split('T')[0]}.xls`;

                if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
                    window.AndroidDownloader.saveExcel(xml, fileName);
                } else {
                    let blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
                    let url = URL.createObjectURL(blob);
                    let link = document.createElement("a");
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }

                if(statusMsg) statusMsg.innerHTML = "<span style='color:green;'>\u2705 Excel \u09AB\u09BE\u0987\u09B2\u099F\u09BF \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u09B9\u09DF\u09C7\u099B\u09C7!</span>";
            } catch(err) {
                console.error(err);
                if(statusMsg) statusMsg.innerHTML = `<span style='color:red;'>\u274C Excel \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE: ${err.message}</span>`;
            }
        };

        if (sessionStorage.getItem('mf_cached_branches')) {
            updateUIForRole();
        } else {
            document.getElementById('bde-status-msg').innerHTML = "<span style='color:#2980b9;'>\u23F3 \u09B8\u09CD\u0995\u09CD\u09AF\u09BE\u09A8 \u099A\u09B2\u099B\u09C7, \u098F\u0995\u099F\u09C1 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8...</span>";
        }
    }

    function updateUIForRole() {
        let zones = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
        let areas = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
        let levelDropdown = document.getElementById('bde-ui-level');

        levelDropdown.innerHTML = '';
        if (zones.length > 0) levelDropdown.innerHTML += '<option value="3">\u099C\u09CB\u09A8 (Zone)</option>';
        if (areas.length > 0) levelDropdown.innerHTML += '<option value="2">\u0985\u099E\u09CD\u099A\u09B2 (Area)</option>';
        levelDropdown.innerHTML += '<option value="1">\u09B6\u09BE\u0996\u09BE (Branch)</option>';

        populateTargets();
    }

    function populateTargets() {
        let level = document.getElementById('bde-ui-level').value;
        let targetSel = document.getElementById('bde-ui-target');
        targetSel.innerHTML = '<option value="ALL" data-name="ALL">\u{1F680} Select All Branches</option>';

        let data = [];
        if (level === '3') data = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
        else if (level === '2') data = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
        else if (level === '1') data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');

        data.forEach(item => {
            targetSel.innerHTML += `<option value="${item.id}" data-name="${item.name}">${item.name}</option>`;
        });
    }

    async function startFetchingDates() {
        let level = document.getElementById('bde-ui-level').value;
        let targetSel = document.getElementById('bde-ui-target');
        let targetId = targetSel.value;
        let targetName = targetSel.options[targetSel.selectedIndex].getAttribute('data-name');

        let allBranches = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
        let branchesToProcess = [];

        if (targetId === 'ALL') {
            branchesToProcess = allBranches;
        } else {
            if (level === '3') branchesToProcess = allBranches.filter(b => b.zone === targetName);
            else if (level === '2') branchesToProcess = allBranches.filter(b => b.area === targetName);
            else if (level === '1') branchesToProcess = allBranches.filter(b => b.id === targetId);
        }

        if(branchesToProcess.length === 0) {
            alert("\u274C \u0995\u09CB\u09A8\u09CB \u09B6\u09BE\u0996\u09BE \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF! \u09A6\u09AF\u09BC\u09BE \u0995\u09B0\u09C7 \u09A1\u09BE\u09A8\u09A6\u09BF\u0995\u09C7\u09B0 \u{1F504} \u09AC\u09BE\u099F\u09A8\u09C7 \u099A\u09BE\u09AA \u09A6\u09BF\u09DF\u09C7 \u098F\u0995\u09AC\u09BE\u09B0 \u09B8\u09BF\u0999\u09CD\u0995 \u0995\u09B0\u09C7 \u09A8\u09BF\u09A8\u0964");
            return;
        }

        let output = document.getElementById('bde-table-output');
        let startBtn = document.getElementById('bde-start-fetch-btn');
        let exportBtn = document.getElementById('bde-export-excel-btn');
        let statusElement = document.getElementById('bde-status-msg');

        if(startBtn) { startBtn.disabled = true; startBtn.style.background = "#7f8c8d"; }
        if(exportBtn) { exportBtn.style.display = 'none'; }

        let tableHtml = `
            <table style="width:100%; border-collapse:collapse; font-size:10px; text-align:center; table-layout:fixed;">
                <thead style="position: sticky; top: 0; z-index:5;">
                    <tr>
                        <th style="padding:5px 2px; border:1px solid #bdc3c7; background:#2c3e50; color:white; width:46%; text-align:left; padding-left:5px;">\u09B6\u09BE\u0996\u09BE\u09B0 \u09A8\u09BE\u09AE</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#2980b9; color:white; width:18%; white-space:nowrap;">MIS \u09A1\u09C7\u099F</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#2980b9; color:white; width:9%; white-space:nowrap;">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#27ae60; color:white; width:18%; white-space:nowrap;">AIS \u09A1\u09C7\u099F</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#27ae60; color:white; width:9%; white-space:nowrap;">\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC</th>
                    </tr>
                </thead>
        `;

        for(let b of branchesToProcess) {
            let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
            tableHtml += `
                <tbody id="bde-tr-${safeId}" data-status="current">
                    <tr>
                        <td style="text-align:left; padding:4px 3px; border:1px solid #bdc3c7; font-weight:bold; white-space:normal; line-height:1.25; font-size:10px;">${b.name}</td>
                        <td colspan="4" style="padding:3px 2px; border:1px solid #bdc3c7; color:gray; font-size:10px; white-space:nowrap;">\u23F3 \u09AB\u09C7\u099A\u09BF\u0982...</td>
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

            let currentCount = 0;
            let overdueCount = 0;

            for (let b of branchesToProcess) {
                let bCodeMatch = b.name.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                let bCode = bCodeMatch ? bCodeMatch[1] : b.name.replace(/[^a-z]/gi, '').toLowerCase();

                let aisDate = aisDataMap[bCode] || aisDataMap['mybranch'] || aisDataMap['self'] || aisDataMap['default'] || (branchesToProcess.length === 1 ? Object.values(aisDataMap)[0] : null) || "N/A";
                let misDate = misDataMap[bCode] || misDataMap['mybranch'] || misDataMap['self'] || misDataMap['default'] || (branchesToProcess.length === 1 ? Object.values(misDataMap)[0] : null) || "N/A";

                let aisLag = calculateLag(aisDate);
                let misLag = calculateLag(misDate);

                let isOverdue = (typeof misLag === 'number' && misLag > 0) || (typeof aisLag === 'number' && aisLag > 0) || misDate === "N/A" || aisDate === "N/A";
                if (isOverdue) overdueCount++; else currentCount++;

                let aisLagColor = aisLag > 2 ? '#c0392b' : (aisLag > 0 ? '#d35400' : '#27ae60');
                let misLagColor = misLag > 2 ? '#c0392b' : (misLag > 0 ? '#d35400' : '#27ae60');

                let isMismatch = (misDate !== "N/A" && aisDate !== "N/A" && misDate !== aisDate);
                let rowBg = isMismatch ? "background:#fdedec;" : (isOverdue ? "background:#fff5f5;" : "");
                
                let badgeHtml = isOverdue ? `<span style="color:#c0392b; font-weight:bold;">[\u{1F534} \u09AC\u09BF\u09B2\u09AE\u09CD\u09AC] </span>` : `<span style="color:#27ae60; font-weight:bold;">[\u2705] </span>`;
                let cleanName = `${badgeHtml}${b.name}`;

                let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
                
                let trElement = document.getElementById(`bde-tr-${safeId}`);
                if (trElement) {
                    trElement.setAttribute('data-status', isOverdue ? 'overdue' : 'current');
                    trElement.innerHTML = `
                        <tr style="${rowBg}">
                            <td style="text-align:left; padding:4px 3px; border:1px solid #bdc3c7; font-weight:bold; color:#2c3e50; white-space:normal; line-height:1.25; font-size:10px;">${cleanName}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${misDate === 'N/A'?'#e74c3c':'#2980b9'}; font-weight:bold; background:#f4f9f9; font-size:9.5px; white-space:nowrap; overflow:hidden;">${misDate}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${misLagColor}; font-weight:bold; background:#f4f9f9; font-size:10px; white-space:nowrap;">${misLag}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${aisDate === 'N/A'?'#e74c3c':'#27ae60'}; font-weight:bold; background:#f9fbf9; font-size:9.5px; white-space:nowrap; overflow:hidden;">${aisDate}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${aisLagColor}; font-weight:bold; background:#f9fbf9; font-size:10px; white-space:nowrap;">${aisLag}</td>
                        </tr>
                    `;
                }
            }

            // \u{1F31F} Update Slim Tabs Counts
            let tabsBar = document.getElementById('bde-tabs-bar');
            if (tabsBar) {
                tabsBar.style.display = 'flex';
                document.getElementById('bde-lbl-all').innerText = (currentCount + overdueCount);
                document.getElementById('bde-lbl-overdue').innerText = overdueCount;
            }

            if(statusElement) statusElement.innerHTML = `<span style="color:green;">\u2705 \u09B8\u09AC \u09B6\u09BE\u0996\u09BE\u09B0 \u09A1\u09C7\u099F \u0993 Lag \u09B8\u09CD\u0995\u09CD\u09AF\u09BE\u09A8 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8!</span>`;
            
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



    function scrapeViaGhost(hashUrl, targetDate, reportLevel, targetId, type, statusCallback) {
        return new Promise((resolve) => {
            let iframe = document.createElement('iframe');
            iframe.allow = "geolocation 'none'";
            iframe.style.cssText = 'position:fixed; top:0; left:-9999px; width:1200px; height:800px; border:none; z-index:-1;';
            iframe.src = window.location.origin + window.location.pathname + hashUrl;
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => {
                if(document.body.contains(iframe)) iframe.remove();
                resolve(type === 'is' ? { surplusMonth: -999, surplusYear: -999 } : null);
            }, type === 'samity' ? 300000 : 90000); 

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
                            if(reportLvlDropdown) break;
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
                                await new Promise(r => setTimeout(r, 400)); 
                            }
                        }

                        if (type === 'mis') {
                            let samitySel = doc.querySelector('select[name="cbo_samity"]');
                            if (samitySel && samitySel.value !== "-1") {
                                triggerVueChange(samitySel, "-1", win); 
                                await new Promise(r => setTimeout(r, 300));
                            }
                            let scSel = doc.querySelector('select[name="cbo_service_charge"]');
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
                            }, 400);
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
                            }, 1000);
                        } else if (type === 'due_collection') {
                            try {
                                let targetDateFrom = document.getElementById('custom-audit-date-from').value;
                                let targetDateTo = document.getElementById('custom-audit-date').value;
                                
                                let branchSel = doc.querySelector('select[name="cbo_branch"]');
                                if (branchSel && targetId !== 'SELF' && branchSel.value !== targetId) triggerVueChange(branchSel, targetId, win);

                                let dateInputFrom = doc.querySelector('input[name="txt_date_from"]');
                                if (dateInputFrom && dateInputFrom.value !== targetDateFrom) triggerVueChange(dateInputFrom, targetDateFrom, win);

                                let dateInputTo = doc.querySelector('input[name="txt_date_to"]');
                                if (dateInputTo && dateInputTo.value !== targetDateTo) triggerVueChange(dateInputTo, targetDateTo, win);

                                let samitySel = doc.querySelector('select[name="cbo_samity_id"]');
                                if (samitySel && samitySel.value !== "-1") triggerVueChange(samitySel, "-1", win);

                                let prodSel = doc.querySelector('select[name="cbo_product"]');
                                if (prodSel && prodSel.value !== "-1") triggerVueChange(prodSel, "-1", win);

                                let scSel = doc.querySelector('select[name="cbo_service_charge"]');
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
                                            let totalMatured = 0;
                                            let totalOutstanding = 0;
                                            let totalDue = 0;

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
                                                }
                                            }
                                            iframe.remove(); resolve({ totalCurrent, totalMatured, totalOutstanding, totalDue });
                                        } else if (win._reqCompleted && win._activeReqs === 0) {
                                            // Fallback if data was loaded via XMLHttpRequest or HTML instead
                                            let bodyText = (doc.body.textContent || '').toLowerCase();
                                            if (bodyText.includes('due collection') || bodyText.includes('grand total')) {
                                                clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                                alert("DEBUG: Intercept failed or HTML rendered instead of JSON.");
                                                iframe.remove(); resolve({ totalCurrent: 0, totalMatured: 0, totalOutstanding: 0, totalDue: 0 });
                                            }
                                        }
                                    }, 400);
                                }, 1000);
                            } catch (e) {
                                console.error('Due Collection API Error:', e);
                                isProcessed = true; clearTimeout(timeout); iframe.remove();
                                resolve({ totalCurrent: 0, totalMatured: 0, totalOutstanding: 0, totalDue: 0 });
                                return;
                            }
                        } else if (type === 'samity') {
                            try {
                                let savedHd = sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup');
                                let clonedHeaders = {};
                                if (savedHd) clonedHeaders = JSON.parse(savedHd);
                                
                                let cUrl = sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup');
                                let apiBasePath = '/core-service/'; // fallback
                                if (cUrl) {
                                    try {
                                        let urlObj = new URL(cUrl.startsWith('http') ? cUrl : window.location.origin + '/' + cUrl);
                                        let pathParts = urlObj.pathname.split('index.php');
                                        if (pathParts.length > 0) {
                                            apiBasePath = pathParts[0];
                                            if (!apiBasePath.endsWith('/')) apiBasePath += '/';
                                        }
                                    } catch(e){}
                                }
                                
                                let allSamities = [];
                                let offset = 0;
                                let limit = 500;
                                let totalCount = 0;
                                
                                while (true) {
                                    let apiUrl = window.location.origin + apiBasePath + 'index.php/samities/index?limit=' + limit + '&offset=' + offset + '&isSearch=1&cbo_branch=' + (targetId === 'SELF' ? '' : targetId) + '&cbo_status=1&cbo_employee=';
                                    let r = await window.fetch(apiUrl, { method: 'GET', headers: clonedHeaders, credentials: 'include' });
                                    if (!r.ok) throw new Error('HTTP ' + r.status);
                                    let data = await r.json();
                                    
                                    if (data.total) totalCount = parseInt(data.total);
                                    else if (data.recordsTotal) totalCount = parseInt(data.recordsTotal);
                                    
                                    if (data.samities && data.samities.length > 0) {
                                        for (let s of data.samities) {
                                            let code = s.code;
                                            let members = parseInt(s.total_member || '0');
                                            // Prevent duplicates
                                            if (!allSamities.some(x => x.code === code)) {
                                                allSamities.push({ code, members });
                                            }
                                        }
                                        if (data.samities.length < limit) {
                                            break;
                                        }
                                        offset += data.samities.length;
                                    } else {
                                        break;
                                    }
                                }
                                
                                if (totalCount === 0) totalCount = allSamities.length;
                                
                                isProcessed = true; clearTimeout(timeout); iframe.remove();
                                resolve({ totalCount: totalCount, data: allSamities });
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
        container.style.cssText = 'position:fixed; bottom:' + bottomPx + 'px; right:16px; display:flex; align-items:center; background:' + bgColor + '; color:white; border-radius:50px; padding:8px 14px; font-weight:bold; font-size:13px; box-shadow:0 4px 14px rgba(0,0,0,0.4); z-index:999998; font-family:Arial; transition:all 0.3s ease; cursor:pointer;';
        
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
            let p = document.getElementById('ghost-audit-panel');
            if(p) p.remove();
        };

        container.onclick = () => {
            window.currentCheckerType = typeName;
            openMisAisPanel(title);
        };
        container.appendChild(textSpan);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
    }

    function initMisAisToggleBtn() {
        if (!window.location.hash.includes('dashboard')) return;
        createCheckerButton('mis-ais-toggle-btn', '\u{1F680} MIS & AIS Crosschecker', 202, '#2c3e50', 'MIS');
        createCheckerButton('cash-bank-toggle-btn', '\u{1F4B0} Cash-Bank', 244, '#16a085', 'CASH');
        createCheckerButton('equity-toggle-btn', '\u{1F4CA} Equity', 286, '#8e44ad', 'EQUITY');
        createCheckerButton('samity-toggle-btn', '\u{1F465} Samity wise member info.', 328, '#2980b9', 'SAMITY');
        createCheckerButton('due-toggle-btn', '\u{1F4B0} Due collection Summary', 370, '#c0392b', 'DUE_COLLECTION');
    }

    function openMisAisPanel(customTitle) {
        customTitle = customTitle || '\u{1F680} MIS & AIS Checker-DSK_IT';
        if (document.getElementById('ghost-audit-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'ghost-audit-panel';
        panel.style.cssText = 'position: fixed; top: 5px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 98vw; max-width: 750px; font-family: Arial; z-index: 999999; overflow: hidden;';
        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="ghost-header" style="background:#2c3e50; color:white; padding:8px 12px; cursor:move; display:flex; justify-content:space-between; align-items:center;">
                <strong id="panel-title" style="font-size:13px; pointer-events:none; white-space:nowrap;">${customTitle}</strong>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button id="sync-locations-btn" style="background:#f39c12; border:none; color:white; font-size:11px; cursor:pointer; padding:3px 8px; border-radius:3px; font-weight:bold;">\u{1F504} Sync</button>
                    <button id="ghost-close" title="\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(255, 65, 108, 0.45); transition: all 0.2s ease;">\u2715</button>
                </div>
            </div>
            
            <div id="ghost-body" style="padding:6px; overflow-y:auto; max-height: 88vh; display: block;">
                <div style="display:flex; gap:4px; margin-bottom:4px; align-items:flex-end;" id="controls-container">
                </div>
                <button id="start-audit-btn" style="width:100%; background:#27ae60; color:white; border:none; padding:6px; font-weight:bold; font-size:13px; border-radius:3px; cursor:pointer; transition:0.2s;">\u{1F680} Start Audit Process</button>
                <div id="audit-status" style="margin-top:4px; font-size:11px; font-weight:bold; color:#d35400; text-align:center; min-height:15px;"></div>
                <div id="audit-output" style="margin-top:4px;"></div>
                <button id="export-excel-btn" style="display:none; width:100%; background:#8e44ad; color:white; border:none; padding:6px; margin-top:4px; font-weight:bold; font-size:13px; border-radius:3px; cursor:pointer; transition:0.2s;">\u{1F4E5} Download Excel</button>
            </div>
        `;

        document.getElementById('ghost-close').onclick = () => panel.remove();

        function renderUI() {
            let container = document.getElementById('controls-container');
            if (!container) return;
            
            let uType = sessionStorage.getItem('mf_user_type');
            let dateHtml = ``;
            if (window.currentCheckerType === 'DUE_COLLECTION') {
                dateHtml = `
                <div style="flex:1;">
                    <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F4C5} From:</label>
                    <input type="date" id="custom-audit-date-from" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-family:Arial; font-size:10px; height:24px;" value="${getFirstDayOfMonth()}">
                </div>
                <div style="flex:1;">
                    <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F4C5} To:</label>
                    <input type="date" id="custom-audit-date" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-family:Arial; font-size:10px; height:24px;" value="${getToday()}">
                </div>
                `;
            } else {
                dateHtml = `
                <div style="flex:1; display:${window.currentCheckerType === 'SAMITY' ? 'none' : 'block'};">
                    <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F4C5} \u09A4\u09BE\u09B0\u09BF\u0996:</label>
                    <input type="date" id="custom-audit-date" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-family:Arial; cursor:pointer; font-size:11px; height:24px;" value="${getToday()}">
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
                    <div style="flex:1.5;">
                        <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F3E2} \u09B6\u09BE\u0996\u09BE:</label>
                        <select disabled style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px; background:#f5f5f5; cursor:not-allowed;">
                            <option>${currentBranchName}</option>
                        </select>
                    </div>
                `;
            } 
            else if (uType === 'AREA') {
                container.innerHTML = dateHtml + `
                    <div style="flex:1.5;">
                        <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F3E2} \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8:</label>
                        <select id="custom-target" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;">
                            <option value="ALL">-- \u{1F680} All Branches (Batch) --</option>
                        </select>
                    </div>
                `;
                populateTargets();
            } 
            else { 
                let zones = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
                let areas = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
                
                let levelOptions = `<option value="1">\u09B6\u09BE\u0996\u09BE</option>`;
                if (areas.length > 0) levelOptions += `<option value="2">\u0985\u099E\u09CD\u099A\u09B2</option>`;
                if (zones.length > 0) levelOptions += `<option value="3" selected>\u099C\u09CB\u09A8</option>`;
                else if (areas.length > 0) levelOptions = levelOptions.replace('value="2"', 'value="2" selected');
                else levelOptions = levelOptions.replace('value="1"', 'value="1" selected');

                container.innerHTML = dateHtml + `
                    <div style="flex:0.8;">
                        <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F4CD} \u09B2\u09C7\u09AD\u09C7\u09B2:</label>
                        <select id="custom-level" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;">
                            ${levelOptions}
                        </select>
                    </div>
                    <div style="flex:1.4;">
                        <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F3E2} \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8:</label>
                        <select id="custom-target" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;">
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
                if (level === '3') data = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
                else if (level === '2') data = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
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
            document.getElementById('audit-status').innerHTML = `<span style="color:#f39c12;">\u23F3 \u09B8\u09BF\u0982\u0995 \u09B9\u099A\u09CD\u099B\u09C7...</span>`;
            document.getElementById('start-audit-btn').disabled = true;
            document.getElementById('export-excel-btn').style.display = 'none';
            
            window.runGlobalHierarchySync(true, (success) => { 
                let st = document.getElementById('audit-status');
                if(st) {
                    if(success) {
                        st.innerHTML = `<span style="color:#27ae60;">\u2705 \u09B8\u09BF\u09B8\u09CD\u099F\u09C7\u09AE \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4!</span>`;
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
            if(!table) return;

            let cloneAll = table.cloneNode(true);
            cloneAll.querySelectorAll('.manual-retry-btn').forEach(btn => btn.remove());
            
            let diffSheetName = window.currentCheckerType === 'EQUITY' ? 'Loss Branches' : 'Differences';
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

            let xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders/>
   <Font ss:FontName="Arial" ss:Size="10"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2c3e50" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sRowspan">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#27ae60"/>
   <Interior ss:Color="#f4f9f4" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sNormal">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
  <Style ss:ID="sNormalBold">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
  </Style>
  <Style ss:ID="sRed">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FF0000"/>
  </Style>
  <Style ss:ID="sGreen">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#008000"/>
  </Style>
 </Styles>`;

            let sheets = [{name: 'All Branches', table: cloneAll}];
            if (window.currentCheckerType === 'MIS' || window.currentCheckerType === 'EQUITY') {
                sheets.push({name: diffSheetName, table: cloneDiff});
            } else if (window.currentCheckerType === 'CASH' && cloneHighCash) {
                sheets.push({name: 'High Cash-Bank', table: cloneHighCash});
            }
            
            sheets.forEach(sheet => {
                xmlContent += `\n <Worksheet ss:Name="${sheet.name}">
  <Table>
   <Column ss:Width="200"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>`;
                
                sheet.table.querySelectorAll('tr').forEach(tr => {
                    xmlContent += `\n   <Row>`;
                    let colIndex = 1;
                    tr.querySelectorAll('th, td').forEach(td => {
                        let text = (td.innerText || td.textContent || "").trim();
                        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        let style = "sNormal";
                        
                        if (td.tagName.toLowerCase() === 'th') style = "sHeader";
                        else if (td.hasAttribute('rowspan')) style = "sRowspan";
                        else if (td.style.color === 'red' || td.style.color === 'rgb(255, 0, 0)') style = "sRed";
                        else if (td.style.color === 'green' || td.style.color === 'rgb(0, 128, 0)') style = "sGreen";
                        else if (td.style.fontWeight === 'bold') style = "sNormalBold";

                        let rowspan = td.getAttribute('rowspan');
                        let mergeAttr = (rowspan && parseInt(rowspan) > 1) ? ` ss:MergeDown="${parseInt(rowspan) - 1}"` : '';

                        let type = "String";
                        let numCheck = text.replace(/,/g, '').replace(/\u09F3/g, '').trim();
                        if (!isNaN(numCheck) && numCheck !== "") {
                            type = "Number";
                            text = numCheck;
                        }
                        
                        // ss:Index helps ensure proper column placement in case Excel's auto-flow with MergeDown gets confused
                        if (td.tagName.toLowerCase() !== 'th' && !td.hasAttribute('rowspan')) {
                            // If this row is missing the first column (because of rowspan above), start at col 2
                            let hasColspan = Array.from(tr.children).some(c => c.hasAttribute('colspan'));
                            if (window.currentCheckerType !== 'SAMITY' && window.currentCheckerType !== 'DUE_COLLECTION' && !hasColspan && tr.children.length < 5 && colIndex === 1) colIndex = 2;
                        }
                        
                        xmlContent += `<Cell ss:Index="${colIndex}" ss:StyleID="${style}"${mergeAttr}><Data ss:Type="${type}">${text}</Data></Cell>`;
                        colIndex++;
                    });
                    xmlContent += `</Row>`;
                });
                xmlContent += `\n  </Table>\n </Worksheet>`;
            });

            xmlContent += `\n</Workbook>`;

            let uType = sessionStorage.getItem('mf_user_type');
            let targetName = "Branch";
            if (uType !== 'BRANCH') {
                let targetSel = document.getElementById('custom-target');
                if (targetSel && targetSel.options.length > 0) {
                    targetName = targetSel.options[targetSel.selectedIndex].text;
                    if(targetSel.value === 'ALL') targetName = "All_Batch";
                }
            }
            
            let targetDate = document.getElementById('custom-audit-date').value;
            let fileName = `Audit_Report_${targetName.replace(/\s+/g, '_')}_${targetDate}.xls`;

            // Strip emojis for clean Excel view and prevent mobile Mojibake
            xmlContent = xmlContent.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '');
            let finalOutput = "\uFEFF" + xmlContent; // Add UTF-8 BOM

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
                URL.revokeObjectURL(a.href);
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
                        <td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${bName}</td>
                        <td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} \u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987 \u099A\u09B2\u099B\u09C7...</td>
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
                    mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', sDate, '1', bId, 'mis', updateStatus);
                    if (mData) {
                        let t2 = document.getElementById(`tbody-${safeId}`);
                        if(t2) t2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${bName}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} Balance Sheet \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', sDate, '1', bId, 'ais', updateStatus);
                    }
                    } else if (window.currentCheckerType === 'SAMITY') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${bName}</td><td colspan="3" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost('#/samity/samities/index', sDate, '1', bId, 'samity', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${bName}</td><td colspan="3" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await scrapeViaGhost('#/samity/samities/index', sDate, '1', bId, 'samity', updateStatus);
                        }
                    } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${bName}</td><td colspan="2" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} Due Collection \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost('#/reports/register-reports/due-collection-register-index', sDate, '1', bId, 'due_collection', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${bName}</td><td colspan="2" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} Due Collection \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await scrapeViaGhost('#/reports/register-reports/due-collection-register-index', sDate, '1', bId, 'due_collection', updateStatus);
                        }
                    } else {
                        theadHTML = `<tr><th style="width:24%; text-align:left;">Branch</th><th style="width:14%; text-align:left;">Item</th><th style="width:62%; text-align:right;">Balance (AIS)</th></tr>`;
                    }

                    let htmlRowsSingle = '';                    if (window.currentCheckerType === 'MIS') {
                        htmlRowsSingle = `
                            <tr>
                                <td rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4; font-size:9.5px;">${targetName}</td>
                                <td style="text-align:left; font-size:9px;"><b>Loan</b></td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(misData.loan)}</td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(aisData.loan)}</td>
                                <td style="color:${loanDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(loanDiff)}</td>
                            </tr>
                            <tr>
                                <td style="text-align:left; font-size:9px;"><b>Savings</b></td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(misData.savings)}</td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(aisData.savings)}</td>
                                <td style="color:${savDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(savDiff)}</td>
                            </tr>
                        `;
                    } else if (window.currentCheckerType === 'CASH') {
                        let cashColor = aisData.cashInHand > 2000 ? 'red' : '#16a085';
                        let bankColor = aisData.cashAtBank > 1000000 ? 'red' : '#16a085';
                        htmlRowsSingle = `
                            <tr>
                                <td rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4; font-size:9.5px;">${targetName}</td>
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Cash</b></td>
                                <td style="color:${cashColor}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aisData.cashInHand)}</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Bank</b></td>
                                <td style="color:${bankColor}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aisData.cashAtBank)}</td>
                            </tr>
                        `;
                    } else if (window.currentCheckerType === 'EQUITY') {
                        htmlRowsSingle = `
                            <tr class="equity-row">
                                <td class="branch-name-td" rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; font-size:9.5px; border-bottom:1px solid #bdc3c7;">${targetName}</td>
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Equity</b></td>
                                <td style="color:${(aisData.equity < 0 && aisData.equity !== -999) ? 'red' : '#8e44ad'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aisData.equity)}</td>
                                <td style="color:${(aisData.equityPrev < 0 && aisData.equityPrev !== -999) ? 'red' : '#8e44ad'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aisData.equityPrev)}</td>
                            </tr>
                            <tr class="surplus-row" style="border-bottom:1px solid #bdc3c7;">
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Surplus</b></td>
                                <td style="color:${(isData.surplusMonth < 0 && isData.surplusMonth !== -999) ? 'red' : '#e67e22'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${sM}</td>
                                <td style="color:${(isData.surplusYear < 0 && isData.surplusYear !== -999) ? 'red' : '#d35400'}; text-align:right; font-weight:bold; white-space:nowrap; font-size:9px;">${sY}</td>
                            </tr>
                        `;
                    } else if (window.currentCheckerType === 'SAMITY') {
                        let totalCount = misData && misData.totalCount !== undefined ? misData.totalCount : (misData ? misData.length : 0);
                        let smallSamities = misData && misData.data ? misData.data.filter(s => s.members >= 0 && s.members <= 19) : (misData ? misData.filter(s => s.members >= 0 && s.members <= 19) : []);
                        let smallCount = smallSamities.length;
                        let codesText = smallSamities.map(s => s.code).join(', ');
                        htmlRowsSingle = `<tr class="samity-row"><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; font-size:9.5px; border-bottom:1px solid #bdc3c7;">` + targetName + `</td><td style="text-align:center; color:#2c3e50; font-size:10px; font-weight:bold;">` + totalCount + `</td><td style="text-align:center; color:#c0392b; font-size:10px; font-weight:bold;">` + smallCount + `</td><td style="text-align:left; color:#8e44ad; font-size:9px; white-space:normal; word-wrap:break-word;">` + codesText + `</td></tr>`;
                    } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                        htmlRowsSingle = `<tr><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; font-size:9.5px; border-bottom:1px solid #bdc3c7;">` + targetName + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (misData ? misData.totalCurrent.toFixed(2) : '0') + `</td><td style="text-align:center; font-weight:bold; color:#e67e22;">` + (misData ? misData.totalMatured.toFixed(2) : '0') + `</td></tr>`;
                    }
                    tbody.innerHTML = htmlRowsSingle;
                
                let expBtn = document.getElementById('export-excel-btn');
                if(expBtn) expBtn.style.display = 'block';
            } else if (e.target && e.target.id === 'start-audit-btn') {
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
                    } else {
                        branchesToProcess = [{id: 'SELF', name: currentBranchName}];
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
                let tableStyle = `<style>.audit-table { width:100%; border-collapse:collapse; background:white; } .audit-table th, .audit-table td { border:1px solid #bdc3c7; padding:4px; font-family:Arial, sans-serif; } .has-diff {} .no-diff {} .loss-branch {} .high-cash {} .audit-table th { background:#2c3e50; color:white; }</style>`;
                
                let now = new Date();
                let dtString = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
                                <td colspan="5" style="padding:4px; font-size:11px; text-align:center; font-weight:bold; border:1px solid #bdc3c7;">
                                    \u{1F552} Report Generated On: ${dtString}
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
                                `<tr><th style="width:24%; text-align:left;">Branch</th><th style="width:14%; text-align:left;">Item</th><th style="width:62%; text-align:right;">Balance (AIS)</th></tr>`)))
                            }
                        </thead>
                `;
                for(let b of branchesToProcess) {
                    let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
                    tableHtml += `
                        <tbody id="tbody-${safeId}" class="audit-row-group">
                            <tr style="background:#fff;">
                                <td style="text-align:left; font-weight:bold; color:#2c3e50; font-size:9.5px;">${b.name}</td>
                                <td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:gray; font-size:9.5px;">\u23F3 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A8...</td>
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
                for (let i = 0; i < branchesToProcess.length; i++) {
                    let b = branchesToProcess[i];
                    let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');

                    updateStatus(`[${i+1}/${branchesToProcess.length}] \u0985\u09A1\u09BF\u099F \u099A\u09B2\u099B\u09C7: ${b.name}...`);
                    
                    let tbodyBefore = document.getElementById(`tbody-${safeId}`);
                    if(tbodyBefore) {
                        tbodyBefore.innerHTML = `
                            <tr>
                                <td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td>
                                <td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} MIS \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td>
                            </tr>
                        `;
                    }

                    let mData = null;
                    let aData = null;
                    let iData = null;
                    if (window.currentCheckerType === 'MIS') {
                        mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, '1', b.id, 'mis', updateStatus);
                        if (!mData) {
                            let tRetry1 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry1) tRetry1.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} MIS \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, '1', b.id, 'mis', updateStatus);
                        }
                        if (mData) {
                            let tRetry2 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} Balance Sheet \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                            aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, '1', b.id, 'ais', updateStatus);
                            if (!aData) {
                                let tRetry3 = document.getElementById(`tbody-${safeId}`);
                                if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} Balance Sheet \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                                aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, '1', b.id, 'ais', updateStatus);
                            }
                        }
                    } else if (window.currentCheckerType === 'SAMITY') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td><td colspan="3" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost('#/samity/samities/index', selectedDate, '1', b.id, 'samity', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="3" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} \u09B8\u09AE\u09BF\u09A4\u09BF \u09B2\u09BF\u09B8\u09CD\u099F \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await scrapeViaGhost('#/samity/samities/index', selectedDate, '1', b.id, 'samity', updateStatus);
                        }
                    } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td><td colspan="2" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} Due Collection \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost('#/reports/register-reports/due-collection-register-index', selectedDate, '1', b.id, 'due_collection', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="2" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} Due Collection \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await scrapeViaGhost('#/reports/register-reports/due-collection-register-index', selectedDate, '1', b.id, 'due_collection', updateStatus);
                        }
                    } else {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} Balance Sheet \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                        aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, '1', b.id, 'ais', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} Balance Sheet \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                            aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, '1', b.id, 'ais', updateStatus);
                        }
                        if (window.currentCheckerType === 'EQUITY') {
                            let tRetry4 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry4) tRetry4.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#27ae60; font-size:9.5px;">\u{1F504} Income Statement \u09B0\u09BF\u09A1 \u09B9\u099A\u09CD\u099B\u09C7...</td></tr>`;
                            iData = await scrapeViaGhost('#/reports/acc-income-statements/income-statment-filter', selectedDate, '1', b.id, 'is', updateStatus);
                            if (!iData) {
                                let tRetry5 = document.getElementById(`tbody-${safeId}`);
                                if(tRetry5) tRetry5.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="${window.currentCheckerType === 'MIS' ? '4' : (window.currentCheckerType === 'EQUITY' ? '3' : '2')}" style="text-align:center; color:#d35400; font-size:9.5px;">\u{1F504} Income Statement \u0985\u099F\u09CB-\u09B0\u09BF\u099F\u09CD\u09B0\u09BE\u0987...</td></tr>`;
                                iData = await scrapeViaGhost('#/reports/acc-income-statements/income-statment-filter', selectedDate, '1', b.id, 'is', updateStatus);
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

                        if (window.currentCheckerType === 'CASH' && (aData.cashInHand > 2000 || aData.cashAtBank > 1000000)) {
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
                                    <td rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4; font-size:9.5px;">${b.name}</td>
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
                            let cashColor = aData.cashInHand > 2000 ? 'red' : '#16a085';
                            let bankColor = aData.cashAtBank > 1000000 ? 'red' : '#16a085';
                            let isHighCashClass = aData.cashInHand > 2000 ? 'is-high' : '';
                            let isHighBankClass = aData.cashAtBank > 1000000 ? 'is-high' : '';
                            htmlRowsBatch = `
                                <tr class="cash-row ${isHighCashClass}">
                                    <td class="branch-name-td" rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4; font-size:9.5px;">${b.name}</td>
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
                                    <td class="branch-name-td" rowspan="2" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; font-size:9.5px; border-bottom:1px solid #bdc3c7;">${b.name}</td>
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
                            htmlRowsBatch = `<tr class="samity-row"><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; font-size:9.5px; border-bottom:1px solid #bdc3c7;">` + b.name + `</td><td style="text-align:center; color:#2c3e50; font-size:10px; font-weight:bold;">` + totalCount + `</td><td style="text-align:center; color:#c0392b; font-size:10px; font-weight:bold;">` + smallCount + `</td><td style="text-align:left; color:#8e44ad; font-size:9px; white-space:normal; word-wrap:break-word;">` + codesText + `</td></tr>`;
                        } else if (window.currentCheckerType === 'DUE_COLLECTION') {
                            htmlRowsBatch = `<tr><td style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; font-size:9.5px; border-bottom:1px solid #bdc3c7;">` + b.name + `</td><td style="text-align:center; font-weight:bold; color:#16a085;">` + (aData ? aData.totalCurrent.toFixed(2) : '0') + `</td><td style="text-align:center; font-weight:bold; color:#e67e22;">` + (aData ? aData.totalMatured.toFixed(2) : '0') + `</td></tr>`;
                        }
                        tbodyAfter.innerHTML = htmlRowsBatch;
                        if (window.applyTabFilters) window.applyTabFilters(tbodyAfter);
                        successCount++;
                    } else {
                        tbodyAfter.innerHTML = `
                            <tr>
                                <td style="text-align:left; font-weight:bold; color:#e74c3c; font-size:9.5px;">${b.name}</td>
                                <td colspan="${window.currentCheckerType === 'MIS' ? '3' : (window.currentCheckerType === 'EQUITY' ? '2' : '1')}" style="text-align:center; color:red; font-size:9.5px;">\u274C \u09A1\u09BE\u099F\u09BE \u09A8\u09C7\u0987</td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <button class="manual-retry-btn" data-id="${b.id}" data-name="${b.name}" style="background:#e74c3c; color:white; border:none; padding:2px 6px; font-size:9.5px; border-radius:2px; cursor:pointer; font-weight:bold;">\u{1F504} Retry</button>
                                </td>
                            </tr>
                        `;
                    }
                }

                let finalStatus = document.getElementById('audit-status');
                if(finalStatus) finalStatus.innerHTML = `<span style="color:green;">\u2705 ${successCount} \u099F\u09BF \u09B6\u09BE\u0996\u09BE\u09B0 \u0985\u09A1\u09BF\u099F \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8!</span>`;
                
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
                localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders));
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
                        localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders));
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
        if (sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup')) {
            return;
        }

        return new Promise((resolve) => {
            isCapturing = true;
            let ifr = document.createElement('iframe');
            ifr.allow = "geolocation 'none'";
            ifr.style.cssText = 'position:fixed; top:0; left:0; width:1px; height:1px; opacity:0; pointer-events:none; z-index:-9999;';
            ifr.src = window.location.origin + window.location.pathname.replace('/#/', '/').replace('/#', '/') + '#/members/members/index';
            document.body.appendChild(ifr);

            let timer = setTimeout(() => {
                isCapturing = false;
                if(ifr.parentNode) ifr.remove();
                resolve();
            }, 12000);

            ifr.onload = () => {
                setTimeout(async () => {
                    try {
                        let doc = ifr.contentDocument || ifr.contentWindow.document;
                        let win = ifr.contentWindow;

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
                                if (this._url && (this._url.includes('cbo_branch') || this._url.includes('cbo_member_status') || (this._url.includes('members') && (this._url.includes('limit=') || this._url.includes('ajax') || this._url.includes('list'))))) {
                                    clonedUrl = this._url; 
                                    clonedHeaders = Object.assign({}, this._headers); 
                                    try {
                                        sessionStorage.setItem('mf_cloned_url', clonedUrl);
                                        localStorage.setItem('mf_cloned_url_backup', clonedUrl);
                                        sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                                        localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders));
                                        
                                        let bodyStr = body;
                                        if (body instanceof win.FormData || body instanceof FormData) {
                                            let p = new URLSearchParams();
                                            for (let [k,v] of body.entries()) p.append(k, v);
                                            bodyStr = p.toString();
                                        }
                                        let template = { url: clonedUrl, method: this._method || 'POST', headers: clonedHeaders, body: bodyStr };
                                        sessionStorage.setItem('mf_api_template', JSON.stringify(template));
                                    } catch(e){}
                                }
                                ifrSend.apply(this, arguments);
                            };
                        }

                        let filterBtn = doc.querySelector('.filter-btn') || doc.querySelector('.fa-filter') || doc.querySelector('[title="Filter"]');
                        if (filterBtn) filterBtn.click();

                        await new Promise(r => setTimeout(r, 200));

                        let sBtn = doc.querySelector('#custom-search-btn') || doc.querySelector('.search-btn') || doc.querySelector('button[type="submit"]');
                        if (sBtn) {
                            sBtn.click();
                            let checks = 0;
                            while (!sessionStorage.getItem('mf_cloned_url') && checks < 20) {
                                await new Promise(r => setTimeout(r, 150));
                                checks++;
                            }
                        }

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
        let tmplStr = sessionStorage.getItem('mf_api_template');
        if (!tmplStr) {
            // Fallback to GET method if template not found but URL is
            let cUrl = sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup');
            if(!cUrl) return 0;
            try { 
                let savedHd = sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup');
                if(savedHd) clonedHeaders = JSON.parse(savedHd); 
            } catch(e){}
            let basePath = window.location.pathname.replace('/#/', '/').replace('/#', '/');
            if (!basePath.endsWith('/')) basePath += '/';
            let urlObj = new URL(cUrl.startsWith('http') ? cUrl : window.location.origin + basePath + cUrl);
            urlObj.searchParams.set('cbo_branch', (branchId && branchId !== 'SELF' && branchId !== '0') ? branchId : '');
            urlObj.searchParams.set('cbo_nid_status', nidStatus);
            urlObj.searchParams.set('cbo_member_status', 'A');
            try {
                let r = await fetch(urlObj.toString(), { method: 'GET', headers: clonedHeaders });
                let d = await r.json();
                return d.total || d.total_rows || d.count || d.recordsTotal || d.recordsFiltered || 0;
            } catch(e) { return 0; }
        }

        try {
            let t = JSON.parse(tmplStr);
            let url = t.url;
            let options = { method: t.method || 'POST', headers: Object.assign({}, t.headers || {}) };
            
            if (t.body) {
                if (typeof t.body === 'string') {
                    let p = new URLSearchParams(t.body);
                    p.set('cbo_branch', (branchId && branchId !== 'SELF' && branchId !== '0') ? branchId : '');
                    p.set('cbo_nid_status', nidStatus);
                    p.set('cbo_member_status', 'A');
                    options.body = p.toString();
                    
                    // Force content-type if not present for URLSearchParams
                    if (!options.headers['Content-Type'] && !options.headers['content-type']) {
                        options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                    }
                } else {
                    let u = new URLSearchParams();
                    for(let k in t.body) u.append(k, t.body[k]);
                    u.set('cbo_branch', (branchId && branchId !== 'SELF' && branchId !== '0') ? branchId : '');
                    u.set('cbo_nid_status', nidStatus);
                    u.set('cbo_member_status', 'A');
                    options.body = u.toString();
                    options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                }
            } else {
                let u = new URL(url.startsWith('http') ? url : (window.location.origin + url));
                u.searchParams.set('cbo_branch', (branchId && branchId !== 'SELF' && branchId !== '0') ? branchId : '');
                u.searchParams.set('cbo_nid_status', nidStatus);
                u.searchParams.set('cbo_member_status', 'A');
                url = u.toString();
            }
            
            let r = await window.fetch(url, options);
            let d = await r.json();
            return d.total || d.total_rows || d.count || d.recordsTotal || d.recordsFiltered || 0;
        } catch(e) {
            return 0;
        }
    }

    // \u09A1\u09CD\u09AF\u09BE\u09B6\u09AC\u09CB\u09B0\u09CD\u09A1\u09C7 \u09AD\u09BE\u09B8\u09AE\u09BE\u09A8 \u09AC\u09BE\u099F\u09A8
    function injectToggleBtn() {
        if (document.getElementById('member-report-toggle-btn')) return;
        
        let container = document.createElement('div');
        container.id = 'member-report-toggle-btn';
        container.style.cssText = 'position:fixed; bottom:160px; right:16px; display:flex; align-items:center; background:#8e44ad; color:white; border-radius:50px; padding:8px 14px; font-weight:bold; font-size:13px; box-shadow:0 4px 14px rgba(0,0,0,0.4); z-index:999998; font-family:Arial; transition:0.3s;';
        
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
        container.appendChild(closeBtn);
        document.body.appendChild(container);
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
            panel.style.cssText = 'position: fixed; top: 5px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #8e44ad; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 97vw; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; font-family: Arial; z-index: 999999; overflow: hidden;';

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
                    <div style="display:flex; gap:8px; margin-bottom:8px;">
                        <div style="flex:1;">
                            <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F4CD} \u09B2\u09C7\u09AD\u09C7\u09B2:</label>
                            <select id="mv-level-selection" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                                ${levelOptions}
                            </select>
                        </div>
                        <div style="flex:1.5;">
                            <label style="font-size:10px; font-weight:bold; color:#34495e;">\u{1F3E2} \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8:</label>
                            <select id="filter-selection" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                            </select>
                        </div>
                    </div>
                `;
            }

            panel.innerHTML = `
                <div id="mem-report-header" style="background:#8e44ad; color:white; padding:8px 12px; cursor:move; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <strong style="font-size:14px; pointer-events:none; white-space:nowrap;">\u{1F465} Member CIB Verification Report</strong>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button id="resync-btn" style="background:#f39c12; color:white; border:none; padding:4px 8px; font-size:11px; cursor:pointer; border-radius:3px; font-weight:bold;">\u{1F504} Resync</button>
                        <button id="close-panel-btn" title="\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 25px; height: 25px; border-radius: 50%; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(255, 65, 108, 0.45); transition: 0.2s;">\u2715</button>
                    </div>
                </div>
                <div style="padding:10px; overflow-y:auto; flex:1; display:flex; flex-direction:column;">
                    ${filterHtml}
                    <button id="gen-btn" style="width:100%; background:${isReady ? '#8e44ad' : '#ccc'}; color:white; border:none; padding:8px; cursor:${isReady ? 'pointer' : 'not-allowed'}; font-weight:bold; border-radius:4px; font-size:13px; flex-shrink:0;" ${!isReady ? 'disabled' : ''}>\u{1F680} Generate Tree Report</button>
                    <div id="status-text" style="margin-top:8px; font-size:12px; font-weight:bold; text-align:center; color:#2c3e50; min-height:16px;"></div>
                    <div id="table-container" style="overflow-y:auto; margin-top:8px; flex:1; max-height:55vh;"></div>
                    <button id="export-btn" style="display:none; width:100%; background:#27ae60; color:white; border:none; padding:8px; margin-top:8px; font-weight:bold; border-radius:4px; font-size:13px; flex-shrink:0;">\u{1F4E5} Download Excel</button>
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

                    let html = `<table id="reportTable" border="1" style="width:100%; border-collapse:collapse; font-size:11px; line-height:1.2;">
                        <tr style="background:#e8f4f8; color:#2980b9;">
                            <td colspan="4" style="padding:6px; font-size:12px; text-align:center; font-weight:bold;">
                                \u{1F552} Report Generated On: ${dtString}
                            </td>
                        </tr>
                        <tr style="background:#2c3e50; color:white; font-size:11px;">
                            <th style="padding:2px; text-align:left; white-space:normal;">Hierarchy & Branch</th>
                            <th style="padding:2px; text-align:center; white-space:normal;">Active Member</th>
                            <th style="padding:2px; text-align:center; white-space:normal;">Verified Active Member</th>
                            <th style="padding:2px; text-align:center; white-space:normal;">Percentage</th>
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
                        
                        let totalHOActive = 0, totalHOVerified = 0;
                        
                        for (let z in tree) {
                            html += `<tr style="background:#0277bd; color:white;"><td colspan="4" style="padding:4px;"><b>\u{1F3E2} Zone: ${z}</b></td></tr>`;
                            let zoneActive = 0, zoneVerified = 0;
                            
                            for (let a in tree[z]) {
                                html += `<tr style="background:#e1f5fe; color:#01579b;"><td colspan="4" style="padding:4px;">&nbsp;&nbsp;<b>\u{1F4CD} Area: ${a}</b></td></tr>`;
                                let areaActive = 0, areaVerified = 0;
                                
                                for (let b of tree[z][a]) {
                                    let active = fetchedCounts[b.id].active;
                                    let verified = fetchedCounts[b.id].verified;
                                    let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                                    
                                    areaActive += active;
                                    areaVerified += verified;
                                    
                                    html += `<tr style="background:#fff;"><td style="padding:4px; word-break:break-word;">&nbsp;&nbsp;&nbsp;&nbsp;\u{1F3F7}\uFE0F ${b.name}</td><td style="text-align:center; padding:4px;">${active}</td><td style="text-align:center; padding:4px;">${verified}</td><td style="text-align:center; padding:4px;"><b>${perc}%</b></td></tr>`;
                                }
                                let areaPerc = areaActive > 0 ? Math.round((areaVerified / areaActive) * 100) : 0;
                                html += `<tr style="background:#fff2e6; font-weight:bold;"><td style="text-align:left; padding:4px; word-break:break-word;">&nbsp;&nbsp;\u{1F4CA} Total Area (${a})</td><td style="text-align:center; padding:4px;">${areaActive}</td><td style="text-align:center; padding:4px;">${areaVerified}</td><td style="text-align:center; color:#d35400; padding:4px;">${areaPerc}%</td></tr>`;
                                
                                zoneActive += areaActive;
                                zoneVerified += areaVerified;
                            }
                            let zonePerc = zoneActive > 0 ? Math.round((zoneVerified / zoneActive) * 100) : 0;
                            html += `<tr style="background:#e6f4ea; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">\u{1F4CA} Total Zone (${z})</td><td style="text-align:center; padding:2px;">${zoneActive}</td><td style="text-align:center; padding:2px;">${zoneVerified}</td><td style="text-align:center; color:green; padding:2px;">${zonePerc}%</td></tr>`;
                            
                            totalHOActive += zoneActive;
                            totalHOVerified += zoneVerified;
                        }
                        
                        if (Object.keys(tree).length > 1) {
                            let hoPerc = totalHOActive > 0 ? Math.round((totalHOVerified / totalHOActive) * 100) : 0;
                            html += `<tr style="background:#2c3e50; color:white; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">\u{1F4CA} Grand Total</td><td style="text-align:center; padding:2px;">${totalHOActive}</td><td style="text-align:center; padding:2px;">${totalHOVerified}</td><td style="text-align:center; color:#f1c40f; padding:2px;">${hoPerc}%</td></tr>`;
                        }
                    } 
                    else if (currentRole === 'ZONE') {
                        let tree = {};
                        rawBranches.forEach(b => {
                            if(!tree[b.area]) tree[b.area] = [];
                            tree[b.area].push(b);
                        });
                        let grandActive = 0, grandVerified = 0;
                        for (let a in tree) {
                            html += `<tr style="background:#0277bd; color:white;"><td colspan="4" style="padding:4px;"><b>\u{1F4CD} Area: ${a}</b></td></tr>`;
                            let areaActive = 0, areaVerified = 0;
                            
                            for (let b of tree[a]) {
                                let active = fetchedCounts[b.id].active;
                                let verified = fetchedCounts[b.id].verified;
                                let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                                
                                areaActive += active;
                                areaVerified += verified;
                                
                                html += `<tr style="background:#fff; font-size:11px;"><td style="padding:2px; white-space:nowrap;">&nbsp;&nbsp;\u{1F3F7}\uFE0F ${b.name}</td><td style="text-align:center; padding:2px;">${active}</td><td style="text-align:center; padding:2px;">${verified}</td><td style="text-align:center; padding:2px;"><b>${perc}%</b></td></tr>`;
                            }
                            let areaPerc = areaActive > 0 ? Math.round((areaVerified / areaActive) * 100) : 0;
                            html += `<tr style="background:#fff2e6; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">\u{1F4CA} Total Area (${a})</td><td style="text-align:center; padding:2px;">${areaActive}</td><td style="text-align:center; padding:2px;">${areaVerified}</td><td style="text-align:center; color:#d35400; padding:2px;">${areaPerc}%</td></tr>`;
                            
                            grandActive += areaActive;
                            grandVerified += areaVerified;
                        }
                        if (Object.keys(tree).length > 1) {
                            let grandPerc = grandActive > 0 ? Math.round((grandVerified / grandActive) * 100) : 0;
                            let totalLabel = "\u{1F4CA} Grand Total";
                            if (uniqueZones.size === 1 && rawBranches[0].zone && rawBranches[0].zone !== 'Unknown Zone' && rawBranches[0].zone !== 'Branch') {
                                totalLabel = `\u{1F4CA} Total Zone (${rawBranches[0].zone})`;
                            } else if (maps.entityName) {
                                totalLabel = `\u{1F4CA} Grand Total (${maps.entityName})`;
                            }
                            html += `<tr style="background:#e6f4ea; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">${totalLabel}</td><td style="text-align:center; padding:2px;">${grandActive}</td><td style="text-align:center; padding:2px;">${grandVerified}</td><td style="text-align:center; color:green; padding:2px;">${grandPerc}%</td></tr>`;
                        }
                    } 
                    else { 
                        let grandActive = 0, grandVerified = 0;
                        
                        for (let b of rawBranches) {
                            let active = fetchedCounts[b.id].active;
                            let verified = fetchedCounts[b.id].verified;
                            let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                            
                            grandActive += active;
                            grandVerified += verified;
                            
                            html += `<tr style="background:#fff; font-size:11px;"><td style="padding:2px; white-space:nowrap;"><span style="font-weight:bold; color:#2c3e50;">\u{1F3F7}\uFE0F ${b.name}</span></td><td style="text-align:center; padding:2px;">${active}</td><td style="text-align:center; padding:2px;">${verified}</td><td style="text-align:center; padding:2px;"><b>${perc}%</b></td></tr>`;
                        }
                        if (rawBranches.length > 1) {
                            let grandPerc = grandActive > 0 ? Math.round((grandVerified / grandActive) * 100) : 0;
                            let totalLabel = "\u{1F4CA} Grand Total";
                            if (uniqueAreas.size === 1 && rawBranches[0].area && rawBranches[0].area !== 'Unknown Area' && rawBranches[0].area !== 'Branch') {
                                totalLabel = `\u{1F4CA} Total Area (${rawBranches[0].area})`;
                            } else if (maps.entityName) {
                                totalLabel = `\u{1F4CA} Grand Total (${maps.entityName})`;
                            } 
                            html += `<tr style="background:#fff2e6; font-weight:bold; font-size:11px;"><td style="text-align:left; padding:2px; white-space:normal;">${totalLabel}</td><td style="text-align:center; padding:2px;">${grandActive}</td><td style="text-align:center; padding:2px;">${grandVerified}</td><td style="text-align:center; color:#d35400; padding:2px;">${grandPerc}%</td></tr>`;
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
                        rawBranches = [{ id: '', name: localStorage.getItem('microfin_entity_name') || "My Branch", area: 'Branch', zone: 'Branch' }];
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
                    
                    if (!sessionStorage.getItem('mf_cloned_url') && !localStorage.getItem('mf_cloned_url_backup')) {
                        status.innerText = "Connecting to Data Source (background)...";
                        await ensureApiAndBranchList();
                    }

                    if (!sessionStorage.getItem('mf_cloned_url') && !localStorage.getItem('mf_cloned_url_backup')) {
                        status.innerHTML = '<span style="color:#e74c3c;">Connection failed. Please visit Member > Member List manually once.</span>';
                        setTimeout(() => { if(!status || !status.parentNode) return; status.innerText = "Ready"; btn.disabled = false; }, 6000);
                        return;
                    }

                    let currentReportStructure = { 
                        maps: maps, 
                        rawBranches: rawBranches, 
                        fetchedCounts: {}
                    };

                    status.innerText = `Connecting...`;
                    
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
                            currentReportStructure.fetchedCounts[b.id] = { active: active, verified: verified };
                            
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
                    document.getElementById('export-btn').style.display = 'block';
                    btn.disabled = false;
                };

                document.getElementById('export-btn').onclick = () => {
                    let table = document.getElementById('reportTable');
                    let htmlContent = `<html><head><meta charset="UTF-8"></head><body>${table.outerHTML}</body></html>`;
                    
                    let filterEl = document.getElementById('filter-selection');
                    let name = filterEl && filterEl.value !== 'ALL' ? filterEl.options[filterEl.selectedIndex].text.replace(/\s+/g, '_') : 'All_Branches';
                    let dateSuffix = new Date().toISOString().split('T')[0];
                    let fileName = `Member_Verification_${name}_${dateSuffix}.xls`;

                    // Strip emojis for clean Excel view and prevent mobile Mojibake
                    htmlContent = htmlContent.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '');
                    let finalOutput = "\uFEFF" + htmlContent; // Add UTF-8 BOM

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
                        URL.revokeObjectURL(a.href);
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

})();
