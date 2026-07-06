'use strict';

const { URL } = require('url');

const POLICY_DOC = 'docs/athletetime-legacy-collector-policy.md';
const EXTERNAL_COLLECTION_ENV = 'ATHLETETIME_ENABLE_EXTERNAL_COLLECTION';
const BLOCKED_COLLECTION_HOSTS = Object.freeze([
  'result.kaaf.or.kr',
]);

class CollectionPolicyError extends Error {
  constructor(message, code = 'COLLECTION_POLICY_BLOCKED') {
    super(message);
    this.name = 'CollectionPolicyError';
    this.code = code;
  }
}

function parseCollectionUrl(inputUrl) {
  let parsed;

  try {
    parsed = new URL(String(inputUrl || ''));
  } catch (error) {
    throw new CollectionPolicyError(
      `Invalid collection URL. See ${POLICY_DOC}.`,
      'INVALID_COLLECTION_URL',
    );
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new CollectionPolicyError(
      `Collection URL must use http or https. See ${POLICY_DOC}.`,
      'INVALID_COLLECTION_URL',
    );
  }

  return parsed;
}

function hostMatches(host, rootHost) {
  return host === rootHost || host.endsWith(`.${rootHost}`);
}

function findBlockedHost(host) {
  return BLOCKED_COLLECTION_HOSTS.find(rootHost => hostMatches(host, rootHost));
}

function isExternalCollectionEnabled() {
  return process.env[EXTERNAL_COLLECTION_ENV] === 'true';
}

function isBlockedCollectionHost(inputUrl) {
  const parsed = parseCollectionUrl(inputUrl);
  return Boolean(findBlockedHost(parsed.hostname.toLowerCase()));
}

function assertCollectionUrlAllowed(inputUrl, context = 'external collection') {
  const parsed = parseCollectionUrl(inputUrl);
  const host = parsed.hostname.toLowerCase();
  const blockedHost = findBlockedHost(host);

  if (blockedHost) {
    throw new CollectionPolicyError(
      `${context} blocked: ${blockedHost} is frozen by policy and must not be used as a collection source. See ${POLICY_DOC}.`,
      'FROZEN_COLLECTION_SOURCE',
    );
  }

  if (!isExternalCollectionEnabled()) {
    throw new CollectionPolicyError(
      `${context} blocked: external URL collection is disabled by default. Set ${EXTERNAL_COLLECTION_ENV}=true only after policy approval. See ${POLICY_DOC}.`,
      'EXTERNAL_COLLECTION_DISABLED',
    );
  }

  return { ok: true, host };
}

module.exports = {
  BLOCKED_COLLECTION_HOSTS,
  CollectionPolicyError,
  EXTERNAL_COLLECTION_ENV,
  POLICY_DOC,
  assertCollectionUrlAllowed,
  isBlockedCollectionHost,
  isExternalCollectionEnabled,
};
