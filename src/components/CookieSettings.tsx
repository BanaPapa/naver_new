import React, { useEffect, useState } from 'react';
import { getCookieStatus, saveCookie } from '../services/api';

export function CookieSettings() {
  const [hasCookie, setHasCookie] = useState(false);
  const [preview, setPreview] = useState('');
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadStatus = () => {
    getCookieStatus()
      .then((s) => {
        setHasCookie(s.hasCookie);
        setPreview(s.preview);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async () => {
    if (!input.trim()) {
      setMessage({ type: 'err', text: '쿠키를 입력해주세요' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveCookie(input.trim());
      setMessage({ type: 'ok', text: '쿠키가 저장되었습니다' });
      setInput('');
      loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'err', text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <h2 className="settings-title">쿠키 설정</h2>

      <div className="settings-card">
        <div className="settings-status">
          <span className="settings-label">현재 쿠키 상태:</span>
          {hasCookie ? (
            <span className="status-ok">
              ✓ 설정됨 <span className="cookie-preview">{preview}</span>
            </span>
          ) : (
            <span className="status-err">✕ 미설정</span>
          )}
        </div>

        <div className="settings-guide">
          <h3>쿠키 가져오는 방법</h3>
          <ol>
            <li>Chrome에서 <code>fin.land.naver.com</code> 접속 후 로그인</li>
            <li>F12 개발자 도구 → Network 탭</li>
            <li>아무 API 요청 클릭 → Request Headers에서 <code>Cookie</code> 복사</li>
            <li>아래 텍스트박스에 붙여넣기 후 저장</li>
          </ol>
        </div>

        <div className="form-group">
          <label className="form-label">쿠키 붙여넣기</label>
          <textarea
            className="cookie-textarea"
            rows={6}
            placeholder="NID_AUT=...; NID_SES=...; ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        {message && (
          <div className={`settings-message ${message.type === 'ok' ? 'msg-ok' : 'msg-err'}`}>
            {message.text}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !input.trim()}
        >
          {saving ? '저장 중...' : '쿠키 저장'}
        </button>
      </div>
    </div>
  );
}
