import { useEffect, useState, useRef } from 'react';
import { loadWeapons, TYPES } from './dataParser';

const TYPE_LABELS = {
  [TYPES.UPPER]: '上段',
  [TYPES.MID]: '中段',
  [TYPES.LOWER]: '下段',
  [TYPES.ULT]: '奥義',
  [TYPES.FORM]: '無形'
};

function App() {
  const [weapons, setWeapons] = useState([]);
  const [workerReady, setWorkerReady] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mode, setMode] = useState('global'); // 'global' or 'target'
  const [metaPolicy, setMetaPolicy] = useState('exclusion'); // 'exclusion', 'soft', 'uniform'
  const [wmSortPolicy, setWmSortPolicy] = useState('winrate'); // 'winrate', 'draws'
  
  const [myWeaponId, setMyWeaponId] = useState('');
  const [targetWeaponIds, setTargetWeaponIds] = useState([]);
  
  const [weaponMasterConfigs, setWeaponMasterConfigs] = useState(() => {
    const saved = localStorage.getItem('bo5_weaponMasterConfigs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved configs", e);
      }
    }
    return [];
  });
  
  const [extraWeapons, setExtraWeapons] = useState(() => {
    const saved = localStorage.getItem('bo5_extraWeapons');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });
  const [isExtraWeaponFormOpen, setIsExtraWeaponFormOpen] = useState(false);
  const [isMasterConfigsOpen, setIsMasterConfigsOpen] = useState(true);
  const [myWeaponSearchQuery, setMyWeaponSearchQuery] = useState('');
  const [wmWeaponSearchQuery, setWmWeaponSearchQuery] = useState('');
  const [targetWeaponSearchQuery, setTargetWeaponSearchQuery] = useState('');
  const [masterConfigSearchQuery, setMasterConfigSearchQuery] = useState('');
  const [editingExtraWeaponId, setEditingExtraWeaponId] = useState(null);
  const [newExtraWeaponName, setNewExtraWeaponName] = useState('');
  const [newExtraWeaponSkills, setNewExtraWeaponSkills] = useState([
    { name: '', type: TYPES.UPPER, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.MID, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.LOWER, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.ULT, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.FORM, atk: 0, def: 0, uses: 1, icon: '', desc: '' }
  ]);
  
  const resetExtraWeaponForm = () => {
    setEditingExtraWeaponId(null);
    setNewExtraWeaponName('');
    setNewExtraWeaponSkills([
      { name: '', type: TYPES.UPPER, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
      { name: '', type: TYPES.MID, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
      { name: '', type: TYPES.LOWER, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
      { name: '', type: TYPES.ULT, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
      { name: '', type: TYPES.FORM, atk: 0, def: 0, uses: 1, icon: '', desc: '' }
    ]);
  };

  const [wmSelectedWeaponId, setWmSelectedWeaponId] = useState('');
  const [wmSelectedSkills, setWmSelectedSkills] = useState([0, 0, 0, 0, 0]);
  const [wmLastSimulatedWeaponId, setWmLastSimulatedWeaponId] = useState(null);
  
  const [results, setResults] = useState(null);
  
  const workerRef = useRef(null);
  
  const allWeapons = [...weapons, ...extraWeapons];

  const filteredMyWeapons = allWeapons.filter(w => w.name.toLowerCase().includes(myWeaponSearchQuery.toLowerCase()));
  const filteredWmWeapons = allWeapons.filter(w => w.name.toLowerCase().includes(wmWeaponSearchQuery.toLowerCase()));
  const filteredTargetWeapons = allWeapons.filter(w => w.name.toLowerCase().includes(targetWeaponSearchQuery.toLowerCase()));

  useEffect(() => {
    if (filteredMyWeapons.length > 0 && !filteredMyWeapons.some(w => w.id.toString() === myWeaponId.toString())) {
      setMyWeaponId(filteredMyWeapons[0].id.toString());
    }
  }, [myWeaponSearchQuery, allWeapons]);

  useEffect(() => {
    if (filteredWmWeapons.length > 0 && !filteredWmWeapons.some(w => w.id.toString() === wmSelectedWeaponId.toString())) {
      setWmSelectedWeaponId(filteredWmWeapons[0].id.toString());
      setWmSelectedSkills([0, 0, 0, 0, 0]);
    }
  }, [wmWeaponSearchQuery, allWeapons]);

  useEffect(() => {
    localStorage.setItem('bo5_weaponMasterConfigs', JSON.stringify(weaponMasterConfigs));
  }, [weaponMasterConfigs]);

  useEffect(() => {
    localStorage.setItem('bo5_extraWeapons', JSON.stringify(extraWeapons));
    if (workerReady && workerRef.current) {
      workerRef.current.postMessage({ type: 'UPDATE_EXTRA_WEAPONS', extraWeapons });
    }
  }, [extraWeapons, workerReady]);

  useEffect(() => {
    loadWeapons().then(loadedWeapons => {
      setWeapons(loadedWeapons);
      if (loadedWeapons.length > 0) {
        setMyWeaponId(loadedWeapons[0].id.toString());
        setWmSelectedWeaponId(loadedWeapons[0].id.toString());
      }
      
      // Initialize Worker
      workerRef.current = new Worker(new URL('./simulationWorker.js', import.meta.url), { type: 'module' });
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'INIT_DONE') {
          setWorkerReady(true);
        } else if (e.data.type === 'SIMULATE_RESULT' || e.data.type === 'SIMULATE_MASTERS_RESULT') {
          setResults(e.data.topConfigs);
          setIsSimulating(false);
        } else if (e.data.type === 'UPDATE_EXTRA_WEAPONS_DONE') {
          // Additional handling if needed
        }
      };
      
      workerRef.current.postMessage({ type: 'INIT', weapons: loadedWeapons });
    }).catch(err => {
      console.error("Failed to load weapons", err);
    });

    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  const handleSimulate = () => {
    if (!workerReady) return;
    if (mode !== 'weaponmaster' && !myWeaponId) return;
    
    let targetIds = [];
    if (mode === 'target') {
      targetIds = targetWeaponIds.map(id => parseInt(id, 10));
    } else if (mode === 'global') {
      targetIds = weapons.map(w => parseInt(w.id, 10));
    }
    
    if (mode === 'weaponmaster') {
      const selectedEnemyWeaponId = parseInt(wmSelectedWeaponId, 10);
      const targetConfigs = weaponMasterConfigs.filter(c => c.weaponId === selectedEnemyWeaponId);
      
      if (targetConfigs.length === 0) {
        alert(`${weapons.find(w => w.id === selectedEnemyWeaponId)?.name} の構成が1つも登録されていません。先に構成を記録してください。`);
        return;
      }
      
      if (targetConfigs.some(c => c.sequence.includes(-1))) {
        alert("空欄のスキルが含まれている構成があります。先に構成を削除・再登録してください。");
        return;
      }
      
      setIsSimulating(true);
      setResults(null);
      setWmLastSimulatedWeaponId(selectedEnemyWeaponId);
      
      workerRef.current.postMessage({
        type: 'SIMULATE_MASTERS',
        myWeaponId: parseInt(myWeaponId, 10),
        targetConfigs: targetConfigs,
        wmSortPolicy
      });
    } else {
      setIsSimulating(true);
      setResults(null);
      
      workerRef.current.postMessage({
        type: 'SIMULATE',
        myWeaponId: parseInt(myWeaponId, 10),
        targetWeaponIds: targetIds,
        metaPolicy
      });
    }
  };

  const handleTargetSelection = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    if (selected.length <= 10) {
      setTargetWeaponIds(selected);
    } else {
      setTargetWeaponIds(selected.slice(0, 10));
    }
  };

  const handleAddMasterConfig = () => {
    const weaponIdInt = parseInt(wmSelectedWeaponId, 10);
    const weapon = allWeapons.find(w => w.id === weaponIdInt);
    if (!weapon) return;

    const currentWeaponConfigs = weaponMasterConfigs.filter(c => c.weaponId === weaponIdInt);
    if (currentWeaponConfigs.length >= 10) {
      alert(`${weapon.name} の構成はすでに最大数（10個）登録されています。`);
      return;
    }

    const isDuplicate = currentWeaponConfigs.some(c => 
      c.sequence[0] === wmSelectedSkills[0] &&
      c.sequence[1] === wmSelectedSkills[1] &&
      c.sequence[2] === wmSelectedSkills[2] &&
      c.sequence[3] === wmSelectedSkills[3] &&
      c.sequence[4] === wmSelectedSkills[4]
    );

    if (isDuplicate) {
      alert("すでに登録されています");
      return;
    }
    
    const useCounts = {};
    for (let i = 0; i < 5; i++) {
      const sIdx = wmSelectedSkills[i];
      useCounts[sIdx] = (useCounts[sIdx] || 0) + 1;
    }
    
    for (const [sIdx, count] of Object.entries(useCounts)) {
      if (count > weapon.skills[sIdx].uses) {
        alert(`${weapon.skills[sIdx].name} の使用可能回数(${weapon.skills[sIdx].uses}回)を超えています`);
        return;
      }
    }
    
    const newConfig = {
      id: Date.now() + Math.random(),
      weaponId: weaponIdInt,
      sequence: [...wmSelectedSkills]
    };
    
    setWeaponMasterConfigs([...weaponMasterConfigs, newConfig]);
  };

  const handleRemoveMasterConfig = (idToRemove) => {
    setWeaponMasterConfigs(weaponMasterConfigs.filter(c => c.id !== idToRemove));
  };

  const handleSaveExtraWeapon = () => {
    if (!newExtraWeaponName.trim()) {
      alert('武器名を入力してください。');
      return;
    }
    
    const parsedSkills = newExtraWeaponSkills.map(s => ({
      ...s, 
      atk: parseInt(s.atk, 10) || 0, 
      def: parseInt(s.def, 10) || 0, 
      uses: parseInt(s.uses, 10) || 1
    }));
    
    if (editingExtraWeaponId) {
      const updatedWeapons = extraWeapons.map(w => {
        if (w.id === editingExtraWeaponId) {
          return {
            ...w,
            name: `[Ex] ${newExtraWeaponName.trim()}`,
            skills: parsedSkills
          };
        }
        return w;
      });
      setExtraWeapons(updatedWeapons);
      setWeaponMasterConfigs(weaponMasterConfigs.map(c => {
        if (c.weaponId === editingExtraWeaponId) {
          const newSequence = [...c.sequence];
          const useCounts = {};
          for (let i = 0; i < 5; i++) {
            const sIdx = newSequence[i];
            if (sIdx >= parsedSkills.length) {
              newSequence[i] = -1;
            } else if (sIdx !== -1) {
              useCounts[sIdx] = (useCounts[sIdx] || 0) + 1;
              if (useCounts[sIdx] > parsedSkills[sIdx].uses) {
                newSequence[i] = -1;
              }
            }
          }
          return { ...c, sequence: newSequence };
        }
        return c;
      }));
    } else {
      const newId = Date.now();
      const newWeapon = {
        id: newId,
        name: `[Ex] ${newExtraWeaponName.trim()}`,
        skills: parsedSkills
      };
      setExtraWeapons([...extraWeapons, newWeapon]);
    }
    
    setIsExtraWeaponFormOpen(false);
    resetExtraWeaponForm();
  };

  const handleEditExtraWeapon = (ew) => {
    setEditingExtraWeaponId(ew.id);
    setNewExtraWeaponName(ew.name.replace(/^\[Ex\]\s*/, ''));
    setNewExtraWeaponSkills([...ew.skills]);
    setIsExtraWeaponFormOpen(true);
  };

  const handleRemoveExtraWeapon = (id) => {
    if(window.confirm('このカスタム武器を削除しますか？')) {
      setExtraWeapons(extraWeapons.filter(w => w.id !== id));
      setWeaponMasterConfigs(weaponMasterConfigs.filter(c => c.weaponId !== id));
      if (myWeaponId === id.toString()) setMyWeaponId('');
      if (wmSelectedWeaponId === id.toString()) setWmSelectedWeaponId('');
    }
  };

  const handleAddExtraSkill = () => {
    setNewExtraWeaponSkills([...newExtraWeaponSkills, { name: '', type: TYPES.UPPER, atk: 0, def: 0, uses: 1, icon: '', desc: '' }]);
  };

  const handleRemoveExtraSkill = (index) => {
    if (newExtraWeaponSkills.length > 1) {
      setNewExtraWeaponSkills(newExtraWeaponSkills.filter((_, i) => i !== index));
    }
  };

  if (!workerReady) {
    return (
      <div className="loading">
        <h1>Bo5 Simulator</h1>
        <p>シミュレーションエンジンを初期化中...（全構成を事前計算しています）</p>
      </div>
    );
  }

  const selectedWeapon = weapons.find(w => w.id === parseInt(myWeaponId, 10));

  const emptyConfigWeapons = Array.from(new Set(
    weaponMasterConfigs
      .filter(c => c.sequence.includes(-1))
      .map(c => {
        const w = allWeapons.find(w => w.id === c.weaponId);
        return w ? w.name : '不明';
      })
  ));

  return (
    <div>
      <header>
        <h1>Bo5 Simulator</h1>
        <p className="subtitle">最適構成を見つけ出すゲーム勝率計算ツール</p>
        <p className="meta-notice" style={{color: '#ffb86c', fontSize: '0.85rem', marginTop: '5px'}}>
          {mode !== 'weaponmaster' && metaPolicy === 'exclusion' && "※完全メタ（五手目奥義/無形）想定ロジック：非メタ構成を除外中"}
          {mode !== 'weaponmaster' && metaPolicy === 'soft' && "※ソフトメタ想定ロジック：非メタ構成の評価を0.1倍に残し中"}
          {mode !== 'weaponmaster' && metaPolicy === 'uniform' && "※等確率モード：すべての構成を平等に評価中（メタ無視）"}
          {mode === 'weaponmaster' && "※ウェポンマスターモード（メタ要素なし）"}
        </p>
        {emptyConfigWeapons.length > 0 && (
          <div style={{background: '#ff5555', color: '#fff', padding: '10px', borderRadius: '4px', marginTop: '10px', fontWeight: 'bold', fontSize: '0.9rem'}}>
            ⚠ 空欄のスキルがあります：{emptyConfigWeapons.join(', ')}
          </div>
        )}
      </header>
      
      <main>
        <div className="glass-panel">
          <div className="tabs">
            <button 
              className={`tab-btn ${mode === 'global' ? 'active' : ''}`}
              onClick={() => { setMode('global'); setResults(null); }}
            >
              総合評価モード
            </button>
            <button 
              className={`tab-btn ${mode === 'target' ? 'active' : ''}`}
              onClick={() => { setMode('target'); setResults(null); }}
            >
              ターゲット対策モード
            </button>
            <button 
              className={`tab-btn ${mode === 'weaponmaster' ? 'active' : ''}`}
              onClick={() => { setMode('weaponmaster'); setResults(null); }}
            >
              ウェポンマスターモード
            </button>
          </div>
          
          {mode !== 'weaponmaster' && (
            <div className="form-group" style={{marginTop: '15px'}}>
              <label>メタ環境設定（相手の思考パターン）</label>
              <div style={{display: 'flex', gap: '15px', marginTop: '5px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0}}>
                  <input type="radio" name="metaPolicy" value="exclusion" checked={metaPolicy === 'exclusion'} onChange={(e) => setMetaPolicy(e.target.value)} />
                  完全メタ (除外)
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0}}>
                  <input type="radio" name="metaPolicy" value="soft" checked={metaPolicy === 'soft'} onChange={(e) => setMetaPolicy(e.target.value)} />
                  ソフトメタ (0.1倍)
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0}}>
                  <input type="radio" name="metaPolicy" value="uniform" checked={metaPolicy === 'uniform'} onChange={(e) => setMetaPolicy(e.target.value)} />
                  等確率 (メタ無視)
                </label>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label>使用する武器を選択</label>
            <input 
              type="text" 
              placeholder="武器名で検索..." 
              value={myWeaponSearchQuery} 
              onChange={e => setMyWeaponSearchQuery(e.target.value)}
              style={{marginBottom: '5px', width: '100%', padding: '8px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff'}}
            />
            <select 
              value={myWeaponId} 
              onChange={e => setMyWeaponId(e.target.value)}
            >
              {filteredMyWeapons.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {mode === 'weaponmaster' && (
            <div className="form-group" style={{marginTop: '15px', marginBottom: '15px'}}>
              <label>評価基準</label>
              <div style={{display: 'flex', gap: '15px', marginTop: '5px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0}}>
                  <input type="radio" name="wmSortPolicy" value="winrate" checked={wmSortPolicy === 'winrate'} onChange={(e) => setWmSortPolicy(e.target.value)} />
                  勝率重視 (デフォルト)
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0}}>
                  <input type="radio" name="wmSortPolicy" value="draws" checked={wmSortPolicy === 'draws'} onChange={(e) => setWmSortPolicy(e.target.value)} />
                  引き分け優先 (勝率100%以外の場合)
                </label>
              </div>
            </div>
          )}

          {mode === 'weaponmaster' && (
            <div className="form-group">
              <label>敵の構成（ウェポンマスター）の武器を選択</label>
              <input 
                type="text" 
                placeholder="武器名で検索..." 
                value={wmWeaponSearchQuery} 
                onChange={e => setWmWeaponSearchQuery(e.target.value)}
                style={{marginBottom: '5px', width: '100%', padding: '8px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff'}}
              />
              <select 
                value={wmSelectedWeaponId} 
                onChange={e => {
                  setWmSelectedWeaponId(e.target.value);
                  setWmSelectedSkills([0, 0, 0, 0, 0]);
                }}
              >
                {filteredWmWeapons.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              
              <div style={{marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                <label>スキル構成 (1手目〜5手目)</label>
                <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                  {[0, 1, 2, 3, 4].map(turn => (
                    <select 
                      key={turn}
                      value={wmSelectedSkills[turn]}
                      onChange={(e) => {
                        const newSkills = [...wmSelectedSkills];
                        newSkills[turn] = parseInt(e.target.value, 10);
                        setWmSelectedSkills(newSkills);
                      }}
                      style={{flex: '1', minWidth: '120px'}}
                    >
                      {allWeapons.find(w => w.id === parseInt(wmSelectedWeaponId, 10))?.skills.map((s, i) => (
                        <option key={i} value={i}>{s.name} ({s.uses}回)</option>
                      ))}
                    </select>
                  ))}
                </div>
                <button 
                  className="secondary" 
                  onClick={handleAddMasterConfig}
                  disabled={weaponMasterConfigs.filter(c => c.weaponId === parseInt(wmSelectedWeaponId, 10)).length >= 10}
                  style={{marginTop: '5px'}}
                >
                  敵の構成を記録 ({weaponMasterConfigs.filter(c => c.weaponId === parseInt(wmSelectedWeaponId, 10)).length}/10)
                </button>
              </div>
              
              {weaponMasterConfigs.length > 0 && (
                <div style={{marginTop: '15px'}}>
                  <div 
                    style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px'}}
                    onClick={() => setIsMasterConfigsOpen(!isMasterConfigsOpen)}
                  >
                    <label style={{margin: 0, cursor: 'pointer'}}>記録された敵の構成（全武器合計: {weaponMasterConfigs.length}構成）</label>
                    <span style={{fontSize: '0.8rem', opacity: 0.8}}>{isMasterConfigsOpen ? '▼ 閉じる' : '▶ 開く'}</span>
                  </div>
                  {isMasterConfigsOpen && (
                    <div style={{marginTop: '10px'}}>
                      <input 
                        type="text" 
                        placeholder="記録された武器名で検索..." 
                        value={masterConfigSearchQuery} 
                        onChange={e => setMasterConfigSearchQuery(e.target.value)}
                        style={{marginBottom: '10px', width: '100%', padding: '8px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff'}}
                      />
                      <div className="ranking-list">
                        {allWeapons.filter(w => w.name.toLowerCase().includes(masterConfigSearchQuery.toLowerCase())).map(w => {
                      const cfgs = weaponMasterConfigs.filter(c => c.weaponId === w.id);
                      if (cfgs.length === 0) return null;
                      return (
                        <div key={w.id} style={{marginBottom: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px'}}>
                          <div style={{fontWeight: 'bold', color: '#8be9fd', marginBottom: '8px'}}>{w.name} ({cfgs.length}/10)</div>
                          {cfgs.map((cfg, idx) => (
                            <div key={cfg.id} className="ranking-card" style={{padding: '8px', marginBottom: '5px'}}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div style={{fontWeight: 'bold', fontSize: '0.9rem'}}>構成 {idx + 1}</div>
                                <button className="danger" onClick={() => handleRemoveMasterConfig(cfg.id)} style={{padding: '4px 8px', fontSize: '0.8rem', background: '#ff5555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>削除</button>
                              </div>
                              <div className="skill-sequence" style={{marginTop: '8px'}}>
                                {cfg.sequence.map((skillIdx, turn) => {
                                  if (skillIdx === -1) {
                                    return (
                                      <div key={turn} className="skill-tag" style={{padding: '3px 6px', fontSize: '0.8rem', background: '#555', color: '#fff', border: '1px dashed #ff5555'}}>
                                        <span className="skill-name">空欄</span>
                                      </div>
                                    );
                                  }
                                  const skill = w.skills[skillIdx];
                                  if (!skill) return null;
                                  return (
                                    <div key={turn} className="skill-tag" style={{padding: '3px 6px', fontSize: '0.8rem'}}>
                                      <span className={`skill-type type-${skill.type}`}>{TYPE_LABELS[skill.type]}</span>
                                      <span className="skill-name">{skill.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {(mode === 'target') && (
            <div className="form-group">
              <label>ターゲット武器を選択 (最大10個)</label>
              <input 
                type="text" 
                placeholder="武器名で検索..." 
                value={targetWeaponSearchQuery} 
                onChange={e => setTargetWeaponSearchQuery(e.target.value)}
                style={{marginBottom: '5px', width: '100%', padding: '8px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff'}}
              />
              <select 
                multiple 
                value={targetWeaponIds} 
                onChange={handleTargetSelection}
              >
                {filteredTargetWeapons.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <p className="target-select-info">
                Ctrl (または Cmd) を押しながらクリックで複数選択できます。({targetWeaponIds.length}/10)
              </p>
            </div>
          )}

          {mode === 'weaponmaster' && (
            <div className="form-group" style={{marginTop: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label style={{margin: 0}}>カスタム武器（エクストラエネミー）設定</label>
                <button 
                  className="secondary" 
                  style={{padding: '5px 10px', fontSize: '0.9rem'}}
                  onClick={() => {
                    if (isExtraWeaponFormOpen) {
                      resetExtraWeaponForm();
                    }
                    setIsExtraWeaponFormOpen(!isExtraWeaponFormOpen);
                  }}
                >
                  {isExtraWeaponFormOpen ? '閉じる' : '新規作成'}
                </button>
              </div>
              
              {isExtraWeaponFormOpen && (
                <div style={{marginTop: '10px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px'}}>
                  <div style={{marginBottom: '10px', fontWeight: 'bold'}}>
                    {editingExtraWeaponId ? 'カスタム武器の編集' : 'カスタム武器の新規作成'}
                  </div>
                  <div style={{marginBottom: '10px'}}>
                    <input 
                      type="text" 
                      placeholder="武器名" 
                      value={newExtraWeaponName}
                      onChange={e => setNewExtraWeaponName(e.target.value)}
                      style={{width: '100%', padding: '8px', borderRadius: '4px', border: 'none'}}
                    />
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {newExtraWeaponSkills.map((skill, idx) => (
                      <div key={idx} style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
                        <span style={{width: '40px', fontSize: '0.8rem'}}>技{idx+1}</span>
                        <input type="text" placeholder="名前" style={{flex: 2, padding: '5px'}} value={skill.name} onChange={e => {
                          const s = [...newExtraWeaponSkills]; s[idx].name = e.target.value; setNewExtraWeaponSkills(s);
                        }}/>
                        <select style={{flex: 1, padding: '5px'}} value={skill.type} onChange={e => {
                          const s = [...newExtraWeaponSkills]; s[idx].type = parseInt(e.target.value, 10); setNewExtraWeaponSkills(s);
                        }}>
                          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <input type="number" placeholder="ATK" style={{flex: 1, padding: '5px'}} value={skill.atk} onChange={e => {
                          const s = [...newExtraWeaponSkills]; s[idx].atk = e.target.value; setNewExtraWeaponSkills(s);
                        }}/>
                        <input type="number" placeholder="DEF" style={{flex: 1, padding: '5px'}} value={skill.def} onChange={e => {
                          const s = [...newExtraWeaponSkills]; s[idx].def = e.target.value; setNewExtraWeaponSkills(s);
                        }}/>
                        <input type="number" placeholder="回数" style={{flex: 1, padding: '5px'}} value={skill.uses} onChange={e => {
                          const s = [...newExtraWeaponSkills]; s[idx].uses = e.target.value; setNewExtraWeaponSkills(s);
                        }}/>
                        {newExtraWeaponSkills.length > 1 && (
                          <button className="danger" style={{padding: '5px', fontSize: '0.7rem', flex: '0 0 auto'}} onClick={() => handleRemoveExtraSkill(idx)}>✕</button>
                        )}
                      </div>
                    ))}
                    <button className="secondary" style={{padding: '5px', fontSize: '0.8rem', marginTop: '5px'}} onClick={handleAddExtraSkill}>+ スキルを追加</button>
                  </div>
                  <button className="primary" style={{marginTop: '15px', width: '100%'}} onClick={handleSaveExtraWeapon}>
                    {editingExtraWeaponId ? 'エクストラエネミーを更新' : 'エクストラエネミーを保存'}
                  </button>
                </div>
              )}
              
              {extraWeapons.length > 0 && (
                <div style={{marginTop: '15px'}}>
                  <label style={{fontSize: '0.9rem', opacity: 0.8}}>作成済みカスタム武器</label>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px'}}>
                    {extraWeapons.map(ew => (
                      <div key={ew.id} style={{background: 'rgba(255,184,108,0.2)', padding: '5px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span>{ew.name}</span>
                        <button className="secondary" style={{padding: '2px 5px', fontSize: '0.7rem'}} onClick={() => handleEditExtraWeapon(ew)}>編集</button>
                        <button className="danger" style={{padding: '2px 5px', fontSize: '0.7rem'}} onClick={() => handleRemoveExtraWeapon(ew.id)}>削除</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          
          <button 
            className="primary" 
            onClick={handleSimulate}
            disabled={isSimulating || (mode === 'target' && targetWeaponIds.length === 0)}
          >
            {isSimulating ? 'シミュレーション実行中...' : 
             mode === 'weaponmaster' ? `${selectedWeapon?.name || ''} 対 ${allWeapons.find(w => w.id === parseInt(wmSelectedWeaponId, 10))?.name} の勝率を計算` : 
             '勝率が高い構成を計算'}
          </button>
        </div>
        
        {isSimulating && (
          <div className="loading">
            <p>全マッチアップを計算中... 少々お待ちください</p>
          </div>
        )}
        
        {results && mode !== 'weaponmaster' && selectedWeapon && (
          <div className="results-container glass-panel">
            <h2>上位5つの推奨構成</h2>
            <div className="ranking-list">
              {results.map((result, i) => (
                <div key={i} className={`ranking-card rank-${i + 1}`}>
                  <div className="rank-badge">{i + 1}</div>
                  <div className="card-content">
                    <div className="stats-row">
                      <div className="win-rate">加重勝率: {(result.winRate * 100).toFixed(2)}%</div>
                      <div className="match-counts" style={{fontSize: '0.8rem', opacity: 0.8}}>
                        (メタ対象{result.totalMatches}種中: <span className="count w">{result.wins} 勝</span> /
                        <span className="count d">{result.draws} 分</span> /
                        <span className="count l">{result.losses} 敗</span>)
                      </div>
                    </div>
                    <div className="skill-sequence">
                      {result.sequence.map((skillIdx, turn) => {
                        const skill = selectedWeapon.skills[skillIdx];
                        return (
                          <div key={turn} className="skill-tag">
                            <span className={`skill-type type-${skill.type}`}>
                              {TYPE_LABELS[skill.type]}
                            </span>
                            <span className="skill-name">{skill.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results && mode === 'weaponmaster' && selectedWeapon && (
          <div className="results-container glass-panel">
            <h2>対 {allWeapons.find(w => w.id === wmLastSimulatedWeaponId)?.name} 勝率トップ3構成</h2>
            <div className="ranking-list">
              {results.map((result, i) => {
                return (
                  <div key={i} className={`ranking-card rank-${i + 1}`}>
                    <div className="rank-badge">{i + 1}</div>
                    <div className="card-content">
                      <div className="stats-row">
                        <div className="win-rate">勝率: {(result.winRate * 100).toFixed(2)}%</div>
                        <div className="match-counts" style={{fontSize: '0.8rem', opacity: 0.8}}>
                          (敵構成{result.totalMatches}種中: <span className="count w">{result.wins} 勝</span> /
                          <span className="count d">{result.draws} 分</span> /
                          <span className="count l">{result.losses} 敗</span>)
                        </div>
                      </div>
                      <div className="skill-sequence">
                        {result.sequence.map((skillIdx, turn) => {
                          const skill = selectedWeapon.skills[skillIdx];
                          if (!skill) return null;
                          return (
                            <div key={turn} className="skill-tag">
                              <span className={`skill-type type-${skill.type}`}>
                                {TYPE_LABELS[skill.type]}
                              </span>
                              <span className="skill-name">{skill.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
