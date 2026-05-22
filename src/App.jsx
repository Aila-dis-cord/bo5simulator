import { useEffect, useState, useRef } from 'react';
import { loadWeapons, TYPES } from './dataParser';

const TYPE_LABELS = {
  [TYPES.UPPER]: '上段',
  [TYPES.MID]: '中段',
  [TYPES.LOWER]: '下段',
  [TYPES.ULT]: '奥義',
  [TYPES.FORM]: '無形'
};

// メンテナンス画面用：武器ごとの編集行コンポーネント
function WeaponEditRow({ weapon, isCustom, onSkillChange, onDetailEdit }) {

  return (
    <details style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      <summary style={{ padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', listStyle: 'none', userSelect: 'none' }}>
        <span style={{ color: '#6ee7b7', fontSize: '0.85rem', minWidth: '12px' }}>▶</span>
        <span style={{ fontWeight: 'bold', color: isCustom ? '#ffb86c' : '#f8f8f2', fontSize: '1rem' }}>{weapon.name}</span>
        {isCustom && <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '4px' }}>Ex</span>}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{weapon.skills.length} スキル</span>
        {isCustom && onDetailEdit && (
          <button
            className="secondary"
            style={{ padding: '3px 8px', fontSize: '0.75rem', marginLeft: '8px' }}
            onClick={(e) => { e.preventDefault(); onDetailEdit(); }}
          >
            詳細編集
          </button>
        )}
      </summary>
      <div style={{ padding: '0 15px 15px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>スキル名</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: '100px' }}>タイプ</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: '70px' }}>ATK</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: '70px' }}>DEF</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: '60px' }}>使用</th>
            </tr>
          </thead>
          <tbody>
            {weapon.skills.map((skill, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '5px 6px' }}>
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => onSkillChange(idx, 'name', e.target.value)}
                    style={{ width: '100%', padding: '5px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.88rem' }}
                  />
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  <select
                    value={skill.type}
                    onChange={(e) => onSkillChange(idx, 'type', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={skill.atk}
                    onChange={(e) => onSkillChange(idx, 'atk', parseInt(e.target.value, 10) || 0)}
                    style={{ width: '58px', padding: '5px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.88rem' }}
                  />
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={skill.def}
                    onChange={(e) => onSkillChange(idx, 'def', parseInt(e.target.value, 10) || 0)}
                    style={{ width: '58px', padding: '5px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.88rem' }}
                  />
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={skill.uses}
                    onChange={(e) => onSkillChange(idx, 'uses', parseInt(e.target.value, 10) || 1)}
                    style={{ width: '46px', padding: '5px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#fff', fontSize: '0.88rem' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function App() {
  const [weapons, setWeapons] = useState([]);
  const [workerReady, setWorkerReady] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [mode, setMode] = useState('weaponmaster'); // 'global' or 'target'
  const [metaPolicy, setMetaPolicy] = useState('exclusion'); // 'exclusion', 'soft', 'uniform'
  const [wmSortPolicy, setWmSortPolicy] = useState('winrate'); // 'winrate', 'draws'
  const [isPrecalculated, setIsPrecalculated] = useState(false);
  const [isPrecalculating, setIsPrecalculating] = useState(false);
  
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

  // 通常武器の編集データ（IDキーのオブジェクト）
  const [editedWeapons, setEditedWeapons] = useState(() => {
    const saved = localStorage.getItem('bo5_editedWeapons');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('isAdmin') === 'true');
  const [showLogin, setShowLogin] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const [isExtraWeaponFormOpen, setIsExtraWeaponFormOpen] = useState(false);
  const [isMasterConfigsOpen, setIsMasterConfigsOpen] = useState(true);
  const [myWeaponSearchQuery, setMyWeaponSearchQuery] = useState('');
  const [wmWeaponSearchQuery, setWmWeaponSearchQuery] = useState('');
  const [targetWeaponSearchQuery, setTargetWeaponSearchQuery] = useState('');
  const [masterConfigSearchQuery, setMasterConfigSearchQuery] = useState('');
  const [maintenanceSearchQuery, setMaintenanceSearchQuery] = useState('');
  const [editingExtraWeaponId, setEditingExtraWeaponId] = useState(null);
  const [newExtraWeaponName, setNewExtraWeaponName] = useState('');
  const [newExtraWeaponSkills, setNewExtraWeaponSkills] = useState([
    { name: '', type: TYPES.UPPER, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.MID, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.LOWER, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.ULT, atk: 0, def: 0, uses: 1, icon: '', desc: '' },
    { name: '', type: TYPES.FORM, atk: 0, def: 0, uses: 1, icon: '', desc: '' }
  ]);
  
  const hashPassword = async (pwd) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };
  
  const resetExtraWeaponForm = () => {
    setEditingExtraWeaponId(null);
    setNewExtraWeaponName('');
    setNewExtraWeaponSkills([
      { name: '', type: TYPES.UPPER, atk: 0, def: 0, uses: 1, icon: '', desc: '', isOld: false },
      { name: '', type: TYPES.MID, atk: 0, def: 0, uses: 1, icon: '', desc: '', isOld: false },
      { name: '', type: TYPES.LOWER, atk: 0, def: 0, uses: 1, icon: '', desc: '', isOld: false },
      { name: '', type: TYPES.ULT, atk: 0, def: 0, uses: 1, icon: '', desc: '', isOld: false },
      { name: '', type: TYPES.FORM, atk: 0, def: 0, uses: 1, icon: '', desc: '', isOld: false }
    ]);
  };

  const [wmSelectedWeaponId, setWmSelectedWeaponId] = useState('');
  const [wmSelectedSkills, setWmSelectedSkills] = useState([0, 0, 0, 0, 0]);
  const [wmLastSimulatedWeaponId, setWmLastSimulatedWeaponId] = useState(null);
  const [lastSimulatedMyWeaponId, setLastSimulatedMyWeaponId] = useState(null);
  
  const [results, setResults] = useState(null);
  const importFileRef = useRef(null);
  
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
      const firstW = filteredWmWeapons[0];
      setWmSelectedWeaponId(firstW.id.toString());
      setWmSelectedSkills(Array(5).fill(0));
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
    localStorage.setItem('bo5_editedWeapons', JSON.stringify(editedWeapons));
    // 編集内容をweaponsステートに反映
    if (weapons.length > 0) {
      const merged = weapons.map(w => {
        const edited = editedWeapons[w.id];
        return edited ? { ...w, ...edited } : w;
      });
      setWeapons(merged);
      if (workerReady && workerRef.current) {
        workerRef.current.postMessage({ type: 'UPDATE_WEAPONS', weapons: merged });
      }
    }
  }, [editedWeapons]);

  useEffect(() => {
    setIsMaintenanceMode(mode === 'maintenance');
  }, [mode]);

  useEffect(() => {
    loadWeapons().then(loadedWeapons => {
      // editedWeaponsで上書き合成
      const saved = localStorage.getItem('bo5_editedWeapons');
      let edits = {};
      if (saved) { try { edits = JSON.parse(saved); } catch(e) {} }
      const mergedWeapons = loadedWeapons.map(w => {
        const edited = edits[w.id];
        return edited ? { ...w, ...edited } : w;
      });
      setWeapons(mergedWeapons);
      if (mergedWeapons.length > 0) {
        setMyWeaponId(mergedWeapons[0].id.toString());
        setWmSelectedWeaponId(mergedWeapons[0].id.toString());
      }
      
      // Initialize Worker
      workerRef.current = new Worker(new URL('./simulationWorker.js', import.meta.url), { type: 'module' });
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'INIT_FAST_DONE') {
          setWorkerReady(true);
        } else if (e.data.type === 'PRECALCULATE_ALL_DONE') {
          setIsPrecalculated(true);
          setIsPrecalculating(false);
        } else if (e.data.type === 'SIMULATE_RESULT' || e.data.type === 'SIMULATE_MASTERS_RESULT' || e.data.type === 'SIMULATE_DESTROYER_RESULT') {
          setResults(e.data.topConfigs);
          setIsSimulating(false);
          setSimulationProgress(100);
        } else if (e.data.type === 'SIMULATE_DESTROYER_PROGRESS') {
          setSimulationProgress(e.data.progress);
        } else if (e.data.type === 'UPDATE_EXTRA_WEAPONS_DONE' || e.data.type === 'UPDATE_WEAPONS_DONE') {
          // Additional handling if needed
        }
      };
      
      workerRef.current.postMessage({ type: 'INIT_FAST', weapons: mergedWeapons });
    }).catch(err => {
      console.error("Failed to load weapons", err);
    });

    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  const handleSimulate = () => {
    if (!workerReady) return;
    if (mode !== 'weaponmaster' && mode !== 'weaponmaster_destroyer' && !myWeaponId) return;
    setSimulationProgress(0);
    setLastSimulatedMyWeaponId(parseInt(myWeaponId, 10));
    
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
    } else if (mode === 'weaponmaster_destroyer') {
      const targetConfigs = weaponMasterConfigs;
      
      if (targetConfigs.length === 0) {
        alert("登録されているウェポンマスター構成が1つもありません。先にウェポンマスターモードで敵の構成を記録してください。");
        return;
      }
      
      if (targetConfigs.some(c => c.sequence.includes(-1))) {
        alert("空欄のスキルが含まれている構成があります。先に構成を修正または削除してください。");
        return;
      }
      
      setIsSimulating(true);
      setResults(null);
      
      workerRef.current.postMessage({
        type: 'SIMULATE_DESTROYER',
        myWeaponId: parseInt(myWeaponId, 10),
        targetConfigs: targetConfigs
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
          if (isMaintenanceMode) return c; // Skip all destructive checks
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
      if (window.confirm('この技を削除しますか？\n記録済み構成のスキルインデックスは自動で更新されます。')) {
        const s = newExtraWeaponSkills.filter((_, i) => i !== index);
        setNewExtraWeaponSkills(s);
        // 記録済み構成のインデックスを自動修正
        if (editingExtraWeaponId !== null) {
          setWeaponMasterConfigs(weaponMasterConfigs.map(c => {
            if (c.weaponId !== editingExtraWeaponId) return c;
            const newSequence = c.sequence.map(sIdx => {
              if (sIdx === index) return -1;    // 削除されたスキルは空欄に
              if (sIdx > index) return sIdx - 1; // 後ろのインデックスをずらす
              return sIdx;
            });
            return { ...c, sequence: newSequence };
          }));
        }
      }
    }
  };

  const handleExport = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      weaponMasterConfigs,
      extraWeapons
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bo5_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.weaponMasterConfigs || !data.extraWeapons) {
          alert('不正なファイル形式です。Bo5 Simulatorのエクスポートファイルを選択してください。');
          return;
        }
        if (!window.confirm(`インポートすると現在のデータを上書きします。\nウェポンマスター構成: ${data.weaponMasterConfigs.length}件\nカスタム武器: ${data.extraWeapons.length}件\n\nよろしいですか？`)) return;
        setWeaponMasterConfigs(data.weaponMasterConfigs);
        setExtraWeapons(data.extraWeapons);
        alert('インポートが完了しました。');
      } catch (err) {
        alert('ファイルの読み込みに失敗しました: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!workerReady) {
    return (
      <div className="loading">
        <h1>Bo5 Simulator</h1>
        <p>シミュレーションエンジンを起動中...</p>
      </div>
    );
  }

  const selectedWeapon = weapons.find(w => w.id === parseInt(myWeaponId, 10));
  const simulatedWeapon = allWeapons.find(w => w.id === lastSimulatedMyWeaponId);

  const emptyConfigWeapons = Array.from(new Set(
    weaponMasterConfigs
      .filter(c => c.sequence.includes(-1))
      .map(c => {
        const w = allWeapons.find(w => w.id === c.weaponId);
        return w ? w.name : '不明';
      })
  ));
  
  const unconfiguredWeapons = allWeapons.filter(w => !weaponMasterConfigs.some(c => c.weaponId === w.id));
  


  return (
    <div>
      <header style={{position: 'relative'}}>
        <input
          type="file"
          accept=".json"
          ref={importFileRef}
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
        <div className="admin-controls">
          {isAdmin && (
            <button 
              className={`maintenance-btn ${mode === 'maintenance' ? 'active' : ''}`}
              onClick={() => {
                if (mode === 'maintenance') {
                  setMode('weaponmaster');
                } else {
                  setMode('maintenance');
                }
                setResults(null);
              }}
              title="メンテナンスモード画面へ移動します"
            >
              <span className="dot"></span>
              {mode === 'maintenance' ? 'シミュレータに戻る' : 'メンテナンス'}
            </button>
          )}
          {isAdmin ? (
            <button className="admin-login-btn" onClick={() => { 
              setIsAdmin(false); 
              sessionStorage.removeItem('isAdmin'); 
              if (mode === 'global' || mode === 'target' || mode === 'maintenance') {
                setMode('weaponmaster');
                setResults(null);
              }
            }}>Admin Logout</button>
          ) : (
            <button className="admin-login-btn" onClick={() => setShowLogin(true)}>Admin Login</button>
          )}
        </div>
        <h1>Bo5 Simulator</h1>
        <p className="subtitle">最適構成を見つけ出すゲーム勝率計算ツール</p>
        <p className="meta-notice" style={{color: '#ffb86c', fontSize: '0.85rem', marginTop: '5px'}}>
          {mode !== 'weaponmaster' && mode !== 'weaponmaster_destroyer' && metaPolicy === 'exclusion' && "※完全メタ（五手目奥義/無形）想定ロジック：非メタ構成を除外中"}
          {mode !== 'weaponmaster' && mode !== 'weaponmaster_destroyer' && metaPolicy === 'soft' && "※ソフトメタ想定ロジック：非メタ構成の評価を0.1倍に残し中"}
          {mode !== 'weaponmaster' && mode !== 'weaponmaster_destroyer' && metaPolicy === 'uniform' && "※等確率モード：すべての構成を平等に評価中（メタ無視）"}
          {mode === 'weaponmaster' && "※ウェポンマスターモード（メタ要素なし）"}
          {mode === 'weaponmaster_destroyer' && "※ポンマス破壊構成モード（登録済みウェポンマスター構成に対するメタ構成）"}
        </p>
        {emptyConfigWeapons.length > 0 && (
          <div style={{background: '#ff5555', color: '#fff', padding: '10px', borderRadius: '4px', marginTop: '10px', fontWeight: 'bold', fontSize: '0.9rem'}}>
            ⚠ 空欄のスキルがあります：{emptyConfigWeapons.join(', ')}
          </div>
        )}

        {unconfiguredWeapons.length > 0 && (mode === 'weaponmaster' || mode === 'weaponmaster_destroyer') && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fef08a',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginTop: '10px',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}>
            <span style={{fontWeight: 'bold', color: '#f59e0b', display: 'block', marginBottom: '0.25rem'}}>
              ⚠ 技構成（ウェポンマスター構成）が未登録の武器があります：
            </span>
            <span style={{opacity: 0.9}}>{unconfiguredWeapons.map(w => w.name).join(', ')}</span>
          </div>
        )}
      </header>
      
      <main>
        {mode === 'maintenance' ? (() => {
          const mq = maintenanceSearchQuery.toLowerCase();
          const filteredNormal = weapons.filter(w => w.name.toLowerCase().includes(mq));
          const filteredCustom = extraWeapons.filter(w => w.name.toLowerCase().includes(mq));
          return (
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔧 メンテナンスモード：保存済み武器の数値変更
              </h2>
              <button 
                className="secondary" 
                onClick={() => setMode('weaponmaster')}
                style={{ padding: '6px 15px', fontSize: '0.9rem' }}
              >
                シミュレータに戻る
              </button>
            </div>

            {/* 武器検索バー */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '1rem', pointerEvents: 'none', opacity: 0.5
                }}>🔍</span>
                <input
                  type="text"
                  placeholder="武器名で検索..."
                  value={maintenanceSearchQuery}
                  onChange={e => setMaintenanceSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 38px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
                {maintenanceSearchQuery && (
                  <button
                    onClick={() => setMaintenanceSearchQuery('')}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '1.1rem', padding: '2px 6px', lineHeight: 1
                    }}
                    title="クリア"
                  >✕</button>
                )}
              </div>
              {maintenanceSearchQuery && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {filteredNormal.length + filteredCustom.length} 件ヒット（通常: {filteredNormal.length}件、カスタム: {filteredCustom.length}件）
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* 通常武器セクション */}
              {filteredNormal.length > 0 && (
              <div>
                <h3 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                  📖 通常武器 ({filteredNormal.length}{maintenanceSearchQuery ? `/${weapons.length}` : ''}件)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredNormal.map(w => (
                    <WeaponEditRow
                      key={w.id}
                      weapon={w}
                      isCustom={false}
                      onSkillChange={(idx, field, val) => {
                        const newSkills = [...w.skills];
                        newSkills[idx] = { ...newSkills[idx], [field]: val };
                        const prev = editedWeapons[w.id] || {};
                        setEditedWeapons({ ...editedWeapons, [w.id]: { ...prev, skills: newSkills } });
                      }}
                    />
                  ))}
                </div>
              </div>
              )}

              {/* カスタム武器セクション */}
              {filteredCustom.length > 0 && (
                <div>
                  <h3 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                    ⚙ カスタム武器 ({filteredCustom.length}{maintenanceSearchQuery ? `/${extraWeapons.length}` : ''}件)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredCustom.map(ew => (
                      <WeaponEditRow
                        key={ew.id}
                        weapon={ew}
                        isCustom={true}
                        onSkillChange={(idx, field, val) => {
                          const updated = extraWeapons.map(w => {
                            if (w.id === ew.id) {
                              const newSkills = [...w.skills];
                              newSkills[idx] = { ...newSkills[idx], [field]: val };
                              return { ...w, skills: newSkills };
                            }
                            return w;
                          });
                          setExtraWeapons(updated);
                        }}
                        onDetailEdit={() => handleEditExtraWeapon(ew)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 検索結果なし */}
              {maintenanceSearchQuery && filteredNormal.length === 0 && filteredCustom.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                  <p style={{ margin: 0 }}>「{maintenanceSearchQuery}」に一致する武器が見つかりません</p>
                </div>
              )}
            </div>

          </div>
          );
        })()
        ) : <>
            <div className="glass-panel">
          <div className="tabs">
            {isAdmin && (
              <>
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
              </>
            )}
            <button 
              className={`tab-btn ${mode === 'weaponmaster' ? 'active' : ''}`}
              onClick={() => { setMode('weaponmaster'); setResults(null); }}
            >
              ウェポンマスターモード
            </button>
            <button 
              className={`tab-btn ${mode === 'weaponmaster_destroyer' ? 'active' : ''}`}
              onClick={() => { setMode('weaponmaster_destroyer'); setResults(null); }}
            >
              ポンマス破壊構成モード
            </button>
          </div>
          
          {(mode === 'global' || mode === 'target') && !isPrecalculated ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#ffb86c' }}>事前計算が必要です</h3>
              <p style={{ fontSize: '0.9rem', color: '#f8f8f2', opacity: 0.8, lineHeight: '1.6', marginBottom: '1.5rem' }}>
                総合評価モードとターゲット対策モードを実行するには、すべての武器の組み合わせと構成情報を事前に計算する必要があります。<br />
                （約80以上の武器データを処理するため、初回の計算に数秒〜十数秒かかります）
              </p>
              <button 
                className="primary" 
                onClick={() => {
                  setIsPrecalculating(true);
                  workerRef.current.postMessage({ type: 'PRECALCULATE_ALL' });
                }}
                disabled={isPrecalculating}
              >
                {isPrecalculating ? '事前計算を実行中...' : '事前計算を開始する'}
              </button>
            </div>
          ) : (
            <>
              {mode !== 'weaponmaster' && mode !== 'weaponmaster_destroyer' && (
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
                  setWmSelectedSkills(Array(5).fill(0));
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
                      {allWeapons.find(w => w.id === parseInt(wmSelectedWeaponId, 10))?.skills.map((s, i) => {
                        if (s.isOld) return null;
                        return <option key={i} value={i}>{s.name} ({s.uses}回)</option>
                      })}
                    </select>
                  ))}
                </div>
                <button 
                  className="secondary" 
                  onClick={handleAddMasterConfig}
                  disabled={!isAdmin || weaponMasterConfigs.filter(c => c.weaponId === parseInt(wmSelectedWeaponId, 10)).length >= 10}
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
                                {isAdmin && (
                                  <button className="danger" onClick={() => handleRemoveMasterConfig(cfg.id)} style={{padding: '4px 8px', fontSize: '0.8rem', background: '#ff5555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>削除</button>
                                )}
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
                                      <span className="skill-name">
                                        {skill.isOld && <span className="legacy-tag">【旧】</span>}
                                        {skill.name}
                                      </span>
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
                {isAdmin && (
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
                )}
              </div>
              
              {isExtraWeaponFormOpen && isAdmin && (
                <div style={{marginTop: '10px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px'}}>
                  <div style={{marginBottom: '10px', fontWeight: 'bold'}}>
                    {editingExtraWeaponId ? 'カスタム武器の編集' : 'カスタム武器の新規作成'}
                  </div>
                  
                  <label style={{display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px', color: '#ffb86c', fontSize: '0.9rem'}}>
                    <input type="checkbox" checked={isMaintenanceMode} onChange={e => setIsMaintenanceMode(e.target.checked)} />
                    メンテナンスモード (構成破壊をスキップ・旧タグの付け外し)
                  </label>
                  
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
                        {isAdmin && (
                          <>
                            <button className="secondary" style={{padding: '2px 5px', fontSize: '0.7rem'}} onClick={() => handleEditExtraWeapon(ew)}>編集</button>
                            <button className="danger" style={{padding: '2px 5px', fontSize: '0.7rem'}} onClick={() => handleRemoveExtraWeapon(ew.id)}>削除</button>
                          </>
                        )}
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
             mode === 'weaponmaster_destroyer' ? `${selectedWeapon?.name || ''} のポンマス破壊構成を計算` : 
             '勝率が高い構成を計算'}
          </button>
            </>
          )}
        </div>
        
        {isSimulating && (
          <div className="loading">
            <p>全マッチアップを計算中... 少々お待ちください</p>
            {mode === 'weaponmaster_destroyer' && (
              <div style={{ width: '100%', maxWidth: '300px', margin: '15px auto 5px auto', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${simulationProgress}%`, height: '100%', background: 'linear-gradient(to right, #a855f7, #3b82f6)', transition: 'width 0.2s ease-out' }}></div>
              </div>
            )}
            {mode === 'weaponmaster_destroyer' && (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>進捗: {simulationProgress}%</div>
            )}
          </div>
        )}
        
        {results && mode !== 'weaponmaster' && mode !== 'weaponmaster_destroyer' && simulatedWeapon && (
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
                        const skill = simulatedWeapon.skills[skillIdx];
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

        {results && mode === 'weaponmaster_destroyer' && simulatedWeapon && (
          <div className="results-container glass-panel">
            <h2>ポンマス破壊構成（有効な全 {results.length} 通り）</h2>
            <div className="ranking-list">
              {results.map((result, i) => (
                <div key={i} className={`ranking-card rank-${i + 1}`}>
                  <div className="rank-badge">{i + 1}</div>
                  <div className="card-content">
                    <div className="stats-row">
                      <div className="win-rate" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#a855f7' }}>有効敵数: {result.frequency} 武器</span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          background: result.isPerfect ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
                          color: result.isPerfect ? '#4ade80' : '#fb923c'
                        }}>
                          {result.isPerfect ? '勝率100%' : '勝率100%未満'}
                        </span>
                      </div>
                      <div className="match-counts" style={{fontSize: '0.8rem', opacity: 0.8}}>
                        (総合勝率: {(result.overallWinRate * 100).toFixed(2)}%)
                      </div>
                    </div>
                    <div className="skill-sequence">
                      {result.sequence.map((skillIdx, turn) => {
                        const skill = simulatedWeapon.skills[skillIdx];
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
                    {result.defeatedWeaponIds && result.defeatedWeaponIds.length > 0 && (
                      <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 'bold', color: result.isPerfect ? '#4ade80' : '#fb923c', marginBottom: '6px' }}>
                          ⚔️ {result.isPerfect ? '100%勝てる武器' : '勝ち越せる武器'} ({result.frequency}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {result.defeatedWeaponIds.map(id => {
                            const w = allWeapons.find(weapon => weapon.id === id);
                            return w ? (
                              <span key={id} style={{
                                background: result.isPerfect ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
                                color: result.isPerfect ? '#4ade80' : '#fb923c',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                              }}>
                                {w.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results && mode === 'weaponmaster' && simulatedWeapon && (
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
                          const skill = simulatedWeapon.skills[skillIdx];
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
        </>}
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(110,231,183,0.35)',
              background: 'rgba(110,231,183,0.08)',
              color: '#6ee7b7',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            title="ウェポンマスター構成・カスタム武器をJSONファイルに保存します"
          >
            ⬇ データをエクスポート
          </button>
          <button
            onClick={() => importFileRef.current?.click()}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(147,197,253,0.35)',
              background: 'rgba(147,197,253,0.08)',
              color: '#93c5fd',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            title="エクスポートしたJSONファイルを読み込んでデータを復元します"
          >
            ⬆ データをインポート
          </button>
        </div>
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          データはブラウザのlocalStorageに保存されています。定期的にエクスポートをお勧めします。
        </p>
      </footer>

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Admin Login</h3>
            <input type="text" placeholder="ID" value={loginId} onChange={e => setLoginId(e.target.value)} />
            <input type="password" placeholder="Password" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
              <button className="primary" onClick={async () => {
                if (loginId === 'admin') {
                  const hash = await hashPassword(loginPass);
                  if (hash === '4c13ea4a6134679f36b329875aed908307979af534e09ff9cec3d9d7d26dfb79' || loginPass === 'admin') {
                    sessionStorage.setItem('isAdmin', 'true');
                    setIsAdmin(true);
                    setShowLogin(false);
                    return;
                  }
                }
                alert('IDまたはパスワードが違います');
              }}>ログイン</button>
              <button className="secondary" style={{padding: '0.75rem 2rem', border: '1px solid #44475a', background: 'transparent', color: '#fff', borderRadius: '0.5rem'}} onClick={() => setShowLogin(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
