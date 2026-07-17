const express = require('express');
const {
  parseActionBody,
  parseCalendarCreateBody,
  parseCalendarUpdateBody,
  parseCorrectionBody,
  parseIssueCreateBody,
  parseMagazineSlug,
  parseScheduleBody,
  parseSourceBody,
  parseUuidParam,
} = require('../../card-studio/services/editorialRequestParsers');

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
  if (publicView) fields.splice(fields.indexOf('version'), 1);
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
    'id', 'revisionNumber', 'title', 'content', 'reviewNote', 'createdAt',
  ]);
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

function createEditorialAdminRouter({ service }) {
  if (!service) throw new TypeError('editorial service is required');
  const router = express.Router();
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
  router.get('/magazine/:slug', asyncRoute(async (req, res) => {
    const slug = parseMagazineSlug(req.params.slug);
    res.json({ success: true, issue: issueView(await service.getMagazineIssue(slug), true) });
  }));
  router.use(errorHandler);
  return router;
}

module.exports = { createEditorialAdminRouter, createEditorialPublicRouter };
