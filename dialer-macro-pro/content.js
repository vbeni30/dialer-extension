(function() {
    console.log("%c [Extension] MACROS RESTORED - Minimal Pro UI ", "background: #000; color: #ffaa00; font-weight: bold; font-size: 14px;");

    const keyMap = {
        'F2': 'timeclockpopover',
        'F4': 'end_call',
        'F5': 'end_call_am'
    };

    const TIME_CLOCK_SUPERVISOR_ID = 'timeclock_supervisor';
    const JENNIFER_JONES_ID = '3880';
    const DISPOSITION_DROPDOWN_ID = 'dialer_disposition';
    const NOTES_BOX_ID = 'dialer_notes';

    // Disposition values
    const NO_ANSWER_VALUE = "12";
    const UNIDENTIFIED_HANGUP_VALUE = "105";
    const HANG_UP_BY_CONTACT = "6";
    const LEFT_MESSAGE_WITH_TP = "9";
    const CALL_INTERCEPT = "2";
    const NOT_INTERESTED_VALUE = "13";
    const DNC_VALUE = "14";
    const OPERATOR_TRITONE_VALUE = "14";

    // Notes
    const DEAD_AIR_TEXT = "Dead Air";
    const CALL_DROPPED_TEXT = "Call Dropped";
    const VA_NO_CONNECT_TEXT = "VA didn't connect with SH";
    const UNID_HANGUP_BEFORE_TEXT = "TP HU before listening what it was about";
    const UNID_HANGUP_AFTER_TEXT = "TP HU after listening what it was about";

    // --- Cycling click counters ---
    const clickCounts = {};
    const COUNTER_STORAGE_KEY = 'dialer-macro-pro-counters';

    function loadDirectActionCounts() {
        const defaults = { F4: 0, F5: 0 };
        try {
            const saved = JSON.parse(window.sessionStorage.getItem(COUNTER_STORAGE_KEY) || '{}');
            return {
                F4: Number.isFinite(Number(saved.F4)) ? Math.max(0, Number(saved.F4)) : defaults.F4,
                F5: Number.isFinite(Number(saved.F5)) ? Math.max(0, Number(saved.F5)) : defaults.F5
            };
        } catch (err) {
            return defaults;
        }
    }

    const directActionCounts = loadDirectActionCounts();

    const ACTIONS = {
        'F6': [
            { dispo: CALL_INTERCEPT,            note: VA_NO_CONNECT_TEXT,                          msg: "VA didn't connect" },
            { dispo: CALL_INTERCEPT,            note: "AD",                                        msg: "AD" },
            { dispo: CALL_INTERCEPT,            note: "The number is blocked",                     msg: "Number Blocked" }
        ],
        'F7': [
            { dispo: UNIDENTIFIED_HANGUP_VALUE, note: UNID_HANGUP_BEFORE_TEXT,                     msg: "Unidentified HU" }
        ],
        'F10': [
            { dispo: LEFT_MESSAGE_WITH_TP,      note: UNID_HANGUP_AFTER_TEXT,                      msg: "Left msg W TP (1)" },
            { dispo: LEFT_MESSAGE_WITH_TP,      note: "TP took the message",                       msg: "Left msg W TP (2)" }
        ],
        'F8': [
            { dispo: NO_ANSWER_VALUE,           note: DEAD_AIR_TEXT,                               msg: "Dead Air" }
        ],
        'F3': [
            { dispo: HANG_UP_BY_CONTACT,        note: "SH HU before listening what it was about",  msg: "HU BY CONTACT" }
        ],
        'F12': [
            { dispo: NO_ANSWER_VALUE,           note: CALL_DROPPED_TEXT,                           msg: "Call Dropped" }
        ],
        'NI': [
            { dispo: NOT_INTERESTED_VALUE,      note: "SH HU after the reason of the call",        msg: "Not Interested (1)" },
            { dispo: NOT_INTERESTED_VALUE,      note: "SH is not interested in voting",             msg: "Not Interested (2)" }
        ],
        'OTT': [
            { dispo: OPERATOR_TRITONE_VALUE,    note: "The number is no longer in service",        msg: "Operator Tri-Tone (1)" },
            { dispo: OPERATOR_TRITONE_VALUE,    note: "The number is disconnected",                msg: "Operator Tri-Tone (2)" }
        ]
    };

    // --- Core ---
    function findElement(id) {
        let el = document.getElementById(id);
        if (el) return el;
        const frames = document.querySelectorAll('iframe');
        for (let frame of frames) {
            try {
                const doc = frame.contentDocument || frame.contentWindow.document;
                const found = doc.getElementById(id);
                if (found) return found;
            } catch (err) {}
        }
        return null;
    }

    function triggerDeepClick(el) {
        if (!el) return;
        try { el.focus(); } catch(e) {}
        const opts = { bubbles: true, cancelable: true, view: window, buttons: 1 };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    function findButtonByText(text) {
        const matcher = text instanceof RegExp ? text : new RegExp(text, 'i');
        const roots = [document];
        document.querySelectorAll('iframe').forEach((frame) => {
            try { roots.push(frame.contentDocument || frame.contentWindow.document); } catch (err) {}
        });
        for (const root of roots) {
            const button = Array.from(root.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                .find((candidate) => matcher.test((candidate.textContent || candidate.value || '').trim()));
            if (button) return button;
        }
        return null;
    }

    function clockInJennifer() {
        const completeClockIn = () => {
            const supervisor = findElement(TIME_CLOCK_SUPERVISOR_ID);
            if (!supervisor) {
                showToast('Time Clock supervisor field not found', '#ef4444');
                return;
            }

            supervisor.value = JENNIFER_JONES_ID;
            supervisor.dispatchEvent(new Event('input', { bubbles: true }));
            supervisor.dispatchEvent(new Event('change', { bubbles: true }));

            const clockIn = findElement('timeclock_clockin')
                || findElement('timeclock_clock_in')
                || findButtonByText(/clock\s*in/i);
            if (!clockIn) {
                showToast('Clock In control not found', '#ef4444');
                return;
            }

            triggerDeepClick(clockIn);
            showToast('✓ Clocked in Jennifer Jones', '#10b981');
        };

        if (findElement(TIME_CLOCK_SUPERVISOR_ID)) {
            completeClockIn();
            return;
        }

        const timeClock = findElement(keyMap.F2);
        if (!timeClock) {
            showToast('Time Clock control not found', '#ef4444');
            return;
        }
        triggerDeepClick(timeClock);
        window.setTimeout(completeClockIn, 150);
    }

    function setDispositionAndNotes(dispoValue, notesText, successMsg) {
        const dropdown = findElement(DISPOSITION_DROPDOWN_ID);
        const notesBox = findElement(NOTES_BOX_ID);
        if (dropdown) {
            dropdown.value = dispoValue;
            dropdown.dispatchEvent(new Event('change', { bubbles: true }));
            dropdown.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (notesBox) {
            notesBox.value = notesText;
            notesBox.dispatchEvent(new Event('input', { bubbles: true }));
            notesBox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        showToast(`✓ ${successMsg}`, '#10b981');
    }

    function normalizeLabel(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ');
    }

    function setDispositionAndNotesByLabel(dispoLabel, notesText, successMsg) {
        const dropdown = findElement(DISPOSITION_DROPDOWN_ID);
        if (!dropdown) {
            showToast('Disposition field not found', '#ef4444');
            return;
        }

        const target = normalizeLabel(dispoLabel);
        const option = Array.from(dropdown.options || []).find((candidate) => {
            const label = normalizeLabel(candidate.textContent);
            return label === target || label.includes(target);
        });

        if (!option) {
            showToast(`"${dispoLabel}" option not found`, '#ef4444');
            return;
        }

        setDispositionAndNotes(option.value, notesText, successMsg);
    }

    function handleSmartSave() {
        const btn = findElement('save_disposition_all') || findElement('save_disposition');
        if (btn) triggerDeepClick(btn);
        else showToast('❌ Save button not found', '#ef4444');
    }

    function showToast(text, color) {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color};color:#fff;padding:7px 14px;border-radius:6px;z-index:2147483647;font-family:'Inter',system-ui,sans-serif;font-size:12px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.3);letter-spacing:0.01em;`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    function incrementQuickActionCounter(actionKey) {
        directActionCounts[actionKey] = (directActionCounts[actionKey] || 0) + 1;
        try {
            window.sessionStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(directActionCounts));
        } catch (err) {}
        const counterId = actionKey === 'F4' ? 'crm-finish-count' : 'crm-answ-mach-count';
        const counter = document.getElementById(counterId);
        if (counter) counter.textContent = String(directActionCounts[actionKey]);
    }

    function renderQuickActionCounters() {
        const finishCounter = document.getElementById('crm-finish-count');
        const answeringMachineCounter = document.getElementById('crm-answ-mach-count');
        if (finishCounter) finishCounter.textContent = String(directActionCounts.F4);
        if (answeringMachineCounter) answeringMachineCounter.textContent = String(directActionCounts.F5);
    }

    function resetQuickActionCounters() {
        directActionCounts.F4 = 0;
        directActionCounts.F5 = 0;
        try {
            window.sessionStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(directActionCounts));
        } catch (err) {}
        renderQuickActionCounters();
        showToast('Counters reset', '#c7a15b');
    }

    function triggerCycleAction(actionKey) {
        const steps = ACTIONS[actionKey];
        if (!steps || !steps.length) return;
        if (clickCounts[actionKey] === undefined) clickCounts[actionKey] = 0;
        const step = steps[clickCounts[actionKey] % steps.length];
        clickCounts[actionKey]++;
        setDispositionAndNotes(step.dispo, step.note, step.msg);
    }

    // --- SVG Icons ---
    const ICONS = {
        clock:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        phoneOff:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/><path d="M14.35 9.65a2 2 0 0 0-.45-2.11L12.63 6.27a16 16 0 0 0-2.6-3.41"/><line x1="23" y1="1" x2="1" y2="23"/></svg>`,
        bot:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 2v4"/><path d="M8 2h8"/><circle cx="8.5" cy="16.5" r="1.5"/><circle cx="15.5" cy="16.5" r="1.5"/><path d="M6 11V8a6 6 0 0 1 12 0v3"/></svg>`,
        userX:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>`,
        volX:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
        msgSq:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        micOff:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
        phoneMis:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 1 17 1 17 7"/><line x1="16" y1="8" x2="23" y2="1"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
        users:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        ban:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
        check:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        minus:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        dnc:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/><path d="M14.35 9.65a2 2 0 0 0-.45-2.11L12.63 6.27a16 16 0 0 0-2.6-3.41"/><line x1="23" y1="1" x2="1" y2="23"/></svg>`,
        tritone: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
    };

    function decisionBtn(actionKey, icon, label, note, accentColor, fullWidth) {
        return `<button class="mp-btn mp-decision-btn${fullWidth ? ' mp-decision-full' : ''}" data-action="${actionKey}" style="--decision-accent:${accentColor};">
            <span class="mp-decision-icon">${icon}</span>
            <span class="mp-decision-copy">
                <span class="mp-decision-label">${label}</span>
                <span class="mp-decision-note">${note}</span>
            </span>
            <span class="mp-decision-arrow">→</span>
        </button>`;
    }

    function btn(actionKey, icon, label, fkey, accentColor) {
        const fkeyHtml = fkey
            ? `<span style="margin-left:auto;background:#2a2a2a;border:1px solid #444;color:#aaa;font-family:monospace;font-size:9px;padding:2px 5px;border-radius:3px;flex-shrink:0;">${fkey}</span>`
            : '';
        return `<button class="mp-btn" data-action="${actionKey}" style="position:relative;display:flex;align-items:center;width:100%;height:32px;background:#2d2d2d;border:1px solid #383838;border-radius:6px;cursor:pointer;overflow:hidden;padding:0 8px 0 0;box-sizing:border-box;transition:background 0.15s,border-color 0.15s;">
            <span style="position:absolute;left:0;top:0;bottom:0;width:2px;background:${accentColor};opacity:1;"></span>
            <span style="display:flex;align-items:center;gap:8px;padding-left:12px;width:100%;overflow:hidden;">
                <span style="color:#bbb;display:flex;flex-shrink:0;">${icon}</span>
                <span style="font-size:11px;color:#d4d4d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">${label}</span>
                ${fkeyHtml}
            </span>
        </button>`;
    }

    function createInterface() {
        if (document.getElementById('crm-macro-panel')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            #crm-macro-panel * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
             #crm-macro-panel { color-scheme: dark; }
             .mp-qbtn { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:68px;background:#0a0907 !important;border:1px solid #3d3223 !important;border-radius:6px;cursor:pointer;transition:transform 0.18s,background 0.18s,border-color 0.18s,box-shadow 0.18s;padding:5px 4px; }
             .mp-qbtn:hover { background:#1a140b !important; border-color:#c7a15b !important; transform:translateY(-1px);box-shadow:0 7px 18px rgba(0,0,0,.45); }
             .mp-dbtn { position:relative;display:flex;align-items:center;width:100%;height:38px;background:#0d0c0a !important;border:none;border-bottom:1px solid #29231a;cursor:pointer;padding:0 10px 0 0;transition:background 0.18s,padding-left 0.18s; }
             .mp-dbtn:hover { background:#19140c !important;padding-left:3px; }
             .mp-decision-btn { position:relative;display:flex;align-items:center;gap:9px;min-width:0;min-height:52px;background:linear-gradient(145deg,#17130d,#0f0e0b);border:1px solid #3a3021;border-radius:10px;cursor:pointer;padding:9px 10px;overflow:hidden;text-align:left;transition:transform .18s,border-color .18s,background .18s,box-shadow .18s; }
             .mp-decision-btn::before { content:'';position:absolute;left:0;top:10px;bottom:10px;width:3px;background:var(--decision-accent);border-radius:0 3px 3px 0;box-shadow:0 0 10px color-mix(in srgb,var(--decision-accent) 55%,transparent); }
             .mp-decision-btn:hover { transform:translateY(-1px);background:linear-gradient(145deg,#211a0f,#151109);border-color:color-mix(in srgb,var(--decision-accent) 60%,#3a3021);box-shadow:0 8px 20px rgba(0,0,0,.35); }
             .mp-decision-icon { color:var(--decision-accent);display:flex;flex-shrink:0;margin-left:3px; }
             .mp-decision-icon svg { width:14px;height:14px; }
             .mp-decision-copy { display:flex;flex-direction:column;gap:3px;min-width:0;flex:1; }
             .mp-decision-label { color:#f0e9dc;font-size:11px;font-weight:700;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
             .mp-decision-note { color:#b0a493;font-size:9px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
             .mp-decision-arrow { color:#786b58;font-size:15px;line-height:1;transition:color .18s,transform .18s; }
             .mp-decision-btn:hover .mp-decision-arrow { color:var(--decision-accent);transform:translateX(2px); }
             .mp-decision-full { grid-column:1 / -1; }
             #crm-dnc-btn:hover { background:linear-gradient(90deg,rgba(220,38,38,0.28),rgba(185,28,28,0.2)) !important; border-color:rgba(220,38,38,0.55) !important; }
             .dnc-choice:hover { background:#2a1d0e !important; }
             #crm-macro-minimize:hover { color:#f0d298 !important; }
             #crm-smart-save:hover { opacity:0.9 !important; }
             #crm-macro-panel button:focus-visible { outline:2px solid #c7a15b;outline-offset:2px; }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'crm-macro-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
              width: 320px;
              background: #080808;
              border: 1px solid #4b3b27;
             border-radius: 8px;
             box-shadow: 0 22px 60px rgba(0,0,0,0.72), 0 3px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,.04);
            z-index: 2147483646;
            overflow: hidden;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        `;

        panel.innerHTML = `
             <!-- DNC Overlay -->
              <div id="crm-dnc-overlay" style="display:none;position:absolute;inset:0;background:rgba(8,6,4,0.98);z-index:99;border-radius:16px;flex-direction:column;align-items:stretch;padding:16px 12px 12px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #4b3b27;">
                      <span style="color:#c46c77;display:flex;">${ICONS.dnc}</span>
                     <span style="font-size:13px;font-weight:700;color:#f0dfbd;flex:1;">Do Not Call</span>
                      <button id="crm-dnc-cancel" aria-label="Close Do Not Call menu" style="background:none;border:none;color:#9b8e7c;font-size:18px;cursor:pointer;line-height:1;padding:0 2px;">×</button>
                </div>
                 <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:#b09b76;text-transform:uppercase;margin-bottom:10px;">Select reason</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                     <button class="dnc-choice" data-dnc="1" style="display:flex;flex-direction:column;align-items:flex-start;padding:10px 12px;background:#21100f;border:1px solid #5b302e;border-left:3px solid #b45b67;border-radius:8px;cursor:pointer;transition:all 0.15s;text-align:left;">
                         <span style="font-size:12px;font-weight:600;color:#d2939b;margin-bottom:3px;">SH Req</span>
                         <span style="font-size:10px;color:#b0a493;line-height:1.4;">SH asked to not be called</span>
                    </button>
                     <button class="dnc-choice" data-dnc="2" style="display:flex;flex-direction:column;align-items:flex-start;padding:10px 12px;background:#17120d;border:1px solid #5b4a31;border-left:3px solid #b58b55;border-radius:8px;cursor:pointer;transition:all 0.15s;text-align:left;">
                         <span style="font-size:12px;font-weight:600;color:#d8b66f;margin-bottom:3px;">Unable to Confirm ID</span>
                         <span style="font-size:10px;color:#b0a493;line-height:1.4;">TP asked to be taken off the call list</span>
                    </button>
                     <button class="dnc-choice" data-dnc="3" style="display:flex;flex-direction:column;align-items:flex-start;padding:10px 12px;background:#17120d;border:1px solid #5b4a31;border-left:3px solid #c7a15b;border-radius:8px;cursor:pointer;transition:all 0.15s;text-align:left;">
                         <span style="font-size:12px;font-weight:600;color:#d8b66f;margin-bottom:3px;">Irate Party</span>
                         <span style="font-size:10px;color:#b0a493;line-height:1.4;">TP was irate and asked to not be called</span>
                    </button>
                </div>
            </div>

             <!-- Header -->
              <div id="crm-macro-header" style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #3a3021;cursor:move;background:linear-gradient(90deg,rgba(76,54,22,.38),rgba(17,13,7,.12));">
                <div style="display:flex;align-items:center;gap:7px;">
                     <span style="width:8px;height:8px;border-radius:50%;background:#c7a15b;box-shadow:0 0 10px rgba(199,161,91,0.7);flex-shrink:0;"></span>
                      <span style="font-size:12px;font-weight:700;color:#f0dfbd;letter-spacing:0.02em;">Dialer Controller</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                     <span id="crm-timer" style="background:rgba(199,161,91,0.13);border:1px solid rgba(199,161,91,0.38);color:#d8b66f;font-size:10px;font-weight:700;font-family:monospace;padding:2px 7px;border-radius:20px;letter-spacing:0.05em;">00:00</span>
                     <button id="crm-reset-counters" title="Reset Finish Call and Answ Mach counters" style="background:#18130b;border:1px solid #59482f;color:#bca77e;cursor:pointer;padding:3px 6px;display:flex;align-items:center;transition:color 0.15s,border-color 0.15s;line-height:1;font-family:monospace;font-size:8px;letter-spacing:0.04em;border-radius:3px;">RESET</button>
                     <button id="crm-macro-minimize" style="background:none;border:none;color:#8f806d;cursor:pointer;padding:0;display:flex;align-items:center;transition:color 0.15s;line-height:1;font-size:16px;">—</button>
                </div>
            </div>

            <div id="crm-macro-body">
                <!-- Quick Actions label -->
                  <div style="display:flex;align-items:center;gap:5px;padding:11px 12px 6px;font-size:9px;font-weight:700;letter-spacing:0.14em;color:#b09b76;text-transform:uppercase;">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#c7a15b"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Quick Actions
                </div>

                <!-- Quick Action Buttons (3-column) -->
                 <div style="display:flex;gap:7px;padding:0 12px 12px;">
                      <button class="mp-btn mp-qbtn" data-action="F2" style="border-color:#c7a15b99 !important;background:#151006 !important;">
                          <span style="color:#d8b66f;display:flex;">${ICONS.clock}</span>
                          <span style="font-size:10px;color:#f7e8c6;text-align:center;line-height:1.2;font-weight:700;">Clock In</span>
                          <span style="font-size:8px;color:#d2b678;text-align:center;line-height:1.2;">Jennifer Jones</span>
                         <span style="background:#18130b;border:1px solid #59482f;color:#bca77e;font-family:monospace;font-size:8px;padding:1px 5px;border-radius:3px;">F2</span>
                    </button>
                      <button class="mp-btn mp-qbtn" data-action="F4" style="border-color:#a84f6099 !important;background:#160a0d !important;">
                          <span style="color:#c46c77;display:flex;">${ICONS.phoneOff}</span>
                          <span style="font-size:10px;color:#f4dadd;text-align:center;line-height:1.2;font-weight:700;">Finish Call</span>
                          <span id="crm-finish-count" style="font-size:9px;color:#d28b94;font-family:monospace;font-weight:700;line-height:1;">0</span>
                          <span style="background:#1a0c0f;border:1px solid #61333a;color:#c48b92;font-family:monospace;font-size:8px;padding:1px 5px;border-radius:3px;">F4</span>
                    </button>
                      <button class="mp-btn mp-qbtn" data-action="F5" style="border-color:#8e789d99 !important;background:#110d13 !important;">
                          <span style="color:#a58db3;display:flex;">${ICONS.bot}</span>
                          <span style="font-size:10px;color:#eee5f0;text-align:center;line-height:1.2;font-weight:700;">Answ Mach</span>
                          <span id="crm-answ-mach-count" style="font-size:9px;color:#c5aecf;font-family:monospace;font-weight:700;line-height:1;">0</span>
                          <span style="background:#181019;border:1px solid #594763;color:#c0a9ca;font-family:monospace;font-size:8px;padding:1px 5px;border-radius:3px;">F5</span>
                    </button>
                </div>

                <!-- DNC Button -->
                 <div style="padding:0 12px 12px;">
                     <button id="crm-dnc-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:36px;background:linear-gradient(90deg,rgba(180,91,103,0.18),rgba(104,35,46,0.14));border:1px solid rgba(180,91,103,0.45);border-radius:8px;cursor:pointer;transition:all 0.15s;">
                         <span style="color:#d2939b;display:flex;">${ICONS.dnc}</span>
                         <span style="font-size:12px;font-weight:700;color:#d2939b;letter-spacing:0.04em;">Do Not Call</span>
                    </button>
                </div>

                 <!-- Decision Shortcuts -->
                  <div style="display:flex;align-items:center;gap:5px;padding:2px 12px 7px;font-size:9px;font-weight:700;letter-spacing:0.14em;color:#b09b76;text-transform:uppercase;border-top:1px solid #3a3021;">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#c7a15b" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
                     Decision Shortcuts
                 </div>
                 <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:0 12px 12px;">
                      ${decisionBtn('WRONG_NUMBER', ICONS.phoneMis, 'Wrong Number', 'Number does not belong to SH', '#c7a15b', true)}
                      ${decisionBtn('UNDECIDED', ICONS.minus, 'Undecided', 'SH has not decide yet', '#b5ada0', false)}
                      ${decisionBtn('UNDECIDED_WAITING', ICONS.users, 'Undecided', 'Waiting on advisor or S/O', '#9f8754', false)}
                 </div>

                 <!-- Voting Status -->
                  <div style="display:flex;align-items:center;gap:5px;padding:2px 12px 7px;font-size:9px;font-weight:700;letter-spacing:0.14em;color:#b09b76;text-transform:uppercase;border-top:1px solid #3a3021;">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#c7a15b" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
                     Voting Status
                 </div>
                 <div style="display:flex;flex-direction:column;gap:7px;padding:0 12px 12px;">
                      ${decisionBtn('WILL_VOTE', ICONS.check, 'Will Vote', 'SH said I will vote', '#91a878', true)}
                      ${decisionBtn('HAS_VOTED', ICONS.check, 'Has Voted', 'SH has voted', '#75977d', true)}
                      ${decisionBtn('VERIFICATION_DECLINED_NO_VOTE', ICONS.dnc, 'Verification Declined — No Vote', "SH didn't verify info", '#b45b67', true)}
                 </div>

                <!-- Disposition label -->
                 <div style="display:flex;align-items:center;gap:5px;padding:2px 12px 5px;font-size:9px;font-weight:700;letter-spacing:0.14em;color:#b09b76;text-transform:uppercase;border-top:1px solid #3a3021;">
                     <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#786b58" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
                    Disposition
                </div>

                <!-- Disposition Buttons -->
                <div style="display:flex;flex-direction:column;">
                    <button class="mp-btn mp-dbtn" data-action="F6">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#c7a15b;border-radius:0 0 0 0;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#c7a15b;display:flex;flex-shrink:0;">${ICONS.userX}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">VA No Connect</span>
                             <span style="background:rgba(117,151,125,0.12);border:1px solid rgba(117,151,125,0.3);color:#91a878;font-size:8px;font-weight:700;padding:1px 5px;border-radius:10px;flex-shrink:0;">x3</span>
                             <span style="background:#18130b;border:1px solid #4c402d;color:#bca77e;font-family:monospace;font-size:8px;padding:1px 4px;border-radius:3px;flex-shrink:0;">F6</span>
                        </span>
                    </button>
                    <button class="mp-btn mp-dbtn" data-action="F7">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#b5ada0;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#b5ada0;display:flex;flex-shrink:0;">${ICONS.volX}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">Unidentified HU</span>
                             <span style="background:#18130b;border:1px solid #4c402d;color:#bca77e;font-family:monospace;font-size:8px;padding:1px 4px;border-radius:3px;flex-shrink:0;">F7</span>
                        </span>
                    </button>
                    <button class="mp-btn mp-dbtn" data-action="F10">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#a78450;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#a78450;display:flex;flex-shrink:0;">${ICONS.msgSq}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">Left msg W TP</span>
                             <span style="background:rgba(117,151,125,0.12);border:1px solid rgba(117,151,125,0.3);color:#91a878;font-size:8px;font-weight:700;padding:1px 5px;border-radius:10px;flex-shrink:0;">x2</span>
                             <span style="background:#18130b;border:1px solid #4c402d;color:#bca77e;font-family:monospace;font-size:8px;padding:1px 4px;border-radius:3px;flex-shrink:0;">F10</span>
                        </span>
                    </button>
                    <button class="mp-btn mp-dbtn" data-action="F8">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#8f8678;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#8f8678;display:flex;flex-shrink:0;">${ICONS.micOff}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">Dead Air</span>
                             <span style="background:#18130b;border:1px solid #4c402d;color:#bca77e;font-family:monospace;font-size:8px;padding:1px 4px;border-radius:3px;flex-shrink:0;">F8</span>
                        </span>
                    </button>
                    <button class="mp-btn mp-dbtn" data-action="F12">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#b45b67;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#b45b67;display:flex;flex-shrink:0;">${ICONS.phoneMis}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">Call Dropped</span>
                             <span style="background:#18130b;border:1px solid #4c402d;color:#bca77e;font-family:monospace;font-size:8px;padding:1px 4px;border-radius:3px;flex-shrink:0;">F12</span>
                        </span>
                    </button>
                    <button class="mp-btn mp-dbtn" data-action="F3">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#75977d;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#75977d;display:flex;flex-shrink:0;">${ICONS.users}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">HU by contact</span>
                             <span style="background:#18130b;border:1px solid #4c402d;color:#bca77e;font-family:monospace;font-size:8px;padding:1px 4px;border-radius:3px;flex-shrink:0;">F3</span>
                        </span>
                    </button>
                    <button class="mp-btn mp-dbtn" data-action="NI">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#b58b55;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#b58b55;display:flex;flex-shrink:0;">${ICONS.ban}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">Not Interested</span>
                             <span style="background:rgba(117,151,125,0.12);border:1px solid rgba(117,151,125,0.3);color:#91a878;font-size:8px;font-weight:700;padding:1px 5px;border-radius:10px;flex-shrink:0;">x2</span>
                        </span>
                    </button>
                    <button class="mp-btn mp-dbtn" data-action="OTT" style="border-bottom:none;">
                         <span style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#9a86a8;"></span>
                        <span style="display:flex;align-items:center;gap:7px;padding-left:14px;width:100%;overflow:hidden;">
                             <span style="color:#9a86a8;display:flex;flex-shrink:0;">${ICONS.tritone}</span>
                             <span style="font-size:11px;color:#eee7dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;">Operator Tri-Tone</span>
                             <span style="background:rgba(117,151,125,0.12);border:1px solid rgba(117,151,125,0.3);color:#91a878;font-size:8px;font-weight:700;padding:1px 5px;border-radius:10px;flex-shrink:0;">x2</span>
                        </span>
                    </button>
                </div>

                 <!-- Smart Save -->
                  <button class="mp-btn" id="crm-smart-save" data-action="F9" style="display:flex;align-items:center;justify-content:space-between;width:100%;height:44px;background:linear-gradient(90deg,#392914,#171006);border:none;border-top:1px solid #c7a15b66;border-radius:0 0 16px 16px;cursor:pointer;padding:0 14px;transition:opacity 0.15s;">
                    <span style="display:flex;align-items:center;gap:8px;">
                         <span style="color:#d8b66f;display:flex;">${ICONS.check}</span>
                         <span style="font-size:13px;font-weight:700;color:#f0d298;letter-spacing:0.02em;">Smart Save</span>
                    </span>
                     <span style="background:rgba(0,0,0,0.32);border:1px solid rgba(216,182,111,0.35);color:#d8b66f;font-family:monospace;font-size:9px;padding:2px 6px;border-radius:4px;">F9</span>
                </button>
            </div>
        `;

        document.body.appendChild(panel);
        renderQuickActionCounters();

        // Timer
        let timerSec = 0;
        const timerEl = document.getElementById('crm-timer');
        const timerInterval = setInterval(() => {
            timerSec++;
            const m = String(Math.floor(timerSec / 60)).padStart(2, '0');
            const s = String(timerSec % 60).padStart(2, '0');
            if (timerEl) timerEl.textContent = `${m}:${s}`;
        }, 1000);
        if (timerEl) timerEl.addEventListener('click', () => { timerSec = 0; timerEl.textContent = '00:00'; });

        // Click handler
        panel.addEventListener('click', (e) => {
            const b = e.target.closest('.mp-btn');
            if (!b) return;
            handleKeyLogic(b.getAttribute('data-action'));
        });

        // DNC overlay
        const dncOverlay = document.getElementById('crm-dnc-overlay');
        const dncNotes = {
            '1': { value: '4',   note: 'SH asked to not be called',              msg: 'DNC – Client Requested' },
            '2': { value: '119', note: 'TP asked to be taken off the call list',  msg: 'DNC – Unable to Confirm' },
            '3': { value: '120', note: 'TP was irate and asked to not be called', msg: 'DNC – Irate Party' }
        };
        document.getElementById('crm-dnc-btn').addEventListener('click', () => {
            dncOverlay.style.display = 'flex';
        });
        document.getElementById('crm-reset-counters').addEventListener('click', (e) => {
            e.stopPropagation();
            resetQuickActionCounters();
        });
        document.getElementById('crm-dnc-cancel').addEventListener('click', () => {
            dncOverlay.style.display = 'none';
        });
        dncOverlay.querySelectorAll('.dnc-choice').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-dnc');
                const { value, note, msg } = dncNotes[key];
                setDispositionAndNotes(value, note, msg);
                dncOverlay.style.display = 'none';
            });
        });

        // Minimize toggle
        let minimized = false;
        document.getElementById('crm-macro-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            minimized = !minimized;
            document.getElementById('crm-macro-body').style.display = minimized ? 'none' : 'block';
        });

        // Draggable
        const header = document.getElementById('crm-macro-header');
        let isDragging = false, offX, offY;
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            const r = panel.getBoundingClientRect();
            offX = e.clientX - r.left;
            offY = e.clientY - r.top;
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = (e.clientX - offX) + 'px';
            panel.style.top  = (e.clientY - offY) + 'px';
            panel.style.bottom = 'auto';
            panel.style.right  = 'auto';
        });
        document.addEventListener('mouseup', () => isDragging = false);
    }

    function handleKeyLogic(key) {
        if (key === 'F2') { clockInJennifer(); return; }
        if (key === 'F4') { incrementQuickActionCounter('F4'); triggerDeepClick(findElement(keyMap['F4'])); return; }
        if (key === 'F5') { incrementQuickActionCounter('F5'); triggerDeepClick(findElement(keyMap['F5'])); return; }
        if (key === 'F9') { handleSmartSave(); return; }
        if (key === 'WRONG_NUMBER') {
            setDispositionAndNotesByLabel('Wrong Number', 'Wrong Number', 'Wrong Number');
            return;
        }
        if (key === 'UNDECIDED') {
            setDispositionAndNotesByLabel('Undecided', 'SH has not decide yet', 'Undecided — SH has not decide yet');
            return;
        }
        if (key === 'UNDECIDED_WAITING') {
            setDispositionAndNotesByLabel('Undecided', 'SH waiting on advisor or significant other', 'Undecided — waiting on advisor or significant other');
            return;
        }
        if (key === 'WILL_VOTE') {
            setDispositionAndNotesByLabel('Will Vote', 'SH said I will vote', 'Will Vote — SH said I will vote');
            return;
        }
        if (key === 'HAS_VOTED') {
            setDispositionAndNotesByLabel('Has Voted', 'SH has voted', 'Has Voted — SH has voted');
            return;
        }
        if (key === 'VERIFICATION_DECLINED_NO_VOTE') {
            setDispositionAndNotesByLabel('Verification Declined No Vote', "SH didn't verify info", "Verification Declined — SH didn't verify info");
            return;
        }
        if (ACTIONS[key]) { triggerCycleAction(key); return; }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') createInterface();
    else window.addEventListener('DOMContentLoaded', createInterface);

    window.addEventListener('keydown', function(e) {
        const keys = ['F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12'];
        if (keys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            handleKeyLogic(e.key);
        }
    }, true);
})();
