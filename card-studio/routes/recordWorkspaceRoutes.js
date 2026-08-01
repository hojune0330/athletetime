const express = require('express');

const { workspacePreviewLimiter } = require('../middleware/rateLimiter');
const { createRecordWorkspacePreviewService, RecordWorkspacePreviewError } = require('../services/recordWorkspacePreviewService');

function createRecordWorkspaceRouter({ previewService = createRecordWorkspacePreviewService() } = {}) {
  const router = express.Router();
  router.post('/preview', workspacePreviewLimiter, (req, res) => {
    try {
      const data = previewService.getRecordWorkspacePreview(req.body || {});
      if (!data) {
        return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_AVAILABLE', error: 'WORKSPACE_NOT_AVAILABLE' });
      }
      return res.json({ success: true, data });
    } catch (error) {
      return sendPreviewError(error, res);
    }
  });
  return router;
}

function sendPreviewError(error, res) {
  if (error instanceof RecordWorkspacePreviewError) {
    return res.status(error.status).json({ success: false, code: error.code, error: error.code });
  }
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', error: 'INTERNAL_ERROR' });
}

module.exports = { createRecordWorkspaceRouter };
