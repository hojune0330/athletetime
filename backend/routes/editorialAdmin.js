const express = require('express');
const {
  areEditorialVoteCountsVisible,
  requestTime,
} = require('./postVoteVisibility');
const {
  parseActionBody,
  parseCalendarCreateBody,
  parseCalendarUpdateBody,
  parseCorrectionBody,
  parseIssueCreateBody,
  parseMagazineSlug,
  parsePostIdParam,
  parseScheduleBody,
  parseSourceBody,
  parseUuidParam,
} = require('../../card-studio/services/editorialRequestParsers');
const {
  parseCalendarLinkBody,
  parseConfirmedSourceBody,
} = require('../../card-studio/services/editorialNewsDiscoveryRequestParser');

function pick(value, fields) {
  return Object.fromEntries(fields.filter((field) => value?.[field] !== undefined)
    .map((field) => [field, value[field]]));
}

function sourceView(source, publicView = false) {
  const fields = ['id', 'sourceUrl', 'sourceKind', 'title', 'publisher', 'capturedAt'];
  if (!publicView) fields.push('issueId', 'issueVersion');
  return pick(source, fields);
}

function issueView(issue, publicView = false) {
  const fields = [
    'id', 'slug', 'postId', 'status', 'version', 'title', 'content', 'summary', 'whyNow',
    'discussionQuestion', 'relatedUrl', 'sectionKey', 'publishedAt', 'updatedAt',
  ];
  if (publicView) {
    fields.splice(fields.indexOf('version'), 1);
    fields.push('commentsCount');
  }
  if (!publicView) fields.push(
    'calendarId', 'calendarState', 'author', 'subjectAgeGroup', 'scheduledFor', 'createdAt',
  );
  return {
    ...pick(issue, fields),
    sources: (issue?.sources || []).map((source) => sourceView(source, publicView)),
  };
}

function calendarView(entry) {
  return pick(entry, [
    'id', 'seasonYear', 'competitionId', 'packageRole', 'sectionKey', 'slot', 'state',
    'scheduledFor', 'skipReason', 'version', 'createdAt', 'updatedAt',
  ]);
}

function revisionView(revision) {
  return pick(revision, [
    'id', 'revisionNumber', 'title', 'content', 'reviewNote', 'publicSummary', 'createdAt',
  ]);
}

function correctionView(correction) {
  return {
    ...pick(correction, ['revisionNumber', 'createdAt']),
    publicSummary: correction?.publicSummary || '내용을 바로잡았어요.',
  };
}

function publishJobView(job) {
  return pick(job, [
    'issueId', 'title', 'status', 'attemptCount', 'nextAttemptAt', 'errorCode',
    'scheduledFor', 'updatedAt', 'issueVersion',
  ]);
}

function newsDiscoveryView(discovery) {
  return pick(discovery, [
    'id', 'originalUrl', 'naverUrl', 'title', 'publishedAt', 'firstSeenAt', 'lastSeenAt',
    'queryKeys', 'relevanceScore', 'relevanceTags', 'subjectAgeGroup', 'status', 'reviewedAt',
    'confirmedSourceUrl', 'confirmedSourceTitle', 'confirmedSourcePublisher', 'confirmedSourceKind', 'linkedCalendarId',
  ]);
}

function newsRunView(run) {
  return pick(run, [
    'id', 'runDateKst', 'profileVersion', 'trigger', 'status', 'startedAt', 'completedAt',
    'apiCallCount', 'resultCount', 'insertedCount', 'duplicateCount', 'irrelevantCount', 'safeErrorCode',
  ]);
}

function parseNewsActionBody(action, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('Invalid discovery request');
  const allowed = action === 'dismissed' ? new Set(['reviewNote']) : new Set();
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new TypeError('Invalid discovery request');
  if (body.reviewNote !== undefined && (typeof body.reviewNote !== 'string' || body.reviewNote.length > 1000)) throw new TypeError('Invalid review note');
  if (action === 'dismissed' && (!body.reviewNote || !body.reviewNote.trim())) throw new TypeError('Dismissal reason is required');
  return { status: action, reviewNote: body.reviewNote };
}

function parseEmptyNewsRunBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length > 0) {
    throw new TypeError('News run does not accept input');
  }
}

function parseNewsRunListQuery(query) {
  if (Object.keys(query).some((key) => key !== 'limit')) throw new TypeError('Invalid news run query');
  if (query.limit !== undefined && (!/^\d+$/u.test(query.limit) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
    throw new TypeError('Invalid news run limit');
  }
  return query;
}

function parseNewsDiscoveryListQuery(query) {
  const allowed = new Set(['range', 'status', 'limit', 'cursor']);
  if (Object.keys(query).some((key) => !allowed.has(key))) throw new TypeError('Invalid discovery query');
  if (query.range !== undefined && !['today', 'month'].includes(query.range)) throw new TypeError('Invalid discovery range');
  if (query.status !== undefined && !['discovered', 'reviewing', 'source_confirmed', 'calendar_linked', 'dismissed', 'expired'].includes(query.status)) throw new TypeError('Invalid discovery status');
  if (query.limit !== undefined && (!/^\d+$/u.test(query.limit) || Number(query.limit) < 1 || Number(query.limit) > 100)) throw new TypeError('Invalid discovery limit');
  if (query.cursor !== undefined) {
    try {
      const value = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
      if (!value || typeof value.publishedAt !== 'string' || Number.isNaN(Date.parse(value.publishedAt)) || typeof value.id !== 'string') throw new TypeError('Invalid discovery cursor');
      parseUuidParam(value.id);
    } catch { throw new TypeError('Invalid discovery cursor'); }
  }
  return query;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

function actionParser(action, body) {
  if (action === 'schedule') return parseScheduleBody(body);
  if (action === 'correct') return parseCorrectionBody(body);
  return parseActionBody(body);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : error instanceof TypeError ? 400 : 500;
  const code = error.code || (status === 400 ? 'INVALID_EDITORIAL_REQUEST' : 'EDITORIAL_REQUEST_FAILED');
  const message = status >= 500 ? '편집 요청을 처리하지 못했습니다.' : error.message;
  const reasons = Array.isArray(error.reasons)
    ? error.reasons
      .filter((reason) => reason && typeof reason.code === 'string' && typeof reason.message === 'string')
      .slice(0, 20)
      .map((reason) => ({ code: reason.code, message: reason.message }))
    : undefined;
  return res.status(status).json({
    success: false,
    code,
    error: message,
    ...(reasons ? { reasons } : {}),
  });
}

function createEditorialAdminRouter({ service, newsDiscoveryService }) {
  if (!service) throw new TypeError('editorial service is required');
  const router = express.Router();
  if (newsDiscoveryService) {
    router.post('/news-discoveries/run', asyncRoute(async (req, res) => {
      parseEmptyNewsRunBody(req.body);
      const run = await newsDiscoveryService.runManual({ actorUserId: req.user.id });
      res.set('Cache-Control', 'no-store');
      res.status(run.status === 'running' ? 202 : 200).json({ success: true, run: newsRunView(run) });
    }));
    router.get('/news-discoveries/runs', asyncRoute(async (req, res) => {
      const runs = await newsDiscoveryService.listRuns(parseNewsRunListQuery(req.query));
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, runs: runs.map(newsRunView) });
    }));
    router.get('/news-discoveries', asyncRoute(async (req, res) => {
      const page = await newsDiscoveryService.listDiscoveries(parseNewsDiscoveryListQuery(req.query));
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, discoveries: page.discoveries.map(newsDiscoveryView), nextCursor: page.nextCursor });
    }));
    router.post('/news-discoveries/:id/start-review', asyncRoute(async (req, res) => {
      const discovery = await newsDiscoveryService.transitionDiscovery({
        ...parseNewsActionBody('reviewing', req.body), id: parseUuidParam(req.params.id), actorUserId: req.user.id,
      });
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, discovery: newsDiscoveryView(discovery) });
    }));
    router.post('/news-discoveries/:id/dismiss', asyncRoute(async (req, res) => {
      const discovery = await newsDiscoveryService.transitionDiscovery({
        ...parseNewsActionBody('dismissed', req.body), id: parseUuidParam(req.params.id), actorUserId: req.user.id,
      });
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, discovery: newsDiscoveryView(discovery) });
    }));
    router.post('/news-discoveries/:id/confirm-source', asyncRoute(async (req, res) => {
      const discovery = await newsDiscoveryService.confirmSource({
        ...parseConfirmedSourceBody(req.body), id: parseUuidParam(req.params.id), actorUserId: req.user.id,
      });
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, discovery: newsDiscoveryView(discovery) });
    }));
    router.post('/news-discoveries/:id/link-calendar', asyncRoute(async (req, res) => {
      const discovery = await newsDiscoveryService.linkCalendar({
        ...parseCalendarLinkBody(req.body), id: parseUuidParam(req.params.id), actorUserId: req.user.id,
      });
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, discovery: newsDiscoveryView(discovery) });
    }));
  }
  router.get('/calendar', asyncRoute(async (req, res) => {
    const calendar = await service.listCalendar(req.query);
    res.json({ success: true, calendar: calendar.map(calendarView) });
  }));
  router.post('/calendar', asyncRoute(async (req, res) => {
    const calendar = await service.createCalendar({
      ...parseCalendarCreateBody(req.body), actorUserId: req.user.id,
    });
    res.status(201).json({ success: true, calendar: calendarView(calendar) });
  }));
  router.patch('/calendar/:id', asyncRoute(async (req, res) => {
    const calendar = await service.updateCalendar({
      ...parseCalendarUpdateBody(req.body),
      calendarId: parseUuidParam(req.params.id),
      actorUserId: req.user.id,
    });
    res.json({ success: true, calendar: calendarView(calendar) });
  }));
  router.delete('/calendar/:id', asyncRoute(async (req, res) => {
    const body = parseActionBody(req.body);
    if (!body.note) throw new TypeError('Calendar cancellation reason is required');
    const calendar = await service.cancelCalendar({
      ...body, calendarId: parseUuidParam(req.params.id), actorUserId: req.user.id,
    });
    res.json({ success: true, calendar: calendarView(calendar) });
  }));
  router.post('/calendar/:id/skip', asyncRoute(async (req, res) => {
    const body = parseActionBody(req.body);
    if (!body.note) throw new TypeError('Calendar skip reason is required');
    const calendar = await service.skipCalendar({
      ...body, calendarId: parseUuidParam(req.params.id), actorUserId: req.user.id,
    });
    res.json({ success: true, calendar: calendarView(calendar) });
  }));
  router.get('/issues', asyncRoute(async (req, res) => {
    const issues = await service.listIssues(req.query);
    res.json({ success: true, issues: issues.map((issue) => issueView(issue)) });
  }));
  router.get('/publish-jobs', asyncRoute(async (req, res) => {
    const jobs = await service.listPublishJobs(req.query);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, jobs: jobs.map(publishJobView) });
  }));
  router.get('/publish-jobs/warnings', asyncRoute(async (req, res) => {
    const jobs = await service.listPublishJobWarnings(req.query);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, jobs: jobs.map(publishJobView) });
  }));
  router.post('/issues', asyncRoute(async (req, res) => {
    const issue = await service.createIssue({ ...parseIssueCreateBody(req.body), actorUserId: req.user.id });
    res.status(201).json({ success: true, issue: issueView(issue) });
  }));
  router.get('/issues/:id', asyncRoute(async (req, res) => {
    const issue = await service.getIssue(parseUuidParam(req.params.id));
    res.json({ success: true, issue: issueView(issue) });
  }));
  router.get('/issues/:id/revisions', asyncRoute(async (req, res) => {
    const revisions = await service.listRevisions(parseUuidParam(req.params.id));
    res.json({ success: true, revisions: revisions.map(revisionView) });
  }));
  router.patch('/issues/:id', asyncRoute(async (req, res) => {
    const issue = await service.reviseIssue({
      ...parseCorrectionBody(req.body),
      issueId: parseUuidParam(req.params.id),
      actorUserId: req.user.id,
    });
    res.json({ success: true, issue: issueView(issue) });
  }));
  router.get('/issues/:id/sources', asyncRoute(async (req, res) => {
    const sources = await service.listSources(parseUuidParam(req.params.id));
    res.json({ success: true, sources: sources.map(sourceView) });
  }));
  router.post('/issues/:id/sources', asyncRoute(async (req, res) => {
    const source = await service.addSource({
      ...parseSourceBody(req.body), issueId: parseUuidParam(req.params.id), actorUserId: req.user.id,
    });
    res.status(201).json({ success: true, source: sourceView(source) });
  }));
  router.patch('/issues/:id/sources/:sourceId', asyncRoute(async (req, res) => {
    const source = await service.updateSource({
      ...parseSourceBody(req.body), issueId: parseUuidParam(req.params.id),
      sourceId: parseUuidParam(req.params.sourceId), actorUserId: req.user.id,
    });
    res.json({ success: true, source: sourceView(source) });
  }));
  router.delete('/issues/:id/sources/:sourceId', asyncRoute(async (req, res) => {
    const body = parseActionBody(req.body);
    const result = await service.deleteSource({
      ...body, issueId: parseUuidParam(req.params.id),
      sourceId: parseUuidParam(req.params.sourceId), actorUserId: req.user.id,
    });
    res.json({ success: true, result: pick(result, ['deleted', 'sourceId', 'issueVersion']) });
  }));
  router.post('/issues/:id/retry-publish', asyncRoute(async (req, res) => {
    const job = await service.retryPublish({
      ...parseScheduleBody(req.body),
      issueId: parseUuidParam(req.params.id),
      actorUserId: req.user.id,
    });
    res.json({ success: true, job: publishJobView(job) });
  }));
  for (const action of ['check', 'approve', 'reject', 'schedule', 'cancel', 'publish', 'correct', 'unpublish']) {
    router.post(`/issues/:id/${action}`, asyncRoute(async (req, res) => {
      const issue = await service.act(action, {
        ...actionParser(action, req.body),
        issueId: parseUuidParam(req.params.id),
        actorUserId: req.user.id,
      });
      res.json({ success: true, issue: issueView(issue) });
    }));
  }
  router.use(errorHandler);
  return router;
}

function createEditorialPublicRouter({ service }) {
  if (!service) throw new TypeError('editorial service is required');
  const router = express.Router();
  router.get('/magazine', asyncRoute(async (req, res) => {
    const issues = await service.listMagazine(req.query);
    res.json({ success: true, issues: issues.map((issue) => issueView(issue, true)) });
  }));
  router.get('/magazine/by-post/:postId', asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const issue = await service.getMagazineIssueByPostId(parsePostIdParam(req.params.postId));
    const corrections = await service.listPublicCorrections(issue.id);
    res.json({
      success: true,
      issue: {
        ...issueView(issue, true),
        countsVisible: areEditorialVoteCountsVisible(issue.publishedAt, requestTime(req)),
        corrections: corrections.map(correctionView),
      },
    });
  }));
  router.get('/magazine/:slug', asyncRoute(async (req, res) => {
    const slug = parseMagazineSlug(req.params.slug);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, issue: issueView(await service.getMagazineIssue(slug), true) });
  }));
  router.use(errorHandler);
  return router;
}

module.exports = { createEditorialAdminRouter, createEditorialPublicRouter };
