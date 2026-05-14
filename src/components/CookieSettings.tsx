import React, { useEffect, useState } from 'react';
import { getStoredCookie, setStoredCookie, clearStoredCookie } from '../services/naverApi';

export function CookieSettings() {
  const [hasCookie, setHasCookie] = useState(false);
  const [preview, setPreview] = useState('');
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadStatus = () => {
    const cookie = getStoredCookie();
    setHasCookie(!!cookie);
    setPreview(cookie ? cookie.slice(0, 40) + '...' : '');
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setMessage({ type: 'err', text: '쿠키를 입력해주세요' });
      return;
    }
    setStoredCookie(trimmed);
    setMessage({ type: 'ok', text: '쿠키가 저장되었습니다 (브라우저에 보관)' });
    setInput('');
    loadStatus();
  };

  const handleClear = () => {
    clearStoredCookie();
    setMessage({ type: 'ok', text: '쿠키가 삭제되었습니다' });
    loadStatus();
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
          <p className="settings-note">
            💡 쿠키는 이 브라우저의 <strong>localStorage</strong>에만 저장되며 서버로 전송되지 않습니다.
          </p>
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

        <div className="settings-actions">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!input.trim()}
          >
            쿠키 저장
          </button>
          {hasCookie && (
            <button className="btn-ghost" onClick={handleClear}>
              쿠키 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
