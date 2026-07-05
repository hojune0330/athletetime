/**
 * 이메일 발송 유틸리티 (Resend)
 */

const { Resend } = require('resend');

// Resend API 키가 없으면 null로 초기화 (서버 시작은 가능하도록)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@athletetime.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || '애슬리트 타임';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://athlete-time.netlify.app';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// API 키 경고
if (!resend) {
  console.warn('⚠️  RESEND_API_KEY가 설정되지 않았습니다. 이메일 기능이 비활성화됩니다.');
}

function emailServiceNotConfigured(label, code) {
  const message = `⚠️  Resend API가 설정되지 않아 ${label} 이메일을 발송하지 않습니다.`;

  if (IS_PRODUCTION) {
    console.error(message);
  } else if (code) {
    console.warn(`${message} 인증 코드:`, code);
  } else {
    console.warn(message);
  }

  return { success: false, error: 'Email service not configured' };
}

/**
 * 인증 코드 이메일 템플릿
 */
function getVerificationEmailHtml(code, nickname) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin: 0;
    }
    .code-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      text-align: center;
      padding: 20px;
      border-radius: 10px;
      margin: 30px 0;
      font-family: 'Courier New', monospace;
    }
    .message {
      text-align: center;
      color: #666;
      margin: 20px 0;
    }
    .expire-notice {
      text-align: center;
      color: #e74c3c;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏃</div>
      <h1 class="title">애슬리트 타임</h1>
    </div>

    <p>안녕하세요, <strong>${nickname || '회원'}</strong>님!</p>
    <p>애슬리트 타임 회원가입을 환영합니다.</p>
    <p>아래 인증 코드를 입력하여 이메일 인증을 완료해주세요.</p>

    <div class="code-box">
      ${code}
    </div>

    <p class="message">
      위 코드를 회원가입 페이지에 입력해주세요.
    </p>

    <p class="expire-notice">
      ⏰ 이 인증 코드는 10분 후 만료됩니다.
    </p>

    <div class="footer">
      <p>이 메일은 발신 전용입니다.</p>
      <p>애슬리트 타임 | Every Second Counts ⏱️</p>
      <p><a href="${FRONTEND_URL}" style="color: #667eea;">athletetime.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 비밀번호 재설정 이메일 템플릿 (링크 방식)
 */
function getResetPasswordEmailHtml(resetUrl, nickname) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin: 0;
    }
    .button {
      display: inline-block;
      padding: 15px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 30px 0;
      font-weight: bold;
    }
    .button-container {
      text-align: center;
    }
    .expire-notice {
      text-align: center;
      color: #e74c3c;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔐</div>
      <h1 class="title">비밀번호 재설정</h1>
    </div>

    <p>안녕하세요, <strong>${nickname || '회원'}</strong>님!</p>
    <p>비밀번호 재설정 요청을 받았습니다.</p>
    <p>아래 버튼을 클릭하여 비밀번호를 재설정하세요.</p>

    <div class="button-container">
      <a href="${resetUrl}" class="button">비밀번호 재설정하기</a>
    </div>

    <p class="expire-notice">
      ⏰ 이 링크는 1시간 후 만료됩니다.
    </p>

    <p style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 5px; font-size: 14px;">
      ⚠️ 비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시하셔도 됩니다.
    </p>

    <div class="footer">
      <p>이 메일은 발신 전용입니다.</p>
      <p>애슬리트 타임 | Every Second Counts ⏱️</p>
      <p><a href="${FRONTEND_URL}" style="color: #667eea;">athletetime.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 비밀번호 재설정 인증 코드 이메일 템플릿
 */
function getResetPasswordCodeEmailHtml(code, nickname) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin: 0;
    }
    .code-box {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      text-align: center;
      padding: 20px;
      border-radius: 10px;
      margin: 30px 0;
      font-family: 'Courier New', monospace;
    }
    .message {
      text-align: center;
      color: #666;
      margin: 20px 0;
    }
    .expire-notice {
      text-align: center;
      color: #e74c3c;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    .warning {
      margin-top: 30px;
      padding: 15px;
      background-color: #fff3cd;
      border-radius: 5px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔐</div>
      <h1 class="title">비밀번호 재설정</h1>
    </div>

    <p>안녕하세요, <strong>${nickname || '회원'}</strong>님!</p>
    <p>비밀번호 재설정을 위한 인증 코드입니다.</p>
    <p>아래 인증 코드를 입력하여 본인 확인을 완료해주세요.</p>

    <div class="code-box">
      ${code}
    </div>

    <p class="message">
      위 코드를 비밀번호 찾기 화면에 입력해주세요.
    </p>

    <p class="expire-notice">
      ⏰ 이 인증 코드는 10분 후 만료됩니다.
    </p>

    <p class="warning">
      ⚠️ 비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시하셔도 됩니다.
    </p>

    <div class="footer">
      <p>이 메일은 발신 전용입니다.</p>
      <p>애슬리트 타임 | Every Second Counts ⏱️</p>
      <p><a href="${FRONTEND_URL}" style="color: #667eea;">athletetime.com</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 인증 코드 이메일 발송
 */
async function sendVerificationEmail(email, code, nickname) {
  if (!resend) {
    return emailServiceNotConfigured('인증 코드', code);
  }
  
  try {
    console.log('📧 이메일 발송 시도:', { to: email, from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>` });
    
    const result = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: email,
      subject: `[애슬리트 타임] 이메일 인증 코드: ${code}`,
      html: getVerificationEmailHtml(code, nickname)
    });

    console.log('✅ 인증 이메일 발송 성공:', JSON.stringify(result, null, 2));
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('❌ 인증 이메일 발송 실패:', JSON.stringify(error, null, 2));
    console.error('❌ 에러 메시지:', error.message);
    console.error('❌ 에러 상세:', error.response?.data || error);
    throw new Error('이메일 발송에 실패했습니다');
  }
}

/**
 * 비밀번호 재설정 이메일 발송 (링크 방식)
 */
async function sendResetPasswordEmail(email, resetToken, nickname) {
  if (!resend) {
    return emailServiceNotConfigured('비밀번호 재설정');
  }
  
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  try {
    const result = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: email,
      subject: '[애슬리트 타임] 비밀번호 재설정',
      html: getResetPasswordEmailHtml(resetUrl, nickname)
    });

    console.log('✅ 비밀번호 재설정 이메일 발송 성공:', result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('❌ 비밀번호 재설정 이메일 발송 실패:', error);
    throw new Error('이메일 발송에 실패했습니다');
  }
}

/**
 * 비밀번호 재설정 인증 코드 이메일 발송
 */
async function sendResetPasswordCodeEmail(email, code, nickname) {
  if (!resend) {
    return emailServiceNotConfigured('비밀번호 재설정 인증 코드', code);
  }
  
  try {
    console.log('📧 비밀번호 재설정 인증 코드 이메일 발송 시도:', { to: email, from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>` });
    
    const result = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: email,
      subject: `[애슬리트 타임] 비밀번호 재설정 인증 코드: ${code}`,
      html: getResetPasswordCodeEmailHtml(code, nickname)
    });

    console.log('✅ 비밀번호 재설정 인증 코드 이메일 발송 성공:', JSON.stringify(result, null, 2));
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('❌ 비밀번호 재설정 인증 코드 이메일 발송 실패:', JSON.stringify(error, null, 2));
    console.error('❌ 에러 메시지:', error.message);
    throw new Error('이메일 발송에 실패했습니다');
  }
}

/**
 * 환영 이메일 발송
 */
async function sendWelcomeEmail(email, nickname) {
  if (!resend) {
    console.warn('⚠️  Resend API가 설정되지 않아 이메일을 발송하지 않습니다.');
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const result = await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: email,
      subject: '[애슬리트 타임] 가입을 환영합니다! 🏃',
      html: `
        <h1>환영합니다, ${nickname}님! 🎉</h1>
        <p>애슬리트 타임 커뮤니티에 가입하신 것을 진심으로 환영합니다.</p>
        <p>이제 다양한 육상 선수들과 소통하고 정보를 공유할 수 있습니다.</p>
        <p><a href="${FRONTEND_URL}">커뮤니티 바로가기 →</a></p>
        <p>Every Second Counts ⏱️</p>
      `
    });

    console.log('✅ 환영 이메일 발송 성공:', result.id);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('❌ 환영 이메일 발송 실패:', error);
    // 환영 이메일은 실패해도 무시
    return { success: false };
  }
}

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendResetPasswordCodeEmail,
  sendWelcomeEmail
};
