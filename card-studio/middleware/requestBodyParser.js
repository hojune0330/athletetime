const express = require('express');

const WORKSPACE_PREVIEW_PATH = '/api/card-studio/analytics/record-workspaces/preview';

function createRequestBodyParser() {
  const workspacePreviewParser = express.json({ limit: '4kb' });
  return (req, res, next) => {
    const isWorkspacePreview = req.method === 'POST' && req.path === WORKSPACE_PREVIEW_PATH;
    if (!isWorkspacePreview) return next();
    return workspacePreviewParser(req, res, (error) => handleParserResult(error, res, next));
  };
}

function handleParserResult(error, res, next) {
  if (!error) return next();
  res.setHeader('Cache-Control', 'no-store');
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, code: 'REQUEST_TOO_LARGE', error: 'REQUEST_TOO_LARGE' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, code: 'INVALID_JSON', error: 'INVALID_JSON' });
  }
  return res.status(400).json({ success: false, code: 'INVALID_JSON', error: 'INVALID_JSON' });
}

module.exports = { createRequestBodyParser };
