const PROJECT_REF_PATTERN = /^project-\d{8}-[a-f0-9]{8}$/;

function directiveError(code, message) {
  return Object.assign(new Error(message), { code });
}

function parseProjectDirective(text) {
  const original = String(text ?? "");
  const lines = original.split(/\r?\n/u);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex < 0) return { projectRef: "", textWithoutDirective: original, hadDirective: false };
  const firstLine = lines[firstContentIndex].trim();
  if (!/^\/project(?:\s|$)/u.test(firstLine)) return { projectRef: "", textWithoutDirective: original, hadDirective: false };
  const match = /^\/project\s+([^\s]+)\s*$/u.exec(firstLine);
  if (!match || !PROJECT_REF_PATTERN.test(match[1])) {
    throw directiveError("PROJECT_DIRECTIVE_INVALID", "Project 指令格式无效：请使用 /project <projectRef>");
  }
  const textWithoutDirective = lines.slice(firstContentIndex + 1).join("\n").trim();
  if (!textWithoutDirective) throw directiveError("PROJECT_DIRECTIVE_BODY_REQUIRED", "Project 指令后必须提供用户正文");
  return { projectRef: match[1], textWithoutDirective, hadDirective: true };
}

export { PROJECT_REF_PATTERN, parseProjectDirective };
