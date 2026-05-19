export const TYPES = {
  UPPER: 0,
  MID: 1,
  LOWER: 2,
  ULT: 3,
  FORM: 4
};

const TYPE_MAP = {
  '上段': TYPES.UPPER,
  '中段': TYPES.MID,
  '下段': TYPES.LOWER,
  '奥義': TYPES.ULT,
  '無形': TYPES.FORM
};

export async function loadWeapons() {
  const response = await fetch('/data.txt?v=' + Date.now());
  if (!response.ok) {
    throw new Error('Failed to load data.txt');
  }
  const text = await response.text();
  
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  const weapons = [];
  
  let currentSkills = [];
  let weaponId = 0;
  
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 4) continue;
    
    const icon = parts[0];
    const skillNamePart = parts[1];
    const typeStr = parts[2];
    const statsStr = parts[3];
    const desc = parts[4] || '';
    
    // Extract base name from skillNamePart (e.g. "カットオフ/350/0/2" -> "カットオフ")
    const nameMatch = skillNamePart.split('/');
    const skillName = nameMatch[0].trim();
    
    // Extract stats: (atk/def/uses)
    const statsMatch = statsStr.match(/\(([-0-9]+)\/([-0-9]+)\/([-0-9]+)\)/);
    let atk = 0, def = 0, uses = 0;
    if (statsMatch) {
      atk = parseInt(statsMatch[1], 10);
      def = parseInt(statsMatch[2], 10);
      uses = parseInt(statsMatch[3], 10);
    }
    
    const type = TYPE_MAP[typeStr] !== undefined ? TYPE_MAP[typeStr] : -1;
    
    currentSkills.push({
      name: skillName,
      type,
      atk,
      def,
      uses,
      icon,
      desc
    });
    
    if (currentSkills.length === 5) {
      let weaponName = currentSkills[0].name;
      
      // Try to extract weapon name from the first column (e.g., "[バトルアックス] スキル1")
      const firstCol = currentSkills[0].icon;
      const bracketMatch = firstCol.match(/\[(.*?)\]/);
      if (bracketMatch) {
        weaponName = bracketMatch[1].trim();
      }
      
      weapons.push({
        id: weaponId++,
        name: weaponName,
        skills: currentSkills
      });
      currentSkills = [];
    }
  }
  
  return weapons;
}
