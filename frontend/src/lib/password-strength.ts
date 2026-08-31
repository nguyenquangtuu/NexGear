export type PasswordStrengthResult = {
  checks: {
    length: boolean;
    lower: boolean;
    upper: boolean;
    number: boolean;
    special: boolean;
    noWhitespace: boolean;
  };
  score: number;
  label: string;
  tone: string;
  isStrong: boolean;
  unmetRequirements: string[];
  hint: string;
};

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    noWhitespace: password.length > 0 && !/\s/.test(password),
  };

  const score = [
    checks.length,
    checks.lower,
    checks.upper,
    checks.number,
    checks.special,
    checks.noWhitespace,
  ].filter(Boolean).length;

  let label = 'Yếu';
  let tone = 'bg-red-500';

  if (score >= 6) {
    label = 'Rất mạnh';
    tone = 'bg-emerald-500';
  } else if (score >= 5) {
    label = 'Đạt yêu cầu';
    tone = 'bg-green-500';
  } else if (score >= 4) {
    label = 'Tạm ổn';
    tone = 'bg-amber-500';
  }

  const unmetRequirements: string[] = [];

  if (!checks.length) unmetRequirements.push('Tối thiểu 8 ký tự');
  if (!checks.lower) unmetRequirements.push('Thêm chữ thường');
  if (!checks.upper) unmetRequirements.push('Thêm chữ hoa');
  if (!checks.number) unmetRequirements.push('Thêm chữ số');
  if (!checks.special) unmetRequirements.push('Thêm ký tự đặc biệt');
  if (!checks.noWhitespace) unmetRequirements.push('Bỏ khoảng trắng');

  const hint = unmetRequirements[0] || 'Đạt yêu cầu';

  return {
    checks,
    score,
    label,
    tone,
    isStrong: score >= 5,
    unmetRequirements,
    hint,
  };
}
