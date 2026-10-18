// This check describes page structure, not whether an article mentions CAPTCHA.
function sourceValidity({ text = "", title = "", url = "", html = "", truncated = false } = {}) {
  const body = String(text).trim();
  const compact = body.replace(/\s+/gu, " ");
  let redirect = false;
  try { redirect = /(?:appmsgcaptcha|\/captcha(?:\/|$)|\/challenge(?:\/|$))/iu.test(new URL(url).hostname + new URL(url).pathname); } catch {}
  const wallTitle = /^(?:环境异常|安全验证|人机验证|访问验证|登录验证|请(?:先)?登录|登录|sign in|access denied|just a moment)[.!。… ]*$/iu.test(String(title).trim());
  const verificationBody = /^(?:环境异常\s*)?当前环境异常[，, ]*完成验证后即可继续访问[。.! ]*去验证/u.test(compact) || /^(?:验证码|人机验证|安全验证|captcha)$/iu.test(compact) || /^(?:环境异常\s*)?(?:当前环境异常[，, ]*)?完成验证后即可继续访问[。.! ]*(?:去验证)?$/u.test(compact)
    || /^(?:环境异常\s*)?当前环境异常[，, ]*完成验证后即可继续访问[。.! ]*(?:去验证)?$/u.test(compact);
  const form = /<(?:input|form)\b[^>]*(?:password|captcha|challenge|login)/iu.test(html);
  const denied = /^(?:(?:403|404|500|502|503)\s*)?(?:access denied|forbidden|not found|service unavailable|页面不存在|访问被拒绝)[.!。 ]*$/iu.test(compact);
  if (redirect || body.length < 1200 && (verificationBody || denied || wallTitle && (form || /(?:验证|登录|captcha|sign in|checking|verify)/iu.test(body)))) {
    return { valid: false, code: "SOURCE_VERIFICATION_REQUIRED", reason: redirect ? "verification_redirect" : denied ? "error_page" : /^(?:验证码|人机验证|安全验证|captcha)$/iu.test(compact) ? "short_verification_page" : "verification_page" };
  }
  if (!body || truncated) return { valid: false, code: "SOURCE_BODY_INCOMPLETE", reason: truncated ? "truncated" : "empty" };
  return { valid: true };
}
function assertValidSource(source) {
  const validity = sourceValidity(source);
  if (!validity.valid) throw Object.assign(new Error(`来源不可收录：${validity.reason}`), { code: validity.code, retryable: false, validity });
  return validity;
}
export { sourceValidity, assertValidSource };
