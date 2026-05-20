// simulationWorker.js

const TYPES = {
  UPPER: 0,
  MID: 1,
  LOWER: 2,
  ULT: 3,
  FORM: 4
};

const VOLTAGE_MUL = [1.0, 1.1, 1.25, 1.5, 2.0];

// Storage for all resolved configs
// allResolved[weaponId] = array of Int32Array(16), each representing a valid 5-turn sequence
let allResolved = {};

// allConfigsBase[weaponId] = array of original index sequences (each is Int8Array(5))
let allConfigsBase = {};

// Raw weapon data dictionary
let weaponDict = {};

// Pre-calculate all valid configurations for a weapon
function generateValidConfigs(weapon) {
  const uses = weapon.skills.map(s => s.uses);
  const results = [];
  
  function backtrack(path, currentUses) {
    if (path.length === 5) {
      results.push(new Int8Array(path));
      return;
    }
    for (let i = 0; i < weapon.skills.length; i++) {
      if (currentUses[i] < uses[i]) {
        path.push(i);
        currentUses[i]++;
        backtrack(path, currentUses);
        currentUses[i]--;
        path.pop();
      }
    }
  }
  
  backtrack([], new Array(weapon.skills.length).fill(0));
  return results;
}

// Resolve a config to a flat Int32Array of 16 elements:
// [type0, atk0, def0, type1, atk1, def1, ... type4, atk4, def4, weight]
function resolveConfig(weapon, configSeq) {
  const resolved = new Int32Array(16); // index 15 is weight
  let history = new Set();
  
  for (let i = 0; i < 5; i++) {
    const skillIndex = configSeq[i];
    const skill = weapon.skills[skillIndex];
    let atk = skill.atk;
    const def = skill.def;
    const t = skill.type;
    
    if (t === TYPES.ULT || t === TYPES.FORM) {
      let otherTypesCount = 0;
      for (const ht of history) {
        if (ht !== t) otherTypesCount++;
      }
      atk = Math.floor(atk * VOLTAGE_MUL[otherTypesCount]);
    }
    
    resolved[i * 3 + 0] = t;
    resolved[i * 3 + 1] = atk;
    resolved[i * 3 + 2] = def;
    
    history.add(t);
  }
  
  // Calculate Meta Category
  let metaCategory = 1; // 1 = REGULAR (No Ult/Formless constraint)
  const hasUltOrForm = weapon.skills.some(s => (s.type === TYPES.ULT || s.type === TYPES.FORM) && s.uses > 0);
  
  if (hasUltOrForm) {
    const t5 = resolved[4 * 3 + 0]; // 5th turn type
    const t4 = resolved[3 * 3 + 0]; // 4th turn type
    
    if (t5 === TYPES.ULT || t5 === TYPES.FORM) {
      metaCategory = 3; // META
    } else if (t4 === TYPES.ULT || t4 === TYPES.FORM) {
      metaCategory = 2; // SUB-META
    } else {
      metaCategory = 0; // NON-META
    }
  }
  
  resolved[15] = metaCategory;
  
  return resolved;
}

