'use strict';

const REVIEW_STATUS = {
  SOURCE_VERIFIED: 'source_verified',
  NEEDS_EXTERNAL_CONFIRMATION: 'needs_external_confirmation',
};

const DOMESTIC_OVERRIDE_PATTERN =
  /(국가대표\s*선발|선발대회|최종선발|코리아오픈|Korea\s*Open|예천|구미|나주|대구|익산|고성|목포|김천|정선|횡성|춘천|부산|광주|제주|전국|체전|종별|KBS|실업|대학|중고|초등|소년체전|문화체육관광부|대통령기|회장배|춘계|추계)/i;

const EXTERNAL_CONFIRMATION_PATTERN =
  /(대만|타이완|Taiwan|TAIWAN|타이페이|타이베이|뉴타이페이|오사카|Osaka|OSAKA|일본|Japan|JAPAN|도쿄|동경|Tokyo|TOKYO|삿포|삿뽀|시베츠|아바시리|아바시라|이바시리|키타미|쿠시로|후카가와|호크랜|호쿠렌|HOKUREN|노베오카|Nobeoka|Fuji|Hokuroku|니타이다|NITTALDAI|일본체육대학|동해대학|런던|London|난징|Nanjing|자싱|Jiaxing|타이창|Taicang|두바이|Dubai|바레인|Bahrain|다카하타|Takahata|노미|Nomi|세계|World|IAAF|WA\s|Asian|아시아경보|아시아투척|아시아실내|아시아경기|아시아육상|동아시아|올림픽|Olympic|청소년올림픽|하계세계대학경기|세계대학경기)/i;

const DISTANCE_CHALLENGE_PATTERN = /디스턴스\s*(챌린지|첼린지|첼린)|Distance\s*Challenge/i;

function getManualTopReviewText(record) {
  return [
    record?.competitionName,
    record?.competitionNameEnglish,
    record?.sourceUrl,
    record?.apiEndpoint,
    record?.event,
  ]
    .filter(Boolean)
    .join(' ');
}

function hasExternalConfirmationHint(record) {
  const text = getManualTopReviewText(record);
  if (!text) return false;

  if (DOMESTIC_OVERRIDE_PATTERN.test(text)) return false;
  return EXTERNAL_CONFIRMATION_PATTERN.test(text) || DISTANCE_CHALLENGE_PATTERN.test(text);
}

function classifyManualTopRecordReviewStatus(record) {
  return hasExternalConfirmationHint(record)
    ? REVIEW_STATUS.NEEDS_EXTERNAL_CONFIRMATION
    : REVIEW_STATUS.SOURCE_VERIFIED;
}

module.exports = {
  REVIEW_STATUS,
  classifyManualTopRecordReviewStatus,
  hasExternalConfirmationHint,
};
