(function (root) {
  'use strict';
  const data = root.MurasData || (typeof require !== 'undefined' && require('./data.js'));
  const roles = { visitor: 'Visitor', moderator: 'Moderator Demo', specialist: 'Heritage Specialist Demo', manager: 'Site Manager Demo' };
  const reportLabels = { submitted: 'Submitted', awaiting: 'Awaiting Review', information: 'More Information Required', reviewed: 'Reviewed in Demo', rejected: 'Rejected', referred: 'Referred to Responsible Organisation · Demo', closed: 'Closed in Demo' };
  const activityLabels = { proposed: 'Proposed', preliminary: 'Preliminary Review', permission: 'Permission Required', awaiting: 'Awaiting Approval', approved: 'Approved for Demo', open: 'Registration Open', completed: 'Completed in Demo', cancelled: 'Cancelled' };
  const reportTransitions = { submitted: ['awaiting'], awaiting: ['information', 'reviewed', 'rejected'], information: ['awaiting', 'rejected'], reviewed: ['referred', 'closed'], referred: ['closed'], rejected: [], closed: [] };
  const activityTransitions = { proposed: ['preliminary', 'cancelled'], preliminary: ['permission', 'cancelled'], permission: ['awaiting', 'cancelled'], awaiting: ['approved', 'cancelled'], approved: ['open', 'cancelled'], open: ['completed', 'cancelled'], completed: [], cancelled: [] };
  const categories = { litter: 'Litter Near Heritage Site', graffiti: 'Possible Graffiti on Historic Surface', damage: 'Possible Surface Damage', other: 'Other Concern' };
  const timestamp = () => new Date().toISOString();
  const id = prefix => prefix + '-' + (root.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const placeExists = placeId => data.places.some(p => p.id === placeId);
  function history(from, to, role, comment) {
    return { from, to, role: roles[role], at: timestamp(), comment };
  }
  function freshState() {
    const at = timestamp();
    return {
      version: 1,
      stories: [{ id: 'demo-memory', placeId: 'burana', title: 'Looking up at the tower', content: 'This fictional example imagines a visitor pausing in the valley and wondering about the travellers who came before. It is invented to demonstrate how a personal memory is reviewed. No real storyteller or consent is represented.', type: 'personal', authorAttribution: 'Fictional demo narrator', permissionConfirmed: true, historicalStatus: 'Personal Memory', publicationStatus: 'pending', isDemo: true, createdAt: at, history: [history('New', 'Pending Review', 'visitor', 'Fictional Demo Story; sample consent applies only to this invented example.')] }],
      reports: [
        { id: 'demo-litter', placeId: 'burana', title: 'Sample Report: Litter Near Burana Tower', category: 'litter', description: 'Sample litter report on surrounding grounds. This is a fictional product scenario; no actual pollution at Burana Tower is claimed.', reviewStatus: 'awaiting', conservationStatus: 'Not assessed', priority: 'Standard', confidence: 'Unverified', isDemo: true, source: 'Demo Submission', createdAt: at, history: [history('Submitted', 'Awaiting Review', 'visitor', 'Fictional sample submitted for local demonstration.')] },
        { id: 'demo-graffiti', placeId: 'sulaiman', title: 'Sample Report: Possible Graffiti on Historic Surface', category: 'graffiti', description: 'A fictional example of possible marks on a historic surface. No real damage at Sulaiman-Too is claimed. Specialist assessment is required before any intervention.', reviewStatus: 'awaiting', conservationStatus: 'Specialist Assessment Required', priority: 'Specialist triage', confidence: 'Unverified', isDemo: true, source: 'Demo Submission', createdAt: at, history: [history('Submitted', 'Awaiting Review', 'visitor', 'Fictional example; no real damage is claimed.')] }
      ],
      activities: [{ id: 'demo-cleanup', placeId: 'burana', linkedReportId: 'demo-litter', title: 'Community Cleanup Near Burana Tower', type: 'litter', proposedDate: '2026-11-28T10:00', zone: 'Surrounding grounds only; final boundary to be set by the site manager.', purpose: 'Demonstrate a supervised litter pickup without touching the monument.', approvalStatus: 'proposed', restrictions: 'Loose modern litter on the agreed surrounding grounds only. No historic surfaces, excavation, chemicals, graffiti removal or restoration. Follow site supervision.', participants: [], isDemo: true, history: [history('New', 'Proposed', 'visitor', 'A fictional proposal. Registration stays closed until simulated permission and opening.')] }],
      appeals: []
    };
  }
  function checkText(text, label, min = 3, max = 3000) {
    if (typeof text !== 'string' || text.trim().length < min) throw new Error(`${label} needs at least ${min} characters.`);
    if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
    for (const raw of text.match(/(?:https?:\/\/|www\.)[^\s<>]+/gi) || []) {
      try { const u = new URL(raw.startsWith('www.') ? 'https://' + raw : raw); if (!u.hostname.includes('.')) throw new Error(); }
      catch { throw new Error('Please remove or correct the invalid link.'); }
    }
    if (/\b(?:javascript|data|file):/i.test(text)) throw new Error('Unsupported links. Use an ordinary https:// source link.');
    return text.trim();
  }
  function preliminaryChecks(report, reports) {
    const duplicate = reports.some(r => r.id !== report.id && r.placeId === report.placeId && r.category === report.category && r.reviewStatus !== 'rejected');
    const repeated = /(.)\1{9,}|\b(\w+)(?:\s+\1){5,}\b/i.test(report.description);
    const sensitive = /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+\d[\d\s()-]{8,}/i.test(report.description);
    return [
      { label: 'Description has enough detail', passed: report.description.trim().length >= 20 },
      { label: duplicate ? 'Possible duplicate: compare reports at this place' : 'No same-category report at this place', passed: !duplicate },
      { label: repeated ? 'Repetitive content needs attention' : 'No obvious repeated-text pattern', passed: !repeated },
      { label: sensitive ? 'Possible personal contact details: human privacy review needed' : 'No obvious email or phone pattern', passed: !sensitive },
      { label: 'Image content, sensitive details and prohibited content still need human review', passed: null }
    ];
  }
  function transitionReport(state, reportId, next, role, comment) {
    const report = state.reports.find(r => r.id === reportId);
    if (!report || !reportTransitions[report.reviewStatus]?.includes(next)) throw new Error('This report status change is not allowed.');
    const allowed = role === 'moderator' || (role === 'specialist' && ['referred', 'closed'].includes(next));
    if (!allowed) throw new Error('Switch to the appropriate demo review role first.');
    if (next === 'closed' && ['graffiti', 'damage'].includes(report.category) && role !== 'specialist') throw new Error('A specialist demo review is required to close a historic-surface report.');
    const note = checkText(comment, 'Review comment', 5, 1000);
    report.history.push(history(reportLabels[report.reviewStatus], reportLabels[next], role, note));
    report.reviewStatus = next;
    if (['graffiti', 'damage'].includes(report.category) && next === 'reviewed') report.conservationStatus = 'Specialist Assessment Required';
    if (['graffiti', 'damage'].includes(report.category) && next === 'referred') report.conservationStatus = 'Referred to Specialists · Demo Only';
    return report;
  }
  function transitionActivity(state, activityId, next, role, comment, completion = {}) {
    const activity = state.activities.find(a => a.id === activityId);
    if (!activity || !activityTransitions[activity.approvalStatus]?.includes(next)) throw new Error('This activity status change is not allowed.');
    if (role !== 'manager') throw new Error('Only Site Manager Demo can review volunteer proposals.');
    const linkedReport = state.reports.find(r => r.id === activity.linkedReportId);
    if (activity.type !== 'litter' || (linkedReport && linkedReport.category !== 'litter')) throw new Error('Historic-surface work cannot be approved as a public volunteer activity.');
    if (next !== 'cancelled' && linkedReport && !['reviewed', 'referred'].includes(linkedReport.reviewStatus)) throw new Error('The linked report needs moderator review before the activity can proceed.');
    if (next === 'approved' && (!completion.zoneConfirmed || !completion.supervisionConfirmed)) throw new Error('Confirm the permitted zone and responsible supervision for this simulation.');
    const note = checkText(comment, 'Review comment', 5, 1000);
    if (next === 'completed') {
      const summary = checkText(completion.summary, 'Completion summary', 20, 1500);
      const count = Number(completion.participantCount);
      if (!Number.isInteger(count) || count < activity.participants.length || count > 1000) throw new Error('Use a whole participant count between the registered count and 1,000.');
      activity.completion = { summary, participantCount: count, resultStatus: 'Outcome Under Review · Demo Only' };
    }
    activity.history.push(history(activityLabels[activity.approvalStatus], activityLabels[next], role, note));
    activity.approvalStatus = next;
    return activity;
  }
  function joinActivity(state, activityId) {
    const activity = state.activities.find(a => a.id === activityId);
    const report = activity && state.reports.find(r => r.id === activity.linkedReportId);
    if (!activity || activity.approvalStatus !== 'open' || activity.type !== 'litter' || (report && (report.category !== 'litter' || !['reviewed', 'referred'].includes(report.reviewStatus)))) throw new Error('Registration is closed until the permitted activity has been approved and opened in demo.');
    if (activity.participants.includes('this-browser')) throw new Error('This browser is already registered.');
    activity.participants.push('this-browser');
    activity.history.push(history('Not registered', 'Registered in Demo', 'visitor', 'One local participant from this browser; no real event registration.'));
    return activity;
  }
  function reviewStory(state, storyId, next, role, comment) {
    const story = state.stories.find(s => s.id === storyId);
    if (!story || !['pending', 'expert'].includes(story.publicationStatus)) throw new Error('This story is not awaiting review.');
    if (role !== 'moderator' && role !== 'specialist') throw new Error('A demo review role is required.');
    if (story.publicationStatus === 'expert' && role !== 'specialist') throw new Error('Switch to Heritage Specialist Demo to review a referred story.');
    if (!['published', 'rejected', 'expert'].includes(next) || next === story.publicationStatus) throw new Error('Invalid publication status.');
    if (!story.permissionConfirmed) throw new Error('Storyteller permission is required.');
    const note = checkText(comment, 'Review comment', 5, 1000);
    story.history.push(history(story.publicationStatus, next, role, note));
    story.publicationStatus = next;
    // A simulated review never turns a personal account into an expert-verified fact.
    return story;
  }
  function createReport(state, input) {
    if (!placeExists(input.placeId) || !Object.hasOwn(categories, input.category)) throw new Error('Select a valid place and concern category.');
    const description = checkText(input.description, 'Observation', 20, 3000);
    const report = { id: id('report'), placeId: input.placeId, category: input.category, title: categories[input.category] + ' · ' + data.places.find(p => p.id === input.placeId).shortName, description, evidenceName: input.evidenceName || '', reviewStatus: 'awaiting', conservationStatus: ['graffiti', 'damage'].includes(input.category) ? 'Specialist Assessment Required' : 'Not assessed', priority: ['graffiti', 'damage'].includes(input.category) ? 'Specialist triage' : 'Standard', confidence: 'Unverified', isDemo: false, source: 'Local user submission', createdAt: timestamp(), history: [history('Submitted', 'Awaiting Review', 'visitor', 'Local submission; a request for review, not evidence of confirmed damage.')] };
    state.reports.unshift(report);
    return report;
  }
  function createStory(state, input) {
    if (!placeExists(input.placeId)) throw new Error('Select a valid place.');
    if (!input.permissionConfirmed) throw new Error('Confirm the storyteller’s permission before saving.');
    const story = { id: id('story'), placeId: input.placeId, title: checkText(input.title, 'Title', 3, 120), content: checkText(input.content, 'Story', 30, 5000), authorAttribution: checkText(input.authorAttribution, 'Attribution', 2, 100), type: 'personal', historicalStatus: 'Personal Memory', permissionConfirmed: true, publicationStatus: 'pending', isDemo: false, createdAt: timestamp(), evidenceName: input.evidenceName || '', audioName: input.audioName || '', history: [history('New', 'Pending Review', 'visitor', 'Personal memory saved with confirmed permission. Historical claims are not verified.')] };
    if (state.stories.some(s => s.title.toLowerCase() === story.title.toLowerCase() && s.placeId === story.placeId)) throw new Error('A story with this title already exists at this place.');
    state.stories.unshift(story);
    return story;
  }
  function createActivity(state, input) {
    if (!placeExists(input.placeId)) throw new Error('Select a valid place.');
    if (input.type !== 'litter') throw new Error('Public volunteer proposals are limited to supervised litter pickup on surrounding grounds. Historic surfaces need specialists.');
    const report = input.linkedReportId && state.reports.find(r => r.id === input.linkedReportId);
    if (input.linkedReportId && (!report || report.placeId !== input.placeId || report.category !== 'litter')) throw new Error('Only a litter report at the same place can be linked to this proposal.');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.proposedDate) || !Number.isFinite(Date.parse(input.proposedDate)) || Date.parse(input.proposedDate) <= Date.now()) throw new Error('Choose a future proposed date and time.');
    const activity = { id: id('activity'), placeId: input.placeId, linkedReportId: input.linkedReportId || '', title: checkText(input.title, 'Activity title', 5, 140), type: 'litter', proposedDate: input.proposedDate, zone: checkText(input.zone, 'Proposed zone', 10, 500), purpose: checkText(input.purpose, 'Purpose', 15, 1000), restrictions: 'Surrounding grounds only, subject to an agreed zone and supervision. No historic surfaces, graffiti removal, chemicals, excavation or restoration.', approvalStatus: 'proposed', participants: [], isDemo: true, history: [history('New', 'Proposed', 'visitor', 'Local proposal only; no legal permission is issued.')] };
    state.activities.unshift(activity);
    return activity;
  }
  function eventStatus(event, today) {
    const date = today || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bishkek', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (date > event.endDate) return 'Past Event';
    if (date < event.startDate) return 'Upcoming · scheduled';
    return 'Ongoing · scheduled';
  }
  function validState(state) {
    const text = (v, max = 10000) => typeof v === 'string' && v.length <= max;
    const validHistory = rows => Array.isArray(rows) && rows.length <= 2000 && rows.every(h => h && ['from', 'to', 'role', 'at', 'comment'].every(k => text(h[k])) && Object.values(roles).includes(h.role) && Number.isFinite(Date.parse(h.at)));
    if (!state || state.version !== 1 || !['reports', 'stories', 'activities', 'appeals'].every(k => Array.isArray(state[k]) && state[k].length <= 1000)) return false;
    const all = [...state.reports, ...state.stories, ...state.activities, ...state.appeals];
    if (!all.every(r => r && text(r.id, 100)) || new Set(all.map(r => r.id)).size !== all.length) return false;
    if (!state.reports.every(r => placeExists(r.placeId) && text(r.title) && text(r.description, 3000) && Object.hasOwn(categories, r.category) && Object.hasOwn(reportLabels, r.reviewStatus) && text(r.conservationStatus) && text(r.priority) && text(r.confidence) && text(r.source) && typeof r.isDemo === 'boolean' && Number.isFinite(Date.parse(r.createdAt)) && validHistory(r.history))) return false;
    if (!state.stories.every(s => placeExists(s.placeId) && text(s.title, 120) && text(s.content, 5000) && text(s.authorAttribution, 100) && s.type === 'personal' && s.historicalStatus === 'Personal Memory' && s.permissionConfirmed === true && ['pending', 'expert', 'published', 'rejected'].includes(s.publicationStatus) && typeof s.isDemo === 'boolean' && validHistory(s.history))) return false;
    if (!state.activities.every(a => placeExists(a.placeId) && text(a.title) && a.type === 'litter' && text(a.zone) && text(a.purpose) && text(a.restrictions) && Number.isFinite(Date.parse(a.proposedDate)) && Object.hasOwn(activityLabels, a.approvalStatus) && Array.isArray(a.participants) && a.participants.length <= 1 && a.participants.every(p => p === 'this-browser') && (!a.linkedReportId || state.reports.some(r => r.id === a.linkedReportId && r.placeId === a.placeId && r.category === 'litter')) && validHistory(a.history) && (a.approvalStatus !== 'completed' || a.completion && text(a.completion.summary) && Number.isInteger(a.completion.participantCount) && a.completion.participantCount >= 0 && text(a.completion.resultStatus)))) return false;
    return state.appeals.every(a => state.reports.some(r => r.id === a.reportId) && text(a.text, 15000) && ['draft', 'submitted', 'evidence', 'response', 'outcome'].includes(a.status) && Array.isArray(a.history) && validHistory(a.history) && (!a.evidence || text(a.evidence, 3000)));
  }
  root.MurasStore = { roles, reportLabels, activityLabels, reportTransitions, activityTransitions, categories, timestamp, id, history, freshState, validState, checkText, preliminaryChecks, transitionReport, transitionActivity, joinActivity, reviewStory, createReport, createStory, createActivity, eventStatus };
  if (typeof module !== 'undefined') module.exports = root.MurasStore;
})(typeof window !== 'undefined' ? window : globalThis);