self.onmessage = function(e) {
  const data = e.data;
  
  if (data.type === 'INIT') {
    const weapons = data.weapons;
    allResolved = {};
    allConfigsBase = {};
    weaponDict = {};
    
    for (let w = 0; w < weapons.length; w++) {
      const weapon = weapons[w];
      weaponDict[weapon.id] = weapon;
      const validSeqs = generateValidConfigs(weapon);
      allConfigsBase[weapon.id] = validSeqs;
      
      const resolvedList = new Array(validSeqs.length);
      for (let i = 0; i < validSeqs.length; i++) {
        resolvedList[i] = resolveConfig(weapon, validSeqs[i]);
      }
      allResolved[weapon.id] = resolvedList;
    }
    
    self.postMessage({ type: 'INIT_DONE' });
  }
  else if (data.type === 'INIT_FAST') {
    const weapons = data.weapons;
    allResolved = {};
    allConfigsBase = {};
    weaponDict = {};
    
    for (let w = 0; w < weapons.length; w++) {
      const weapon = weapons[w];
      weaponDict[weapon.id] = weapon;
    }
    
    self.postMessage({ type: 'INIT_FAST_DONE' });
  }
  else if (data.type === 'PRECALCULATE_ALL') {
    for (const key in weaponDict) {
      const weapon = weaponDict[key];
      if (!allResolved[weapon.id]) {
        const validSeqs = generateValidConfigs(weapon);
        allConfigsBase[weapon.id] = validSeqs;
        
        const resolvedList = new Array(validSeqs.length);
        for (let i = 0; i < validSeqs.length; i++) {
          resolvedList[i] = resolveConfig(weapon, validSeqs[i]);
        }
        allResolved[weapon.id] = resolvedList;
      }
    }
    self.postMessage({ type: 'PRECALCULATE_ALL_DONE' });
  }
  else if (data.type === 'SIMULATE') {
    const { myWeaponId, targetWeaponIds, metaPolicy = 'exclusion' } = data;
    
    let myResolvedList = allResolved[myWeaponId];
    let mySeqs = allConfigsBase[myWeaponId];
    
    if (!myResolvedList && weaponDict[myWeaponId]) {
      mySeqs = generateValidConfigs(weaponDict[myWeaponId]);
      myResolvedList = new Array(mySeqs.length);
      for(let i=0; i<mySeqs.length; i++) {
        myResolvedList[i] = resolveConfig(weaponDict[myWeaponId], mySeqs[i]);
      }
    }
    
    if (!myResolvedList) return;
    
    // Determine opponent configurations
    let targetResolvedLists = [];
    if (!targetWeaponIds || targetWeaponIds.length === 0) {
      for (const key in allResolved) {
        targetResolvedLists.push(allResolved[key]);
      }
    } else {
      for (const tid of targetWeaponIds) {
        if (allResolved[tid]) {
          targetResolvedLists.push(allResolved[tid]);
        }
      }
    }
    
    // Define Weight Mapping based on policy
    // categories: 3=META, 2=SUB-META, 1=REGULAR, 0=NON-META
    let weightMap = { 3: 10, 2: 2, 1: 1, 0: 0 };
    if (metaPolicy === 'soft') {
      weightMap = { 3: 10, 2: 2, 1: 1, 0: 0.1 };
    } else if (metaPolicy === 'uniform') {
      weightMap = { 3: 1, 2: 1, 1: 1, 0: 1 };
    }
    
    // Flatten opponents and apply weights
    const opponents = [];
    const opWeights = []; // Store resolved weights side-by-side
    let totalOpWeight = 0;
    
    for (const list of targetResolvedLists) {
      for (let i = 0; i < list.length; i++) {
        const cat = list[i][15];
        const w = weightMap[cat];
        if (w > 0) {
          opponents.push(list[i]);
          opWeights.push(w);
          totalOpWeight += w;
        }
      }
    }
    
    const totalMatches = opponents.length; // raw filtered match count
    const results = [];
    
    for (let c = 0; c < myResolvedList.length; c++) {
      const myRes = myResolvedList[c];
      
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let weightedWins = 0;
      
      for (let o = 0; o < totalMatches; o++) {
        const opRes = opponents[o];
        const w = opWeights[o];
        let myScore = 0;
        let opScore = 0;
        
        for (let t = 0; t < 5; t++) {
          const idx = t * 3;
          const t1 = myRes[idx];
          const a1 = myRes[idx+1];
          const d1 = myRes[idx+2];
          
          const t2 = opRes[idx];
          const a2 = opRes[idx+1];
          const d2 = opRes[idx+2];
          
          if (t1 === t2) {
            myScore += Math.max(0, Math.floor(a1 / 2) - d2);
            opScore += Math.max(0, Math.floor(a2 / 2) - d1);
          } else {
            const p1Wins = 
              (t1 === 0 && (t2 === 1 || t2 === 4)) ||
              (t1 === 1 && (t2 === 2 || t2 === 4)) ||
              (t1 === 2 && (t2 === 0 || t2 === 4)) ||
              (t1 === 3 && (t2 === 0 || t2 === 1 || t2 === 2)) ||
              (t1 === 4 && (t2 === 3));
              
            if (p1Wins) {
              myScore += Math.max(0, a1 - d2);
            } else {
              opScore += Math.max(0, a2 - d1);
            }
          }
        }
        
        if (myScore > opScore) {
          wins++;
          weightedWins += w;
        }
        else if (myScore < opScore) {
          losses++;
        }
        else {
          draws++;
        }
      }
      
      const winRate = totalOpWeight > 0 ? weightedWins / totalOpWeight : 0;
      results.push({
        seqIndex: c,
        sequence: Array.from(mySeqs[c]), // [0,1,2,3,4] skill indices
        winRate,
        wins,
        draws,
        losses,
        totalMatches
      });
    }
    
    // Sort descending by winRate, then wins
    results.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    });
    
    // Top 5
    const top5 = results.slice(0, 5);
    
    self.postMessage({
      type: 'SIMULATE_RESULT',
      myWeaponId,
      topConfigs: top5
    });
  }
  else if (data.type === 'SIMULATE_MASTERS') {
    const { myWeaponId, targetConfigs, wmSortPolicy = 'winrate' } = data;
    
    // Opponents are exactly the targetConfigs (weight = 1)
    const opponents = [];
    const opWeights = [];
    let totalOpWeight = 0;
    
    for (let c = 0; c < targetConfigs.length; c++) {
      const configInfo = targetConfigs[c];
      const { weaponId, sequence } = configInfo;
      
      const weapon = weaponDict[weaponId];
      if (weapon) {
        const resolved = resolveConfig(weapon, sequence);
        opponents.push(resolved);
        opWeights.push(1); // No meta weight in weapon master mode
        totalOpWeight += 1;
      }
    }
    
    const totalMatches = opponents.length;
    const results = [];
    
    let myResolvedList = allResolved[myWeaponId];
    let mySeqs = allConfigsBase[myWeaponId];
    
    if (!myResolvedList && weaponDict[myWeaponId]) {
      mySeqs = generateValidConfigs(weaponDict[myWeaponId]);
      myResolvedList = new Array(mySeqs.length);
      for(let i=0; i<mySeqs.length; i++) {
        myResolvedList[i] = resolveConfig(weaponDict[myWeaponId], mySeqs[i]);
      }
    }
    
    if (!myResolvedList) return;
    
    for (let c = 0; c < myResolvedList.length; c++) {
      const myRes = myResolvedList[c];
      
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let weightedWins = 0;
      
      for (let o = 0; o < totalMatches; o++) {
        const opRes = opponents[o];
        const w = opWeights[o];
        let myScore = 0;
        let opScore = 0;
        
        for (let t = 0; t < 5; t++) {
          const idx = t * 3;
          const t1 = myRes[idx];
          const a1 = myRes[idx+1];
          const d1 = myRes[idx+2];
          
          const t2 = opRes[idx];
          const a2 = opRes[idx+1];
          const d2 = opRes[idx+2];
          
          if (t1 === t2) {
            myScore += Math.max(0, Math.floor(a1 / 2) - d2);
            opScore += Math.max(0, Math.floor(a2 / 2) - d1);
          } else {
            const p1Wins = 
              (t1 === 0 && (t2 === 1 || t2 === 4)) ||
              (t1 === 1 && (t2 === 2 || t2 === 4)) ||
              (t1 === 2 && (t2 === 0 || t2 === 4)) ||
              (t1 === 3 && (t2 === 0 || t2 === 1 || t2 === 2)) ||
              (t1 === 4 && (t2 === 3));
              
            if (p1Wins) {
              myScore += Math.max(0, a1 - d2);
            } else {
              opScore += Math.max(0, a2 - d1);
            }
          }
        }
        
        if (myScore > opScore) {
          wins++;
          weightedWins += w;
        }
        else if (myScore < opScore) {
          losses++;
        }
        else {
          draws++;
        }
      }
      
      const winRate = totalOpWeight > 0 ? weightedWins / totalOpWeight : 0;
      results.push({
        seqIndex: c,
        sequence: Array.from(mySeqs[c]),
        winRate,
        wins,
        draws,
        losses,
        totalMatches
      });
    }
    
    results.sort((a, b) => {
      if (wmSortPolicy === 'draws') {
        // もしどちらかが勝率100%なら、100%の方を無条件で上にする
        if (a.winRate === 1 && b.winRate !== 1) return -1;
        if (b.winRate === 1 && a.winRate !== 1) return 1;
        
        // 勝率が共に100%でない、または共に100%の場合
        if (b.winRate !== a.winRate) {
          // 引き分け数が多い方を優先
          if (a.draws !== b.draws) return b.draws - a.draws;
          // 引き分け数が同じなら勝率が高い方を優先
          return b.winRate - a.winRate;
        }
      }
      
      // wmSortPolicy === 'winrate'、または引き分け/勝率が同じ場合のフォールバック
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    });
    
    const top3 = results.slice(0, 3);
    
    self.postMessage({
      type: 'SIMULATE_MASTERS_RESULT',
      myWeaponId,
      topConfigs: top3
    });
  }
  else if (data.type === 'SIMULATE_DESTROYER') {
    const { myWeaponId, targetConfigs } = data;
    
    let myResolvedList = allResolved[myWeaponId];
    let mySeqs = allConfigsBase[myWeaponId];
    
    if (!myResolvedList && weaponDict[myWeaponId]) {
      mySeqs = generateValidConfigs(weaponDict[myWeaponId]);
      myResolvedList = new Array(mySeqs.length);
      for(let i=0; i<mySeqs.length; i++) {
        myResolvedList[i] = resolveConfig(weaponDict[myWeaponId], mySeqs[i]);
      }
    }
    
    if (!myResolvedList) return;

    // 敵武器ごとに構成をグループ化
    const enemyGroups = {};
    for (const cfg of targetConfigs) {
      if (!enemyGroups[cfg.weaponId]) enemyGroups[cfg.weaponId] = [];
      const weapon = weaponDict[cfg.weaponId];
      if (weapon) {
        enemyGroups[cfg.weaponId].push(resolveConfig(weapon, cfg.sequence));
      }
    }
    
    const enemyIds = Object.keys(enemyGroups);
    if (enemyIds.length === 0) return;
    
    const defeatedEnemies = Array.from({ length: myResolvedList.length }, () => []);
    const totalWinRates = new Array(myResolvedList.length).fill(0);
    
    let progressCount = 0;
    for (const eId of enemyIds) {
      const opponents = enemyGroups[eId];
      const totalMatches = opponents.length;
      
      for (let c = 0; c < myResolvedList.length; c++) {
        const myRes = myResolvedList[c];
        let wins = 0;
        let losses = 0;
        
        for (let o = 0; o < totalMatches; o++) {
          const opRes = opponents[o];
          let myScore = 0;
          let opScore = 0;
          
          for (let t = 0; t < 5; t++) {
            const idx = t * 3;
            const t1 = myRes[idx];
            const a1 = myRes[idx+1];
            const d1 = myRes[idx+2];
            
            const t2 = opRes[idx];
            const a2 = opRes[idx+1];
            const d2 = opRes[idx+2];
            
            if (t1 === t2) {
              myScore += Math.max(0, Math.floor(a1 / 2) - d2);
              opScore += Math.max(0, Math.floor(a2 / 2) - d1);
            } else {
              const p1Wins = 
                (t1 === 0 && (t2 === 1 || t2 === 4)) ||
                (t1 === 1 && (t2 === 2 || t2 === 4)) ||
                (t1 === 2 && (t2 === 0 || t2 === 4)) ||
                (t1 === 3 && (t2 === 0 || t2 === 1 || t2 === 2)) ||
                (t1 === 4 && (t2 === 3));
                
              if (p1Wins) {
                myScore += Math.max(0, a1 - d2);
              } else {
                opScore += Math.max(0, a2 - d1);
              }
            }
          }
          
          if (myScore > opScore) wins++;
          else if (myScore < opScore) losses++;
        }
        
        const winRate = wins / totalMatches;
        totalWinRates[c] += winRate;
        
        // 勝ち越し (wins > losses) を「倒せる」と判定
        if (wins > losses) {
          defeatedEnemies[c].push(parseInt(eId, 10));
        }
      }

      progressCount++;
      self.postMessage({
        type: 'SIMULATE_DESTROYER_PROGRESS',
        progress: Math.round((progressCount / enemyIds.length) * 100)
      });
    }
    
    const finalResults = [];
    for (let c = 0; c < myResolvedList.length; c++) {
      finalResults.push({
        seqIndex: c,
        sequence: Array.from(mySeqs[c]),
        defeatedWeaponIds: defeatedEnemies[c],
        frequency: defeatedEnemies[c].length,
        overallWinRate: totalWinRates[c] / enemyIds.length
      });
    }
    
    // 頻度順、同数なら総合勝率順でソート
    finalResults.sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return b.overallWinRate - a.overallWinRate;
    });
    
    // 少なくとも1つの敵武器を倒せる構成のみを出力
    const validConfigs = finalResults.filter(r => r.frequency > 0);
    
    self.postMessage({
      type: 'SIMULATE_DESTROYER_RESULT',
      myWeaponId,
      topConfigs: validConfigs
    });
  }
  else if (data.type === 'UPDATE_EXTRA_WEAPONS') {
    const extraWeapons = data.extraWeapons;
    for (let w = 0; w < extraWeapons.length; w++) {
      const weapon = extraWeapons[w];
      weaponDict[weapon.id] = weapon;
      // Do NOT pre-calculate valid configs for extra weapons to prevent OOM
    }
    self.postMessage({ type: 'UPDATE_EXTRA_WEAPONS_DONE' });
  }
};
