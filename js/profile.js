// Player profile: nickname, birthday, coins and TBS, saved on this device only.
const KEY = 'psychwar.profile.v1';

// Common first names. A nickname that is (or contains) one of these looks
// like a real name, so we ask for a fun nickname instead.
const REAL_NAMES = [
  'amir', 'ameer', 'osama', 'usama', 'huzebi', 'alhuzebi', 'mohammed', 'mohamed', 'muhammad', 'mohammad',
  'ahmed', 'ahmad', 'ali', 'omar', 'umar', 'abdullah', 'abdulrahman', 'khalid', 'khaled', 'saad', 'fahad',
  'faisal', 'sultan', 'saud', 'nasser', 'nasir', 'hamza', 'yousef', 'yusuf', 'joseph', 'ibrahim', 'ismail',
  'hassan', 'hasan', 'hussein', 'husain', 'mansour', 'majed', 'majid', 'salman', 'turki', 'bandar', 'nawaf',
  'rayan', 'ryan', 'ziad', 'zaid', 'zayed', 'yasser', 'yasir', 'adel', 'adil', 'tariq', 'tarek', 'waleed',
  'walid', 'hamad', 'hamed', 'hamid', 'sami', 'samir', 'karim', 'kareem', 'mustafa', 'mostafa', 'anas',
  'bilal', 'jamal', 'kamal', 'nabil', 'rashid', 'rashed', 'saleh', 'salem', 'sultan', 'talal', 'yahya',
  'fatima', 'fatimah', 'aisha', 'aysha', 'maryam', 'mariam', 'sara', 'sarah', 'noura', 'nora', 'nour', 'noor',
  'layla', 'leila', 'lina', 'reem', 'rana', 'hana', 'huda', 'amal', 'asma', 'dana', 'jana', 'jood', 'joud',
  'maha', 'mona', 'muna', 'nada', 'rawan', 'razan', 'ruba', 'salma', 'sana', 'shahad', 'yara', 'zainab',
  'john', 'james', 'david', 'michael', 'daniel', 'adam', 'noah', 'liam', 'lucas', 'oliver', 'jack', 'harry',
  'emma', 'olivia', 'sophia', 'mia', 'emily', 'anna', 'lily', 'grace',
];

const ADJECTIVES = ['Turbo', 'Shadow', 'Rocket', 'Sneaky', 'Mighty', 'Crazy', 'Golden', 'Ninja', 'Thunder', 'Super', 'Speedy', 'Funky'];
const ANIMALS = ['Falcon', 'Camel', 'Fox', 'Panda', 'Gecko', 'Hawk', 'Tiger', 'Shark', 'Oryx', 'Wolf', 'Cobra', 'Llama'];

export function randomNickname(rand = Math.random) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  return `${pick(ADJECTIVES)}${pick(ANIMALS)}${Math.floor(rand() * 90) + 10}`;
}

// Returns an error message, or '' when the nickname is OK.
export function validateNickname(raw) {
  const name = String(raw ?? '').trim();
  if (name.length < 3) return 'Your nickname needs at least 3 letters.';
  if (name.length > 16) return 'Your nickname can have at most 16 letters.';
  if (/\s/.test(name)) return 'No spaces please. Try something like ShadowFox99.';
  if (!/^[A-Za-z0-9_]+$/.test(name)) return 'Use only English letters, numbers and _';
  const letters = name.toLowerCase().replace(/[^a-z]/g, '');
  const looksReal = REAL_NAMES.some((n) => letters === n || (n.length >= 4 && letters.includes(n)));
  if (looksReal) return "That looks like a real name! Use a secret nickname instead (tap 🎲).";
  return '';
}

export function parseBirthday(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str ?? ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

export function ageOn(birthday, today = new Date()) {
  let age = today.getFullYear() - birthday.getFullYear();
  const before = today.getMonth() < birthday.getMonth()
    || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate());
  if (before) age -= 1;
  return age;
}

// Returns an error message, or '' when the birthday is OK.
export function validateBirthday(str, today = new Date()) {
  const d = parseBirthday(str);
  if (!d) return 'Please enter your birthday.';
  if (d > today) return "That birthday hasn't happened yet!";
  const age = ageOn(d, today);
  if (age < 4 || age > 99) return 'Please check your birthday.';
  return '';
}

export function isBirthdayToday(str, today = new Date()) {
  const d = parseBirthday(str);
  return !!d && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && !validateNickname(p.nickname) && !validateBirthday(p.birthday)) {
      return { coins: 0, tbs: 0, matches: 0, totalTags: 0, ...p };
    }
  } catch { /* storage unavailable or corrupt */ }
  return null;
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch { /* storage unavailable: progress lasts for this visit only */ }
}

// Level grows with tag-outs; bots use it to pick their difficulty.
export function levelOf(profile) {
  return 1 + Math.floor(Math.sqrt((profile.totalTags ?? 0) / 5));
}

export function botDifficulty(profile) {
  return Math.min(1, 0.12 + (levelOf(profile) - 1) * 0.08);
}
